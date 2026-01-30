import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { DEPARTMENTS } from '../constants';

interface AreaSelectionModalProps {
    user: User;
    onUpdate: (updatedUser: User) => void;
}

export const AreaSelectionModal: React.FC<AreaSelectionModalProps> = ({ user, onUpdate }) => {
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // If user already has a department set (and it's not the placeholder), don't show modal
    if (user.department && user.department !== 'PENDING_SELECTION') {
        return null;
    }

    const handleSave = async () => {
        if (!selectedArea) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ department: selectedArea })
                .eq('id', user.id);

            if (error) throw error;

            // Update local user state
            onUpdate({ ...user, department: selectedArea });
        } catch (error) {
            console.error('Error updating area of activity:', error);
            alert('Erro ao salvar a área de atuação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Bem-vindo(a) ao NobreAgenda!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Para personalizar sua experiência, por favor selecione sua Área de Atuação.
                </p>

                <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto">
                    {DEPARTMENTS.map((area) => (
                        <button
                            key={area}
                            onClick={() => setSelectedArea(area)}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedArea === area
                                ? 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{area}</span>
                                {selectedArea === area && (
                                    <span className="h-3 w-3 rounded-full bg-primary" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSave}
                    disabled={!selectedArea || loading}
                    className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Salvando...' : 'Confirmar e Continuar'}
                </button>
            </div>
        </div>
    );
};
