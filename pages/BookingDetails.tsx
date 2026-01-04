import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SPACES, COURSES, LESSONS } from '../constants';
import { Booking } from '../types';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';

interface Props {
  onBook?: (booking: Booking) => void;
}

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const BookingDetails: React.FC<Props> = ({ onBook }) => {
  const { showModal } = useModal();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useQuery();
  const editId = query.get('editId');
  const space = SPACES.find(s => s.id === id);

  // Estados do Calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  // Carregar dados da edição
  useEffect(() => {
    if (editId) {
      fetchBookingToEdit();
    }
  }, [editId]);

  const fetchBookingToEdit = async () => {
    if (!editId) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', editId)
      .single();

    if (data) {
      // Pre-fill state
      const [y, m, d] = data.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d); // Month is 0-indexed

      setSelectedDate(dateObj);
      setCurrentDate(dateObj); // Navigate calendar to that month
      setSelectedLessons(data.lessons);
      setSelectedCourse(data.course);
      setSelectedYear(data.year);
      setExistingUserId(data.user_id); // Save original owner
    }
  };

  useEffect(() => {
    if (!space) {
      navigate('/');
      return;
    }
    checkMaintenanceStatus();
  }, [id, space]);

  const checkMaintenanceStatus = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('space_maintenance')
      .select('*')
      .eq('space_id', id)
      .single();

    if (data && data.is_unavailable) {
      showModal({
        title: 'Ambiente Indisponível',
        message: `Este ambiente está indisponível.\nMotivo: ${data.reason || 'Manutenção'}`,
        type: 'error'
      });
      navigate('/');
    }
  };

  // Inicializar com fuso de Fortaleza logic only if NOT editing (avoid reset)
  useEffect(() => {
    if (!editId) {
      const initialView = new Date();
      initialView.setDate(1);
      setCurrentDate(initialView);
    }
  }, [editId]);

  // Buscar agendamentos existentes para o mês visível
  useEffect(() => {
    if (!space) return;

    const fetchBookings = async () => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('space_id', space.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);

      if (data) {
        setExistingBookings(data as Booking[]);
      }
    };

    fetchBookings();
  }, [currentDate, space]);

  if (!space) return <div>Espaço não encontrado.</div>;

  const toggleLesson = (index: number) => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const isOccupied = existingBookings.some(b =>
      b.date === dateStr &&
      b.lessons.includes(index) &&
      b.status !== 'Cancelado' &&
      b.id !== editId // Ignore current booking being edited
    );

    if (isOccupied) return;

    setSelectedLessons(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleConfirm = async () => {
    if (!selectedDate || selectedLessons.length === 0 || !selectedCourse) {
      showModal({
        title: 'Dados Incompletos',
        message: 'Por favor, selecione a data, as aulas e o curso.',
        type: 'info'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formattedDate = formatDateLocal(selectedDate);

      // ✅ VERIFICAR CONFLITOS ANTES DE SALVAR
      if (!editId) {
        // Buscar agendamentos existentes para este espaço e data
        const { data: existingBookings, error: checkError } = await supabase
          .from('bookings')
          .select('lessons')
          .eq('space_id', space.id)
          .eq('date', formattedDate)
          .eq('status', 'Confirmado');

        if (checkError) throw checkError;

        // Verificar se há conflito de horários
        if (existingBookings && existingBookings.length > 0) {
          const occupiedLessons: number[] = [];
          existingBookings.forEach((booking: any) => {
            if (booking.lessons && Array.isArray(booking.lessons)) {
              occupiedLessons.push(...booking.lessons);
            }
          });

          // Verificar se alguma aula selecionada já está ocupada
          const conflicts = selectedLessons.filter(lesson => occupiedLessons.includes(lesson));

          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(index => LESSONS[index]).join(', ');
            showModal({
              title: '❌ Conflito de agendamento',
              message: `Uma ou mais aulas já foram agendadas para este dia:\n${conflictNames}\n\nPor favor, escolha outros horários.`,
              type: 'error'
            });
            setLoading(false);
            return;
          }
        }
      }

      const bookingData = {
        user_id: existingUserId || user.id, // Keep original owner if editing
        space_id: space.id,
        space_name: space.name,
        date: formattedDate,
        lessons: selectedLessons,
        course: selectedCourse,
        year: selectedYear,
        status: 'Confirmado'
      };

      if (editId) {
        // UPDATE existing
        const { data, error } = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('id', editId)
          .select()
          .single();

        if (error) throw error;
        showModal({
          title: 'Sucesso',
          message: '✅ Agendamento atualizado com sucesso!',
          type: 'success'
        });
      } else {
        // INSERT new
        const { data, error } = await supabase
          .from('bookings')
          .insert([bookingData])
          .select()
          .single();

        if (error) throw error;
        showModal({
          title: 'Sucesso',
          message: '✅ Agendamento realizado com sucesso!\n\nSeu agendamento foi confirmado.',
          type: 'success'
        });
      }

      if (onBook && !editId) onBook({ id: 'temp', ...bookingData } as any); // Mock for prop callback if needed
      navigate('/my-appointments');
    } catch (error: any) {
      showModal({
        title: 'Erro',
        message: `❌ Erro ao agendar: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções do Calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);

    const today = new Date();
    const limitDate = new Date(today);
    limitDate.setMonth(today.getMonth() + 6);

    if (newDate > limitDate) return;

    setCurrentDate(newDate);
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limitDate = new Date(today);
    limitDate.setMonth(today.getMonth() + 6);

    return date >= today && date <= limitDate;
  };

  const isLessonOccupied = (lessonIndex: number) => {
    if (!selectedDate) return false;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return existingBookings.some(b =>
      b.date === dateStr &&
      b.lessons.includes(lessonIndex) &&
      b.status !== 'Cancelado' &&
      b.id !== editId
    );
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const formattedMonthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-40">
      <header className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="text-slate-900 dark:text-white flex size-10 items-center justify-center hover:bg-black/5 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold flex-1 text-center pr-10">
          {editId ? 'Editar Agendamento' : 'Agendar Espaço'}
        </h2>
      </header>

      <main className="flex-1">
        <div className="px-4 py-3">
          <div className="relative h-48 w-full rounded-xl overflow-hidden shadow-sm group">
            <img src={space.image} alt={space.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">groups</span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Capacidade: {space.capacity}</span>
            </div>
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="text-2xl font-bold leading-tight">{space.name}</h3>
              {/* Location removed as per request */}
            </div>
          </div>
        </div>

        <section className="mt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 dark:text-white text-base font-bold">Selecione a data</h2>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDate(today);
              }}
              className="text-primary text-sm font-semibold flex items-center gap-1"
            >
              Hoje <span className="material-symbols-outlined text-sm">calendar_today</span>
            </button>
          </div>
          <div className="bg-white dark:bg-[#1a2634] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <p className="text-slate-900 dark:text-white text-sm font-bold capitalize">{formattedMonthTitle}</p>
              <button
                onClick={handleNextMonth}
                className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-xs font-medium text-gray-400 py-2">{d}</span>)}
              {getDaysInMonth(currentDate).map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;

                const isSelectable = isDateSelectable(day);
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const dayLabel = day.getDate();

                return (
                  <button
                    key={day.toISOString()}
                    disabled={!isSelectable}
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedLessons([]); // Limpar seleção ao mudar dia
                    }}
                    className={`size-9 flex items-center justify-center rounded-full text-sm transition-all ${isSelected
                      ? 'bg-primary text-white font-semibold shadow-md'
                      : isSelectable
                        ? 'text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                      }`}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {selectedDate && (
          <section className="mt-6 px-4">
            <h2 className="text-slate-900 dark:text-white text-base font-bold mb-3">Selecione as aulas</h2>
            <div className="grid grid-cols-3 gap-3">
              {LESSONS.map((lesson, idx) => {
                const occupied = isLessonOccupied(idx);
                const isSelected = selectedLessons.includes(idx);
                return (
                  <button
                    key={idx}
                    disabled={occupied}
                    onClick={() => toggleLesson(idx)}
                    className={`relative flex h-12 items-center justify-center rounded-lg border text-sm font-medium transition-all ${occupied ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' :
                      isSelected ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' :
                        'bg-white dark:bg-[#1a2634] border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:border-primary/50'
                      }`}
                  >
                    {lesson}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full p-0.5 shadow-sm">
                        <span className="material-symbols-outlined text-[10px] block font-bold">check</span>
                      </div>
                    )}
                    {occupied && (
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-gray-300 opacity-50 text-xl">lock</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 px-1 text-[10px] text-gray-500">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full border bg-white dark:bg-slate-800" /> Livre</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Selecionado</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-200" /> Ocupado</div>
            </div>
          </section>
        )}

        <section className="mt-6 px-4 space-y-5">
          <div>
            <label className="text-slate-900 dark:text-white text-base font-bold mb-2 block">Selecione o Curso</label>
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full h-12 pl-4 pr-10 rounded-xl bg-white dark:bg-[#1a2634] border border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary appearance-none outline-none shadow-sm text-sm font-medium cursor-pointer"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
              >
                <option value="">Escolha o curso</option>
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-900 dark:text-white text-base font-bold mb-3 block">Ano / Série</label>
            <div className="flex bg-gray-100 dark:bg-[#1a2634] p-1 rounded-xl">
              {['1', '2', '3'].map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${selectedYear === year ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {year}º Ano
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-500">Selecionado:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {selectedDate ? `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}` : '--/--'} • {selectedLessons.length > 0 ? `${selectedLessons.length} Aulas` : 'Nenhuma aula'}
          </span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || !selectedDate || selectedLessons.length === 0 || !selectedCourse}
          className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? 'Processando...' : (editId ? 'Atualizar Agendamento' : 'Confirmar Agendamento')} <span className="material-symbols-outlined text-lg">check_circle</span>
        </button>
      </footer>
    </div>
  );
};

export default BookingDetails;
