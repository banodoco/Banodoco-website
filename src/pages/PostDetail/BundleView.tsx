import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PostDetailItem } from '@/hooks/usePost';
import type { PostBundleRow } from '@/types/post';
import { BundleFrame } from '@/features/bundlePosts/BundleFrame';
import { buildBundleUrl } from '@/features/bundlePosts/buildBundleUrl';

interface BundleViewProps {
  post: PostDetailItem;
  /** Bundle row loaded from the ?preview=<id> query arg. Takes precedence over activeBundle. */
  previewBundle: PostBundleRow | null;
}

// Request a fresh preview token 30s before the 5-minute expiry so the iframe
// never tries to fetch with an expired token during a long preview session.
const PREVIEW_TOKEN_LIFETIME_MS = 5 * 60 * 1000;
const PREVIEW_TOKEN_REFRESH_MARGIN_MS = 30 * 1000;

function ensureMeta(
  property: string,
  attribute: 'name' | 'property' = 'name',
): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, property);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Bundle-mode body renderer. Chooses previewBundle when present (owner/admin
 * flow behind a preview token), otherwise falls back to the post's active
 * approved bundle. Triggers FullscreenContext when the manifest requests it,
 * and writes runtime SEO meta tags per the spec "SEO Mapping" section.
 */
export function BundleView({ post, previewBundle }: BundleViewProps) {
  const bundle = previewBundle ?? post.activeBundle;
  const manifest = bundle?.manifest ?? null;

  const isFullscreenLayout = manifest?.layout?.mode === 'fullscreen';
  console.info('[bundle/view] render', {
    postId: post.id,
    activeBundleId: post.activeBundleVersionId,
    bundleId: bundle?.id ?? null,
    reviewStatus: bundle?.review_status ?? null,
    layoutMode: manifest?.layout?.mode ?? null,
    isFullscreenLayout,
    usingPreviewBundle: Boolean(previewBundle),
  });

  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewTokenError, setPreviewTokenError] = useState<string | null>(null);

  // Preview token lifecycle — initial fetch + periodic refresh so long-running
  // owner/admin preview sessions never render stale tokens.
  useEffect(() => {
    if (!previewBundle) {
      setPreviewToken(null);
      setPreviewTokenError(null);
      return undefined;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const requestToken = async () => {
      if (!supabase) {
        setPreviewTokenError('Supabase is not configured.');
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('issue-preview-token', {
          body: { bundleVersionId: previewBundle.id },
        });
        if (cancelled) return;
        if (error) {
          setPreviewTokenError(error.message);
          setPreviewToken(null);
          return;
        }
        const payload = data as { token?: string } | null;
        if (payload?.token) {
          setPreviewToken(payload.token);
          setPreviewTokenError(null);
          refreshTimer = setTimeout(() => {
            void requestToken();
          }, PREVIEW_TOKEN_LIFETIME_MS - PREVIEW_TOKEN_REFRESH_MARGIN_MS);
        } else {
          setPreviewTokenError('Preview token unavailable.');
        }
      } catch (err) {
        if (cancelled) return;
        setPreviewTokenError(err instanceof Error ? err.message : 'Preview token request failed.');
      }
    };

    void requestToken();

    return () => {
      cancelled = true;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
    };
  }, [previewBundle]);

  // Runtime SEO mapping: document.title + meta description + OG title / OG
  // description / canonical / og:image when ogImage is declared. Spec
  // "SEO Mapping" — doc-side runtime-only because Vite SPA has no SSR.
  useEffect(() => {
    if (!manifest || !bundle) return undefined;
    const originalTitle = document.title;
    document.title = manifest.title;

    const descriptionEl = ensureMeta('description');
    const ogTitleEl = ensureMeta('og:title', 'property');
    const ogDescriptionEl = ensureMeta('og:description', 'property');
    const ogTypeEl = ensureMeta('og:type', 'property');
    const canonicalEl = ensureCanonical();
    let ogImageEl: HTMLMetaElement | null = null;

    const priors = {
      description: descriptionEl.getAttribute('content') ?? '',
      ogTitle: ogTitleEl.getAttribute('content') ?? '',
      ogDescription: ogDescriptionEl.getAttribute('content') ?? '',
      ogType: ogTypeEl.getAttribute('content') ?? '',
      canonical: canonicalEl.getAttribute('href') ?? '',
    };

    const summary = manifest.summary ?? '';
    descriptionEl.setAttribute('content', summary);
    ogTitleEl.setAttribute('content', manifest.title);
    ogDescriptionEl.setAttribute('content', summary);
    ogTypeEl.setAttribute('content', 'article');
    canonicalEl.setAttribute('href', `${window.location.origin}/posts/${post.slug}`);

    if (manifest.ogImage) {
      ogImageEl = ensureMeta('og:image', 'property');
      const priorOgImage = ogImageEl.getAttribute('content') ?? '';
      ogImageEl.setAttribute('content', buildBundleUrl(bundle.id, manifest.ogImage, previewToken));
      (ogImageEl as HTMLMetaElement & { __prior?: string }).__prior = priorOgImage;
    }

    return () => {
      document.title = originalTitle;
      descriptionEl.setAttribute('content', priors.description);
      ogTitleEl.setAttribute('content', priors.ogTitle);
      ogDescriptionEl.setAttribute('content', priors.ogDescription);
      ogTypeEl.setAttribute('content', priors.ogType);
      canonicalEl.setAttribute('href', priors.canonical);
      if (ogImageEl) {
        const prior = (ogImageEl as HTMLMetaElement & { __prior?: string }).__prior ?? '';
        ogImageEl.setAttribute('content', prior);
      }
    };
  }, [manifest, bundle, post.slug, previewToken]);

  const statusBadge = useMemo(() => {
    if (!bundle) return null;
    if (bundle.review_status === 'approved' && post.activeBundleVersionId === bundle.id) {
      return null;
    }
    const label =
      bundle.review_status === 'approved'
        ? 'Approved (not active)'
        : bundle.review_status === 'rejected'
        ? 'Rejected'
        : 'Pending review';
    return (
      <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
        {label}
      </span>
    );
  }, [bundle, post.activeBundleVersionId]);

  if (!bundle || !manifest) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101821] p-8 text-sm text-zinc-400">
        This bundle post does not yet have an active bundle version. Upload a ZIP from the author
        tools to attach one.
      </div>
    );
  }

  if (previewBundle && previewTokenError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-200">
        Preview token could not be issued: {previewTokenError}
      </div>
    );
  }
  if (previewBundle && !previewToken) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101821] p-6 text-sm text-zinc-400">
        Issuing preview token…
      </div>
    );
  }

  const frameClassName = isFullscreenLayout
    ? 'w-full border-0'
    : 'w-full rounded-2xl border border-white/10 bg-black';

  const frameInner = (
    <BundleFrame
      bundleVersionId={bundle.id}
      manifest={manifest}
      previewToken={previewToken ?? null}
      className={frameClassName}
    />
  );

  // Both fullscreen and inline-auto bundles want to feel like part of the
  // page — the iframe flows in document order and grows with its content
  // (for inline-auto via postMessage resize). PostDetail suppresses its own
  // chrome for bundle posts, so the bundle body is the page body.
  return (
    <div className="relative">
      {statusBadge && (
        <div className="absolute right-4 top-4 z-10">{statusBadge}</div>
      )}
      {frameInner}
    </div>
  );
}
