import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { IToastProvider, TToastApi, TToastRecord } from './Toast.types';
import { toast, toastEmitter, type TToastEvent } from './toast.store';
import { Toaster } from './Toaster';
import { useToastTheme } from './toast.theme';

export const ToastContext = createContext<TToastApi | null>(null);

export function ToastProvider({
  children,
  theme = 'system',
  position = 'top',
  duration = 3600,
  offset = 0,
  maxVisible = 3,
}: IToastProvider) {
  const colors = useToastTheme(theme);
  const [toasts, setToasts] = useState<TToastRecord[]>([]);

  const handleEvent = useCallback((event: TToastEvent) => {
    if (event.type === 'show') {
      setToasts((current) => {
        const toastRecord: TToastRecord = {
          ...event.toast,
          duration: event.toast.duration ?? duration,
          position: event.toast.position ?? position,
        };
        const remaining = current.filter((item) => item.id !== toastRecord.id);
        const samePosition = [...remaining.filter((item) => item.position === toastRecord.position), toastRecord];
        const keepIds = new Set(samePosition.slice(-Math.max(1, maxVisible)).map((item) => item.id));
        return [...remaining.filter((item) => item.position !== toastRecord.position), ...samePosition.filter((item) => keepIds.has(item.id))];
      });
      return;
    }

    if (event.type === 'update') {
      setToasts((current) => current.map((item) => (
        item.id === event.id
          ? {
              ...item,
              title: event.title,
              description: event.options?.description ?? item.description,
              duration: event.options?.duration ?? item.duration,
              position: event.options?.position ?? item.position,
              action: event.options?.action ?? item.action,
            }
          : item
      )));
      return;
    }

    if (event.type === 'dismissAll') {
      setToasts([]);
      return;
    }

    setToasts((current) => current.filter((item) => item.id !== event.id));
  }, [duration, maxVisible, position]);

  useEffect(() => toastEmitter.subscribe(handleEvent), [handleEvent]);

  const api = useMemo(() => toast, []);
  const handleDismiss = useCallback((id: string) => toast.dismiss(id), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} colors={colors} offset={offset} onDismiss={handleDismiss} />
      {toasts.map((item) => (
        <ToastExpiry key={`expiry-${item.id}`} toast={item} />
      ))}
    </ToastContext.Provider>
  );
}

function ToastExpiry({ toast: toastRecord }: { toast: TToastRecord }) {
  useEffect(() => {
    if (toastRecord.duration <= 0) return;
    const timer = setTimeout(() => toast.dismiss(toastRecord.id), toastRecord.duration);
    return () => clearTimeout(timer);
  }, [toastRecord.duration, toastRecord.id]);

  return null;
}
