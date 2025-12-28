import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import Home from '@/pages/Home';

// Lazy load non-critical pages
const OwnershipPage = lazy(() => import('@/pages/OwnershipPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-pulse text-gray-400">Loading...</div>
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
