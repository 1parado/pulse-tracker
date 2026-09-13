# Pulse

轻量、本地优先的 issue tracker —— Rust 核心 + Web 界面，编译为单个 Windows exe（安装包 ~2.8MB）。

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
- 评论（作者名可在设置中配置）+ Markdown 渲染（描述与评论，DOMPurify 消毒）
- 附件（存本地，点击用系统默认程序打开）
- GitHub 双向同步：`owner/repo#123` 关联 issue，拉取元数据/评论、推送状态/评论（本地为准）
- 桌面便签：把任意待办钉成置顶小窗，随手勾完成
- 全局搜索（标题/描述/编号/评论命中高亮）+ 状态筛选；归档 + 撤销（回收站保留 7 天）
- 系统托盘（左键显隐主窗 / 右键菜单）、全局快捷键 `Ctrl+Shift+Space` / `Ctrl+Shift+Alt+N`
- 自动更新：启动静默检查 + 设置页手动检查，一键下载安装重启（minisign 签名校验，v0.4.0 起生效）
- 命令面板 `Ctrl+K`、新建 `c`、上下移动 `j/k`、明暗主题

## 本地开发（可选）

```bash
pnpm install
pnpm tauri dev
```

## 发布（推荐方式：GitHub CI，本地零编译）

推送 `v*` tag 即触发 `.github/workflows/release.yml`（windows-latest + tauri-action）：

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

构建约 10~25 分钟，产物（draft release）：

- `Pulse_X.Y.Z_x64-setup.exe`（NSIS 安装包，支持自动更新）
- `Pulse-portable.exe`（便携版，免安装）
- `latest.json` + `.sig`（更新清单与签名）

CI 结束后到 Releases 页把 draft 转正即可，或：

```bash
gh release edit vX.Y.Z --draft=false
```

## 目录

```
src/            前端（React）
  components/   侧栏 / 列表 / 详情 / 命令面板 / 弹窗 / 桌面便签
  styles/       tokens.css（设计令牌） + app.css
  lib/          类型与 Tauri invoke 封装
src-tauri/      Rust 核心
  src/db.rs     SQLite 迁移与查询
  src/commands.rs  Tauri 命令层
  src/github.rs GitHub API
design/         静态设计样张（preview.html，与真实样式同源）
```

## Roadmap

- [x] Markdown 渲染（描述/评论）
- [x] 自动更新（tauri-plugin-updater，v0.4.0 起生效）
- [ ] 多端同步引擎（last-write-wins → 向量时钟）
- [ ] 按项目独立编号（当前为跨项目连续编号）
- [ ] 数据导出/导入（JSON / Markdown）

## License

MIT
