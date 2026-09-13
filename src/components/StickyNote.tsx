import { useEffect, useState } from "react";
import { Circle, CircleCheck, GripVertical, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../lib/api";
import type { Issue } from "../lib/types";
import { STATUS_META } from "../lib/types";
import { fmtDate } from "./common";

/** 桌面便签：无边框置顶小窗口，显示一个待办问题 */
export function StickyNote({ issueId }: { issueId: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [title, setTitle] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme =
      (localStorage.getItem("pulse.theme") as "dark" | "light") || "dark";
  }, []);

  useEffect(() => {
    api
      .getIssue(issueId)
      .then((i) => {
        setIssue(i);
        setTitle(i.title);
      })
      .catch(() => setFailed(true));
  }, [issueId]);

  if (failed) {
    return (
      <div className="sticky-note">
        <div className="sticky-empty">问题不存在或已被删除，可关闭此便签</div>
      </div>
    );
  }
  if (!issue) {
    return (
      <div className="sticky-note">
        <div className="sticky-empty">加载中…</div>
      </div>
    );
  }

  const done = issue.status === "done";
  const meta = STATUS_META[issue.status];

  const toggleDone = async () => {
    try {
      const next = done ? "todo" : "done";
      setIssue(await api.updateIssue({ id: issue.id, status: next }));
    } catch {
      setTitle(issue.title);
    }
  };

  const saveTitle = async () => {
    const t = title.trim();
    if (!t || t === issue.title) {
      setTitle(issue.title);
      return;
    }
    try {
      setIssue(await api.updateIssue({ id: issue.id, title: t }));
    } catch {
      setTitle(issue.title);
    }
  };

  const dismiss = async () => {
    try {
      await api.closeSticky(issue.id);
    } catch {
      /* 由 Rust 端负责关窗，失败静默 */
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,input")) return;
    e.preventDefault();
    getCurrentWindow().startDragging();
  };

  return (
    <div className="sticky-note">
      <div
        className="sticky-bar"
        style={{ background: meta.color }}
        onMouseDown={startDrag}
        onDoubleClick={toggleDone}
      >
        <GripVertical size={13} className="sticky-grip" />
        <span className="sticky-key">{issue.displayKey}</span>
        <button className="sticky-close" onClick={dismiss} title="取消便签">
          <X size={13} />
        </button>
      </div>
      <div className="sticky-body">
        <div className="sticky-title-row">
          <button
            className={"sticky-check" + (done ? " done" : "")}
            onClick={toggleDone}
            title={done ? "标记为待办" : "标记为完成"}
          >
            {done ? <CircleCheck size={16} /> : <Circle size={16} />}
          </button>
          <input
            className="sticky-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="待办标题"
          />
        </div>
        {issue.description && <div className="sticky-desc">{issue.description}</div>}
      </div>
      <div className="sticky-foot">
        <span>{fmtDate(issue.updatedAt)}</span>
        <span>{meta.label}</span>
      </div>
    </div>
  );
}
