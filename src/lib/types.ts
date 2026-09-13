export type Status = "backlog" | "todo" | "in_progress" | "done" | "canceled";
export type Priority = "urgent" | "high" | "medium" | "low" | "none";

export interface Issue {
  id: string;
  seq: number;
  displayKey: string;
  projectId: string | null;
  cycleId: string | null;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  ghRepo: string | null;
  ghNumber: number | null;
  ghState: string | null;
  ghTitle: string | null;
  ghUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  prefix: string;
  color: string;
  description: string;
  createdAt: string;
}

export interface Cycle {
  id: string;
  projectId: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  issueId: string;
  name: string;
  size: number;
  path: string;
  createdAt: string;
}

export type View =
  | { kind: "all" }
  | { kind: "project"; id: string }
  | { kind: "cycle"; id: string };

export const STATUS_ORDER: Status[] = [
  "in_progress",
  "todo",
  "backlog",
  "done",
  "canceled",
];

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  in_progress: { label: "进行中", color: "#F5B83D" },
  todo: { label: "待办", color: "#9AA0B4" },
  backlog: { label: "未排期", color: "#6B7080" },
  done: { label: "已完成", color: "#58C48F" },
  canceled: { label: "已取消", color: "#E5566A" },
};

export const PRIORITY_ORDER: Priority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

export const PRIORITY_META: Record<Priority, { label: string }> = {
  urgent: { label: "紧急" },
  high: { label: "高" },
  medium: { label: "中" },
  low: { label: "低" },
  none: { label: "无" },
};
