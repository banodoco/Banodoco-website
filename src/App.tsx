import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { MainLayout } from '@/layouts/MainLayout';
import Home from '@/pages/Home';

// Lazy load non-critical pages
const OwnershipPage = lazy(() => import('@/pages/OwnershipPage'));
const SecondRenaissance = lazy(() => import('@/pages/SecondRenaissance'));
const WrappedPage = lazy(() => import('@/pages/Wrapped'));
const Resources = lazy(() => import('@/pages/Resources'));
const ArtDetail = lazy(() => import('@/pages/ArtDetail'));
const ResourceDetail = lazy(() => import('@/pages/ResourceDetail'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const SubmitArt = lazy(() => import('@/pages/SubmitArt'));
const SubmitPost = lazy(() => import('@/pages/SubmitPost'));
const SubmitResource = lazy(() => import('@/pages/SubmitResource'));
const PostDetail = lazy(() => import('@/pages/PostDetail'));
const AdminBundles = lazy(() => import('@/pages/admin/Bundles'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Minimal loading fallback — keeps layout stable while lazy chunks load.
// Intentionally blank so page-specific skeletons (e.g. ResourceGrid) aren't preceded by a flash.
const PageLoader = () => (
  <div className="min-h-[60vh]" />
);

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
              <Route path="/auth/callback" element={<AuthCallback />} />
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
              <Route path="/admin/bundles" element={<AdminBundles />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;
