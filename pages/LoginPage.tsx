import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';

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
  const [department, setDepartment] = useState('Linguagens');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEPARTMENTS = [
    'Linguagens',
    'Matemática',
    'Natureza',
    'Humanas',
    'Administração',
    'Contabilidade',
    'Enfermagem',
    'Informática'
  ];

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
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Success modal (Trigger already created the profile)
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
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-4">
      <div className="relative w-full mb-6">
        <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-lg min-h-[180px] shadow-sm relative" style={{ backgroundImage: "url('/school-header.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="relative z-10 p-4 flex items-center gap-3">
            <img src="/school-logo.png" alt="Nobre Agenda" className="w-12 h-12 object-contain drop-shadow-lg" />
            <h2 className="text-white font-bold text-2xl">Nobre Agenda</h2>
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-[#0d141b] dark:text-white text-[28px] font-bold leading-tight">
          {isRegistering ? 'Criar sua conta' : 'Bem-vindo de volta'}
        </h1>
        <p className="text-[#4c739a] dark:text-gray-400 text-sm mt-1 px-6">
          {isRegistering ? 'Preencha os dados abaixo para começar.' : 'Acesse seu painel de agendamentos.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
        {isRegistering && (
          <>
            <div>
              <label className="block text-[#0d141b] dark:text-gray-200 text-sm font-medium mb-1">Nome Completo</label>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none dark:text-white"
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <label className="block text-[#0d141b] dark:text-gray-200 text-sm font-medium mb-1">Área de Atuação</label>
              <select
                value={department} onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none dark:text-white"
              >
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-[#0d141b] dark:text-gray-200 text-sm font-medium mb-1">E-mail</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none dark:text-white"
            placeholder="exemplo@escola.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[#0d141b] dark:text-gray-200 text-sm font-medium">Senha</label>
            {!isRegistering && (
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-primary text-xs font-bold hover:underline"
              >
                Esqueceu a senha?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pr-12 focus:ring-2 focus:ring-primary outline-none dark:text-white"
              placeholder="••••••••"
            />
            <button
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a]"
            >
              <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-12 rounded-lg shadow-md transition-all active:scale-[0.98] mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="size-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
          ) : (
            isRegistering ? 'Criar Conta' : 'Entrar'
          )}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background-light dark:bg-background-dark px-2 text-gray-500">Ou continue com</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all font-bold text-slate-700 dark:text-gray-200 shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Entrar com Google
        </button>

        <div className="text-center mt-6">
          <p className="text-[#4c739a] dark:text-gray-400 text-sm">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-primary font-bold hover:underline ml-1"
            >
              {isRegistering ? 'Faça Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
