// components/ui/ActiveBadge.tsx

interface ActiveBadgeProps {
  ativo: boolean;
  genero?: 'masculino' | 'feminino';
}

export function ActiveBadge({ ativo, genero = 'masculino' }: ActiveBadgeProps) {
  const label = ativo
    ? genero === 'feminino' ? 'Ativa' : 'Ativo'
    : genero === 'feminino' ? 'Inativa' : 'Inativo';

  return (
    <span className={`badge ${ativo
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      {label}
    </span>
  );
}