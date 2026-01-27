
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-2 z-50">
      <div className="flex justify-around items-center h-16">
        {[
          { path: '/', label: 'Início', icon: 'home' },
          { path: '/my-appointments', label: 'Agenda', icon: 'calendar_month' },
          { path: '/?filter=favorites', label: 'Favoritos', icon: 'favorite' },
          { path: '/profile', label: 'Perfil', icon: 'person' }
        ].map((item) => {
          const active = item.path === '/' && location.search.includes('favorites')
            ? item.label === 'Favoritos'
            : isActive(item.path);

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full gap-1 transition-all duration-300 relative group
                ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'}
              `}
            >
              <div className={`
                p-1.5 rounded-2xl transition-all duration-300
                ${active ? 'bg-primary/10 dark:bg-primary/20 -translate-y-1' : 'bg-transparent'}
              `}>
                <span className={`material-symbols-outlined text-[24px] ${active ? 'font-filled' : ''}`}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[10px] font-bold transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-70 group-hover:opacity-100'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
