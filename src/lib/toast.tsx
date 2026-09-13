import { useEffect, useState } from "react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

export type ToastKind = "info" | "ok" | "error";

export interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
  action?: ToastAction;
}

let seq = 0;
const listeners = new Set<(t: ToastItem) => void>();

/** 全局轻量通知：toast("已钉到桌面", "ok")；带 action 时用于撤销等操作 */
export function toast(text: string, kind: ToastKind = "info", action?: ToastAction) {
  const item = { id: ++seq, kind, text, action };
  listeners.forEach((l) => l(item));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = (id: number) =>
    setItems((list) => list.filter((x) => x.id !== id));

  useEffect(() => {
    const on = (t: ToastItem) => {
      setItems((list) => [...list.slice(-3), t]);
      // 带撤销按钮的通知停留更久
      window.setTimeout(() => dismiss(t.id), t.action ? 6500 : 3200);
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
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
