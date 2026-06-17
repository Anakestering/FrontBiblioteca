import { formatDateTime } from '@/lib/utils';

interface Props {
  checkinEm?: string | null;
  checkoutEm?: string | null;
}

export function CheckinCheckoutInfo({ checkinEm, checkoutEm }: Props) {
  if (!checkinEm && !checkoutEm) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {checkinEm && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Check-in realizado</p>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {formatDateTime(checkinEm)}
          </p>
        </div>
      )}
      {checkoutEm && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Check-out realizado</p>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {formatDateTime(checkoutEm)}
          </p>
        </div>
      )}
    </div>
  );
}