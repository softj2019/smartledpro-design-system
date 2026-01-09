// ================================================================
// Confirm Dialog Hook
// ================================================================

import { create } from 'zustand';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@softj/smartledpro-design-system";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  close: (confirmed: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,
  
  open: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },
  
  close: (confirmed) => {
    const { resolve } = get();
    if (resolve) {
      resolve(confirmed);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },
}));

export function useConfirm() {
  const open = useConfirmStore((state) => state.open);
  return open;
}

// Global ConfirmDialog Component
export function ConfirmDialog() {
  const { isOpen, options, close } = useConfirmStore();
  
  if (!options) return null;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {options.cancelText || '취소'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={
              options.variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }
          >
            {options.confirmText || '확인'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
