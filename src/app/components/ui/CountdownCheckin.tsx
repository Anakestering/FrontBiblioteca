import { useEffect, useState } from 'react';

export function CountdownCheckin({ inicioPrevisto }: { inicioPrevisto: string }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const tick = () => {
      const agora = new Date();
      const abertura = new Date(new Date(inicioPrevisto).getTime() - 5 * 60000);
      const diff = abertura.getTime() - agora.getTime();
      if (diff <= 0) { setDisplay(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inicioPrevisto]);

  if (!display) return null;

  return (
    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
      Check-in em {display}
    </span>
  );
}