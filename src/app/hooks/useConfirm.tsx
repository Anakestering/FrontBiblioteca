// hooks/useConfirm.tsx

import { useState } from 'react';
import { ConfirmModal } from '@/app/components/ui/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmStyle?: 'danger' | 'warning' | 'success';
  onConfirm: () => void;
}

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const openConfirm = (opts: ConfirmOptions) => setOptions(opts);

  const confirmModal = options ? (
    <ConfirmModal
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      confirmStyle={options.confirmStyle}
      onConfirm={() => { options.onConfirm(); setOptions(null); }}
      onClose={() => setOptions(null)}
    />
  ) : null;

  return { openConfirm, confirmModal };
}