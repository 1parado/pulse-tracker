import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  Folder,
  FolderPlus,
  Moon,
  Plus,
  Settings as SettingsIcon,
  StickyNote as StickyNoteIcon,
  Sun,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { api } from "./lib/api";
import { toast, ToastHost } from "./lib/toast";
import type { Cycle, Issue, Project, Status, View } from "./lib/types";
import { STATUS_ORDER } from "./lib/types";
import { Sidebar } from "./components/Sidebar";
import { IssueList } from "./components/IssueList";
import { IssueDetail } from "./components/IssueDetail";
import { CommandPalette } from "./components/CommandPalette";
import { NewCycleModal, NewIssueModal, NewProjectModal, SettingsModal } from "./components/modals";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("pulse.theme") as "dark" | "light") || "dark"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pulse.theme", theme);
  }, [theme]);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [view, setView] = useState<View>({ kind: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stickyIds, setStickyIds] = useState<string[]>([]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [ghToken, setGhToken] = useState("");

  const refresh = useCallback(async () => {
    const [i, p, c] = await Promise.all([api.listIssues(), api.listProjects(), api.listCycles()]);
    setIssues(i);
    setProjects(p);
    setCycles(c);
  }, []);

  useEffect(() => {
    refresh();
    api.getSetting("display_name").then((v) => setDisplayName(v ?? "")).catch(() => {});
    api.getSetting("github_token").then((v) => setGhToken(v ?? "")).catch(() => {});
    api.listStickies().then(setStickyIds).catch(() => {});
  }, [refresh]);

  // 托盘菜单「新建问题」
  useEffect(() => {
    const un = listen("tray://new-issue", () => setNewIssueOpen(true));
    return () => {
      un.then((f) => f()).catch(() => {});
    };
  }, []);

  const visible = useMemo(() => {
    if (view.kind === "project") return issues.filter((i) => i.projectId === view.id);
    if (view.kind === "cycle") return issues.filter((i) => i.cycleId === view.id);
    return issues;
  }, [issues, view]);

  const flat = useMemo(
    () => STATUS_ORDER.flatMap((s) => visible.filter((i) => i.status === s)),
    [visible]
  );
  const flatRef = useRef<Issue[]>(flat);
  useEffect(() => {
    flatRef.current = flat;
  }, [flat]);

  const selected = issues.find((i) => i.id === selectedId) ?? null;

  const move = useCallback(
    (d: number) => {
      const list = flatRef.current;
      if (list.length === 0) return;
      const idx = list.findIndex((i) => i.id === selectedId);
      const next = idx === -1 ? 0 : Math.min(list.length - 1, Math.max(0, idx + d));
      setSelectedId(list[next].id);
    },
    [selectedId]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

      const anyModal = paletteOpen || newIssueOpen || newProjectOpen || newCycleOpen || settingsOpen;
      if (anyModal) {
        if (e.key === "Escape") {
          setPaletteOpen(false);
          setNewIssueOpen(false);
          setNewProjectOpen(false);
          setNewCycleOpen(false);
          setSettingsOpen(false);
        }
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "c") {
        setNewIssueOpen(true);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onIssueUpdated = (u: Issue) => setIssues((list) => list.map((i) => (i.id === u.id ? u : i)));
  const onIssueDeleted = (id: string) => {
    setIssues((list) => list.filter((i) => i.id !== id));
    setSelectedId(null);
  };
  const onIssueCreated = (i: Issue) => {
    setIssues((list) => [i, ...list]);
    setSelectedId(i.id);
  };

  const onStatusChange = (id: string, status: Status) => {
    api
      .updateIssue({ id, status })
      .then(onIssueUpdated)
      .catch((e) => toast(`状态更新失败：${e}`, "error"));
  };

  const toggleSticky = (issue: Issue) => {
    const pinned = stickyIds.includes(issue.id);
    const call = pinned ? api.closeSticky(issue.id) : api.openSticky(issue.id);
    call
      .then(() => api.listStickies())
      .then((ids) => {
        setStickyIds(ids);
        toast(pinned ? "已取消桌面便签" : "已钉到桌面，随时可见", "ok");
      })
      .catch((e) => toast(pinned ? `取消便签失败：${e}` : `钉便签失败：${e}`, "error"));
  };

  const issueCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of issues) {
      if (i.projectId) map[i.projectId] = (map[i.projectId] ?? 0) + 1;
    }
    return map;
  }, [issues]);

  const viewInfo = useMemo(() => {
    const pct = (list: Issue[]) => {
      const done = list.filter((i) => i.status === "done").length;
      const canceled = list.filter((i) => i.status === "canceled").length;
      const denom = list.length - canceled;
      return denom > 0 ? done / denom : 0;
    };
    if (view.kind === "project") {
      const p = projects.find((x) => x.id === view.id);
      return {
        title: p?.name ?? "项目",
        sub: `${visible.length} 个问题`,
        progress: visible.length > 0 ? pct(visible) : null,
      };
    }
    if (view.kind === "cycle") {
      const c = cycles.find((x) => x.id === view.id);
      const range =
        c?.startDate || c?.endDate ? `${c?.startDate ?? "…"} → ${c?.endDate ?? "…"}` : undefined;
      return {
        title: c?.name ?? "周期",
        sub: range ?? `${visible.length} 个问题`,
        progress: visible.length > 0 ? pct(visible) : null,
      };
    }
    return { title: "全部问题", sub: `${issues.length} 个问题`, progress: null };
  }, [view, visible, projects, cycles, issues.length]);

  const saveSettings = async (dn: string, gt: string) => {
    await api.setSetting("display_name", dn);
    await api.setSetting("github_token", gt);
    setDisplayName(dn);
    setGhToken(gt);
    setSettingsOpen(false);
  };

  // ---------- 项目 / 周期管理 ----------

  const deleteProject = async (p: Project) => {
    const n = issueCountByProject[p.id] ?? 0;
    const msg = n > 0
      ? `删除项目「${p.name}」？其中 ${n} 个问题将变为未分配，其周期将一并删除。`
      : `删除项目「${p.name}」？`;
    if (!confirm(msg)) return;
    try {
      await api.deleteProject(p.id);
      setProjects((list) => list.filter((x) => x.id !== p.id));
      setCycles((list) => list.filter((c) => c.projectId !== p.id));
      setIssues((list) =>
        list.map((i) => (i.projectId === p.id ? { ...i, projectId: null, cycleId: null } : i))
      );
      setView((v) => (v.kind === "project" && v.id === p.id ? { kind: "all" } : v));
      toast(`已删除项目「${p.name}」`, "ok");
    } catch (e) {
      toast(`删除项目失败：${e}`, "error");
    }
  };

  const deleteCycle = async (c: Cycle) => {
    if (!confirm(`删除周期「${c.name}」？其中的问题将保留并脱离周期。`)) return;
    try {
      await api.deleteCycle(c.id);
      setCycles((list) => list.filter((x) => x.id !== c.id));
      setIssues((list) =>
        list.map((i) => (i.cycleId === c.id ? { ...i, cycleId: null } : i))
      );
      setView((v) => (v.kind === "cycle" && v.id === c.id ? { kind: "all" } : v));
      toast(`已删除周期「${c.name}」`, "ok");
    } catch (e) {
      toast(`删除周期失败：${e}`, "error");
    }
  };

  const projectUpdated = (p: Project) => {
    setProjects((list) => list.map((x) => (x.id === p.id ? p : x)));
  };

  const cycleUpdated = (c: Cycle) => {
    setCycles((list) => list.map((x) => (x.id === c.id ? c : x)));
    // 更换所属项目后后端已将问题脱离周期，全量刷新保持一致
    refresh();
  };

  const navigateAndClose = (v: View) => {
    setView(v);
    setSelectedId(null);
  };

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        cycles={cycles}
        view={view}
        issueCountByProject={issueCountByProject}
        theme={theme}
        onNavigate={navigateAndClose}
        onNewProject={() => setNewProjectOpen(true)}
        onNewCycle={() => setNewCycleOpen(true)}
        onEditProject={(p) => setEditingProject(p)}
        onDeleteProject={deleteProject}
        onEditCycle={(c) => setEditingCycle(c)}
        onDeleteCycle={deleteCycle}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <IssueList
        title={viewInfo.title}
        subtitle={viewInfo.sub}
        issues={visible}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNewIssue={() => setNewIssueOpen(true)}
        progress={viewInfo.progress}
        onStatusChange={onStatusChange}
      />

      <IssueDetail
        issue={selected}
        projects={projects}
        cycles={cycles}
        onUpdated={onIssueUpdated}
        onDeleted={onIssueDeleted}
        stickyPinned={selected != null && stickyIds.includes(selected.id)}
        onToggleSticky={toggleSticky}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        issues={issues}
        projects={projects}
        cycles={cycles}
        actions={[
          { label: "新建问题", icon: <Plus size={14} />, run: () => setNewIssueOpen(true) },
          { label: "新建项目", icon: <FolderPlus size={14} />, run: () => setNewProjectOpen(true) },
          { label: "新建周期", icon: <CalendarPlus size={14} />, run: () => setNewCycleOpen(true) },
          { label: "打开设置", icon: <SettingsIcon size={14} />, run: () => setSettingsOpen(true) },
          {
            label: "切换主题",
            icon: theme === "dark" ? <Sun size={14} /> : <Moon size={14} />,
            run: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
          },
          ...(selected
            ? [
                {
                  label: stickyIds.includes(selected.id)
                    ? "取消当前问题的桌面便签"
                    : "把当前问题钉为桌面便签",
                  icon: <StickyNoteIcon size={14} />,
                  run: () => toggleSticky(selected),
                },
              ]
            : []),
        ]}
        onSelectIssue={(id) => setSelectedId(id)}
        onNavigate={navigateAndClose}
      />

      <NewIssueModal
        open={newIssueOpen}
        onClose={() => setNewIssueOpen(false)}
        projects={projects}
        cycles={cycles}
        defaultProjectId={view.kind === "project" ? view.id : null}
        onCreated={onIssueCreated}
      />

      <NewProjectModal
        open={newProjectOpen || editingProject != null}
        editing={editingProject}
        onClose={() => {
          setNewProjectOpen(false);
          setEditingProject(null);
        }}
        onCreated={(p) => {
          setProjects((list) => [...list, p]);
          setView({ kind: "project", id: p.id });
        }}
        onUpdated={projectUpdated}
      />

      <NewCycleModal
        open={newCycleOpen || editingCycle != null}
        projects={projects}
        editing={editingCycle}
        onClose={() => {
          setNewCycleOpen(false);
          setEditingCycle(null);
        }}
        onCreated={(c) => {
          setCycles((list) => [...list, c]);
          setView({ kind: "cycle", id: c.id });
        }}
        onUpdated={cycleUpdated}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        displayName={displayName}
        ghToken={ghToken}
        onSave={saveSettings}
      />

      <ToastHost />
    </div>
  );
}
