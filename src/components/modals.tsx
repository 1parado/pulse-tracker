import { useEffect, useState } from "react";
import type { Cycle, Issue, Project, Status } from "../lib/types";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from "../lib/types";
import { api } from "../lib/api";
import { Modal } from "./common";

export function NewIssueModal({
  open,
  onClose,
  projects,
  cycles,
  defaultProjectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  cycles: Cycle[];
  defaultProjectId: string | null;
  onCreated: (i: Issue) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Issue["priority"]>("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDesc("");
      setProjectId(defaultProjectId ?? "");
      setCycleId("");
      setStatus("todo");
      setPriority("none");
    }
  }, [open, defaultProjectId]);

  if (!open) return null;

  const cycleOptions = cycles.filter((c) => !projectId || c.projectId === projectId);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const created = await api.createIssue({
        title: title.trim(),
        description: desc || null,
        projectId: projectId || null,
        cycleId: cycleId || null,
        status,
        priority,
      });
      onCreated(created);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="新建问题" onClose={onClose} width={560}>
      <div className="modal-body">
        <input
          className="input title-input"
          autoFocus
          placeholder="问题标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
        />
        <textarea
          className="textarea"
          placeholder="描述（可选）"
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="form-grid">
          <label className="prop">
            <span className="prop-label">项目</span>
            <select className="select" value={projectId} onChange={(e) => { setProjectId(e.target.value); setCycleId(""); }}>
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">周期</span>
            <select className="select" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">无</option>
              {cycleOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">状态</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">优先级</span>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Issue["priority"])}>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="modal-foot">
        <span className="foot-hint">Ctrl+Enter 快速创建</span>
        <button className="btn primary" disabled={!title.trim() || busy} onClick={submit}>
          创建
        </button>
      </div>
    </Modal>
  );
}

export function NewProjectModal({
  open,
  onClose,
  editing,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Project | null;
  onCreated: (p: Project) => void;
  onUpdated: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [color, setColor] = useState("#6E7BF2");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPrefix(editing?.prefix ?? "");
      setColor(editing?.color ?? "#6E7BF2");
      setDesc(editing?.description ?? "");
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) {
        const p = await api.updateProject({
          id: editing.id,
          name: name.trim(),
          prefix: prefix.trim() || editing.prefix,
          color,
          description: desc.trim(),
        });
        onUpdated(p);
      } else {
        const p = await api.createProject({ name: name.trim(), prefix: prefix || undefined, color });
        onCreated(p);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const COLORS = ["#6E7BF2", "#58C48F", "#F5B83D", "#E5566A", "#4CB8E8", "#C77DE8"];

  return (
    <Modal title={editing ? "编辑项目" : "新建项目"} onClose={onClose} width={440}>
      <div className="modal-body">
        <input
          className="input"
          autoFocus
          placeholder="项目名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <div className="form-grid two">
          <label className="prop">
            <span className="prop-label">问题前缀（如 PLS）</span>
            <input
              className="input"
              placeholder="自动生成"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={5}
            />
          </label>
          <div className="prop">
            <span className="prop-label">颜色</span>
            <div className="color-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={"color-dot" + (color === c ? " active" : "")}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <label className="prop">
          <span className="prop-label">描述（可选）</span>
          <input
            className="input"
            placeholder="这个项目是做什么的"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </label>
        {editing && (
          <p className="form-note">修改前缀不影响已生成的问题编号。</p>
        )}
      </div>
      <div className="modal-foot">
        <span />
        <button className="btn primary" disabled={!name.trim() || busy} onClick={submit}>
          {editing ? "保存" : "创建"}
        </button>
      </div>
    </Modal>
  );
}

export function NewCycleModal({
  open,
  onClose,
  projects,
  editing,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  editing?: Cycle | null;
  onCreated: (c: Cycle) => void;
  onUpdated: (c: Cycle) => void;
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setProjectId(editing?.projectId ?? "");
      setStart(editing?.startDate ?? "");
      setEnd(editing?.endDate ?? "");
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) {
        const c = await api.updateCycle({
          id: editing.id,
          name: name.trim(),
          projectId: projectId || null,
          startDate: start || null,
          endDate: end || null,
        });
        onUpdated(c);
      } else {
        const c = await api.createCycle({
          name: name.trim(),
          projectId: projectId || null,
          startDate: start || null,
          endDate: end || null,
        });
        onCreated(c);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? "编辑周期" : "新建周期"} onClose={onClose} width={440}>
      <div className="modal-body">
        <input
          className="input"
          autoFocus
          placeholder="周期名称（如 Sprint 1）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <div className="form-grid two">
          <label className="prop">
            <span className="prop-label">所属项目</span>
            <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div />
          <label className="prop">
            <span className="prop-label">开始日期</span>
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="prop">
            <span className="prop-label">结束日期</span>
            <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        {editing && (
          <p className="form-note">更换所属项目后，原挂靠在该周期的问题将脱离周期。</p>
        )}
      </div>
      <div className="modal-foot">
        <span />
        <button className="btn primary" disabled={!name.trim() || busy} onClick={submit}>
          {editing ? "保存" : "创建"}
        </button>
      </div>
    </Modal>
  );
}

export function SettingsModal({
  open,
  onClose,
  displayName,
  ghToken,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  ghToken: string;
  onSave: (displayName: string, ghToken: string) => void;
}) {
  const [dn, setDn] = useState(displayName);
  const [gt, setGt] = useState(ghToken);

  useEffect(() => {
    if (open) {
      setDn(displayName);
      setGt(ghToken);
    }
  }, [open, displayName, ghToken]);

  if (!open) return null;

  return (
    <Modal title="设置" onClose={onClose} width={440}>
      <div className="modal-body">
        <label className="prop">
          <span className="prop-label">显示名（评论作者）</span>
          <input className="input" value={dn} onChange={(e) => setDn(e.target.value)} placeholder="我" />
        </label>
        <label className="prop">
          <span className="prop-label">GitHub Token（访问私有仓库需要）</span>
          <input
            className="input"
            type="password"
            value={gt}
            onChange={(e) => setGt(e.target.value)}
            placeholder="ghp_…（可选）"
          />
        </label>
        <p className="form-note">Token 仅保存在本机数据库中，用于调用 GitHub API。</p>
      </div>
      <div className="modal-foot">
        <span />
        <button className="btn primary" onClick={() => onSave(dn.trim(), gt.trim())}>
          保存
        </button>
      </div>
    </Modal>
  );
}
