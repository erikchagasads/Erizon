"use client";

/**
 * Sistema de toast global da Erizon.
 * Uso em qualquer componente:
 *
 *   import { toast } from "@/components/Toast";
 *   toast.success("Campanha pausada!");
 *   toast.error("Token expirado.");
 *   toast.info("Sincronizando...");
 *   toast.warn("CPL acima do limite.");
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "warn" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Store global simples (sem contexto — funciona fora de React também) ──────
type Listener = (toasts: ToastItem[]) => void;

let _toasts: ToastItem[] = [];
let _listeners: Listener[] = [];

function notify() {
  _listeners.forEach(l => l([..._toasts]));
}

function add(type: ToastType, message: string) {
  const id = `${Date.now()}-${Math.random()}`;
  _toasts = [..._toasts, { id, type, message }];
  notify();
  setTimeout(() => remove(id), 4500);
}

function remove(id: string) {
  _toasts = _toasts.filter(t => t.id !== id);
  notify();
}

// API pública
export const toast = {
  success: (msg: string) => add("success", msg),
  error:   (msg: string) => add("error",   msg),
  warn:    (msg: string) => add("warn",    msg),
  info:    (msg: string) => add("info",    msg),
};

// ─── Estilos por tipo ─────────────────────────────────────────────────────────
const STYLES: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2,  bg: "bg-[#0d1a12]", border: "border-emerald-500/25", iconColor: "text-emerald-400" },
  error:   { icon: XCircle,       bg: "bg-[#1a0d0d]", border: "border-red-500/25",     iconColor: "text-red-400"     },
  warn:    { icon: AlertTriangle, bg: "bg-[#1a150d]", border: "border-amber-500/25",   iconColor: "text-amber-400"   },
  info:    { icon: Info,          bg: "bg-[#0d0f1a]", border: "border-blue-500/25",    iconColor: "text-blue-400"    },
};

// ─── Componente Toaster — coloca no layout.tsx ────────────────────────────────
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => [..._toasts]);

  useEffect(() => {
    _listeners.push(setToasts);
    return () => { _listeners = _listeners.filter(l => l !== setToasts); };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 8,  scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`
                pointer-events-auto
                flex items-center gap-3 px-4 py-3
                rounded-2xl border shadow-2xl shadow-black/60
                min-w-[260px] max-w-[380px]
                ${s.bg} ${s.border}
              `}
            >
              <Icon size={15} className={`shrink-0 ${s.iconColor}`} />
              <p className="flex-1 text-[13px] font-medium text-white/80 leading-snug">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-all"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
