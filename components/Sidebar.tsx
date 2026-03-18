import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = React.useState(0);

    const isActive = (path: string) => location.pathname === path;

    React.useEffect(() => {
        fetchUnreadCount();

        // Subscribe to changes
        const channel = supabase
            .channel('notifications-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUnreadCount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (!error && count !== null) {
            setUnreadCount(count);
        }
    };
    const isFavorites = location.search.includes('favorites');

    const menuItems = [
        { path: '/', label: 'Início', icon: 'home' },
        { path: '/my-appointments', label: 'Minhas Agendas', icon: 'calendar_month' },
        { path: '/?filter=favorites', label: 'Favoritos', icon: 'favorite', check: isFavorites },
        { path: '/profile', label: 'Perfil', icon: 'person' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
            <div className="p-6 flex items-center gap-3">
                <img src="/custom-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#FA8112] to-[#249E94] bg-clip-text text-transparent">
                    NobreAgenda
                </h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const active = item.check !== undefined ? item.check : isActive(item.path);
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${active ? 'font-filled' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium text-sm">{item.label}</span>
                            {item.icon === 'person' && unreadCount > 0 && (
                                <span className="ml-auto flex size-5 items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        NobreAgenda 1.5.3<br />
                        <span className="opacity-70 mt-1 block">Desenvolvido por: <a href="https://instagram.com/h_alves" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">@h_alves</a></span>
                    </p>
                </div>
            </div>

            <style>{`
                .font-filled { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
            `}</style>
        </aside>
    );
};

export default Sidebar;
