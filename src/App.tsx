import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { MainLayout } from '@/layouts/MainLayout';
import UserSwitcher from '@/components/admin/UserSwitcher';
import Home from '@/pages/Home';

// Lazy load non-critical pages
const OwnershipPage = lazy(() => import('@/pages/OwnershipPage'));
const SecondRenaissance = lazy(() => import('@/pages/SecondRenaissance'));
const WrappedPage = lazy(() => import('@/pages/Wrapped'));
const Resources = lazy(() => import('@/pages/Resources'));
const ArtAgents = lazy(() => import('@/pages/ArtAgents'));
const AgentNodeDetail = lazy(() => import('@/pages/AgentNodeDetail'));
const ArtDetail = lazy(() => import('@/pages/ArtDetail'));
const ResourceDetail = lazy(() => import('@/pages/ResourceDetail'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const GetApproved = lazy(() => import('@/pages/GetApproved'));
const SubmitArt = lazy(() => import('@/pages/SubmitArt'));
const SubmitPost = lazy(() => import('@/pages/SubmitPost'));
const SubmitResource = lazy(() => import('@/pages/SubmitResource'));
const SubmitAgentNode = lazy(() => import('@/pages/SubmitAgentNode'));
const PostDetail = lazy(() => import('@/pages/PostDetail'));
const AdminBundles = lazy(() => import('@/pages/admin/Bundles'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Minimal loading fallback — keeps layout stable while lazy chunks load.
// Intentionally blank so page-specific skeletons (e.g. ResourceGrid) aren't preceded by a flash.
const PageLoader = () => {
  const { pathname } = useLocation();
  const isResourcesRoute = pathname.toLowerCase() === '/2rp';

  useEffect(() => {
    if (!import.meta.env.DEV || !isResourcesRoute) return;

    const start = performance.now();
    console.info('[2RP:route] lazy route fallback mounted');
    return () => {
      console.info(`[2RP:route] lazy route fallback unmounted after ${Math.round(performance.now() - start)}ms`);
    };
  }, [isResourcesRoute]);

  if (isResourcesRoute) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-[1400px] items-center px-6">
          <div className="space-y-5">
            <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-16 w-[min(72vw,620px)] animate-pulse rounded bg-white/10" />
            <div className="h-4 w-[min(56vw,420px)] animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return <div className="min-h-[60vh]" />;
};

function App() {
  useEffect(() => {
    // One-shot config sanity check. In production a `.supabase.co` serving
    // origin means bundle posts fall through to the srcdoc workaround —
    // correct but slower. Warn so it's visible in the console.
    if (import.meta.env.PROD) {
      const origin = import.meta.env.VITE_BUNDLE_SERVING_ORIGIN as string | undefined;
      if (origin && /\.supabase\.co$/.test(new URL(origin).hostname)) {
        console.warn(
          '[bundle] VITE_BUNDLE_SERVING_ORIGIN is on the default Supabase host in production — bundles will use the srcdoc workaround. Set a custom-domain host to get direct iframe serving.'
        );
      }
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ownership" element={<OwnershipPage />} />
              <Route path="/2nd-renaissance" element={<SecondRenaissance />} />
              <Route path="/1m" element={<WrappedPage />} />
              <Route path="/2RP" element={<Resources />} />
              <Route path="/2rp" element={<Resources />} />
              <Route path="/art-agents" element={<ArtAgents />} />
              <Route path="/art-agents/:slug" element={<AgentNodeDetail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/get-approved" element={<GetApproved />} />
              <Route path="/art/:slug" element={<ArtDetail />} />
              <Route path="/posts/id/:id" element={<PostDetail />} />
              <Route path="/posts/:slug" element={<PostDetail />} />
              <Route path="/resources/:slug" element={<ResourceDetail />} />
              <Route path="/:username/art/:slug" element={<ArtDetail />} />
              <Route path="/:username/posts/:slug" element={<PostDetail />} />
              <Route path="/:username/resources/:slug" element={<ResourceDetail />} />
              <Route path="/:username/art" element={<UserProfile />} />
              <Route path="/:username/posts" element={<UserProfile />} />
              <Route path="/:username/resources" element={<UserProfile />} />
              <Route path="/:username" element={<UserProfile />} />
              <Route path="/submit/art" element={<SubmitArt />} />
              <Route path="/submit/post" element={<SubmitPost />} />
              <Route path="/submit/post/:postId" element={<SubmitPost />} />
              <Route path="/submit/resource" element={<SubmitResource />} />
              <Route path="/submit/art-agent" element={<SubmitAgentNode />} />
              <Route path="/admin/bundles" element={<AdminBundles />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <UserSwitcher />
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;
