
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { translateError } from '../lib/i18n';
import { DEPARTMENTS } from '../constants';

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


  const toggleDarkMode = async () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);

    // Aplicar na UI
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Salvar no localStorage para persistência imediata/offline
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
        throw new Error('Você deve selecionar uma imagem para fazer upload.');
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{user.department} • {user.role}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-3 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-primary hover:bg-slate-200"
                >
                  Editar Perfil
                </button>
              </>
            ) : (
              <div className="mt-2 text-xs text-primary font-bold">Modo de Edição Ativo</div>
            )}
          </div>
        </div>

        <section className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Informações Gerais</h3>

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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 ml-1">Área de Atuação</label>
              {isEditing ? (
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-primary bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                >
                  {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              ) : (
                <div className="w-full h-12 px-4 rounded-xl border border-transparent bg-slate-50 dark:bg-slate-900/50 text-slate-500 flex items-center">
                  {department}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 ml-1">E-mail (Login)</label>
              <div className="w-full h-12 px-4 rounded-xl border border-transparent bg-slate-50 dark:bg-slate-900/50 text-slate-400 flex items-center text-sm italic">
                {user.email} (Não editável)
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Preferências de App</h3>
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">dark_mode</span>
              <span className="font-medium text-sm">Modo Escuro</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-11 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </section>

        <div className="mt-10 space-y-3">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setIsEditing(false); setName(user.name); setDepartment(user.department); }}
                className="flex-1 h-12 bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Salvar
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full h-12 bg-white dark:bg-slate-900 text-red-600 font-bold rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span> Sair da Conta
            </button>
          )}
        </div>
      </main>


    </div>
  );
};

export default ProfilePage;
