import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';
import { User } from '../types';
import { SPACES, LESSONS, DEPARTMENTS } from '../constants';

const AdminDashboard: React.FC = () => {
    const { showModal } = useModal();
    const navigate = useNavigate();
    const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const typedProfile = profile as User;
                    setCurrentUserProfile(typedProfile);
                    setCurrentUserRole(typedProfile.role);

                    const isAuthorized = typedProfile.role === 'Administrador' ||
                        typedProfile.role === 'Núcleo Gestor' ||
                        typedProfile.role === 'Coordenador' ||
                        typedProfile.role === 'Coordenador(a)' ||
                        typedProfile.role === 'Regente' ||
                        typedProfile.role === 'PCA';

                    if (!isAuthorized) {
                        navigate('/');
                    }

                    // Se for Administrador (legacy) ou SuperAdministrador, mantém 'bookings' ou 'users'
                    // Se for Regente, o padrão é 'bookings' e não pode ver 'users'
                    if (typedProfile.role === 'Regente' || typedProfile.role === 'PCA') {
                        setActiveTab('bookings');
                    } else if (profile.role !== 'Administrador' && profile.role !== 'Núcleo Gestor' && profile.role !== 'Coordenador(a)') {
                        setActiveTab('bookings');
                    }
                }
            }
        };
        checkAuth();
    }, [navigate]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'spaces' | 'bookings' | 'today' | 'notifications'>('bookings');
    const [spacesStatus, setSpacesStatus] = useState<Record<string, { is_unavailable: boolean; reason: string; unavailable_from?: string | null; unavailable_lessons?: number[] | null }>>({});
    const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
    const [editingReason, setEditingReason] = useState('');
    const [editingFrom, setEditingFrom] = useState('');
    const [editingLessons, setEditingLessons] = useState<number[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        // Restricted access for Núcleo Gestor
        const userRole = localStorage.getItem('user_role'); // We'll need to ensure this is set or passed

        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'spaces') fetchSpacesStatus();
        if (activeTab === 'bookings' || activeTab === 'today') fetchAllBookings();
        if (activeTab === 'notifications') fetchNotifications();
    }, [activeTab]);

    const fetchAllBookings = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profile) return;

        let query = supabase
            .from('bookings')
            .select('*, profiles(name)')
            .order('date', { ascending: false });

        // Se for Regente ou PCA, filtra apenas os agendamentos dos seus espaços
        if ((profile.role === 'Regente' || profile.role === 'PCA')) {
            const assignedIds = profile.assigned_space_ids || (profile.assigned_space_id ? [profile.assigned_space_id] : []);
            if (assignedIds.length > 0) {
                query = query.in('space_id', assignedIds);
            }
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Error fetching bookings:', error);
            // alert('Erro ao carregar agendamentos: ' + error.message); // Optional: don't span user yet, just log
        }

        if (data) {
            setAllBookings(data);
        }
        setLoading(false);
    };

    const fetchNotifications = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setNotifications(data);
            // Marcar como lidas ao visualizar a aba
            await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
        }
        setLoading(false);
    };

    const handleClearPastBookings = async () => {
        const today = new Date().toISOString().split('T')[0];
        const pastCount = allBookings.filter((b: any) => b.date < today).length;

        if (pastCount === 0) {
            showModal({ title: 'Sem histórico', message: 'Não há agendamentos de dias anteriores para apagar.', type: 'info' });
            return;
        }

        showModal({
            title: 'Limpar Histórico',
            message: `Isso apagará ${pastCount} agendamento(s) de dias anteriores. Essa ação não pode ser desfeita. Confirmar?`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (!profile) return;

                    let query = supabase
                        .from('bookings')
                        .delete()
                        .lt('date', today);

                    // Regente e PCA: apenas nos próprios espaços
                    if (profile.role === 'Regente' || profile.role === 'PCA') {
                        const assignedIds = profile.assigned_space_ids || (profile.assigned_space_id ? [profile.assigned_space_id] : []);
                        if (assignedIds.length > 0) {
                            query = query.in('space_id', assignedIds);
                        } else {
                            showModal({ title: 'Aviso', message: 'Nenhum ambiente atribuído.', type: 'info' });
                            return;
                        }
                    }

                    const { error } = await query;

                    if (error) throw error;

                    showModal({ title: 'Concluído', message: `${pastCount} agendamento(s) anterior(es) removido(s) com sucesso.`, type: 'success' });
                    await fetchAllBookings();
                } catch (error: any) {
                    showModal({ title: 'Erro', message: translateError(error.message), type: 'error' });
                }
            }
        });
    };

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');

        if (data) {
            setUsers(data as User[]);
        }
        setLoading(false);
    };

    const fetchSpacesStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profile) return;

        let query = supabase.from('space_maintenance').select('*');

        if ((profile.role === 'Regente' || profile.role === 'PCA')) {
            const assignedIds = profile.assigned_space_ids || (profile.assigned_space_id ? [profile.assigned_space_id] : []);
            if (assignedIds.length > 0) {
                query = query.in('space_id', assignedIds);
            }
        }

        const { data } = await query;
        if (data) {
            const map: any = {};
            data.forEach((item: any) => {
                if (item.is_unavailable) {
                    map[item.space_id] = {
                        is_unavailable: item.is_unavailable,
                        reason: item.reason,
                        unavailable_from: item.unavailable_from || null,
                        unavailable_lessons: item.unavailable_lessons || null
                    };
                }
            });
            setSpacesStatus(map);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser || !editingUser.id) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: editingUser.name,
                    role: editingUser.role,
                    department: editingUser.department,
                    assigned_space_id: editingUser.assigned_space_id,
                    assigned_space_ids: editingUser.assigned_space_ids || []
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
            setEditingUser(null);
            showModal({
                title: 'Sucesso',
                message: 'Usuário atualizado com sucesso!',
                type: 'success'
            });
        } catch (error: any) {
            showModal({
                title: 'Erro',
                message: translateError(error.message),
                type: 'error'
            });
        }
    };

    const openUnavailableForm = (spaceId: string, status: { is_unavailable: boolean; reason: string; unavailable_from?: string | null; unavailable_lessons?: number[] | null }) => {
        setEditingSpaceId(spaceId);
        setEditingReason(status.reason || '');
        setEditingFrom(status.unavailable_from || '');
        setEditingLessons(status.unavailable_lessons || []);
    };

    const cancelUnavailableForm = () => {
        setEditingSpaceId(null);
        setEditingReason('');
        setEditingFrom('');
        setEditingLessons([]);
    };

    const handleDisableSpace = async (spaceId: string) => {
        await saveSpaceStatus(spaceId, false, '', null, null);
    };

    const handleSaveUnavailable = async () => {
        if (!editingSpaceId) return;
        if (!editingReason.trim()) {
            showModal({ title: 'Atenção', message: 'Por favor, informe o motivo da indisponibilidade.', type: 'info' });
            return;
        }

        await saveSpaceStatus(
            editingSpaceId,
            true,
            editingReason.trim(),
            editingFrom || null,
            editingLessons
        );
        cancelUnavailableForm();
    };

    const saveSpaceStatus = async (spaceId: string, isUnavailable: boolean, reason: string, unavailableFrom: string | null, unavailableLessons: number[] | null) => {
        try {
            const { error } = await supabase
                .from('space_maintenance')
                .upsert({
                    space_id: spaceId,
                    is_unavailable: isUnavailable,
                    reason: reason,
                    unavailable_from: unavailableFrom,
                    unavailable_lessons: (unavailableLessons && unavailableLessons.length > 0) ? unavailableLessons : null,
                    updated_at: new Date()
                }, { onConflict: 'space_id' });

            if (error) throw error;
            await fetchSpacesStatus();
        } catch (error: any) {
            showModal({
                title: 'Erro',
                message: `Erro ao salvar status: ${error.message}`,
                type: 'error'
            });
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
            <header className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="text-slate-900 dark:text-white flex size-10 items-center justify-center hover:bg-black/5 rounded-full">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-slate-900 dark:text-white text-lg font-bold flex-1 text-center pr-10">
                    {currentUserRole === 'Administrador' ? 'Painel Admin' : (currentUserRole === 'Regente' ? 'Painel Regente' : 'Núcleo Gestor')}
                </h2>
            </header>

            <div className="flex p-4 gap-2">
                {(currentUserRole === 'Administrador' || currentUserRole === 'Núcleo Gestor') && (
                    <>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                        >
                            Usuários
                        </button>
                    </>
                )}
                {(currentUserRole === 'Administrador' || currentUserRole === 'Regente' || currentUserRole === 'Núcleo Gestor' || currentUserRole === 'Coordenador(a)') && (
                    <button
                        onClick={() => setActiveTab('spaces')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'spaces' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                    >
                        Ambientes
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'bookings' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Histórico
                </button>
                <button
                    onClick={() => setActiveTab('today')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'today' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Hoje
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'notifications' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Avisos
                </button>
            </div>

            <main className="px-4">
                {activeTab === 'users' ? (
                    <>
                        <div className="relative mb-6">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary dark:text-white"
                            />
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-10"><div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                        ) : (
                            <div className="space-y-3">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="size-12 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">{user.name}</h3>
                                                <div className="flex flex-wrap gap-2 text-xs mt-1">
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                                                        {user.department}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full font-medium ${user.role === 'Administrador' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : activeTab === 'spaces' ? (
                    <div className="space-y-4 pb-10">
                        {SPACES.filter(space => {
                            if (currentUserRole === 'Regente' || currentUserRole === 'PCA') {
                                if (!currentUserProfile) return false;
                                const assignedIds = currentUserProfile.assigned_space_ids || (currentUserProfile.assigned_space_id ? [currentUserProfile.assigned_space_id] : []);
                                return assignedIds.includes(space.id);
                            }
                            return true;
                        }).map(space => {
                            const status = spacesStatus[space.id] || { is_unavailable: false, reason: '' };
                            const today = new Date().toISOString().split('T')[0];
                            const isWithinPeriod = status.is_unavailable && (
                                (!status.unavailable_from && !status.unavailable_to) ||
                                ((!status.unavailable_from || today >= status.unavailable_from) &&
                                    (!status.unavailable_to || today <= status.unavailable_to))
                            );
                            const isEditing = editingSpaceId === space.id;

                            const formatStaticDate = (d: string | null | undefined) => {
                                if (!d) return null;
                                // Add T12:00:00 to avoid timezone shift on plain date strings
                                return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit'
                                });
                            };

                            const formatDateTime = (d: string | null | undefined) => {
                                if (!d) return null;
                                const date = new Date(d);
                                return date.toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'America/Fortaleza'
                                });
                            };

                            return (
                                <div key={space.id} className={`rounded-xl border overflow-hidden transition-all ${isWithinPeriod ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700'
                                    }`}>
                                    {/* Main row */}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${isWithinPeriod ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                                }`}>
                                                <span className="material-symbols-outlined">{space.icon}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">{space.name}</h3>
                                                {isWithinPeriod ? (
                                                    <div>
                                                        <p className="text-red-600 text-xs font-bold flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">block</span>
                                                            {status.reason}
                                                        </p>
                                                        {(status.unavailable_from || status.unavailable_to) && (
                                                            <p className="text-red-500 text-[10px] mt-0.5">
                                                                {status.unavailable_from && status.unavailable_to
                                                                    ? `${formatStaticDate(status.unavailable_from)} até ${formatStaticDate(status.unavailable_to)}`
                                                                    : status.unavailable_to
                                                                        ? `Até ${formatStaticDate(status.unavailable_to)}`
                                                                        : `A partir de ${formatStaticDate(status.unavailable_from)}`
                                                                }
                                                            </p>
                                                        )}
                                                        {status.unavailable_lessons && (
                                                            <p className="text-red-400 text-[9px] mt-0.5 italic">
                                                                Aulas: {status.unavailable_lessons.map((i: number) => LESSONS[i]).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-green-600 text-xs font-bold flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        Disponível
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isWithinPeriod && !isEditing && (
                                                <button
                                                    onClick={() => openUnavailableForm(space.id, status)}
                                                    className="text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-semibold transition-colors"
                                                >
                                                    Editar
                                                </button>
                                            )}
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!isWithinPeriod}
                                                    onChange={() => {
                                                        if (isWithinPeriod) {
                                                            handleDisableSpace(space.id);
                                                            cancelUnavailableForm();
                                                        } else {
                                                            openUnavailableForm(space.id, { is_unavailable: false, reason: '' });
                                                        }
                                                    }}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-red-500 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Inline unavailability form */}
                                    {isEditing && (
                                        <div className="border-t border-dashed border-red-200 dark:border-red-800 p-4 bg-red-50/60 dark:bg-red-900/5 space-y-3">
                                            <p className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                                Definir período de indisponibilidade
                                            </p>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Motivo *</label>
                                                <input
                                                    type="text"
                                                    value={editingReason}
                                                    onChange={e => setEditingReason(e.target.value)}
                                                    placeholder="Ex: Manutenção, Limpeza..."
                                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-400 dark:text-white"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Data da Indisponibilidade</label>
                                                    <input
                                                        type="date"
                                                        value={editingFrom}
                                                        onChange={e => setEditingFrom(e.target.value)}
                                                        className="w-full h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-400 dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 mb-2">Bloquear Aulas Específicas (opcional)</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {LESSONS.map((name, idx) => {
                                                        const isSelected = editingLessons.includes(idx);
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    setEditingLessons(prev =>
                                                                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                                                    );
                                                                }}
                                                                className={`h-8 rounded-lg text-xs font-medium transition-all border ${isSelected
                                                                    ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300'
                                                                    }`}
                                                            >
                                                                {name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2 italic">
                                                    * Se nenhuma aula for selecionada, o ambiente será bloqueado o dia todo.
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-gray-400">Deixe as datas em branco para indisponibilidade sem prazo definido. Após a data de fim, o ambiente volta a ficar disponível automaticamente.</p>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={cancelUnavailableForm}
                                                    className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveUnavailable}
                                                    className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-colors"
                                                >
                                                    Confirmar Fechamento
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4 pb-10">
                        {/* Header row with summary and clear button */}
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-sm text-gray-500">
                                    {allBookings.filter((b: any) => b.date < new Date().toISOString().split('T')[0]).length > 0
                                        ? <span className="text-orange-500 font-medium">
                                            {allBookings.filter((b: any) => b.date < new Date().toISOString().split('T')[0]).length} agendamento(s) passado(s)
                                        </span>
                                        : <span>Nenhum histórico anterior</span>
                                    }
                                </p>
                            </div>
                            {(currentUserRole === 'Administrador' || currentUserRole === 'Regente' || currentUserRole === 'PCA' || currentUserRole === 'Núcleo Gestor') && (
                                <button
                                    onClick={handleClearPastBookings}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20 text-xs font-bold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                                    Limpar histórico
                                </button>
                            )}
                        </div>

                        {allBookings.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">Nenhum agendamento encontrado.</div>
                        ) : activeTab === 'today' ? (
                    <div className="space-y-4 pb-10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Agendamentos de Hoje ({new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })})
                            </h3>
                        </div>

                        {allBookings.filter((b: any) => {
                            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }); // YYYY-MM-DD
                            return b.date === today;
                        }).length === 0 ? (
                            <div className="text-center py-10 text-gray-500">Nenhum agendamento para hoje.</div>
                        ) : (
                            <div className="space-y-3">
                                {allBookings
                                    .filter((b: any) => {
                                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
                                        return b.date === today;
                                    })
                                    .map((booking: any) => {
                                        const space = SPACES.find(s => s.id === booking.space_id);
                                        return (
                                            <div key={booking.id} className="p-3 rounded-xl shadow-sm border bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700">
                                                <div className="flex gap-3 items-center">
                                                    <div className="size-10 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">{space?.icon || 'event'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                                                            {space?.name || booking.space_name}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                                {[...booking.lessons].sort((a: number, b: number) => a - b).map((l: number) => LESSONS[l] || `${l + 1}ª`).join(', ')}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">person</span>
                                                                {booking.profiles?.name} • {booking.year}º {booking.course}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'notifications' ? (
                    <div className="space-y-4 pb-10">
                        {loading ? (
                            <div className="flex justify-center p-10"><div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">Nenhum aviso recebido.</div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.map(notif => (
                                    <div key={notif.id} className={`p-4 rounded-xl border transition-all ${notif.read ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}>
                                        <div className="flex gap-3">
                                            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${notif.read ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                                                <span className="material-symbols-outlined text-lg">notifications</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{notif.title}</h3>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 leading-relaxed">{notif.message}</p>
                                                <p className="text-gray-400 text-[10px] mt-2">{new Date(notif.created_at).toLocaleString('pt-BR')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                            <div className="space-y-3">
                                {allBookings.map((booking: any) => {
                                    const space = SPACES.find(s => s.id === booking.space_id);
                                    const dateStr = booking.date;
                                    const today = new Date().toISOString().split('T')[0];
                                    const isPast = dateStr < today;

                                    return (
                                        <div key={booking.id} className={`p-3 rounded-xl shadow-sm border transition-colors ${isPast
                                            ? 'bg-gray-50 dark:bg-slate-900/60 border-gray-100 dark:border-gray-800 opacity-70'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700'
                                            }`}>
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                                <div className="flex gap-3 flex-1 min-w-0">
                                                    <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">{space?.icon || 'event'}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate pr-2">
                                                                {space?.name || booking.space_name}
                                                            </h3>
                                                            {isPast && (
                                                                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Passado</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">calendar_today</span>
                                                                {new Date(booking.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                                                <span className="truncate">
                                                                    {[...booking.lessons].sort((a: number, b: number) => a - b).map((l: number) => LESSONS[l] || `${l + 1}ª`).join(', ')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2 overflow-hidden">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">person</span>
                                                                <span className="truncate">
                                                                    <strong className="text-gray-700 dark:text-gray-300 font-semibold">{booking.profiles?.name || '---'}</strong>
                                                                    <span className="mx-1">•</span>
                                                                    {booking.year}º {booking.course}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pl-13 sm:pl-0">
                                                    <button
                                                        onClick={() => navigate(`/booking/${booking.space_id}?editId=${booking.id}`)}
                                                        className="flex-1 sm:flex-none px-3 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            showModal({
                                                                title: 'Confirmar Cancelamento',
                                                                message: 'Tem certeza que deseja cancelar este agendamento?',
                                                                type: 'confirm',
                                                                onConfirm: async () => {
                                                                    const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                                                                    if (!error) {
                                                                        fetchAllBookings();
                                                                        showModal({
                                                                            title: 'Cancelado',
                                                                            message: 'Agendamento cancelado com sucesso!',
                                                                            type: 'success'
                                                                        });
                                                                    } else {
                                                                        showModal({
                                                                            title: 'Erro',
                                                                            message: translateError(error.message),
                                                                            type: 'error'
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="flex-1 sm:flex-none px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Editar Usuário</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Role/Cargo</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                >
                                    <option value="Professor(a)">Professor(a)</option>
                                    <option value="Administrador">Administrador</option>
                                    <option value="Núcleo Gestor">Núcleo Gestor</option>
                                    <option value="Coordenador(a)">Coordenador(a)</option>
                                    <option value="Regente">Regente</option>
                                    <option value="PCA">PCA</option>
                                </select>
                            </div>
                            {(editingUser.role === 'Regente' || editingUser.role === 'PCA') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">
                                        {editingUser.role === 'Regente' ? 'Ambientes de Regência' : 'Ambientes de Responsabilidade (PCA)'}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800">
                                        {SPACES.map(s => (
                                            <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={(editingUser.assigned_space_ids || []).includes(s.id)}
                                                    onChange={(e) => {
                                                        const currentIds = editingUser.assigned_space_ids || [];
                                                        const newIds = e.target.checked
                                                            ? [...currentIds, s.id]
                                                            : currentIds.filter(id => id !== s.id);
                                                        setEditingUser({ ...editingUser, assigned_space_ids: newIds });
                                                    }}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{s.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Departamento</label>
                                <select
                                    value={editingUser.department}
                                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                >
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateUser}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 rounded-lg font-bold text-white transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;
