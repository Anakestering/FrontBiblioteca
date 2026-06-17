'use client';

import React from 'react';

interface ModalProps {
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ title, onClose, children, maxWidth = 'md' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full ${maxWidthMap[maxWidth]} max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex-1 min-w-0">
              {typeof title === 'string'
                ? <h2 className="text-lg font-semibold text-[var(--text-primary)] break-words leading-snug">{title}</h2>
                : title}
            </div>
            <button onClick={onClose} className="shrink-0 ml-3 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}