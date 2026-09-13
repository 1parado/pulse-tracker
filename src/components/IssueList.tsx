import { useState } from "react";
import { ChevronDown, Github, Inbox, Plus } from "lucide-react";
import type { Issue } from "../lib/types";
import { STATUS_META, STATUS_ORDER } from "../lib/types";
import { PriorityIcon, StatusIcon, fmtDate } from "./common";

export function IssueList({
  title,
  subtitle,
  issues,
  selectedId,
  onSelect,
  onNewIssue,
  progress,
}: {
  title: string;
  subtitle?: string;
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewIssue: () => void;
  progress?: number | null;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = STATUS_ORDER.map((s) => ({
    status: s,
    items: issues.filter((i) => i.status === s),
  })).filter((g) => g.items.length > 0);

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
          <div key={g.status} className="issue-group">
            <button
              className="group-header"
              onClick={() => setCollapsed((c) => ({ ...c, [g.status]: !c[g.status] }))}
            >
              <StatusIcon status={g.status} size={14} />
              <span className="group-name">{STATUS_META[g.status].label}</span>
              <span className="group-count">{g.items.length}</span>
              <ChevronDown size={13} className={"chev" + (collapsed[g.status] ? " closed" : "")} />
            </button>
            {!collapsed[g.status] &&
              g.items.map((i) => (
                <div
                  key={i.id}
                  className={"issue-row" + (i.id === selectedId ? " selected" : "")}
                  onClick={() => onSelect(i.id)}
                >
                  <span className="issue-key">{i.displayKey}</span>
                  <StatusIcon status={i.status} size={14} />
                  <PriorityIcon priority={i.priority} size={13} />
                  <span className="issue-title">{i.title}</span>
                  {i.ghRepo && <Github size={12} className="row-gh" />}
                  <span className="issue-date">{fmtDate(i.updatedAt)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
