# Pulse

轻量、本地优先的 issue tracker —— Rust 核心 + Web 界面，编译为单个 Windows exe（安装包 ~5-10MB）。

> 设计语言受 Linear 启发并做了原创简化：暗色优先、克制强调色、语义化设计令牌、键盘优先交互。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 壳 | Tauri 2（系统 WebView2，无 Electron） |
| 核心 | Rust + rusqlite（bundled SQLite，零外部依赖） |
| 前端 | Vite + React 18 + TypeScript，手写设计系统（无 UI 框架） |
| 图标 | lucide-react；字体 Inter Variable（OFL 开源） |
| 集成 | GitHub REST API（ureq），附件落盘 app_data |

## 功能

- 问题：CRUD、状态机（未排期/待办/进行中/已完成/已取消）、优先级、项目、周期
- 项目（自定义前缀生成 `ABC-1` 编号）与周期（日期范围 + 进度条）
- 评论（本地协作，作者名可在设置中配置）
- 附件（存本地，点击用系统默认程序打开）
- GitHub 集成：`owner/repo#123` 关联 issue，拉取 state/title，一键打开
- 命令面板 `Ctrl+K`、新建 `c`、上下移动 `j/k`、明暗主题

## 本地开发（可选）

```bash
pnpm install
pnpm tauri dev
```

## 发布（推荐方式：GitHub CI，本地零编译）

推送 `v*` tag 即触发 `.github/workflows/release.yml`（windows-latest + tauri-action）：

```bash
git tag v0.1.0 && git push origin v0.1.0
```

构建约 10~25 分钟，产物（draft release）：

- `Pulse_0.1.0_x64-setup.exe`（NSIS 安装包）
- `Pulse-portable.exe`（便携版，免安装）

CI 结束后到 Releases 页把 draft 转正即可，或：

```bash
gh release edit v0.1.0 --draft=false
```

## 目录

```
src/            前端（React）
  components/   侧栏 / 列表 / 详情 / 命令面板 / 弹窗
  styles/       tokens.css（设计令牌） + app.css
  lib/          类型与 Tauri invoke 封装
src-tauri/      Rust 核心
  src/db.rs     SQLite 迁移与查询
  src/commands.rs  Tauri 命令层
  src/github.rs GitHub API
design/         静态设计样张（preview.html，与真实样式同源）
```

## Roadmap

- [ ] 多端同步引擎（last-write-wins → 向量时钟）
- [ ] Markdown 渲染（描述/评论）
- [ ] 自动更新（tauri-plugin-updater）

## License

MIT
