'use client';

import { useRef } from 'react';

export function CodigoInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (val: string, index: number) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal && val !== '') return;
    const novoCodigo = value.split('');
    novoCodigo[index] = cleanVal.slice(-1);
    const resultado = novoCodigo.join('').slice(0, 8);
    onChange(resultado);
    if (cleanVal && index < 7) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    onChange(pasteData);
    const nextIndex = pasteData.length >= 8 ? 7 : pasteData.length;
    inputsRef.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
      {Array.from({ length: 8 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(e.target.value, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          disabled={disabled}
          className="w-full max-w-[40px] h-12 text-center text-lg font-bold border-b-2 border-[var(--border)] bg-transparent focus:border-blue-600 focus:outline-none disabled:opacity-50 transition-colors"
        />
      ))}
    </div>
  );
}