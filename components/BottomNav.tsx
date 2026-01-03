
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-2 z-50">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${isActive('/') ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[28px]">home</span>
          <span className="text-[10px] font-medium">Início</span>
        </button>
        <button
          onClick={() => navigate('/my-appointments')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${isActive('/my-appointments') ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[28px]">calendar_month</span>
          <span className="text-[10px] font-medium">Agenda</span>
        </button>
        <button
          onClick={() => navigate('/?filter=favorites')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${location.search.includes('favorites') ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[28px]">favorite</span>
          <span className="text-[10px] font-medium">Favoritos</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${isActive('/profile') ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[28px]">person</span>
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
