import { useEffect, useState } from "react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

export type ToastKind = "info" | "ok" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

let seq = 0;
const listeners = new Set<(t: ToastItem) => void>();

/** 全局轻量通知：toast("已钉到桌面", "ok") */
export function toast(text: string, kind: ToastKind = "info") {
  const item = { id: ++seq, kind, text };
  listeners.forEach((l) => l(item));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const on = (t: ToastItem) => {
      setItems((list) => [...list.slice(-3), t]);
      window.setTimeout(() => {
        setItems((list) => list.filter((x) => x.id !== t.id));
      }, 3200);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={"toast " + t.kind}>
          {t.kind === "ok" ? (
            <CircleCheck size={14} />
          ) : t.kind === "error" ? (
            <TriangleAlert size={14} />
          ) : (
            <Info size={14} />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
