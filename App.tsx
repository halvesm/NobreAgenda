import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BookingDetails from './pages/BookingDetails';
import MyAppointments from './pages/MyAppointments';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { User } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
        // Ao deslogar, mantemos o tema que está no localStorage
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  return (
    <HashRouter>
      <div className="max-w-md mx-auto min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-x-hidden">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={() => { }} />} />
          <Route path="/" element={!user ? <Navigate to="/login" /> : <HomePage user={user} />} />
          <Route path="/admin" element={user?.role === 'Administrador' ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/booking/:id" element={!user ? <Navigate to="/login" /> : <BookingDetails />} />
          <Route path="/my-appointments" element={!user ? <Navigate to="/login" /> : <MyAppointments />} />
          <Route path="/profile" element={!user ? <Navigate to="/login" /> : <ProfilePage user={user} onLogout={handleLogout} onProfileUpdate={() => user && fetchProfile(user.id)} />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
