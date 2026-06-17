// components/ui/SaveButton.tsx

interface SaveButtonProps {
  saving: boolean;
  label?: string;
  savingLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export function SaveButton({
  saving,
  label = 'Salvar',
  savingLabel = 'Salvando...',
  disabled,
  onClick,
  type = 'button',
}: SaveButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={saving || disabled}
      className="btn-primary flex-1 flex items-center justify-center gap-2"
    >
      {saving ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {savingLabel}
        </>
      ) : label}
    </button>
  );
}