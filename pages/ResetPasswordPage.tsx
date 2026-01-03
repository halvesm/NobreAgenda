import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if we have a session (Supabase handles the recovery link automatically)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, it might be an invalid or expired link
                // But the redirect usually already sets the session
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-6 items-center justify-center text-center">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Senha Alterada!</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        Sua senha foi atualizada com sucesso. Você será redirecionado para a tela de login em instantes.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-primary text-white font-bold h-12 rounded-lg shadow-md transition-all active:scale-[0.98]"
                    >
                        Ir para Login Agora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-4">
            <div className="relative w-full mb-6">
                <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-lg min-h-[160px] shadow-sm relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050853064-85a19f03405c?q=80&w=800')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="relative z-10 p-4 flex items-center gap-3">
                        <img src="/school-logo.png" alt="Nobre Agenda" className="w-10 h-10 object-contain drop-shadow-lg" />
                        <h2 className="text-white font-bold text-xl">Nobre Agenda</h2>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto w-full">
                <div className="text-center mb-8">
                    <h1 className="text-[#0d141b] dark:text-white text-[28px] font-bold leading-tight">Nova Senha</h1>
                    <p className="text-[#4c739a] dark:text-gray-400 text-sm mt-1 px-6">Escolha uma nova senha segura para sua conta.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[#0d141b] dark:text-gray-200 text-sm font-medium mb-1 block">Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pr-12 focus:ring-2 focus:ring-primary outline-none dark:text-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c739a]"
                            >
                                <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[#0d141b] dark:text-gray-200 text-sm font-medium mb-1 block">Confirmar Nova Senha</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-12 rounded-lg border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-12 rounded-lg shadow-md transition-all active:scale-[0.98] mt-6 disabled:opacity-70 flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="size-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                        ) : (
                            'Salvar Nova Senha'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
