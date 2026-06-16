import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SPACES, COURSES, LESSONS, COURSE_LETTER_MAP } from '../constants';
import { User, Booking } from '../types';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';

interface Props {
  user: User;
  onBook?: (booking: Booking) => void;
}

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const BookingDetails: React.FC<Props> = ({ user, onBook }) => {
  const { showModal } = useModal();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useQuery();
  const editId = query.get('editId');
  const space = SPACES.find(s => s.id === id);
  const isAuditorum = space?.id === '8';
  const allLessons = LESSONS;

  // Estados do Calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null);
  const [repeatMode, setRepeatMode] = useState<'none' | 'month' | '2months' | 'year'>('none');

  // Estado para agendamento em nome de outro professor
  const [delegateUserId, setDelegateUserId] = useState<string>('');
  const [allTeachers, setAllTeachers] = useState<{id: string; name: string}[]>([]);

  // Detectar se user é Regente deste espaço
  const isRegenteOfSpace = space ? (
    user.role === 'Regente' && 
    (user.assigned_space_ids?.includes(space.id) || user.assigned_space_id === space.id)
  ) : false;

  // Buscar professores cadastrados quando regente
  useEffect(() => {
    if (isRegenteOfSpace) {
      const fetchTeachers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, name')
          .order('name');
        if (data) {
          setAllTeachers(data);
        }
      };
      fetchTeachers();
    }
  }, [isRegenteOfSpace]);

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

      // Se o curso não estiver na lista padrão, assume que é Outros e o valor é o nome customizado
      if (data.course && !COURSES.filter(c => c !== 'Outros').includes(data.course)) {
        setSelectedCourse('Outros');
        setCustomEventName(data.course);
      }

      setExistingUserId(data.user_id); // Save original owner
    }
  };

  const handleDeepLink = async () => {
    const notifId = query.get('notif');
    if (!notifId) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', notifId)
      .single();

    if (data) {
      const [y, m, d] = data.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      setSelectedDate(dateObj);
      setCurrentDate(dateObj);
      setSelectedLessons(data.lessons);
      
      // Auto-scroll to lessons if mobile
      setTimeout(() => {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }, 500);
    }
  };

  useEffect(() => {
    handleDeepLink();
  }, [query.get('notif')]);

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

    if (data) setMaintenanceStatus(data);

    if (data && data.is_unavailable) {
      // Check period-based unavailability
      const today = new Date().toISOString().split('T')[0];
      const unavailableFrom: string | null = data.unavailable_from || null;
      const unavailableTo: string | null = data.unavailable_to || null;

      let isCurrentlyUnavailable = false;
      if (!unavailableFrom && !unavailableTo) {
        // No range set → permanent/indefinite
        isCurrentlyUnavailable = true;
      } else {
        const afterStart = !unavailableFrom || today >= unavailableFrom;
        const beforeEnd = !unavailableTo || today <= unavailableTo;
        isCurrentlyUnavailable = afterStart && beforeEnd;
      }

      // ONLY block the whole page if there are NO specific lessons selected
      // (meaning the block is for the whole day)
      const isWholeDayBlock = !data.unavailable_lessons || data.unavailable_lessons.length === 0;

      if (isCurrentlyUnavailable && isWholeDayBlock) {
        const formatStaticDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });

        const periodInfo = unavailableFrom
          ? `\nData: ${formatStaticDate(unavailableFrom)}`
          : '';

        showModal({
          title: 'Ambiente Indisponível',
          message: `Este ambiente está indisponível para o dia todo.\nMotivo: ${data.reason || 'Manutenção'}${periodInfo}`,
          type: 'error'
        });
        navigate('/');
      }
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

  const isLessonMaintenance = (index: number) => {
    if (!selectedDate || !maintenanceStatus || !maintenanceStatus.is_unavailable) return false;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const targetDate = maintenanceStatus.unavailable_from;

    // Check exact date
    if (dateStr !== targetDate) return false;

    // If no lessons selected, block whole day
    if (!maintenanceStatus.unavailable_lessons || maintenanceStatus.unavailable_lessons.length === 0) return true;

    // Check specific lesson
    return maintenanceStatus.unavailable_lessons.includes(index);
  };

  const toggleLesson = (index: number) => {
    if (!selectedDate) return;

    if (isLessonMaintenance(index)) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const isOccupied = existingBookings.some(b =>
      b.date === dateStr &&
      b.lessons.includes(index) &&
      b.status !== 'Cancelado' &&
      b.id !== editId // Ignore current booking being edited
    );

    if (isOccupied) return;

    if (LESSONS[index] === 'Almoço') {
      const isAuditorium = space?.id === '8';
      const isLibrary = space?.id === '9';

      if (isAuditorium) {
        const canBookLunch = 
          user.role === 'Coordenador(a)' ||
          user.role === 'Coordenador' ||
          (user.role === 'Regente' && (user.assigned_space_ids?.includes('8') || user.assigned_space_id === '8'));

        if (!canBookLunch) {
          showModal({
            title: 'Acesso Negado',
            message: 'Este horário só pode ser agendado pelo regente do ambiente ou coordenação.',
            type: 'error'
          });
          return;
        }
      }

      if (isLibrary) {
        const canBookLunch = (user.role === 'Regente' && (user.assigned_space_ids?.includes('9') || user.assigned_space_id === '9'));

        if (!canBookLunch) {
          showModal({
            title: 'Acesso Negado',
            message: 'Este horário só pode ser agendado pelo regente do ambiente.',
            type: 'error'
          });
          return;
        }
      }
    }

    setSelectedLessons(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Gerar datas recorrentes (mesmo dia da semana)
  const generateRecurringDates = (startDate: Date, mode: 'month' | '2months' | 'year'): Date[] => {
    const dates: Date[] = [];
    const endDate = new Date(startDate);

    if (mode === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (mode === '2months') {
      endDate.setMonth(endDate.getMonth() + 2);
    } else {
      endDate.setFullYear(startDate.getFullYear(), 11, 31);
    }

    let current = new Date(startDate);
    current.setDate(current.getDate() + 7); // Próxima semana (a original já será incluída separadamente)

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    return dates;
  };

  // Preview das datas recorrentes
  const getRecurringPreview = () => {
    if (!selectedDate || repeatMode === 'none') return [];
    return generateRecurringDates(selectedDate, repeatMode);
  };

  const recurringDates = getRecurringPreview();

  const getDayOfWeekName = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  };

  const handleConfirm = async () => {
    const isCustom = selectedCourse === 'Outros';
    const finalCourse = isCustom ? customEventName : selectedCourse;

    if (!selectedDate || selectedLessons.length === 0 || !selectedCourse || (isCustom && !customEventName.trim())) {
      showModal({
        title: 'Dados Incompletos',
        message: 'Por favor, selecione a data, as aulas e o curso/nome do evento.',
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

      // ========== AGENDAMENTO EM LOTE (Regente) ==========
      if (repeatMode !== 'none' && isRegenteOfSpace && !editId) {
        const allDates = [selectedDate, ...generateRecurringDates(selectedDate, repeatMode)];
        const firstDateStr = formatDateLocal(allDates[0]);
        const lastDateStr = formatDateLocal(allDates[allDates.length - 1]);

        // Buscar todos os bookings do período de uma vez
        const { data: periodBookings, error: periodError } = await supabase
          .from('bookings')
          .select('date, lessons')
          .eq('space_id', space.id)
          .eq('status', 'Confirmado')
          .gte('date', firstDateStr)
          .lte('date', lastDateStr);

        if (periodError) throw periodError;

        // Filtrar datas sem conflito
        const validDates: Date[] = [];
        const conflictDates: Date[] = [];

        allDates.forEach(date => {
          const dateStr = formatDateLocal(date);
          const dayBookings = periodBookings?.filter((b: any) => b.date === dateStr) || [];
          const occupiedLessons: number[] = dayBookings.flatMap((b: any) => b.lessons || []);
          const hasConflict = selectedLessons.some(l => occupiedLessons.includes(l));

          if (hasConflict) {
            conflictDates.push(date);
          } else {
            validDates.push(date);
          }
        });

        if (validDates.length === 0) {
          showModal({
            title: '❌ Sem datas disponíveis',
            message: 'Todas as datas do período selecionado já possuem conflitos de horário.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        // Batch insert
        const bookingsToInsert = validDates.map(date => ({
          user_id: delegateUserId || user.id,
          space_id: space.id,
          space_name: space.name,
          date: formatDateLocal(date),
          lessons: selectedLessons,
          course: finalCourse,
          year: isCustom ? '' : selectedYear,
          status: 'Confirmado'
        }));

        const { error: batchError } = await supabase
          .from('bookings')
          .insert(bookingsToInsert);

        if (batchError) throw batchError;

        // Montar mensagem de resumo
        let message = `✅ ${validDates.length} agendamento(s) criado(s) com sucesso!`;
        if (conflictDates.length > 0) {
          const conflictList = conflictDates
            .map(d => d.toLocaleDateString('pt-BR'))
            .join(', ');
          message += `\n\n⚠️ ${conflictDates.length} data(s) ignorada(s) por conflito:\n${conflictList}`;
        }

        showModal({
          title: 'Agendamento em Lote',
          message,
          type: 'success'
        });

        navigate('/my-appointments');
        return;
      }

      // ========== AGENDAMENTO ÚNICO (fluxo original) ==========

      // ✅ VERIFICAR CONFLITOS ANTES DE SALVAR
      if (!editId) {
        const { data: existingBookings, error: checkError } = await supabase
          .from('bookings')
          .select('lessons')
          .eq('space_id', space.id)
          .eq('date', formattedDate)
          .eq('status', 'Confirmado');

        if (checkError) throw checkError;

        if (existingBookings && existingBookings.length > 0) {
          const occupiedLessons: number[] = [];
          existingBookings.forEach((booking: any) => {
            if (booking.lessons && Array.isArray(booking.lessons)) {
              occupiedLessons.push(...booking.lessons);
            }
          });

          const conflicts = selectedLessons.filter(lesson => occupiedLessons.includes(lesson));

          if (conflicts.length > 0) {
            const conflictNames = conflicts.map(index => allLessons[index]).join(', ');
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
        user_id: existingUserId || delegateUserId || user.id,
        space_id: space.id,
        space_name: space.name,
        date: formattedDate,
        lessons: selectedLessons,
        course: finalCourse,
        year: isCustom ? '' : selectedYear,
        status: 'Confirmado'
      };

      if (editId) {
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
        const { data, error } = await supabase
          .from('bookings')
          .insert([bookingData])
          .select()
          .single();

        if (error) throw error;

        // ✅ ENVIAR NOTIFICAÇÃO PARA O REGENTE
        try {
          const { data: managers } = await supabase
            .from('profiles')
            .select('id')
            .or(`role.eq.Regente,role.eq.PCA`);

          if (managers) {
            const relevantManagers = managers.filter((m: any) => {
              return true;
            });
            
            const { data: allRegentes } = await supabase
              .from('profiles')
              .select('id, assigned_space_ids, assigned_space_id')
              .in('role', ['Regente', 'PCA']);

            if (allRegentes) {
              const targetManagers = allRegentes.filter(m => 
                (m.assigned_space_ids && m.assigned_space_ids.includes(space.id)) || 
                (m.assigned_space_id === space.id)
              );

              if (targetManagers.length > 0) {
                const notifications = targetManagers.map(m => ({
                  user_id: m.id,
                  title: '📅 Novo Agendamento',
                  message: `${user.user_metadata?.full_name || 'Um professor'} agendou o(a) ${space.name} para o dia ${new Date(formattedDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`,
                  booking_id: data.id
                }));

                await supabase.from('notifications').insert(notifications);
              }
            }
          }
        } catch (notifError) {
          console.error('Erro ao enviar notificações:', notifError);
        }

        showModal({
          title: 'Sucesso',
          message: '✅ Agendamento realizado com sucesso!\n\nSeu agendamento foi confirmado.',
          type: 'success'
        });
      }

      if (onBook && !editId) onBook({ id: 'temp', ...bookingData } as any);
      navigate('/my-appointments');
    } catch (error: any) {
      showModal({
        title: 'Erro',
        message: translateError(error.message),
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

    // Check maintenance first
    if (isLessonMaintenance(lessonIndex)) return true;

    const dateStr = selectedDate.toISOString().split('T')[0];
    return existingBookings.some(b =>
      b.date === dateStr &&
      b.lessons.includes(lessonIndex) &&
      b.status !== 'Cancelado' &&
      b.id !== editId
    );
  };

  const getOccupyingBooking = (lessonIndex: number) => {
    if (!selectedDate) return null;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return existingBookings.find(b =>
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

      <main className="flex-1 max-w-7xl mx-auto w-full">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:p-6 items-start">

          {/* Left Column: Image, Calendar, Lessons */}
          <div className="lg:col-span-8 space-y-6">
            <div className="px-4 py-3 lg:p-0">
              <div className="relative h-48 lg:h-64 w-full rounded-xl overflow-hidden shadow-sm group">
                <img src={space.image} alt={space.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">groups</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Capacidade: {space.capacity}</span>
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-2xl lg:text-3xl font-bold leading-tight">{space.name}</h3>
                </div>
              </div>
            </div>

            <section className="px-4 lg:p-0">
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
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={`header-${i}`} className="text-xs font-medium text-gray-400 py-2">{d}</span>)}
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
              <section className="px-4 lg:p-0">
                <h2 className="text-slate-900 dark:text-white text-base font-bold mb-3">Selecione as aulas</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {LESSONS.map((lessonLabel, idx) => {
                      const occupied = isLessonOccupied(idx);
                      const isSelected = selectedLessons.includes(idx);
                      const maintenance = isLessonMaintenance(idx);
                      const booking = occupied ? getOccupyingBooking(idx) : null;
                      
                      let detailsText = '';
                      if (occupied && !isSelected) {
                        if (maintenance) {
                          detailsText = 'Manutenção';
                        } else if (booking) {
                          const letter = COURSE_LETTER_MAP[booking.course];
                          detailsText = letter ? `${booking.year}º ${letter}` : booking.course;
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={occupied && !isSelected}
                          onClick={() => toggleLesson(idx)}
                          className={`relative flex flex-col min-h-[56px] h-auto py-1 items-center justify-center rounded-xl border transition-all ${
                            occupied && !isSelected ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60' :
                            isSelected ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm scale-95' :
                            maintenance ? 'border-orange-400 bg-orange-50 text-orange-600' :
                            'bg-white dark:bg-[#1a2634] border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:border-primary/50'
                          }`}
                        >
                          <span className="text-[10px] opacity-80 uppercase leading-none truncate w-full px-1">{lessonLabel}</span>
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <span className="material-symbols-outlined text-[10px] block font-bold">check</span>
                            </div>
                          )}
                          {occupied && !isSelected && (
                            <>
                              {detailsText && (
                                <span className="text-[9px] font-bold text-red-500/80 dark:text-red-400/80 mt-1 leading-none truncate max-w-full px-1">
                                  {detailsText}
                                </span>
                              )}
                              <span className="material-symbols-outlined absolute top-1 right-1 text-gray-400 opacity-60" style={{ fontSize: '12px' }}>lock</span>
                            </>
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
          </div>

          {/* Right Column: Course, Year, Confirmation (Sticky on Desktop) */}
          <div className="lg:col-span-4 mt-6 lg:mt-0 px-4 lg:px-0">
            <div className="lg:sticky lg:top-24 space-y-6">

              <div className="space-y-5 bg-white dark:bg-[#1a2634] lg:p-6 lg:rounded-2xl lg:shadow-sm lg:border lg:border-gray-100 lg:dark:border-gray-800">
                <div>
                  <label className="text-slate-900 dark:text-white text-base font-bold mb-2 block">Selecione o Curso</label>
                  <div className="relative">
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 rounded-xl bg-white dark:bg-[#1a2634] border border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary appearance-none bg-none outline-none shadow-sm text-sm font-medium cursor-pointer"
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

                {selectedCourse === 'Outros' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-slate-900 dark:text-white text-base font-bold mb-2 block">Nome da Ação / Evento</label>
                    <input
                      type="text"
                      value={customEventName}
                      onChange={(e) => setCustomEventName(e.target.value)}
                      placeholder="Ex: Reunião de Pais, Manutenção..."
                      className="w-full h-12 px-4 rounded-xl bg-white dark:bg-[#1a2634] border border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none shadow-sm text-sm font-medium"
                    />
                  </div>
                )}

                {selectedCourse !== 'Outros' && (
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
                )}

                {/* Agendamento em nome de outro professor (Regente) */}
                {isRegenteOfSpace && !editId && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-lg">person_add</span>
                      <label className="text-slate-900 dark:text-white text-base font-bold">Agendar em nome de</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Opcional: selecione um professor para que este agendamento apareça nos horários dele.
                    </p>
                    <div className="relative">
                      <select
                        value={delegateUserId}
                        onChange={(e) => setDelegateUserId(e.target.value)}
                        className="w-full h-12 pl-4 pr-10 rounded-xl bg-white dark:bg-[#1a2634] border border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary appearance-none bg-none outline-none shadow-sm text-sm font-medium cursor-pointer"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                      >
                        <option value="">Minha conta (padrão)</option>
                        {allTeachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========== AGENDAMENTO EM LOTE (Regente) ========== */}
                {isRegenteOfSpace && !editId && selectedDate && selectedLessons.length > 0 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-lg">repeat</span>
                      <label className="text-slate-900 dark:text-white text-base font-bold">Repetir Agendamento</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Replicar este agendamento para o mesmo dia da semana ({selectedDate ? getDayOfWeekName(selectedDate) : ''}).
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'none' as const, label: 'Não repetir', icon: 'event' },
                        { value: 'month' as const, label: 'Mês inteiro', icon: 'date_range' },
                        { value: '2months' as const, label: '2 meses', icon: 'calendar_month' },
                        { value: 'year' as const, label: 'Ano inteiro', icon: 'calendar_today' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setRepeatMode(option.value)}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                            repeatMode === option.value
                              ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/40 bg-white dark:bg-[#1a2634]'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${
                            repeatMode === option.value ? 'text-primary' : 'text-gray-400'
                          }`}>{option.icon}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Preview de datas */}
                    {repeatMode !== 'none' && recurringDates.length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="material-symbols-outlined text-primary text-sm">info</span>
                          <span className="text-xs font-bold text-primary">
                            {recurringDates.length + 1} agendamento(s) no total
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Data original */}
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[10px]">push_pin</span>
                            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          {/* Datas recorrentes */}
                          {recurringDates.map((date, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-medium border border-gray-100 dark:border-gray-700"
                            >
                              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                          Toda <strong>{getDayOfWeekName(selectedDate)}</strong> até{' '}
                          {recurringDates[recurringDates.length - 1]?.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Desktop Confirmation Block */}
                <div className="hidden lg:block pt-6 border-t border-gray-100 dark:border-gray-700 mt-6">
                  <div className="flex items-center justify-between mb-4 text-sm">
                    <span className="text-gray-500">Resumo:</span>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {selectedDate ? selectedDate.toLocaleDateString('pt-BR') : '--/--/----'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedLessons.length > 0 ? `${selectedLessons.length} aula(s)` : 'Nenhuma aula'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || !selectedDate || selectedLessons.length === 0 || !selectedCourse || (selectedCourse === 'Outros' && !customEventName.trim())}
                    className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? 'Processando...' : (
                      editId ? 'Atualizar' : 
                      repeatMode !== 'none' ? `Confirmar ${recurringDates.length + 1} Agendamentos` : 
                      'Confirmar'
                    )} <span className="material-symbols-outlined text-lg">{repeatMode !== 'none' ? 'repeat' : 'check_circle'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Footer */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-[60]">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-500">Selecionado:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {selectedDate ? `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}` : '--/--'} • {selectedLessons.length > 0 ? `${selectedLessons.length} Aulas` : 'Nenhuma aula'}
          </span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || !selectedDate || selectedLessons.length === 0 || !selectedCourse || (selectedCourse === 'Outros' && !customEventName.trim())}
          className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? 'Processando...' : (
            editId ? 'Atualizar Agendamento' : 
            repeatMode !== 'none' ? `Confirmar ${recurringDates.length + 1} Agendamentos` : 
            'Confirmar Agendamento'
          )} <span className="material-symbols-outlined text-lg">{repeatMode !== 'none' ? 'repeat' : 'check_circle'}</span>
        </button>
      </footer>
    </div>
  );
};

export default BookingDetails;
