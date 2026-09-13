import { CalendarRange, ListTodo, Moon, Plus, Settings, Sun } from "lucide-react";
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
        <button
          className={"nav-item" + (view.kind === "all" ? " active" : "")}
          onClick={() => onNavigate({ kind: "all" })}
        >
          <ListTodo size={15} />
          <span className="nav-label">全部问题</span>
        </button>

        <div className="nav-section">
          <div className="nav-section-head">
            <span>项目</span>
            <button className="icon-btn sm" onClick={onNewProject} title="新建项目">
              <Plus size={13} />
            </button>
          </div>
          {projects.map((p) => (
            <button
              key={p.id}
              className={"nav-item" + (view.kind === "project" && view.id === p.id ? " active" : "")}
              onClick={() => onNavigate({ kind: "project", id: p.id })}
            >
              <span className="dot" style={{ background: p.color }} />
              <span className="nav-label">{p.name}</span>
              {issueCountByProject[p.id] > 0 && (
                <span className="nav-count">{issueCountByProject[p.id]}</span>
              )}
            </button>
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
            <button
              key={c.id}
              className={"nav-item" + (view.kind === "cycle" && view.id === c.id ? " active" : "")}
              onClick={() => onNavigate({ kind: "cycle", id: c.id })}
            >
              <CalendarRange size={15} color="var(--text-3)" />
              <span className="nav-label">{c.name}</span>
            </button>
          ))}
          {cycles.length === 0 && <div className="nav-empty">暂无周期</div>}
        </div>
      </nav>

      <div className="side-footer">
        <button className="nav-item" onClick={onOpenSettings}>
          <Settings size={15} />
          <span className="nav-label">设置</span>
        </button>
      </div>
    </aside>
  );
}
