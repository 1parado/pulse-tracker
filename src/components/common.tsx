import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Equal,
  Flame,
  Minus,
  X,
} from "lucide-react";
import type { Priority, Status } from "../lib/types";
import { PRIORITY_META, STATUS_META } from "../lib/types";

export function StatusIcon({ status, size = 15 }: { status: Status; size?: number }) {
  const color = STATUS_META[status].color;
  const props = { size, color, strokeWidth: 2 };
  switch (status) {
    case "backlog":
      return <CircleDashed {...props} />;
    case "todo":
      return <Circle {...props} />;
    case "in_progress":
      return <CircleDot {...props} />;
    case "done":
      return <CircleCheck {...props} />;
    case "canceled":
      return <CircleX {...props} />;
  }
}

export function PriorityIcon({ priority, size = 13 }: { priority: Priority; size?: number }) {
  switch (priority) {
    case "urgent":
      return <Flame size={size} color="#E5566A" strokeWidth={2} />;
    case "high":
      return <ArrowUp size={size} color="#F5A63D" strokeWidth={2.2} />;
    case "medium":
      return <Equal size={size} color="#6E7BF2" strokeWidth={2.4} />;
    case "low":
      return <ArrowDown size={size} color="#8B93AB" strokeWidth={2.2} />;
    default:
      return <Minus size={size} color="var(--text-3)" strokeWidth={2} />;
  }
}

export function Modal({
  title,
  onClose,
  children,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width }}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose} title="关闭">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function fmtDate(s: string): string {
  if (!s || s.length < 16) return s;
  return s.slice(5, 16);
}

export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
