import { toast as sonner } from "sonner";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) => {
      if (variant === "destructive") {
        sonner.error(title, { description });
      } else {
        sonner(title, { description });
      }
    },
  };
}
