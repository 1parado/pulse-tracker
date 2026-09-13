import { invoke } from "@tauri-apps/api/core";
import type { Attachment, Comment, Cycle, Issue, Project } from "./types";

export interface NewIssueInput {
  title: string;
  description?: string | null;
  projectId?: string | null;
  cycleId?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface UpdateIssueInput {
  id: string;
  title?: string | null;
  description?: string | null;
  projectId?: string | null;
  cycleId?: string | null;
  status?: string | null;
  priority?: string | null;
  clearProject?: boolean;
  clearCycle?: boolean;
  clearGithub?: boolean;
}

export const api = {
  // issues
  listIssues: () => invoke<Issue[]>("list_issues"),
  getIssue: (id: string) => invoke<Issue>("get_issue", { id }),
  searchIssues: (query: string) => invoke<Issue[]>("search_issues", { query }),
  createIssue: (input: NewIssueInput) => invoke<Issue>("create_issue", { input }),
  updateIssue: (input: UpdateIssueInput) => invoke<Issue>("update_issue", { input }),
  deleteIssue: (id: string) => invoke<void>("delete_issue", { id }),

  // projects
  listProjects: () => invoke<Project[]>("list_projects"),
  createProject: (input: {
    name: string;
    prefix?: string;
    color?: string;
    description?: string;
  }) => invoke<Project>("create_project", { input }),
  updateProject: (input: {
    id: string;
    name: string;
    prefix: string;
    color: string;
    description: string;
  }) => invoke<Project>("update_project", { input }),
  deleteProject: (id: string) => invoke<void>("delete_project", { id }),

  // cycles
  listCycles: () => invoke<Cycle[]>("list_cycles"),
  createCycle: (input: {
    name: string;
    projectId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }) => invoke<Cycle>("create_cycle", { input }),
  updateCycle: (input: {
    id: string;
    name: string;
    projectId: string | null;
    startDate: string | null;
    endDate: string | null;
  }) => invoke<Cycle>("update_cycle", { input }),
  deleteCycle: (id: string) => invoke<void>("delete_cycle", { id }),

  // comments
  listComments: (issueId: string) => invoke<Comment[]>("list_comments", { issueId }),
  addComment: (issueId: string, body: string) =>
    invoke<Comment>("add_comment", { input: { issueId, body } }),
  deleteComment: (id: string) => invoke<void>("delete_comment", { id }),

  // attachments
  listAttachments: (issueId: string) => invoke<Attachment[]>("list_attachments", { issueId }),
  addAttachment: (issueId: string, name: string, dataBase64: string) =>
    invoke<Attachment>("add_attachment", { input: { issueId, name, dataBase64 } }),
  deleteAttachment: (id: string) => invoke<void>("delete_attachment", { id }),

  // settings
  getSetting: (key: string) => invoke<string | null>("get_setting", { key }),
  setSetting: (key: string, value: string) => invoke<void>("set_setting", { key, value }),

  // github（双向同步：拉元数据/评论 + 推状态/评论；repo/number 缺省用已链接的）
  githubSync: (issueId: string, repo?: string, number?: number) =>
    invoke<Issue>("github_sync", { issueId, repo: repo ?? null, number: number ?? null }),
  pushToGithub: (issueId: string, repo: string) =>
    invoke<Issue>("github_push_issue", { issueId, repo }),

  // sticky notes（桌面便签）
  listStickies: () => invoke<string[]>("list_sticky_notes"),
  openSticky: (issueId: string) => invoke<void>("open_sticky_note", { issueId }),
  closeSticky: (issueId: string) => invoke<void>("close_sticky_note", { issueId }),
};
