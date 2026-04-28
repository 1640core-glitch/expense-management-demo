import { ReactNode, forwardRef } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../../lib/cn';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function DropdownMenu({ open, defaultOpen, onOpenChange, children }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </DropdownMenuPrimitive.Root>
  );
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...rest }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(styles.content, className)}
      {...rest}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...rest }, ref) => (
  <DropdownMenuPrimitive.Item ref={ref} className={cn(styles.item, className)} {...rest} />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...rest }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn(styles.separator, className)} {...rest} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...rest }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn(styles.label, className)} {...rest} />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';
