import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      const toast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none safe-top">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>,
    document.body
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
  style?: React.CSSProperties;
}

const toastStyles = {
  success: {
    bg: "bg-[var(--color-success)]",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-[var(--color-danger)]",
    icon: AlertCircle,
  },
  info: {
    bg: "bg-[var(--color-accent)]",
    icon: Info,
  },
};

function ToastItem({ toast, onDismiss, style }: ToastItemProps) {
  const { bg, icon: Icon } = toastStyles[toast.type];

  return (
    <div
      className={cn(
        bg,
        "text-white",
        "px-4 py-3",
        "rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-lg)]",
        "flex items-center gap-3",
        "max-w-sm w-full",
        "pointer-events-auto",
        "animate-toast-in"
      )}
      style={style}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-[14px] font-medium">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="p-1 rounded-full hover:bg-white/20 transition-colors press-effect"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
