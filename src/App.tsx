import { lazy, Suspense } from 'react';
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
const SubmitResource = lazy(() => import('@/pages/SubmitResource'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Minimal loading fallback — keeps layout stable while lazy chunks load.
// Intentionally blank so page-specific skeletons (e.g. ResourceGrid) aren't preceded by a flash.
const PageLoader = () => (
  <div className="min-h-[60vh]" />
);

function App() {
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
              <Route path="/resources" element={<Resources />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/art/:slug" element={<ArtDetail />} />
              <Route path="/resources/:slug" element={<ResourceDetail />} />
              <Route path="/:username/art/:slug" element={<ArtDetail />} />
              <Route path="/:username/resources/:slug" element={<ResourceDetail />} />
              <Route path="/:username/art" element={<UserProfile />} />
              <Route path="/:username/resources" element={<UserProfile />} />
              <Route path="/:username" element={<UserProfile />} />
              <Route path="/submit/art" element={<SubmitArt />} />
              <Route path="/submit/resource" element={<SubmitResource />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;
