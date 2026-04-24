import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BundleManifestV1 } from '@/types/post';
import type { VirtualFileTree } from '@/types/vibe';
import { composePreviewHtml } from './previewFrameCompose';
import { VibePreviewFrame } from './VibePreviewFrame';
import {
  isSwReadyTimeout,
  registerVibePreviewSw,
  type SwBindResult,
} from './swClient';
import { BlobFallbackController, MULTI_FILE_FALLBACK_BANNER } from './blobFallback';

export interface BundleCanvasProps {
  postId: string;
  tree: VirtualFileTree;
  manifest: BundleManifestV1;
  onAfterSwap?(): void;
}

export function BundleCanvas({
  postId,
  tree,
  manifest,
  onAfterSwap,
}: BundleCanvasProps) {
  const [swBind, setSwBind] = useState<SwBindResult | null>(null);
  const [swError, setSwError] = useState<string | null>(null);
  const [deployedTree, setDeployedTree] = useState<VirtualFileTree>({});
  const [deployedVersion, setDeployedVersion] = useState(0);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null);
  const blobControllerRef = useRef<BlobFallbackController | null>(null);

  if (blobControllerRef.current === null) {
    blobControllerRef.current = new BlobFallbackController();
  }

  useEffect(() => {
    let disposed = false;
    let bind: SwBindResult | null = null;
    setSwBind(null);
    setSwError(null);
    setDeployedTree({});
    setDeployedVersion(0);
    setFallbackUrl(null);
    setFallbackBanner(null);

    void (async () => {
      try {
        const result = await registerVibePreviewSw(postId);
        if (disposed) {
          await result.close();
          return;
        }
        bind = result;
        setSwBind(result);
        setSwError(null);
      } catch (err) {
        if (disposed) return;
        setSwError(
          isSwReadyTimeout(err)
            ? 'Preview SW did not start in time — using blob fallback.'
            : err instanceof Error
              ? err.message
              : String(err),
        );
      }
    })();

    return () => {
      disposed = true;
      if (bind) void bind.close();
      blobControllerRef.current?.disposeAll();
    };
  }, [postId]);

  useEffect(() => {
    if (swBind) {
      const entryPath =
        manifest.entry && tree[manifest.entry]?.kind === 'text' ? manifest.entry : null;
      const composedTree: VirtualFileTree = entryPath
        ? {
            ...tree,
            [entryPath]: {
              ...(tree[entryPath] as typeof tree[string] & { kind: 'text' }),
              content: composePreviewHtml(
                typeof tree[entryPath].content === 'string' ? tree[entryPath].content : '',
                swBind.scope,
              ).html,
            },
          }
        : tree;

      let cancelled = false;
      const started = performance.now();
      console.info('[vibe/canvas] pushing tree to SW', {
        files: Object.keys(tree).length,
        paths: Object.keys(tree),
        preCompose: Boolean(entryPath),
      });
      swBind.pushTree(composedTree).then(() => {
        if (cancelled) return;
        const version = swBind.getTreeVersion();
        console.info(
          '[vibe/canvas] SW acked tree after',
          Math.round(performance.now() - started),
          'ms — navigating preview to version',
          version,
        );
        setDeployedTree(tree);
        setDeployedVersion(version);
      });

      return () => {
        cancelled = true;
      };
    }

    if (swError) {
      console.warn('[vibe/canvas] SW failed; using blob fallback for deployedTree', { swError });
      setDeployedTree(tree);
      return undefined;
    }

    console.info('[vibe/canvas] waiting for SW before populating deployedTree');
    return undefined;
  }, [manifest.entry, swBind, swError, tree]);

  useEffect(() => {
    if (swBind) {
      setFallbackUrl(null);
      setFallbackBanner(null);
      return;
    }
    if (!swError) {
      return;
    }

    const controller = blobControllerRef.current;
    if (!controller) return;
    const paths = Object.keys(tree);
    if (paths.length === 0) {
      setFallbackUrl(null);
      setFallbackBanner(null);
      return;
    }

    try {
      const rebuilt = controller.rebuild(tree);
      setFallbackUrl(rebuilt.primaryUrl);
      setFallbackBanner(null);
    } catch (err) {
      setFallbackUrl(null);
      setFallbackBanner(err instanceof Error ? err.message : MULTI_FILE_FALLBACK_BANNER);
    }
  }, [swBind, swError, tree]);

  const handleAfterSwap = useCallback(() => {
    blobControllerRef.current?.revokePrevious();
    onAfterSwap?.();
  }, [onAfterSwap]);

  const hasEntry = useMemo(() => {
    if (!manifest.entry) return false;
    const entryFile = deployedTree[manifest.entry];
    return Boolean(entryFile && entryFile.kind === 'text' && typeof entryFile.content === 'string');
  }, [deployedTree, manifest.entry]);

  const previewBlock = useMemo(() => {
    if (swBind && hasEntry && deployedVersion > 0) {
      return (
        <VibePreviewFrame
          swScope={swBind.scope}
          version={deployedVersion}
          manifest={manifest}
          onAfterSwap={handleAfterSwap}
          className="h-full w-full"
        />
      );
    }
    if (fallbackBanner) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center text-xs text-amber-200">
          {fallbackBanner}
        </div>
      );
    }
    if (fallbackUrl) {
      return <iframe title={manifest.title} src={fallbackUrl} className="h-full w-full border-0" />;
    }
    return (
      <div className="flex h-full items-center justify-center p-6 text-xs text-zinc-500">
        {swError
          ? `Preview unavailable: ${swError}`
          : Object.keys(tree).length === 0
            ? 'Start typing — your preview appears here once the agent generates content.'
            : 'Preparing live preview…'}
      </div>
    );
  }, [deployedVersion, fallbackBanner, fallbackUrl, handleAfterSwap, hasEntry, manifest, swBind, swError, tree]);

  return <div className="absolute inset-0 bg-black">{previewBlock}</div>;
}

export default BundleCanvas;
