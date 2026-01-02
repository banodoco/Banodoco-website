import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@/components/ui/icons';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl md:text-8xl font-normal tracking-tight text-gray-900 mb-4">
        404
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 mb-8">
        This page doesn't exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        <ArrowLeftIcon />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;


