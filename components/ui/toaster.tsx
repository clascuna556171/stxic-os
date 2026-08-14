"use client";

import { useEffect, useState } from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface ToastMsg {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "danger";
}

/** Fire a toast from anywhere (non-React code included). */
export function toast(props: Omit<ToastMsg, "id">) {
  window.dispatchEvent(
    new CustomEvent<ToastMsg>("stxic:toast", {
      detail: { id: crypto.randomUUID(), ...props },
    }),
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<ToastMsg>).detail;
      setToasts((t) => [...t, msg]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== msg.id)), 4000);
    };
    window.addEventListener("stxic:toast", onToast);
    return () => window.removeEventListener("stxic:toast", onToast);
  }, []);

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          duration={4000}
          className={cn(
            t.variant === "success" && "border-l-success border-l-2",
            t.variant === "danger" && "border-l-danger border-l-2",
          )}
        >
          <div className="grid gap-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
