'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastContextValue {
  readonly showToast: (message: string) => void;
}

const PortalToastContext = createContext<ToastContextValue | null>(null);

export function PortalToastProvider({ children }: { readonly children: ReactNode }) {
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <PortalToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={visible ? 'toast show' : 'toast'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>
    </PortalToastContext.Provider>
  );
}

export function usePortalToast(): ToastContextValue {
  const ctx = useContext(PortalToastContext);
  if (!ctx) {
    throw new Error('usePortalToast must be used inside <PortalToastProvider>');
  }
  return ctx;
}
