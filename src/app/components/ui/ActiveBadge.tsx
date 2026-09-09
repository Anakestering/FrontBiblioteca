import { StatusConta } from '@/types';

interface ActiveBadgeProps {
  statusConta?: StatusConta;
  /** Fallback booleano para entidades que nao usam StatusConta (salas, computadores) */
  ativo?: boolean;
  genero?: 'masculino' | 'feminino';
}

export function ActiveBadge({ statusConta, ativo, genero = 'masculino' }: ActiveBadgeProps) {
  if (statusConta === 'PENDENTE') {
    return (
      <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        Pendente
      </span>
    );
  }

  if (statusConta === 'INATIVO' || ativo === false) {
    const label = genero === 'feminino' ? 'Inativa' : 'Inativo';
    return (
      <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {label}
      </span>
    );
  }

  const label = genero === 'feminino' ? 'Ativa' : 'Ativo';
  return (
    <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
      {label}
    </span>
  );
}
