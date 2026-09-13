import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { Cycle, Issue, Project, View } from "../lib/types";

export interface PaletteAction {
  label: string;
  icon?: ReactNode;
  run: () => void;
}

interface Item {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  issues,
  projects,
  cycles,
  actions,
  onSelectIssue,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  actions: PaletteAction[];
  onSelectIssue: (id: string) => void;
  onNavigate: (v: View) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (label: string) => !q || label.toLowerCase().includes(q);
    const out: Item[] = [];
    for (const a of actions) {
      if (match(a.label)) {
        out.push({ key: `act-${a.label}`, group: "操作", label: a.label, icon: a.icon, run: a.run });
      }
    }
    if (match("全部问题")) {
      out.push({
        key: "nav-all",
        group: "跳转",
        label: "全部问题",
        run: () => onNavigate({ kind: "all" }),
      });
    }
    for (const p of projects) {
      if (match(p.name)) {
        out.push({
          key: `nav-p-${p.id}`,
          group: "跳转",
          label: p.name,
          hint: "项目",
          run: () => onNavigate({ kind: "project", id: p.id }),
        });
      }
    }
    for (const c of cycles) {
      if (match(c.name)) {
        out.push({
          key: `nav-c-${c.id}`,
          group: "跳转",
          label: c.name,
          hint: "周期",
          run: () => onNavigate({ kind: "cycle", id: c.id }),
        });
      }
    }
    for (const i of issues) {
      const hay = `${i.displayKey} ${i.title}`;
      if (!q || hay.toLowerCase().includes(q)) {
        out.push({
          key: `issue-${i.id}`,
          group: "问题",
          label: i.title,
          hint: i.displayKey,
          run: () => onSelectIssue(i.id),
        });
        if (out.length > 40) break;
      }
    }
    return out;
  }, [query, actions, issues, projects, cycles, onNavigate, onSelectIssue]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector(".palette-item.active");
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const runActive = () => {
    const it = items[active];
    if (!it) return;
    onClose();
    it.run();
  };

  let lastGroup = "";

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette">
        <div className="palette-input-row">
          <Search size={15} />
          <input
            className="palette-input"
            autoFocus
            placeholder="搜索问题、跳转或执行操作…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runActive();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <span className="palette-esc">esc</span>
        </div>
        <div className="palette-list" ref={listRef}>
          {items.length === 0 && <div className="palette-empty">没有匹配结果</div>}
          {items.map((it, idx) => {
            const showGroup = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <div key={it.key}>
                {showGroup && <div className="palette-group">{it.group}</div>}
                <div
                  className={"palette-item" + (idx === active ? " active" : "")}
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={runActive}
                >
                  {it.icon && <span className="palette-icon">{it.icon}</span>}
                  <span className="palette-label">{it.label}</span>
                  {it.hint && <span className="palette-hint">{it.hint}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="palette-footer">
          <span>↑↓ 选择</span>
          <span>↵ 执行</span>
        </div>
      </div>
    </div>
  );
}
