// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  SW_READY_TIMEOUT_MS,
  VIBE_PREVIEW_BASE,
  isSwReadyTimeout,
  mintSwId,
  registerVibePreviewSw,
  scopeFor,
  unregisterStaleSiblings,
} from './swClient';

vi.mock('./db', () => ({
  getAsset: vi.fn(async () => null),
}));

interface FakeWorker {
  state: string;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

interface FakeRegistration {
  scope: string;
  active: FakeWorker | null;
  waiting: FakeWorker | null;
  installing: FakeWorker | null;
  unregister: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

const makeFakeWorker = (state: string = 'activated'): FakeWorker => ({
  state,
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const makeFakeRegistration = (scope: string): FakeRegistration => ({
  scope: `http://localhost${scope}`,
  active: makeFakeWorker('activated'),
  waiting: null,
  installing: null,
  unregister: vi.fn(async () => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

interface FakeContainer {
  register: ReturnType<typeof vi.fn>;
  getRegistrations: ReturnType<typeof vi.fn>;
  ready: Promise<FakeRegistration>;
  existingRegistrations: FakeRegistration[];
}

const installFakeServiceWorker = (opts: {
  readyDelayMs: number;
  existing: FakeRegistration[];
  registerResolvesTo?: FakeRegistration;
}): FakeContainer => {
  let readyResolve: ((reg: FakeRegistration) => void) | null = null;
  const readyPromise = new Promise<FakeRegistration>((resolve) => {
    readyResolve = resolve;
  });

  const container: FakeContainer = {
    register: vi.fn(async (_url: string, registerOpts: { scope: string }) => {
      const reg = opts.registerResolvesTo ?? makeFakeRegistration(registerOpts.scope);
      reg.scope = `http://localhost${registerOpts.scope}`;
      // Only settle `.ready` if readyDelayMs is finite.
      if (opts.readyDelayMs >= 0) {
        setTimeout(() => readyResolve?.(reg), opts.readyDelayMs);
      }
      return reg;
    }),
    getRegistrations: vi.fn(async () => opts.existing),
    ready: readyPromise,
    existingRegistrations: opts.existing,
  };
  Object.defineProperty(global.navigator, 'serviceWorker', {
    value: container,
    configurable: true,
    writable: true,
  });
  return container;
};

beforeEach(() => {
  // happy-dom ships a stub serviceWorker; clear any lingering state.
  Object.defineProperty(global.navigator, 'serviceWorker', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('swClient — scope shape & helpers', () => {
  test('scopeFor returns exactly /submit/post/vibe-preview/<swId>/', () => {
    expect(scopeFor('abc-123')).toBe('/submit/post/vibe-preview/abc-123/');
    expect(VIBE_PREVIEW_BASE).toBe('/submit/post/vibe-preview/');
  });

  test('mintSwId produces a non-empty string', () => {
    const id = mintSwId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('SW_READY_TIMEOUT_MS is a positive integer (bumped from 1500 → 5000 to tolerate Vite cold-start)', () => {
    expect(Number.isInteger(SW_READY_TIMEOUT_MS)).toBe(true);
    expect(SW_READY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SW_READY_TIMEOUT_MS).toBe(5000);
  });
});

describe('swClient — unregisterStaleSiblings', () => {
  test('unregisters sibling scopes whose swId differs from current', async () => {
    const stale = makeFakeRegistration('/submit/post/vibe-preview/old-swid/');
    const other = makeFakeRegistration('/submit/post/vibe-preview/another-swid/');
    const outside = makeFakeRegistration('/totally-unrelated/');
    installFakeServiceWorker({
      readyDelayMs: 0,
      existing: [stale, other, outside],
    });

    const removed = await unregisterStaleSiblings('current-swid');

    expect(removed).toBe(2);
    expect(stale.unregister).toHaveBeenCalledTimes(1);
    expect(other.unregister).toHaveBeenCalledTimes(1);
    expect(outside.unregister).not.toHaveBeenCalled();
  });

  test('returns 0 when navigator.serviceWorker is undefined', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const removed = await unregisterStaleSiblings('any-swid');
    expect(removed).toBe(0);
  });
});

describe('swClient — activation timeout falls through to the caller', () => {
  test('throws SwReadyTimeoutError when the worker never reaches activated', async () => {
    // Registration returns a worker stuck in 'installing' — never activates.
    const stuckReg: FakeRegistration = {
      scope: 'http://localhost/submit/post/vibe-preview/test-swid/',
      active: null,
      waiting: null,
      installing: makeFakeWorker('installing'),
      unregister: vi.fn(async () => true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    installFakeServiceWorker({ readyDelayMs: -1, existing: [], registerResolvesTo: stuckReg });

    let thrown: unknown = null;
    try {
      await registerVibePreviewSw('post-id', {
        swId: 'test-swid',
        workerUrl: '/vibe-preview-sw.js',
        readyTimeoutMs: 50, // short, deterministic
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeTruthy();
    expect(isSwReadyTimeout(thrown)).toBe(true);
  });

  test('happy path: returns a bind with the exact per-session scope', async () => {
    installFakeServiceWorker({ readyDelayMs: 5, existing: [] });
    const bind = await registerVibePreviewSw('post-id', {
      swId: 'happy-swid',
      workerUrl: '/vibe-preview-sw.js',
      readyTimeoutMs: 100,
    });
    expect(bind.swId).toBe('happy-swid');
    expect(bind.scope).toBe('/submit/post/vibe-preview/happy-swid/');
    await bind.close();
  });
});
