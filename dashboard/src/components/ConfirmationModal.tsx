import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDangerous = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="card p-2" style={{ maxWidth: '400px', width: '90%' }}>
                <h3 className="text-lg font-semibold mb-1">{title}</h3>
                <p className="text-secondary mb-2 leading-relaxed">
                    {message}
                </p>
                <div className="flex justify-end gap-1">
                    <button
                        onClick={onCancel}
                        className="btn-secondary"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={isDangerous ? 'btn-danger' : 'btn-primary'}
                        style={isDangerous ? { backgroundColor: 'var(--accent-red)', color: 'white', border: 'none' } : {}}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
