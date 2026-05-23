
interface AlertProps {
  message: string;
  type?: 'error' | 'success';
}

export function Alert({ message, type = 'error' }: AlertProps) {
  if (!message) return null;

  const styles = {
    error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className={`px-3 py-2.5 rounded-lg border ${styles[type]}`}>
      <p className="text-sm">{message}</p>
    </div>
  );
}