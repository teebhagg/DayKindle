import type { TToastApi, TToastOptions, TToastRecord, TToastVariant } from './Toast.types';

export type TToastEvent =
  | { type: 'show'; toast: Omit<TToastRecord, 'duration' | 'position'> & Pick<TToastOptions, 'duration' | 'position'> }
  | { type: 'update'; id: string; title: string; options?: TToastOptions }
  | { type: 'dismiss'; id: string }
  | { type: 'dismissAll' };

type ToastListener = (event: TToastEvent) => void;

class ToastEmitter {
  private listeners = new Set<ToastListener>();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: TToastEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const toastEmitter = new ToastEmitter();

let idCounter = 0;

function enqueue(variant: TToastVariant, title: string, options: TToastOptions = {}) {
  idCounter += 1;
  const id = `toast-${Date.now()}-${idCounter}`;
  toastEmitter.emit({
    type: 'show',
    toast: { id, title, variant, ...options },
  });
  return id;
}

export const toast: TToastApi = {
  show: (title, options) => enqueue('default', title, options),
  success: (title, options) => enqueue('success', title, options),
  error: (title, options) => enqueue('error', title, options),
  warning: (title, options) => enqueue('warning', title, options),
  info: (title, options) => enqueue('info', title, options),
  update: (id, title, options) => toastEmitter.emit({ type: 'update', id, title, options }),
  dismiss: (id) => toastEmitter.emit({ type: 'dismiss', id }),
  dismissAll: () => toastEmitter.emit({ type: 'dismissAll' }),
};
