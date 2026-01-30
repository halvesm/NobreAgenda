import React, { useState, useEffect } from 'react';
import { useNavigate, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BookingDetails from './pages/BookingDetails';
import MyAppointments from './pages/MyAppointments';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { User } from './types';
import { supabase } from './lib/supabase';
import { AreaSelectionModal } from './components/AreaSelectionModal';

import Layout from './components/Layout';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Carregar sessão ao iniciar
  useEffect(() => {
    // Aplicar tema inicial (do localStorage ou preferência do sistema)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
        setLoading(false);
        return;
      }

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
        // Ao deslogar, mantemos o tema que está no localStorage
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      // Usamos maybeSingle() em vez de single() para não disparar erro caso não exista
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profile = data as User;
        setUser(profile);

        // Aplicar tema do perfil se existir
        if (profile.theme) {
          if (profile.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          localStorage.setItem('theme', profile.theme);
        }
      } else {
        // Perfil não encontrado, tentar recriar a partir dos metadados da autenticação
        // Isso resolve o problema de usuários que foram apagados mas a conta de auth permaneceu
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const newProfile = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Usuário',
            role: 'Professor(a)', // Role padrão
            department: authUser.user_metadata?.department || 'PENDING_SELECTION', // Marcar para seleção
            avatar: authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${authUser.user_metadata?.full_name || 'U'}`,
            theme: 'light',
            assigned_space_ids: []
          };

          const { data: createdData, error: insertError } = await supabase
            .from('profiles')
            .upsert([newProfile])
            .select()
            .single();

          if (insertError) throw insertError;

          if (createdData) {
            setUser(createdData as User);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // O tema permanece o que estava, pois é salvo no localStorage
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Se não estiver logado, mostra rotas publicas sem Layout (ou com layout diferente se necessário)
  // Mas para simplicidade, vamos envolver tudo no Layout e ele decide o que mostrar (Sidebar/Nav) ou escondê-los se for login
  // Melhor: Layout só nas rotas autenticadas.

  return (
    <>
      {user && (
        <AreaSelectionModal
          user={user}
          onUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}
      <Routes>
        {/* Public Routes - No Layout needed usually, or minimal layout */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={() => { }} />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Routes - Wrapped in Layout for Sidebar/BottomNav */}
        <Route path="/" element={!user ? <Navigate to="/login" /> : <Layout><HomePage user={user} /></Layout>} />
        <Route path="/admin" element={(user?.role === 'Administrador' || user?.role === 'Núcleo Gestor' || user?.role === 'Coordenador' || user?.role === 'Coordenador(a)' || user?.role === 'Regente') ? <Layout><AdminDashboard /></Layout> : <Navigate to="/" />} />
        <Route path="/booking/:id" element={!user ? <Navigate to="/login" /> : <Layout><BookingDetails /></Layout>} />
        <Route path="/my-appointments" element={!user ? <Navigate to="/login" /> : <Layout><MyAppointments /></Layout>} />
        <Route path="/profile" element={!user ? <Navigate to="/login" /> : <Layout><ProfilePage user={user} onLogout={handleLogout} onProfileUpdate={() => user && fetchProfile(user.id)} /></Layout>} />
      </Routes>
    </>
  );
};

import { ModalProvider } from './context/ModalContext';

const App: React.FC = () => {
  return (
    <HashRouter>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </HashRouter>
  );
};

export default App;
