// components/ui/EmptyState.tsx

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'Nenhum item encontrado' }: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <p className="text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}