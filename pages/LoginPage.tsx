import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
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

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Password Reset Request
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/reset-password`,
        });

        if (resetError) throw resetError;
        setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } else if (isRegistering) {
        // Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile
          const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          const newUser: User = {
            name,
            email,
            role: 'Professor(a)',
            department,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=137fec&color=fff`,
            id: authData.user.id,
            theme: currentTheme
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                department: newUser.department,
                avatar: newUser.avatar,
                theme: newUser.theme
              }
            ]);

          if (profileError) throw profileError;

          // Auto login is handled by session listener in App.tsx
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
      setError(err.message || 'Ocorreu um erro.');
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
          {isForgotPassword ? 'Recuperar Senha' : (isRegistering ? 'Criar sua conta' : 'Bem-vindo de volta')}
        </h1>
        <p className="text-[#4c739a] dark:text-gray-400 text-sm mt-1 px-6">
          {isForgotPassword
            ? 'Enviaremos um link de redefinição para seu e-mail.'
            : (isRegistering ? 'Preencha os dados abaixo para começar.' : 'Acesse seu painel de agendamentos.')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span> {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-xs font-medium mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span> {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
        {isRegistering && !isForgotPassword && (
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

        {!isForgotPassword && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#0d141b] dark:text-gray-200 text-sm font-medium">Senha</label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
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
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-12 rounded-lg shadow-md transition-all active:scale-[0.98] mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="size-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
          ) : (
            isForgotPassword ? 'Enviar E-mail de Recuperação' : (isRegistering ? 'Criar Conta' : 'Entrar')
          )}
        </button>

        <div className="text-center mt-6">
          <p className="text-[#4c739a] dark:text-gray-400 text-sm">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }}
                className="text-primary font-bold hover:underline"
              >
                Voltar para o Login
              </button>
            ) : (
              <>
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMessage(''); }}
                  className="text-primary font-bold hover:underline ml-1"
                >
                  {isRegistering ? 'Faça Login' : 'Cadastre-se'}
                </button>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
