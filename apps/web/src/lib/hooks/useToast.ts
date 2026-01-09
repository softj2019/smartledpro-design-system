// ================================================================
// Toast Hook (Sonner Wrapper)
// ================================================================

import { toast as sonnerToast } from 'sonner';

export function useToast() {
  return {
    success: (message: string, description?: string) => {
      sonnerToast.success(message, {
        description,
        duration: 3000,
      });
    },
    
    error: (message: string, description?: string) => {
      sonnerToast.error(message, {
        description,
        duration: 5000,
      });
    },
    
    info: (message: string, description?: string) => {
      sonnerToast.info(message, {
        description,
        duration: 3000,
      });
    },
    
    warning: (message: string, description?: string) => {
      sonnerToast.warning(message, {
        description,
        duration: 4000,
      });
    },
    
    loading: (message: string) => {
      return sonnerToast.loading(message);
    },
    
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return sonnerToast.promise(promise, messages);
    },
    
    dismiss: (toastId?: string | number) => {
      sonnerToast.dismiss(toastId);
    },
  };
}
