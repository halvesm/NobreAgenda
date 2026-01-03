import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { SPACES } from '../constants';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'spaces' | 'bookings'>('users');
    const [spacesStatus, setSpacesStatus] = useState<Record<string, { is_unavailable: boolean; reason: string }>>({});
    const [allBookings, setAllBookings] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'spaces') fetchSpacesStatus();
        if (activeTab === 'bookings') fetchAllBookings();
    }, [activeTab]);

    const fetchAllBookings = async () => {
        setLoading(true);
        // Fetch bookings joining with profiles to get the user name
        const { data, error } = await supabase
            .from('bookings')
            .select('*, profiles(name)')
            .order('date', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching bookings:', error);
            // alert('Erro ao carregar agendamentos: ' + error.message); // Optional: don't span user yet, just log
        }

        if (data) {
            setAllBookings(data);
        }
        setLoading(false);
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
        const { data } = await supabase.from('space_maintenance').select('*');
        if (data) {
            const map: any = {};
            data.forEach((item: any) => {
                map[item.space_id] = { is_unavailable: item.is_unavailable, reason: item.reason };
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
                    department: editingUser.department
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
            setEditingUser(null);
            alert('Usuário atualizado com sucesso!');
        } catch (error: any) {
            alert('Erro ao atualizar usuário: ' + error.message);
        }
    };

    const toggleSpaceStatus = async (spaceId: string, currentStatus: boolean, currentReason: string) => {
        try {
            let newStatus = !currentStatus;
            let newReason = currentReason;

            if (newStatus) {
                const reason = prompt("Qual o motivo da indisponibilidade? (Ex: Limpeza, Manutenção)", "Manutenção");
                if (reason === null) return; // Cancelled
                newReason = reason;
            } else {
                newReason = '';
            }

            const { error } = await supabase
                .from('space_maintenance')
                .upsert({
                    space_id: spaceId,
                    is_unavailable: newStatus,
                    reason: newReason,
                    updated_at: new Date()
                }, { onConflict: 'space_id' });

            if (error) throw error;

            await fetchSpacesStatus();
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
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
                <h2 className="text-slate-900 dark:text-white text-lg font-bold flex-1 text-center pr-10">Painel Admin</h2>
            </header>

            <div className="flex p-4 gap-2">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Usuários
                </button>
                <button
                    onClick={() => setActiveTab('spaces')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'spaces' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Ambientes
                </button>
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'bookings' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
                >
                    Agendamentos
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
                        {SPACES.map(space => {
                            const status = spacesStatus[space.id] || { is_unavailable: false, reason: '' };
                            return (
                                <div key={space.id} className={`p-4 rounded-xl border flex items-center justify-between ${status.is_unavailable ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-lg flex items-center justify-center ${status.is_unavailable ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            <span className="material-symbols-outlined">{space.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{space.name}</h3>
                                            {status.is_unavailable ? (
                                                <p className="text-red-600 text-xs font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">block</span>
                                                    Fechado: {status.reason}
                                                </p>
                                            ) : (
                                                <p className="text-green-600 text-xs font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Disponível
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!status.is_unavailable}
                                                onChange={() => toggleSpaceStatus(space.id, status.is_unavailable, status.reason)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-red-500 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4 pb-10">
                        {/* Bookings Management Tab */}
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {/* Simple Filter for Date could be added here, currently defaulting to all/limit 50 or recent */}
                            <p className="text-sm text-gray-500">Exibindo os agendamentos mais recentes.</p>
                        </div>

                        {allBookings.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">Nenhum agendamento encontrado.</div>
                        ) : (
                            <div className="space-y-3">
                                {allBookings.map((booking: any) => {
                                    const space = SPACES.find(s => s.id === booking.space_id);
                                    const dateObj = new Date(booking.date + 'T12:00:00'); // Force simple date

                                    return (
                                        <div key={booking.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                                {/* Icon & Main Info */}
                                                <div className="flex gap-3 flex-1 min-w-0">
                                                    <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">{space?.icon || 'event'}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-1 w-full">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate pr-2">
                                                            {space?.name || booking.space_name}
                                                        </h3>

                                                        {/* Details Grid */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">calendar_today</span>
                                                                {dateObj.toLocaleDateString('pt-BR')}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                                                <span className="truncate">
                                                                    {[...booking.lessons].sort((a: number, b: number) => a - b).map((l: number) => `${l + 1}ª`).join(', ')} Aula(s)
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

                                                {/* Actions */}
                                                <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pl-13 sm:pl-0">
                                                    <button
                                                        onClick={() => navigate(`/booking/${booking.space_id}?editId=${booking.id}`)}
                                                        className="flex-1 sm:flex-none px-3 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                                                                const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                                                                if (!error) fetchAllBookings();
                                                                else alert('Erro ao cancelar: ' + error.message);
                                                            }
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
                                    <option value="Coordenador(a)">Coordenador(a)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Departamento</label>
                                <select
                                    value={editingUser.department}
                                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                >
                                    {[
                                        'Linguagens', 'Matemática', 'Natureza', 'Humanas',
                                        'Administração', 'Contabilidade', 'Enfermagem', 'Informática'
                                    ].map(d => <option key={d} value={d}>{d}</option>)}
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
        </div>
    );
};

export default AdminDashboard;
