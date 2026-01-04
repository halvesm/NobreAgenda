import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { resetPasswordWithToken } from '../lib/authUtils';
import { translateError } from '../lib/i18n';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        const handleAuth = async () => {
            const hash = window.location.hash;
            const accessToken = hash.match(/access_token=([^&]*)/)?.[1];
            const refreshToken = hash.match(/refresh_token=([^&]*)/)?.[1];

            if (accessToken) {
                // If we have tokens in the URL, establish the session IMMEDIATELY
                try {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });
                    if (sessionError) throw sessionError;
                } catch (err: any) {
                    console.error('Session error:', err);
                    setError('O link de recuperação é inválido ou expirou.');
                }
            } else {
                // Short wait for SDK to parse hash if it's doing it automatically (standard behavior)
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('O link de recuperação é inválido ou expirou. Por favor, solicite uma nova redefinição.');
                    setTimeout(() => navigate('/login'), 5000);
                }
            }
            setVerifying(false);
        };

        handleAuth();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            // By now, we MUST have a session because of handleAuth above
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // If somehow the session is gone, try to reload the page or redirect
                throw new Error('Sessão de autorização ausente. Recarregue a página.');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-6 items-center justify-center text-center">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">verified</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Senha Alterada!</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                        Sua senha foi atualizada com sucesso. Você será redirecionado para a tela de login para acessar sua conta.
                    </p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full animate-[progress_3s_linear]"></div>
                    </div>
                    <style>{`
                        @keyframes progress {
                            from { width: 0%; }
                            to { width: 100%; }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-4">
            <div className="relative w-full mb-8">
                <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-2xl min-h-[180px] shadow-lg relative" style={{ backgroundImage: "url('/school-header.jpg')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="relative z-10 p-6 flex items-center gap-4">
                        <img src="/school-logo.png" alt="Logo" className="w-12 h-12 object-contain filter drop-shadow-lg" />
                        <div>
                            <h2 className="text-white font-bold text-2xl">Nobre Agenda</h2>
                            <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Segurança</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto w-full px-2">
                <div className="mb-8">
                    <h1 className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">Nova Senha</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Escolha uma senha forte para proteger sua conta.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-start gap-3 border border-red-100 dark:border-red-900/20">
                        <span className="material-symbols-outlined">error</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-gray-200 text-sm font-semibold ml-1">Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-14 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pr-12 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none dark:text-white transition-all shadow-sm"
                                placeholder="Pelo menos 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-gray-200 text-sm font-semibold ml-1">Confirmar Senha</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-14 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none dark:text-white transition-all shadow-sm"
                            placeholder="Repita a senha digitada"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-6 disabled:opacity-70 flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="size-6 rounded-full border-3 border-white/30 border-t-white animate-spin" />
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

