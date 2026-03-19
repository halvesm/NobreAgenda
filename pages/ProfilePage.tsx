
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';
import { DEPARTMENTS } from '../constants';
import { subscribeToPush } from '../lib/pushManager';

interface Props {
  user: User;
  onLogout: () => void;
  onProfileUpdate: () => void;
}

const ProfilePage: React.FC<Props> = ({ user, onLogout, onProfileUpdate }) => {
  const { showModal } = useModal();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [avatar, setAvatar] = useState(user.avatar);
  const [message, setMessage] = useState('');

  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotifs, setSelectedNotifs] = useState<string[]>([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushActive, setPushActive] = useState(false);

  React.useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setPushActive(!!subscription);
      }
    }
  };

  const handleTogglePush = async () => {
    try {
      setPushLoading(true);
      if (pushActive) {
        // Desinscrever nÃ£o Ã© estritamente necessÃ¡rio agora, mas podemos avisar
        showModal({ title: 'Aviso', message: 'Para desativar, use as configuraÃ§Ãµes do seu navegador.', type: 'info' });
      } else {
        await subscribeToPush();
        setPushActive(true);
        showModal({ title: 'Sucesso', message: 'NotificaÃ§Ãµes popup ativadas!', type: 'success' });
      }
    } catch (err) {
      showModal({ title: 'Erro', message: 'NÃ£o foi possÃ­vel ativar as notificaÃ§Ãµes.', type: 'error' });
    } finally {
      setPushLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Erro ao buscar notificaÃ§Ãµes:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // Marcar como lida
    if (!notif.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notif.id);
      
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }

    // Navegar para o agendamento se existir
    if (notif.booking_id) {
        // Precisamos do space_id para montar a URL /booking/:id
        const { data: booking } = await supabase
            .from('bookings')
            .select('space_id')
            .eq('id', notif.booking_id)
            .single();
        
        if (booking) {
            navigate(`/booking/${booking.space_id}?notif=${notif.booking_id}`);
        } else {
            showModal({
                title: 'Aviso',
                message: 'Este agendamento pode ter sido cancelado ou removido.',
                type: 'info'
            });
        }
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const isAuthorizedToDelete = 
    user.role?.toLowerCase().includes('regente') || 
    user.role?.toLowerCase().includes('admin') || 
    user.role?.toLowerCase().includes('gestor') || 
    user.role?.toLowerCase().includes('coord') || 
    user.role?.toLowerCase().includes('pca');

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevenir navegaÃ§Ã£o ao deletar
    if (!isAuthorizedToDelete) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar notificaÃ§Ã£o:', err);
      showModal({
        title: 'Erro ao Excluir',
        message: 'NÃ£o foi possÃ­vel excluir a notificaÃ§Ã£o. Verifique se vocÃª executou o cÃ³digo SQL no Supabase.',
        type: 'error'
      });
    }
  };

  const clearAllNotifications = async () => {
    if (!isAuthorizedToDelete) return;
    if (!window.confirm('Deseja realmente excluir todas as notificaÃ§Ãµes lidas?')) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      console.error('Erro ao limpar notificaÃ§Ãµes:', err);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotifs([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedNotifs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedNotifs.length === notifications.length) {
      setSelectedNotifs([]);
    } else {
      setSelectedNotifs(notifications.map(n => n.id));
    }
  };

  const deleteSelected = async () => {
    if (!isAuthorizedToDelete) return;
    if (selectedNotifs.length === 0) return;
    if (!window.confirm(`Deseja excluir as ${selectedNotifs.length} notificaÃ§Ãµes selecionadas?`)) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', selectedNotifs);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => !selectedNotifs.includes(n.id)));
      setSelectedNotifs([]);
      setSelectionMode(false);
    } catch (err: any) {
      console.error('Erro ao excluir selecionadas:', err);
      showModal({
        title: 'Erro ao Excluir',
        message: 'Ocorreu um erro ao tentar excluir as notificaÃ§Ãµes selecionadas.',
        type: 'error'
      });
    }
  };


  const toggleDarkMode = async () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);

    // Aplicar na UI
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Salvar no localStorage para persistÃªncia imediata/offline
    localStorage.setItem('theme', newTheme);

    // Salvar no perfil (Supabase)
    try {
      if (user.id) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Erro ao salvar tema no perfil:', err);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('VocÃª deve selecionar uma imagem para fazer upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatar(publicUrl);
      // Optional: Auto-save or wait for manual save. 
      // Let's keep manual save to be consistent, but we could allow auto-save here too.

    } catch (error: any) {
      showModal({
        title: 'Erro de Upload',
        message: translateError(error.message),
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          department,
          avatar
        })
        .eq('id', user.id);

      if (error) throw error;

      onProfileUpdate(); // Refresh global state
      setIsEditing(false);
      setMessage('Perfil atualizado com sucesso!');

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      showModal({
        title: 'Erro ao Salvar',
        message: 'Ocorreu um erro ao atualizar o seu perfil. Por favor, tente novamente.',
        type: 'error'
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Meu Perfil</h1>
      </header>

      <main className="flex-1 px-4 pb-8">
        {message && (
          <div className="mt-4 bg-green-100 text-green-700 p-3 rounded-xl text-center text-sm font-bold animate-pulse">
            {message}
          </div>
        )}

        <div className="flex flex-col items-center pt-8 pb-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full shadow-lg border-4 border-white dark:border-slate-800 bg-cover bg-center overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              {uploading ? (
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              )}
            </div>
            {isEditing && (
              <>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full border-[3px] border-white dark:border-slate-800 shadow-sm flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
          <div className="mt-4 text-center">
            {!isEditing ? (
              <>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{user.department} â€¢ {user.role}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-3 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-primary hover:bg-slate-200"
                >
                  Editar Perfil
                </button>
              </>
            ) : (
              <div className="mt-2 text-xs text-primary font-bold">Modo de EdiÃ§Ã£o Ativo</div>
            )}
          </div>
        </div>

        <section className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">InformaÃ§Ãµes Gerais</h3>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Nome Completo</label>
              <input
                type="text"
                disabled={!isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full h-12 px-4 rounded-xl border transition-all ${isEditing ? 'border-primary bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none' : 'border-transparent bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed'}`}
              />
            </div>

