import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';
import { DEPARTMENTS } from '../constants';

interface Props {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { showModal } = useModal();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasVisited, setHasVisited] = useState(true);

  useEffect(() => {
    const visited = localStorage.getItem('nobre_agenda_visited');
    if (!visited) {
      setHasVisited(false);
      localStorage.setItem('nobre_agenda_visited', 'true');
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      showModal({
        title: 'Erro de Login',
        message: translateError(err.message),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              name: name,
              department: department
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          showModal({
            title: 'Seja bem-vindo(a)! 🎉',
            message: 'Você já pode usar a plataforma para agendar os ambientes para suas aulas.',
            type: 'success',
            confirmText: 'Começar Agora'
          });
        }
      } else {
        // Sign In
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
      }
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-background-dark">
      {/* Left Side - Image & Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/school-header.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        <div className="relative z-10 flex flex-col justify-center px-12 text-white h-full w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 scale-150 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,transparent_70%)] blur-lg"></div>
              <img src="/custom-logo.png" alt="Logo" className="relative w-16 h-16 object-contain" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Nobre Agenda</h1>
          </div>
          <p className="text-xl text-slate-200 leading-relaxed font-light">
            Simplifique o agendamento de espaços escolares.
            <br />
            Reserve laboratórios, auditórios e salas de forma rápida e organizada.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/pwa-icon.png" alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <div className="mt-8 text-center">
              <p className="text-[10px] text-slate-400">
                NobreAgenda 3.1 • Desenvolvido por: <a href="https://instagram.com/h_alves" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">@h_alves</a>
              </p>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nobre Agenda</h2>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#FA8112] to-[#249E94] bg-clip-text text-transparent">
              {isRegistering ? 'Criar Conta' : 'Bem-vindo(a)'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              {isRegistering
                ? 'Preencha seus dados para começar gratuitamente.'
                : 'Entre com suas credenciais para acessar o painel.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-100 dark:border-red-900/50">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nome Completo</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white shadow-sm"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Área</label>
                  <select
                    value={department} onChange={(e) => setDepartment(e.target.value)}
                    required
                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white shadow-sm appearance-none"
                  >
                    <option value="" disabled>Selecione sua área...</option>
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">E-mail</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white shadow-sm"
                placeholder="nome@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Senha</label>
                {!isRegistering && (
                  <button type="button" onClick={() => navigate('/forgot-password')} className="text-primary text-xs font-bold hover:underline">
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-base"
            >
              {loading ? <div className="size-5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                <span className="bg-background-light dark:bg-background-dark/0 px-4 text-slate-400">Ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-slate-700 dark:text-white shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-primary font-bold hover:underline ml-1"
            >
              {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
