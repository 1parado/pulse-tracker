import { Archive, CalendarRange, ListTodo, Moon, Pencil, Plus, Settings, Sun, Trash2 } from "lucide-react";
import type { Cycle, Project, View } from "../lib/types";

export function Sidebar({
  projects,
  cycles,
  view,
  issueCountByProject,
  theme,
  onNavigate,
  onNewProject,
  onNewCycle,
  onEditProject,
  onDeleteProject,
  onEditCycle,
  onDeleteCycle,
  onOpenArchive,
  onOpenSettings,
  onToggleTheme,
}: {
  projects: Project[];
  cycles: Cycle[];
  view: View;
  issueCountByProject: Record<string, number>;
  theme: "dark" | "light";
  onNavigate: (v: View) => void;
  onNewProject: () => void;
  onNewCycle: () => void;
  onEditProject: (p: Project) => void;
  onDeleteProject: (p: Project) => void;
  onEditCycle: (c: Cycle) => void;
  onDeleteCycle: (c: Cycle) => void;
  onOpenArchive: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="side-header">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">Pulse</span>
        </div>
        <button className="icon-btn" onClick={onToggleTheme} title="切换主题">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <nav className="side-nav">
        <div
          className={"nav-item" + (view.kind === "all" ? " active" : "")}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate({ kind: "all" })}
          onKeyDown={(e) => e.key === "Enter" && onNavigate({ kind: "all" })}
        >
          <ListTodo size={15} />
          <span className="nav-label">全部问题</span>
        </div>

        <div
          className={"nav-item" + (view.kind === "archive" ? " active" : "")}
          role="button"
          tabIndex={0}
          onClick={onOpenArchive}
          onKeyDown={(e) => e.key === "Enter" && onOpenArchive()}
        >
          <Archive size={15} />
          <span className="nav-label">归档</span>
        </div>

        <div className="nav-section">
          <div className="nav-section-head">
            <span>项目</span>
            <button className="icon-btn sm" onClick={onNewProject} title="新建项目">
              <Plus size={13} />
            </button>
          </div>
          {projects.map((p) => (
            <div
              key={p.id}
              className={"nav-item" + (view.kind === "project" && view.id === p.id ? " active" : "")}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate({ kind: "project", id: p.id })}
              onKeyDown={(e) => e.key === "Enter" && onNavigate({ kind: "project", id: p.id })}
            >
              <span className="dot" style={{ background: p.color }} />
              <span className="nav-label">{p.name}</span>
              {issueCountByProject[p.id] > 0 && (
                <span className="nav-count">{issueCountByProject[p.id]}</span>
              )}
              <span className="nav-actions">
                <button className="icon-btn sm" title="编辑项目" onClick={(e) => { e.stopPropagation(); onEditProject(p); }}>
                  <Pencil size={12} />
                </button>
                <button className="icon-btn sm danger" title="删除项目" onClick={(e) => { e.stopPropagation(); onDeleteProject(p); }}>
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          ))}
          {projects.length === 0 && <div className="nav-empty">暂无项目</div>}
        </div>

        <div className="nav-section">
          <div className="nav-section-head">
            <span>周期</span>
            <button className="icon-btn sm" onClick={onNewCycle} title="新建周期">
              <Plus size={13} />
            </button>
          </div>
          {cycles.map((c) => (
            <div
              key={c.id}
              className={"nav-item" + (view.kind === "cycle" && view.id === c.id ? " active" : "")}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate({ kind: "cycle", id: c.id })}
              onKeyDown={(e) => e.key === "Enter" && onNavigate({ kind: "cycle", id: c.id })}
            >
              <CalendarRange size={15} color="var(--text-3)" />
              <span className="nav-label">{c.name}</span>
              <span className="nav-actions">
                <button className="icon-btn sm" title="编辑周期" onClick={(e) => { e.stopPropagation(); onEditCycle(c); }}>
                  <Pencil size={12} />
                </button>
                <button className="icon-btn sm danger" title="删除周期" onClick={(e) => { e.stopPropagation(); onDeleteCycle(c); }}>
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          ))}
          {cycles.length === 0 && <div className="nav-empty">暂无周期</div>}
        </div>
      </nav>

      <div className="side-footer">
        <div className="nav-item" role="button" tabIndex={0} onClick={onOpenSettings} onKeyDown={(e) => e.key === "Enter" && onOpenSettings()}>
          <Settings size={15} />
          <span className="nav-label">设置</span>
        </div>
      </div>
    </aside>
  );
}
