import { ReactNode, forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../../lib/cn';
import styles from './Dialog.module.css';

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: ReactNode;
  description?: ReactNode;
  showClose?: boolean;
  overlayClassName?: string;
}

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ title, description, showClose = true, className, overlayClassName, children, ...rest }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={cn(styles.overlay, overlayClassName)} />
    <DialogPrimitive.Content ref={ref} className={cn(styles.content, className)} {...rest}>
      {title && <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>}
      {description && (
        <DialogPrimitive.Description className={styles.description}>
          {description}
        </DialogPrimitive.Description>
      )}
      {children}
      {showClose && (
        <DialogPrimitive.Close className={styles.closeButton} aria-label="Close">
          ×
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

DialogContent.displayName = 'DialogContent';

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn(styles.footer, className)}>{children}</div>;
}
