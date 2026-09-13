import { useState } from "react";
import { ChevronDown, Github, Inbox, Plus, Search, X } from "lucide-react";
import type { Issue, Status } from "../lib/types";
import { STATUS_META, STATUS_ORDER } from "../lib/types";
import { PriorityIcon, StatusIcon, fmtDate } from "./common";

function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

/** 命中片段高亮 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let idx = 0;
  let pos = lower.indexOf(ql);
  let key = 0;
  while (pos !== -1) {
    if (pos > idx) parts.push(text.slice(idx, pos));
    parts.push(<mark key={key++}>{text.slice(pos, pos + q.length)}</mark>);
    idx = pos + q.length;
    pos = lower.indexOf(ql, idx);
  }
  parts.push(text.slice(idx));
  return <>{parts}</>;
}

function matchesText(i: Issue, q: string) {
  const ql = q.trim().toLowerCase();
  if (!ql) return true;
  return (
    i.title.toLowerCase().includes(ql) ||
    i.description.toLowerCase().includes(ql) ||
    i.displayKey.toLowerCase().includes(ql)
  );
}

export function IssueList({
  title,
  subtitle,
  issues,
  selectedId,
  onSelect,
  onNewIssue,
  progress,
  onStatusChange,
  query,
  onQueryChange,
  statusFilter,
  onToggleStatus,
}: {
  title: string;
  subtitle?: string;
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewIssue: () => void;
  progress?: number | null;
  onStatusChange: (id: string, status: Status) => void;
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: Status[];
  onToggleStatus: (s: Status) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);
  const searching = query.trim() !== "";

  const dragging = dragId != null;
  const allGroups = STATUS_ORDER.map((s) => ({
    status: s,
    items: issues.filter((i) => i.status === s),
  }));
  // 平时隐藏空分组；拖拽时全部展开以便投放
  const groups = dragging ? allGroups : allGroups.filter((g) => g.items.length > 0);

  return (
    <section className="list-pane">
      <header className="list-toolbar">
        <div className="toolbar-titles">
          <h1 className="toolbar-title">{title}</h1>
          <span className="toolbar-sub">{subtitle ?? `${issues.length} 个问题`}</span>
        </div>
        <div className="toolbar-actions">
          {progress != null && (
            <div className="progress" title={`完成度 ${Math.round(progress * 100)}%`}>
              <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <button className="btn primary sm" onClick={onNewIssue}>
            <Plus size={14} />
            新建
          </button>
        </div>
      </header>

      <div className="filter-row">
        <div className="search-box">
          <Search size={13} />
          <input
            placeholder="搜索标题、描述、编号、评论…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onQueryChange("");
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {query && (
            <button className="search-clear" title="清空搜索" onClick={() => onQueryChange("")}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="status-chips">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={"chip" + (statusFilter.includes(s) ? " on" : "")}
              style={statusFilter.includes(s) ? { borderColor: STATUS_META[s].color } : undefined}
              onClick={() => onToggleStatus(s)}
              title={statusFilter.includes(s) ? "取消筛选" : `只看「${STATUS_META[s].label}」`}
            >
              <span className="chip-dot" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="issue-scroll">
        {groups.length === 0 && (
          <div className="empty">
            <Inbox size={28} />
            <p>这里空空如也</p>
            <button className="btn primary" onClick={onNewIssue}>
              创建第一个问题
            </button>
          </div>
        )}

        {groups.map((g) => (
          <div
            key={g.status}
            className={"issue-group" + (dragging && overStatus === g.status ? " drop-target" : "")}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverStatus(g.status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setOverStatus((s) => (s === g.status ? null : s));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragId ?? e.dataTransfer.getData("text/plain");
              if (id && id !== "" ) onStatusChange(id, g.status);
              setDragId(null);
              setOverStatus(null);
            }}
          >
            <button
              className="group-header"
              onClick={() => setCollapsed((c) => ({ ...c, [g.status]: !c[g.status] }))}
            >
              <StatusIcon status={g.status} size={14} />
              <span className="group-name">{STATUS_META[g.status].label}</span>
              <span className="group-count">{g.items.length}</span>
              <ChevronDown size={13} className={"chev" + (collapsed[g.status] ? " closed" : "")} />
            </button>
            {g.items.length === 0 ? (
              <div className="group-empty">拖到「{STATUS_META[g.status].label}」</div>
            ) : (
              !collapsed[g.status] &&
              g.items.map((i) => (
                <div
                  key={i.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(i.id);
                    e.dataTransfer.setData("text/plain", i.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStatus(null);
                  }}
                  className={
                    "issue-row" +
                    (i.id === selectedId ? " selected" : "") +
                    (dragId === i.id ? " dragging" : "")
                  }
                  onClick={() => onSelect(i.id)}
                >
                  <span className="issue-key">
                    <Highlight text={i.displayKey} query={query} />
                  </span>
                  <button
                    className="status-cycle"
                    title={`改为「${STATUS_META[nextStatus(i.status)].label}」`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(i.id, nextStatus(i.status));
                    }}
                  >
                    <StatusIcon status={i.status} size={14} />
                  </button>
                  <PriorityIcon priority={i.priority} size={13} />
                  <span className="issue-title">
                    <Highlight text={i.title} query={query} />
                  </span>
                  {searching && !matchesText(i, query) && (
                    <span className="comment-hit" title="命中评论内容">评论</span>
                  )}
                  {i.ghRepo && <Github size={12} className="row-gh" />}
                  <span className="issue-date">{fmtDate(i.updatedAt)}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
