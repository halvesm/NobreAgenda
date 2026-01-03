import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/reset-password`,
            });

            if (resetError) throw resetError;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao enviar o e-mail.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-4">
            <div className="relative w-full mb-8">
                <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-2xl min-h-[200px] shadow-lg relative" style={{ backgroundImage: "url('/school-header.jpg')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="relative z-10 p-6 flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
                            <img src="/school-logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-2xl tracking-tight">Nobre Agenda</h2>
                            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Recuperação de Acesso</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto w-full px-2">
                {!success ? (
                    <>
                        <div className="mb-8">
                            <h1 className="text-[#0d141b] dark:text-white text-3xl font-bold leading-tight">Esqueceu a senha?</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                Não se preocupe! Insira seu e-mail abaixo e enviaremos as instruções para você criar uma nova senha.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                                <span className="material-symbols-outlined text-xl">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-slate-700 dark:text-gray-200 text-sm font-semibold ml-1">E-mail Cadastrado</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <span className="material-symbols-outlined">mail</span>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none dark:text-white transition-all shadow-sm"
                                        placeholder="seu-email@escola.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <div className="size-6 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    <>
                                        <span>Enviar Instruções</span>
                                        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full h-12 text-slate-500 dark:text-slate-400 font-bold text-sm hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Voltar para o Login
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-50 dark:border-green-900/20 scale-110">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">mark_email_read</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">E-mail Enviado!</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed px-4">
                            Enviamos um link de recuperação para <strong>{email}</strong>.
                            Verifique sua caixa de entrada e spam.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => setSuccess(false)}
                                className="w-full h-12 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-[0.98] transition-all"
                            >
                                Tentar outro e-mail
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
