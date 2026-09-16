'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/actions';

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </ToastContext.Provider>
  );
}

/**
 * Runs a server action, surfaces whatever it says, and reports pending so the caller can
 * dim the control it belongs to.
 */
export function useAction() {
  const toast = useContext(ToastContext);
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (action: () => Promise<ActionResult>) => {
      startTransition(async () => {
        const result = await action();
        if (result?.error) toast(result.error);
        else if (result?.message) toast(result.message);
      });
    },
    [toast],
  );

  return { pending, run };
}
