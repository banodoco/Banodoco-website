import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="px-8 md:px-16 pt-[max(env(safe-area-inset-top),16px)] pb-4 xl:py-4 bg-black/50 backdrop-blur-lg xl:bg-[#f5f5f3] xl:backdrop-blur-none border-b border-white/15 xl:border-black/5">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/banodoco.png"
            alt="Banodoco"
            className="h-7 w-7"
            draggable={false}
          />
          <span className="text-2xl font-semibold tracking-tight text-white xl:text-gray-900">Banodoco</span>
        </Link>
      </div>
    </header>
  );
};
