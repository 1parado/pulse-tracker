import DOMPurify from "dompurify";
import { marked } from "marked";
import { openUrl } from "@tauri-apps/plugin-opener";

marked.setOptions({ gfm: true, breaks: true, async: false });

// 链接在新窗口打开失败时由点击委托兜底（见 bindMarkdownLinks）
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderMarkdown(src: string): string {
  const html = marked.parse(src ?? "") as string;
  return DOMPurify.sanitize(html);
}

/** 渲染后的富文本块；容器内链接点击交给系统浏览器打开 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = renderMarkdown(text);
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    openUrl(href).catch(() => {});
  };
  return (
    <div
      className={"markdown-body" + (className ? ` ${className}` : "")}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
