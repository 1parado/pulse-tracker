import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "./toast";

export type { Update };

function shortErr(e: unknown): string {
  const s = String(e);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

/** 下载安装更新并重启应用（toast 反馈贯穿全程） */
async function installAndRelaunch(update: Update) {
  try {
    toast("正在下载更新…", "info");
    await update.downloadAndInstall();
    toast("更新完成，即将重启应用", "ok");
    await relaunch();
  } catch (e) {
    toast("更新安装失败：" + shortErr(e), "error");
  }
}

/** 更新可用时的统一提示（带「立即更新」action） */
function promptUpdate(update: Update) {
  toast(`发现新版本 v${update.version}`, "info", {
    label: "立即更新",
    run: () => void installAndRelaunch(update),
  });
}

/** 手动检查入口（设置页按钮）：有更新给 action，无更新提示，失败报错 */
export async function manualCheckAndPrompt() {
  try {
    const update = await check({ timeout: 15000 });
    if (update) promptUpdate(update);
    else toast("当前已是最新版本", "ok");
  } catch (e) {
    toast("检查更新失败：" + shortErr(e), "error");
  }
}

/** 启动时静默检查：延迟 delayMs 后执行，失败不打扰用户 */
export async function silentStartupCheck(delayMs = 3000) {
  await new Promise((r) => setTimeout(r, delayMs));
  try {
    const update = await check({ timeout: 15000 });
    if (update) promptUpdate(update);
  } catch {
    // 静默失败：启动检查不弹错误
  }
}
