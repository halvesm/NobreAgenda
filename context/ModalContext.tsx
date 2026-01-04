import React, { createContext, useContext, useState, useCallback } from 'react';

type ModalType = 'info' | 'confirm' | 'error' | 'success' | 'prompt';

interface ModalOptions {
    title?: string;
    message: string;
    type?: ModalType;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    placeholder?: string;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

    const showModal = useCallback((options: ModalOptions) => {
        setModalOptions(options);
    }, []);

    const hideModal = useCallback(() => {
        setModalOptions(null);
    }, []);

    return (
        <ModalContext.Provider value={{ showModal, hideModal }}>
            {children}
            {modalOptions && (
                <ModalComponent
                    options={modalOptions}
                    onClose={hideModal}
                />
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

// Internal Modal Component for rendering
const ModalComponent: React.FC<{ options: ModalOptions; onClose: () => void }> = ({ options, onClose }) => {
    const { title, message, type = 'info', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancelar', defaultValue = '', placeholder = '' } = options;
    const [inputValue, setInputValue] = useState(defaultValue);

    const handleConfirm = () => {
        if (onConfirm) onConfirm(type === 'prompt' ? inputValue : undefined);
        onClose();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'confirm': return 'help';
            case 'prompt': return 'edit';
            default: return 'info';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success': return 'text-green-500';
            case 'error': return 'text-red-500';
            case 'confirm': return 'text-primary';
            default: return 'text-primary';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[24px] shadow-2xl p-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className={`size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 ${getIconColor()}`}>
                        <span className="material-symbols-outlined text-[40px]">{getIcon()}</span>
                    </div>

                    {title && <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>}
                    <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                        {message}
                    </div>

                    {type === 'prompt' && (
                        <div className="w-full mt-4 text-left">
                            <input
                                type="text"
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none dark:text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                            />
                        </div>
                    )}

                    <div className="flex flex-col w-full gap-2 mt-8">
                        <button
                            onClick={handleConfirm}
                            className="w-full h-12 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                        >
                            {confirmText}
                        </button>
                        {(type === 'confirm' || type === 'prompt') && (
                            <button
                                onClick={handleCancel}
                                className="w-full h-12 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-[0.98] transition-all"
                            >
                                {cancelText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
