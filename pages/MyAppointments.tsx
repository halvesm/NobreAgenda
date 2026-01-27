import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking } from '../types';
import { SPACES } from '../constants';

import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';

const MyAppointments: React.FC = () => {
  const { showModal } = useModal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (data) {
        // Map DB result to Booking type and lookup space details
        const mappedBookings: Booking[] = data.map((b: any) => {
          const space = SPACES.find(s => s.id === b.space_id);
          return {
            ...b,
            spaceId: b.space_id,
            spaceName: space ? space.name : (b.space_name || 'Ambiente desconhecido'),
          };
        });
        setBookings(mappedBookings);
      }
      setLoading(false);
    };

    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    showModal({
      title: 'Confirmar Cancelamento',
      message: 'Tem certeza que deseja cancelar este agendamento?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);

          if (error) throw error;

          setBookings(prev => prev.filter(b => b.id !== bookingId));
          showModal({
            title: 'Cancelado',
            message: 'Agendamento cancelado com sucesso!',
            type: 'success'
          });
        } catch (error: any) {
          showModal({
            title: 'Erro',
            message: translateError(error.message),
            type: 'error'
          });
        }
      }
    });
  };

  const filteredBookings = bookings.filter(b => {
    // Create a local date string for 'today' in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

    // Compare strings directly: "2026-01-02" >= "2026-01-02"
    // Booking Date comes as YYYY-MM-DD from DB
    const isPast = b.date < todayString;
    const isCancelled = b.status === 'Cancelado';

    if (activeTab === 'upcoming') {
      // Show if Future (or Today) AND Not Cancelled
      return !isPast && !isCancelled;
    } else {
      // History: Past dates OR Cancelled bookings
      return isPast || isCancelled;
    }
  });

  const getFormattedLessons = (lessons: number[]) => {
    return lessons.map(l => `${l + 1}ª Aula`).join(', ');
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center truncate text-slate-900 dark:text-white">Meus Agendamentos</h2>
        <button
          onClick={() => navigate('/')}
          className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <main className="flex-1 p-4">
        {/* ... tabs ... */}
        <div className="flex h-10 w-full items-center rounded-lg bg-slate-200 dark:bg-slate-800 p-1 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 h-full rounded-md text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Próximos
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 h-full rounded-md text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Histórico
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center text-center opacity-60">
                <div className="mb-3 rounded-full bg-slate-100 dark:bg-slate-800 p-4">
                  <span className="material-symbols-outlined text-slate-400 text-3xl">calendar_today</span>
                </div>
                <p className="text-sm dark:text-slate-400">Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              filteredBookings.map((b) => (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3 active:scale-[0.99] transition-transform">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">desktop_windows</span>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-[12px]">groups</span>
                          Turma {b.year}º Ano {b.course}
                        </span>
                        <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{b.spaceName}</h3>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${b.status === 'Confirmado' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {b.status}
                    </span>
                  </div>

                  {/* Lesson Details */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                        <span className="font-medium">{b.date.split('-').reverse().join('/')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{b.lessons.length} Aula(s)</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {getFormattedLessons(b.lessons)}
                    </p>
                  </div>

                  {/* Actions */}
                  {b.status !== 'Cancelado' && activeTab === 'upcoming' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/booking/${b.spaceId}?editId=${b.id}`)}
                        className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-600 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Editar
                      </button>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800/50 dark:text-red-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>


    </div>
  );
};
export default MyAppointments;
