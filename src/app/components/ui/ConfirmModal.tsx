// components/ui/ConfirmModal.tsx

import { Modal } from '@/app/components/ui/Modal';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmStyle?: 'danger' | 'warning' | 'success';
  onConfirm: () => void;
  onClose: () => void;
}

const confirmStyles = {
  danger: 'border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20',
  warning: 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20',
  success: 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20',
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmStyle = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${confirmStyles[confirmStyle]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}