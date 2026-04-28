import { ReactNode, forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../../lib/cn';
import styles from './Tabs.module.css';

export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  children?: ReactNode;
}

export const Tabs = forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ className, ...rest }, ref) => (
    <TabsPrimitive.Root ref={ref} className={cn(styles.root, className)} {...rest} />
  ),
);
Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...rest }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn(styles.list, className)} {...rest} />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...rest }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn(styles.trigger, className)} {...rest} />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...rest }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn(styles.content, className)} {...rest} />
));
TabsContent.displayName = 'TabsContent';
