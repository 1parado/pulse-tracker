# AGENTS.md — Pulse 开发规范（AI Agent 与人类协作者必读）

> 本文件是本仓库的强制规范。任何改动（无论人类还是 AI）动手前必须先读完。
> 历史做法与本文件冲突时，以本文件为准。

## 1. 产品定位

**Pulse 是一个个人项目管理应用**：

- 本地优先的问题跟踪：项目 / 周期 / 问题 / 评论 / 附件 / GitHub 关联
- **桌面便签**：把任意待办问题钉在桌面上（无边框、置顶小窗口），随时可见、随手勾完成
- 对标 Linear 的交互质感，但只服务单人场景：轻量、快速、离线可用

## 2. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面框架 | Tauri 2 | Rust 核心 + 系统 WebView2，安装包 ~2.5MB |
| 后端 | Rust (stable, edition 2021) | rusqlite (bundled SQLite)、ureq、serde、serde_json、uuid |
| 前端 | Vite 5 + React 18 + TypeScript | @tauri-apps/api、@tauri-apps/plugin-opener、lucide-react、@fontsource-variable/inter |
| 样式 | 原创设计令牌系统 | `src/styles/tokens.css`（语义变量 --bg/--surface/--accent…，明暗双主题），组件样式在 `app.css`，便签窗口在 `sticky.css` |
| 包管理 | pnpm@9 | 版本只声明在 package.json 的 `packageManager` 字段，**禁止**在 workflow 里再写 version（会冲突） |
| 构建/发布 | GitHub Actions `.github/workflows/release.yml` | push `v*` tag → windows-latest → tauri-action → draft release → 手动转正 |

## 3. 强制要求（不可协商）

### 3.1 禁止本地编译

- **任何情况下不得在本地机器上编译 Rust 产物或打包安装文件。**
- Windows 构建只走 GitHub CI：commit 推 main → 打 `vX.Y.Z` tag 并推送 → CI 自动构建产出 draft release → `gh release edit --draft=false` 转正。
- 本地允许的验证仅限：`cargo check` / `cargo fmt --check` / `tsc` 类型检查（若环境可用）；连这些都不行时，完全依赖 CI 日志修复。
- workflow 里不要给 setup-node 配 `cache: pnpm`（仓库无 pnpm-lock.yaml，会直接报错）；install 用 `pnpm install --no-frozen-lockfile`。

### 3.2 单文件行数上限 3000 行

- 任何源码文件（.rs / .tsx / .ts / .css）超过 **3000 行**，必须按职责拆分后才能合入。
- 拆分方向：
  - Rust：commands 按域拆（issues / projects / cycles / comments / attachments / settings / github / notes），数据访问全部留在 db.rs
  - React：一个组件一个文件，工具与类型放 lib/
  - CSS：按窗口/页面域分文件（tokens / app / sticky…）
- 禁止用压缩代码、删注释的方式规避行数限制。

### 3.3 良好编程习惯

- 小步提交；commit message 说清楚「为什么」
- **不复制他人项目的代码**——可以借鉴设计气质，实现必须原创
- TypeScript：strict 模式，业务代码禁用 `any`（确需时注释原因）
- Rust：错误统一 `Result<T, String>` 映射；业务路径避免 `unwrap()/expect()`；锁的持有范围尽量小（不持锁做 IO/建窗口）
- 新增一个 Tauri 命令的固定四步：`models.rs`（新结构体，如需）→ `db.rs`（数据访问）→ `commands.rs`（`#[tauri::command]`）→ `main.rs` 注册 `generate_handler` + `lib/api.ts` 封装
- 新窗口 / 新插件记得同步 `src-tauri/capabilities/default.json`（windows 数组与 permissions）
- 发版 bump **三处**版本号：`src-tauri/tauri.conf.json`、`package.json`、`src-tauri/Cargo.toml`
- UI 文案统一简体中文；注释只解释「为什么」，不复述「是什么」
- 样式一律引用 tokens.css 的语义变量，禁止在组件里写裸色值（状态色等元数据除外，见 lib/types.ts）

## 4. 目录结构

```
pulse-tracker/
├── .github/workflows/release.yml   # CI：tag v* → Windows 构建
├── AGENTS.md                       # 本文件
├── index.html                      # Vite 入口（主窗口与便签窗口共用）
├── src/
│   ├── main.tsx                    # 按窗口 label 分支：main → App，sticky-* → StickyNote
│   ├── App.tsx                     # 主窗口三栏布局 + 全局状态 + 快捷键
│   ├── lib/
│   │   ├── api.ts                  # 全部 invoke 封装（前端唯一出口）
│   │   ├── types.ts                # 领域类型 + 状态/优先级元数据
│   │   └── toast.tsx               # 轻量 Toast 通知
│   ├── components/                 # Sidebar / IssueList / IssueDetail / CommandPalette / StickyNote / modals / common
│   └── styles/                     # tokens.css / app.css / sticky.css
└── src-tauri/
    ├── src/
    │   ├── main.rs                 # 应用入口：插件、setup（恢复便签）、命令注册
    │   ├── db.rs                   # SQLite schema + 全部数据访问
    │   ├── commands.rs             # #[tauri::command] 层
    │   ├── notes.rs                # 桌面便签窗口管理（多窗口 + 持久化列表）
    │   ├── github.rs               # GitHub REST（ureq）
    │   └── models.rs               # serde 模型（camelCase 对齐前端）
    ├── capabilities/default.json   # 权限：main 与 sticky-* 窗口
    └── tauri.conf.json
```

## 5. 发布流程（摘要）

1. bump 三处版本号 → commit → push main
2. `git tag vX.Y.Z && git push origin vX.Y.Z` 触发 CI（约 10–25 分钟）
3. 后台 `gh run watch <run_id> --exit-status` 盯结果
4. 成功 → `gh release edit vX.Y.Z --draft=false` 转正并核验产物（`Pulse_X.Y.Z_x64-setup.exe` + `Pulse-portable.exe`）
5. 失败 → `gh run view <run_id> --log-failed` 取日志修复后重打 tag（release 尚不存在时可删远端 tag 重指）

## 6. 已知设计取舍（改动前先确认是否要推翻）

- `seq` 全局自增：跨项目连续编号（PLS-1、ABC-2…），刻意简化
- 便签窗口与主窗口数据不实时互推：便签重开即最新；主窗口操作后需重新选择问题刷新
- 附件上限 20MB（base64 经内存，防 OOM）
- 尚无：系统托盘、自动更新、富文本/Markdown、标签、子问题、分配人、批量操作、撤销

## 7. 路线图优先级（下一版候选）

1. 拖拽改状态已在 v0.2 落地；下一步：列表内联改优先级
2. 项目/周期编辑（改名、改色、改日期）
3. GitHub 双向：从 Pulse 建 issue、评论回流
4. 托盘 + 全局快捷键（快速建待办）
5. 数据导出/导入（JSON / Markdown）
