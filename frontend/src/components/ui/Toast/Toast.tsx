import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import styles from './Toast.module.css';

export interface ToasterProps {
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  richColors?: boolean;
}

export function Toaster({ position = 'top-right', richColors = true }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      toastOptions={{ className: styles.toast }}
    />
  );
}

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
  message: (message: string) => sonnerToast(message),
};
