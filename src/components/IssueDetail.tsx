import { useEffect, useRef, useState } from "react";
import { ExternalLink, Eye, FileText, Github, MessageSquare, MousePointerClick, Paperclip, Pencil, Plus, RefreshCw, StickyNote as StickyNoteIcon, Trash2, Unlink, X } from "lucide-react";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { api, type UpdateIssueInput } from "../lib/api";
import { toast } from "../lib/toast";
import { Markdown } from "../lib/markdown";
import type { Attachment, Comment, Cycle, Issue, Project, Status } from "../lib/types";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from "../lib/types";
import { fmtDate, fmtSize } from "./common";

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function IssueDetail({
  issue,
  projects,
  cycles,
  onUpdated,
  onDeleted,
  stickyPinned,
  onToggleSticky,
}: {
  issue: Issue | null;
  projects: Project[];
  cycles: Cycle[];
  onUpdated: (i: Issue) => void;
  onDeleted: (id: string) => void;
  stickyPinned: boolean;
  onToggleSticky: (i: Issue) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("edit");
  const [ghInput, setGhInput] = useState("");
  const [ghBusy, setGhBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!issue) {
      setComments([]);
      setAttachments([]);
      return;
    }
    setTitleDraft(issue.title);
    setDescDraft(issue.description);
    setDescMode("edit");
    setGhInput(issue.ghRepo && issue.ghNumber ? `${issue.ghRepo}#${issue.ghNumber}` : "");
    api.listComments(issue.id).then(setComments).catch(() => setComments([]));
    api.listAttachments(issue.id).then(setAttachments).catch(() => setAttachments([]));
  }, [issue?.id]);

  // 描述输入框自适应高度
  useEffect(() => {
    const el = descRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [descDraft]);

  if (!issue) {
    return (
      <section className="detail-pane">
        <div className="empty small">
          <MousePointerClick size={24} />
          <p>选择一个问题查看详情</p>
          <p className="hint">j / k 移动 · c 新建 · Ctrl+K 命令面板</p>
        </div>
      </section>
    );
  }

  const patch = async (input: Omit<UpdateIssueInput, "id">) => {
    try {
      const updated = await api.updateIssue({ id: issue.id, ...input });
      onUpdated(updated);
    } catch (e) {
      toast(`保存失败：${e}`, "error");
    }
  };

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft !== issue.title) patch({ title: titleDraft.trim() });
  };
  const saveDesc = () => {
    if (descDraft !== issue.description) patch({ description: descDraft });
  };

  const submitComment = async () => {
    const body = commentDraft.trim();
    if (!body) return;
    try {
      const c = await api.addComment(issue.id, body);
      setCommentDraft("");
      setComments((list) => [...list, c]);
    } catch (e) {
      toast(`评论发送失败：${e}`, "error");
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      try {
        const data = await toBase64(f);
        const att = await api.addAttachment(issue.id, f.name, data);
        setAttachments((list) => [...list, att]);
      } catch (e) {
        toast(`上传 ${f.name} 失败：${e}`, "error");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const delAttachment = async (id: string) => {
    await api.deleteAttachment(id);
    setAttachments((list) => list.filter((a) => a.id !== id));
  };

  const linkGithub = async () => {
    const v = ghInput.trim();
    if (!v || ghBusy) return;
    setGhBusy(true);
    try {
      const linked = v.match(/^([\w.-]+\/[\w.-]+?)#(\d+)$/);
      if (linked) {
        const updated = await api.githubSync(issue.id, linked[1], Number(linked[2]));
        onUpdated(updated);
        toast("已链接并拉取远端内容", "ok");
      } else if (/^[\w.-]+\/[\w.-]+$/.test(v)) {
        const updated = await api.pushToGithub(issue.id, v);
        onUpdated(updated);
        toast("已推送到 GitHub 并建立链接", "ok");
      } else {
        toast("格式应为 owner/repo 或 owner/repo#123", "error");
        return;
      }
    } catch (e) {
      toast(`GitHub 操作失败：${e}`, "error");
    } finally {
      setGhBusy(false);
    }
  };

  const unlinkGithub = () => {
    setGhInput("");
    patch({ clearGithub: true });
  };

  const delIssue = async () => {
    if (!confirm(`删除问题 ${issue.displayKey}？评论与附件将一并删除。`)) return;
    await api.deleteIssue(issue.id);
    onDeleted(issue.id);
  };

  const cycleOptions = cycles.filter((c) => !issue.projectId || c.projectId === issue.projectId);
  const ghStateColor =
    issue.ghState === "open" ? "var(--ok)" : issue.ghState === "closed" ? "#A371F7" : "var(--text-3)";

  return (
    <section className="detail-pane">
      <div className="detail-head">
        <span className="issue-key big">{issue.displayKey}</span>
        <div className="detail-head-actions">
          <button
            className={"icon-btn" + (stickyPinned ? " pinned" : "")}
            onClick={() => onToggleSticky(issue)}
            title={stickyPinned ? "取消桌面便签" : "钉为桌面便签"}
          >
            <StickyNoteIcon size={15} />
          </button>
          <button className="icon-btn" onClick={delIssue} title="删除问题">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="detail-scroll">
        <input
          className="detail-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          placeholder="问题标题"
        />

        <div className="prop-grid">
          <label className="prop">
            <span className="prop-label">状态</span>
            <select
              className="select"
              value={issue.status}
              onChange={(e) => patch({ status: e.target.value as Status })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">优先级</span>
            <select
              className="select"
              value={issue.priority}
              onChange={(e) => patch({ priority: e.target.value as Issue["priority"] })}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">项目</span>
            <select
              className="select"
              value={issue.projectId ?? ""}
              onChange={(e) =>
                e.target.value === ""
                  ? patch({ clearProject: true })
                  : patch({ projectId: e.target.value })
              }
            >
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="prop">
            <span className="prop-label">周期</span>
            <select
              className="select"
              value={issue.cycleId ?? ""}
              onChange={(e) =>
                e.target.value === "" ? patch({ clearCycle: true }) : patch({ cycleId: e.target.value })
              }
            >
              <option value="">无</option>
              {cycleOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="gh-card">
          <div className="gh-head">
            <Github size={14} />
            <span>GitHub</span>
            {issue.ghRepo && (
              <span className="gh-state" style={{ color: ghStateColor }}>
                {issue.ghState === "open" ? "● open" : issue.ghState === "closed" ? "● closed" : ""}
              </span>
            )}
          </div>
          {issue.ghRepo ? (
            <>
              <div className="gh-linked">
                <span className="gh-ref">{issue.ghRepo}#{issue.ghNumber}</span>
                <span className="gh-title">{issue.ghTitle}</span>
              </div>
              <div className="gh-actions">
                {issue.ghUrl && (
                  <button className="btn ghost sm" onClick={() => openUrl(issue.ghUrl!)}>
                    <ExternalLink size={13} />打开
                  </button>
                )}
                <button className="btn ghost sm" disabled={ghBusy} onClick={linkGithub} title="拉取元数据与评论，推送本地状态与评论">
                  <RefreshCw size={13} className={ghBusy ? "spin" : ""} />同步
                </button>
                <button className="btn ghost sm" onClick={unlinkGithub}>
                  <Unlink size={13} />解除
                </button>
              </div>
            </>
          ) : (
            <div className="gh-link-row">
              <input
                className="input"
                placeholder="owner/repo#123 链接已有 · owner/repo 推送新建"
                value={ghInput}
                onChange={(e) => setGhInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") linkGithub();
                }}
              />
              <button className="btn primary sm" disabled={ghBusy || !ghInput.trim()} onClick={linkGithub}>
                {ghInput.includes("#") ? "链接" : "推送"}
              </button>
            </div>
          )}
        </div>

        <div className="desc-block">
          <div className="desc-toolbar">
            <button
              className={"md-toggle" + (descMode === "edit" ? " on" : "")}
              title="编辑描述"
              onClick={() => setDescMode("edit")}
            >
              <Pencil size={12} /> 编辑
            </button>
            <button
              className={"md-toggle" + (descMode === "preview" ? " on" : "")}
              title="预览 Markdown"
              onClick={() => {
                if (descDraft !== issue.description) saveDesc();
                setDescMode("preview");
              }}
            >
              <Eye size={12} /> 预览
            </button>
          </div>
          {descMode === "edit" ? (
            <textarea
              ref={descRef}
              className="detail-desc"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDesc}
              placeholder="添加描述…（支持 Markdown）"
              rows={2}
            />
          ) : (
            <Markdown
              text={descDraft}
              className={descDraft.trim() ? "" : "md-empty"}
            />
          )}
        </div>

        <div className="detail-section">
          <div className="section-head">
            <MessageSquare size={14} />
            <span>评论 · {comments.length}</span>
          </div>
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment-avatar">{c.author.slice(0, 1)}</div>
              <div className="comment-main">
                <div className="comment-meta">
                  <span className="comment-author">
                    {c.author.startsWith("gh:") && <Github size={11} className="comment-gh" />}
                    {c.author.startsWith("gh:") ? c.author.slice(3) : c.author}
                  </span>
                  <span className="comment-time">{fmtDate(c.createdAt)}</span>
                  <button className="icon-btn sm" onClick={() => {
                    api.deleteComment(c.id).then(() =>
                      setComments((list) => list.filter((x) => x.id !== c.id))
                    );
                  }} title="删除评论">
                    <X size={12} />
                  </button>
                </div>
                <Markdown text={c.body} className="comment-md" />
              </div>
            </div>
          ))}
          <div className="composer">
            <textarea
              className="textarea"
              value={commentDraft}
              placeholder="写下评论，支持 Markdown（Ctrl+Enter 发送）"
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment();
              }}
              rows={2}
            />
            <button className="btn primary sm" disabled={!commentDraft.trim()} onClick={submitComment}>
              发送
            </button>
          </div>
        </div>

        <div className="detail-section">
          <div className="section-head">
            <Paperclip size={14} />
            <span>附件 · {attachments.length}</span>
            <button className="icon-btn sm" onClick={() => fileRef.current?.click()} title="添加附件">
              <Plus size={13} />
            </button>
          </div>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
          <div className="attach-list">
            {attachments.map((a) => (
              <div key={a.id} className="attach-chip">
                <FileText size={13} />
                <span className="attach-name" onClick={() => openPath(a.path)} title="打开文件">
                  {a.name}
                </span>
                <span className="attach-size">{fmtSize(a.size)}</span>
                <button className="icon-btn sm" onClick={() => delAttachment(a.id)} title="删除附件">
                  <X size={12} />
                </button>
              </div>
            ))}
            {attachments.length === 0 && <div className="attach-empty">暂无附件</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
