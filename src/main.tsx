import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/sticky.css";
import App from "./App";
import { StickyNote } from "./components/StickyNote";
import { getCurrentWindow } from "@tauri-apps/api/window";

// 便签窗口复用同一个 index.html，按窗口 label 分支渲染
const label = getCurrentWindow().label;
const isSticky = label.startsWith("sticky-");
if (isSticky) {
  document.body.classList.add("is-sticky");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSticky ? <StickyNote issueId={label.slice("sticky-".length)} /> : <App />}
  </React.StrictMode>
);
