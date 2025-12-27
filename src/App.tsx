import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import OwnershipPage from '@/pages/OwnershipPage';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ownership" element={<OwnershipPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
