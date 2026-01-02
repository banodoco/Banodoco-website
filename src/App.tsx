import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Skeleton } from '@/components/ui/Skeleton';
import Home from '@/pages/Home';

// Lazy load non-critical pages
const OwnershipPage = lazy(() => import('@/pages/OwnershipPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Loading fallback with skeleton
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-full max-w-md space-y-4 px-6">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <MainLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ownership" element={<OwnershipPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
}

export default App;
