import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import Home from '@/pages/Home';

// Lazy load non-critical pages
const OwnershipPage = lazy(() => import('@/pages/OwnershipPage'));
const SecondRenaissance = lazy(() => import('@/pages/SecondRenaissance'));
const WrappedPage = lazy(() => import('@/pages/Wrapped'));
const Resources = lazy(() => import('@/pages/Resources'));
const ArtPicksIndex = lazy(() => import('@/pages/Resources/ArtPicks/ArtPicksIndex'));
const ArtPicksDetail = lazy(() => import('@/pages/Resources/ArtPicks/ArtPicksDetail'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Minimal loading fallback — keeps layout stable while lazy chunks load.
// Intentionally blank so page-specific skeletons (e.g. ResourceGrid) aren't preceded by a flash.
const PageLoader = () => (
  <div className="min-h-[60vh]" />
);

function App() {
  return (
    <Router>
      <MainLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ownership" element={<OwnershipPage />} />
            <Route path="/2nd-renaissance" element={<SecondRenaissance />} />
            <Route path="/1m" element={<WrappedPage />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/art-picks" element={<ArtPicksIndex />} />
            <Route path="/resources/art-picks/:weekId" element={<ArtPicksDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
}

export default App;
