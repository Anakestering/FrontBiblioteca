import { statusReservaColor, statusReservaLabel } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusReservaColor[status as keyof typeof statusReservaColor] ?? 'badge-gray'}`}>
      {statusReservaLabel[status as keyof typeof statusReservaLabel] ?? status}
    </span>
  );
}