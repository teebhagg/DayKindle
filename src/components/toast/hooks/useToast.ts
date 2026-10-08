import { useContext } from 'react';
import { ToastContext } from '../ToastProvider';
import type { TToastApi } from '../Toast.types';

export function useToast(): TToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export type { TToastApi } from '../Toast.types';
