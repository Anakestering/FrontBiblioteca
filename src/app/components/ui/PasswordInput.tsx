'use client';

import { useState } from 'react';
import { EyeIcon } from './EyeIcon';

export interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
  maxLength?: number;
}

export function PasswordInput({
  placeholder,
  value,
  onChange,
  hasError,
  disabled,
  id,
  maxLength,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`input-field pr-10 ${hasError ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/30' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}