
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, SpaceCategory } from '../types';
import { SPACES } from '../constants';
import { supabase } from '../lib/supabase';

interface Props {
  user: User;
}

const HomePage: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [spacesStatus, setSpacesStatus] = useState<Record<string, { is_unavailable: boolean; reason: string }>>({});

  useEffect(() => {
    fetchFavorites();
    fetchSpacesStatus();

    // Check for filter param
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'favorites') {
      setShowFavoritesOnly(true);
    } else {
      setShowFavoritesOnly(false);
    }
  }, [location.search]);

  const fetchFavorites = async () => {
    if (!user.id) return;
    const { data } = await supabase
      .from('favorites')
      .select('space_id')
      .eq('user_id', user.id);

    if (data) {
      setFavorites(data.map((f: any) => f.space_id));
    }
  };

  const fetchSpacesStatus = async () => {
    const { data } = await supabase.from('space_maintenance').select('*');
    if (data) {
      const map: any = {};
      data.forEach((item: any) => {
        if (item.is_unavailable) {
          map[item.space_id] = { is_unavailable: item.is_unavailable, reason: item.reason };
        }
      });
      setSpacesStatus(map);
    }
  };

  const toggleFavorite = async (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.id) return;

    if (favorites.includes(spaceId)) {
      // Remove
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('space_id', spaceId);

      if (!error) {
        setFavorites(prev => prev.filter(id => id !== spaceId));
      }
    } else {
      // Add
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, space_id: spaceId });

      if (!error) {
        setFavorites(prev => [...prev, spaceId]);
      }
    }
  };

  const filteredSpaces = SPACES.filter(space => {
    const matchesSearch = space.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || space.category === activeCategory;
    const matchesFavorite = showFavoritesOnly ? favorites.includes(space.id) : true;
    return matchesSearch && matchesCategory && matchesFavorite;
  });

  const natureSpaces = filteredSpaces.filter(s => s.category === SpaceCategory.NATURE);
  const labSpaces = filteredSpaces.filter(s => s.category === SpaceCategory.LAB);
  const ambientSpaces = filteredSpaces.filter(s => s.category === SpaceCategory.AMBIENTS);

  const renderFavoriteButton = (spaceId: string, isAbsolute: boolean = true) => (
    <button
      onClick={(e) => toggleFavorite(spaceId, e)}
      className={`size-8 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${isAbsolute ? 'absolute top-2 right-2 z-20' : ''}`}
    >
      <span className={`material-symbols-outlined text-sm ${favorites.includes(spaceId) ? 'text-red-500 font-filled' : 'text-slate-600 dark:text-white'}`}>
        {favorites.includes(spaceId) ? 'favorite' : 'favorite'}
      </span>
      <style>{`
            .font-filled { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        `}</style>
    </button>
  );

  const renderMaintenanceOverlay = (spaceId: string) => {
    const status = spacesStatus[spaceId];
    if (status && status.is_unavailable) {
      return (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-20 flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm cursor-not-allowed">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">block</span>
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">Indisponível</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{status.reason}</p>
        </div>
      );
    }
    return null;
  };

  const handleSpaceClick = (spaceId: string) => {
    if (spacesStatus[spaceId]?.is_unavailable) return;
    navigate(`/booking/${spaceId}`);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Seleção de Espaço</h2>
        </div>
        <div className="flex gap-2">
          {(user.role === 'Administrador' || user.role === 'Núcleo Gestor' || user.role === 'Coordenador' || user.role === 'Coordenador(a)' || user.role === 'Regente') && (
            <button
              onClick={() => navigate('/admin')}
              className="flex size-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 hover:opacity-80 transition-opacity"
              title={user.role === 'Administrador' ? 'Painel Administrativo' : 'Painel Gestor'}
            >
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            </button>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="flex size-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-primary">account_circle</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-6">
        <div className="w-full mb-6 relative h-40 rounded-2xl overflow-hidden shadow-md">
          <img src="/school-header.jpg" alt="Escola" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
            <h3 className="text-white text-xl font-bold leading-tight">
              Olá, {user.name.split(' ')[0]}.
            </h3>
            <p className="text-white/80 text-sm font-medium">Onde será sua próxima aula?</p>
          </div>
        </div>

        <div className="relative h-12 mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar laboratório ou auditório"
            className="w-full h-full pl-12 pr-4 rounded-xl border-none bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-primary dark:text-white"
          />
        </div>

        {/* Filter Scroll Container - Minimalist with Arrows */}
        <div className="relative group">
          <button
            onClick={() => {
              const container = document.getElementById('filter-scroll-container');
              if (container) container.scrollBy({ left: -150, behavior: 'smooth' });
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-primary opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>

          <div
            id="filter-scroll-container"
            className="flex gap-3 overflow-x-auto pb-4 pt-2 -mx-4 px-12 items-center"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Hide Scrollbar for Chrome/Safari/Edge */}
            <style>{`
                    #filter-scroll-container::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>

            {['Todos', SpaceCategory.LAB, SpaceCategory.NATURE, SpaceCategory.AMBIENTS].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex h-10 shrink-0 whitespace-nowrap items-center justify-center px-6 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-2 ring-primary/20 ring-offset-2 dark:ring-offset-slate-900'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const container = document.getElementById('filter-scroll-container');
              if (container) container.scrollBy({ left: 150, behavior: 'smooth' });
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>

        {natureSpaces.length > 0 && (
          <section className="mb-8">
            <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">science</span> Natureza
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {natureSpaces.map(space => (
                <div
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 transition-all relative ${spacesStatus[space.id]?.is_unavailable ? 'opacity-80' : 'hover:shadow-md active:scale-[0.98] cursor-pointer'}`}
                >
                  {renderMaintenanceOverlay(space.id)}

                  <div className="h-24 w-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                    <span className={`material-symbols-outlined text-4xl text-${space.color}-500`}>{space.icon}</span>
                    {renderFavoriteButton(space.id)}
                  </div>
                  <div className="p-3">
                    <h5 className="text-slate-900 dark:text-white font-bold text-sm truncate">{space.name}</h5>
                    <div className="absolute top-2 left-2 z-10">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${space.status === 'Livre' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {space.status}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1">Capacidade: {space.capacity}</p>
                    <div className={`mt-3 text-[10px] font-bold flex items-center gap-1 ${spacesStatus[space.id]?.is_unavailable ? 'text-gray-400' : 'text-primary'}`}>
                      {spacesStatus[space.id]?.is_unavailable ? 'Indisponível' : 'Reservar'}
                      {!spacesStatus[space.id]?.is_unavailable && <span className="material-symbols-outlined text-[12px]">arrow_forward</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {labSpaces.length > 0 && (
          <section className="mb-8">
            <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">devices</span> Laboratórios
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {labSpaces.map(space => (
                <div
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  className={`flex items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors relative group overflow-hidden ${spacesStatus[space.id]?.is_unavailable ? 'opacity-80' : 'active:bg-slate-50 cursor-pointer'}`}
                >
                  {renderMaintenanceOverlay(space.id)}

                  <div className="size-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 shrink-0">
                    <span className="material-symbols-outlined">{space.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h4 className="text-slate-900 dark:text-white font-bold text-base truncate">{space.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Capacidade: {space.capacity}
                    </p>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div onClick={e => e.stopPropagation()} className={`opacity-0 group-hover:opacity-100 transition-opacity ${spacesStatus[space.id]?.is_unavailable ? 'hidden' : ''}`}>
                      {renderFavoriteButton(space.id, false)}
                    </div>
                    {!spacesStatus[space.id]?.is_unavailable && <span className="material-symbols-outlined text-slate-400">chevron_right</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {ambientSpaces.length > 0 && (
          <section className="mb-8">
            <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">meeting_room</span> Ambientes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ambientSpaces.map(space => (
                <div
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  className={`relative h-32 rounded-xl overflow-hidden shadow-sm group ${spacesStatus[space.id]?.is_unavailable ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                >
                  <div className={`absolute inset-0 bg-black/30 transition-colors z-10 ${!spacesStatus[space.id]?.is_unavailable && 'group-hover:bg-black/40'}`} />
                  <img src={space.image} alt={space.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-15" />

                  {renderMaintenanceOverlay(space.id)}
                  {(!spacesStatus[space.id]?.is_unavailable) && renderFavoriteButton(space.id)}

                  <div className="absolute bottom-0 left-0 p-4 z-20 w-full flex justify-between items-end">
                    <div>
                      <h4 className="text-white font-bold text-xl">{space.name}</h4>
                      <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{space.icon}</span>
                        {space.capacity} Lugares
                      </p>
                    </div>
                    {!spacesStatus[space.id]?.is_unavailable && (
                      <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                        Reservar
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default HomePage;
