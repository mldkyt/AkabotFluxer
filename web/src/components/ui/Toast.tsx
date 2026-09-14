import { useEffect, useState } from "react";

export interface ToastData {
  id: number;
  message: string;
  variant: "danger" | "success";
}

export interface ToastContainerProps {
  [key: string]: never;
}

const TOAST_EVENT = "akabot:toast";

let toastId = 0;

export function showToast(message: string, variant: ToastData["variant"] = "success") {
  window.dispatchEvent(new CustomEvent<ToastData>(TOAST_EVENT, { detail: { id: ++toastId, message, variant } }));
}

export const toast = {
  danger: (message: string) => showToast(message, "danger"),
  success: (message: string) => showToast(message, "success"),
};

export const ToastContainer = (_props: ToastContainerProps) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<ToastData>).detail;
      setToasts((prev) => [...prev, data]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== data.id));
      }, 4000);
    };

    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`flash ${t.variant === "danger" ? "flash--danger" : "flash--success"}`}>
          <p>{t.message}</p>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;