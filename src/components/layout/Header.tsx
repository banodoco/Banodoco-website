import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="px-8 md:px-16 py-4 bg-[#f5f5f3] border-b border-black/5">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/banodoco.png"
            alt="Banodoco"
            className="h-7 w-7"
            draggable={false}
          />
          <span className="text-2xl font-semibold tracking-tight text-gray-900">Banodoco</span>
        </Link>
      </div>
    </header>
  );
};
