# PaperCV AI 开发指南

本文件适用于整个仓库。修改前先查看相关源码与 `package.json`，以当前用户需求和实际代码为准。

## 项目定位

纸简 PaperCV 是中文在线简历编辑器，支持内容编辑、六种基础布局与 36 套模板预设、实时分页预览、PDF 导入、浏览器打印导出和 JSON 备份。

- 默认保持纯前端架构，编辑、导入、存储与打印准备均在浏览器内完成。
- 技术栈：React 19、TypeScript、Vite 6、Radix Themes / Radix UI、React DatePicker、PDF.js。
- 生产环境部署 `dist/`，支持静态站点和仓库子路径；不依赖运行时后端或在线字体 CDN。
- 界面文案和开发交流默认使用简体中文。

## 常用命令

使用 **pnpm** 安装依赖、运行命令和维护 `pnpm-lock.yaml`，不要同时维护多套包管理器锁文件。

```bash
pnpm install
pnpm dev                  # 开发服务；strictPort 开启，端口占用时先检查已有进程
pnpm check                # 格式、类型和单元测试
pnpm build                # 类型检查及生产构建，输出 dist/
pnpm preview              # 本地查看生产构建
pnpm test                 # 单元测试
pnpm test:print           # 构建后运行：静态部署、打印生命周期、PDF 导入与模板回归
```

- Node.js 版本要求以 `package.json` 的 `engines` 为准，当前为 20.19+。
- 若本机默认 registry 不可达，可用 `pnpm install --registry=https://registry.npmjs.org`，不修改全局配置。
- 浏览器测试默认使用 macOS Chrome，其他路径通过 `CHROME_PATH` 指定；部分 PDF 图像检查需要 `pdftoppm`（Poppler）。
- `test:print` 自行启动临时静态服务器；其他现有浏览器回归依赖开发服务，通常使用 `http://127.0.0.1:5173`。

## 目录与入口

| 路径                               | 职责                                             |
| ---------------------------------- | ------------------------------------------------ |
| `src/main.tsx`                     | 启动入口、全局样式顺序、编辑器与打印页懒加载     |
| `src/app/App.tsx`                  | 页面编排、编辑器会话和功能整合                   |
| `src/features/editor/`             | 内容表单、模板与排版面板、弹窗、历史和本地保存   |
| `src/features/preview/`            | 简历渲染、DOM 测量、分页、缩放和打印             |
| `src/features/import/`             | PDF / JSON 解析、导入确认和传输状态              |
| `src/features/rich-text/`          | 富文本编辑、HTML 清理与选区处理                  |
| `src/shared/`                      | 通用 UI、主题 Hook 和浏览器工具                  |
| `shared/resume/`                   | 简历数据类型、规范化、默认值、模板和展示配置     |
| `src/styles/`                      | Radix 按需样式、基础、布局、展示、模板和主题样式 |
| `tests/unit/`                      | 模型、配置、日期和导入解析测试                   |
| `tests/e2e/`、`tests/integration/` | 浏览器交互、模板、布局与 PDF 回归                |
| `tests/helpers/`                   | 隔离浏览器打印和静态服务器等测试工具             |
| `public/`                          | 需要直接部署的静态资源                           |
| `assets/readme/`                   | README 界面截图等本地文档资源                    |

跨功能导入使用 `@/`，共享简历模型使用 `@resume/`，同一功能内部优先相对路径。`src/shared` 不依赖 `features` 或 `app`；功能层不反向依赖 `app`；`shared/resume` 保持独立于 React 和浏览器 UI。

## 简历数据与状态

- `shared/resume/model.ts` 是数据契约入口，导入数据经过 `normalizeResume`，新增字段同时补齐类型、默认值、校验和兼容处理。
- 保持已有 localStorage 存储键和旧 JSON 数据兼容。当前主存储键为 `papercv.resume.v1`，不要仅为重构而更改。
- 模板组合集中维护在 `shared/resume/template-presets.ts`，复用六种基础布局，不为配色或间距组合新增 `Template` 类型。每套预设提供完整外观配置，保留纸张与页码偏好；缩略图和应用操作共用 `applyTemplatePreset`。通过外观值识别当前预设，手动修改后显示“已自定义”，保持旧 JSON 兼容。
- 数据更新沿用 `useResumeActions`、`useResumeHistory` 和 `useResumePersistence`，保留自动保存及撤销 / 重做行为。
- `useResumeTransfer` 管理导入、错误与打印准备状态；`usePreviewLayout` 管理缩放、自适应、专注预览和 Escape，并负责清理观察器与事件。
- 简历内容与页面深浅色主题分别管理；修改编辑器主题不应改变打印纸张效果。
- 富文本通过现有清理逻辑处理，保留安全的列表、缩进、对齐和链接；不要绕过清理直接渲染外部 HTML。
- PDF / JSON 导入继续保留大小、结构和页数限制，以及替换当前内容前的确认。

## 分页与打印

修改分页、字体、模板或导出前，优先阅读：

- `src/features/preview/components/ResumePreview.tsx`
- `src/features/preview/lib/paginate.ts`
- `src/features/preview/services/print-resume.ts`
- `src/features/preview/components/PrintPage.tsx`

约定：

- 编辑器预览和打印页共用内容组件、字体及分页逻辑，长内容和双栏模板都要正确分页。页边距支持 6–25 mm，8 mm 的小留白快捷设置与预览、JSON 恢复、打印保持一致，不在导出时偷偷修改用户排版；不能用负边距补偿未知的系统打印边距。
- 手机打印快照在调用原生打印前显式移除屏幕预览的 zoom，并在打印样式中清除屏幕容器的最小高度；浏览器自行添加的可打印边距和缩放仍需实机验证。
- 打印使用点击时的简历快照。桌面通过 `?print=<token>` 的同源 iframe 准备，保持消息的 origin、来源窗口和 token 校验；手机复用已完成分页的预览，在点击事件内同步调用顶层 `window.print()`，避免重新加载文档与字体，未就绪时提示用户稍后重试。
- 手机打印快照通过专用打印容器与编辑器隔离，取消、异常、返回页面及浏览器不响应时清理容器、标题和锁；不把 `window.print()` 返回视为已保存。网址来源属于浏览器页眉页脚，提供关闭提示，不保证所有系统打印界面都可由 CSS 控制。
- 等待字体、图片与分页完成再调用打印，保留失败、超时、取消、重试和重复点击处理。
- 主页面标题在编辑期间持续跟随左上角简历名称，经 `getPrintTitle` 清理后使用，不能仅在点击打印时临时设置。原生分享 / 打印可能提前缓存标题，或在 `afterprint` 提前触发后再读取；打印页也设置同样标题，清理时恢复编辑页标题和焦点。
- Chromium 的 `page.pdf()` 和手机 UA 模拟不能验证 iOS Safari 系统打印的文件名或页脚。回归应分别检查调用前的页面标题、重命名、提前回调、输出 PDF 的 Title 元数据；实际 iOS 文件需单独检查。不得把零页边距的 Chromium 测试通过表述为所有手机都不会带来源网址。
- `afterprint` 也会在取消时触发，不能据此提示“文件已保存”。
- 浏览器打印的 PDF 用于投递与分享；JSON 用于完整恢复。继续兼容旧版带简历 JSON 附件的 PDF。
- 静态部署保持 `base: "./"`，新增资源或打印链接使用 `import.meta.env.BASE_URL` 等适合子路径的方式构造。

## 样式与打包体积

- 优先使用 `src/shared/ui` 的封装和现有主题变量，保持黑白灰界面以及深浅色主题可读性。
- `src/styles/radix.css` 按需引入 Radix 样式。新增组件时检查其样式和内部依赖；升级 Radix 时重新验证这些源码 CSS 引用。
- 保持 `src/main.tsx` 中的样式顺序。全局样式、Radix 样式或字体更改后检查编辑器和打印效果。
- 编辑器 / 打印入口与日期组件已拆分。`DateField.tsx` 懒加载 `DateFieldPicker.tsx`，个人资料的折叠分组首次展开时再渲染，避免隐藏日历提前下载。
- `pdfjs-dist` 及其 worker 仅在 PDF 导入时动态加载；不要重新静态引入到首页。
- 中文黑体与宋体是构建资源的主要体积来源，已按字符范围分片。不要为压缩体积擅自移除字库、字体选项或生僻字覆盖。
- 比较优化效果时区分构建总量、首屏实际请求和 gzip 体积；仅拆分 chunk 不等于减少构建总量。
- 文档图片放在 `assets/readme/`，临时截图、PDF 和日志放在忽略的 `output/` 或 `tmp/`，不要写入 `public/` 增加部署体积。

## CI 与 GitHub Pages

- `.github/workflows/ci-pages.yml` 在推送到 `main`、向 `main` 提交 PR 和手动触发时运行检查与构建。
- CI 使用 Node.js 22，pnpm 版本取自 `package.json` 的 `packageManager`，通过 `pnpm-lock.yaml` 缓存依赖并执行冻结锁文件安装。
- `build` 执行 `pnpm check` 和 `pnpm build`；仅 `main` 的非 PR 运行上传 `dist/` 并触发部署，PR 不发布站点。
- `deploy` 依赖构建成功，通过官方 Pages Actions 部署到 `github-pages` 环境；部署权限仅授予该 job。
- 首次使用时，在 GitHub 仓库的 Settings → Pages → Build and deployment 中将 Source 设置为 GitHub Actions。
- 部署沿用相对资源路径，不硬编码仓库名称或 Pages 域名。修改默认分支时同步更新触发条件和部署判断。
- 浏览器 / PDF 回归仍按下方命令在本地执行；主构建流水线执行格式、类型、单元测试和构建，PR 标题另有独立校验。

## Git 提交与 PR

- 贡献流程见 `CONTRIBUTING.md`。提交信息和 PR 标题使用 Conventional Commits：`type(scope): 简要说明`；scope 可省略，支持中文，标题最多 100 个字符。
- `commitlint.config.mjs` 维护提交格式规则。提交围绕单一目标，必要时用 `!` 和 `BREAKING CHANGE:` 说明不兼容影响。
- `pnpm install` 的 `prepare` 自动安装 Husky；`pre-commit` 使用 lint-staged 格式化暂存文本文件，`commit-msg` 校验提交信息。
- `.husky/_/` 是本机生成文件，不提交；不要在 hook 中添加旧版 Husky 的初始化脚本。文本文件按 `.gitattributes` 统一使用 LF 换行。
- `.github/workflows/pr-title.yml` 在 PR 标题或代码变化后校验标题；PR 说明按 `.github/pull_request_template.md` 填写。
- 完整质量检查放在 CI，提交 hook 保持轻量；CI 通过 `HUSKY=0` 跳过安装本地 hooks。
- 不自动提交、推送或更改远端合并策略，除非用户授权；需要实际提交时只暂存相关文件。

## 验证与交付

- 代码修改通常运行 `pnpm check` 和 `pnpm build`；纯文档修改只需检查排版、命令及本地资源引用。
- 数据、导入、日期或纯函数修改，运行对应单元测试，按需补充能覆盖实际行为的回归用例。
- 分页、模板、字体或打印修改，构建后运行 `pnpm test:print` 和 `pnpm test:mobile-print`；排版交互按需运行 `pnpm test:layout`、`pnpm test:templates`（覆盖全部预设、JSON 恢复、撤销、窄屏与可搜索 PDF）、`pnpm test:preview`。
- 通用交互组件优先复用 `src/shared/ui` 的 Button、IconButton、Modal、ConfirmDialog、Disclosure、ChoiceGroup 和 Notice；互斥选项保留 radio 语义，图标按钮提供可访问名称。
- 修改共享控件时运行 `pnpm test:ui`，覆盖折叠、键盘选择、滑块、弹窗焦点恢复和通知，并检查桌面 / 窄屏的深浅色显示。独立 UI 测试需提供与应用一致的 Radix Theme 环境。
- 下拉框或日期选择器修改运行 `pnpm test:select`，验证年份边界、日期联动、键盘与浮层交互。
- 富文本和基本信息展示分别有 `pnpm test:richtext`、`pnpm test:identity`；完整编辑流程用 `pnpm test:e2e`；复杂 PDF 排版用 `pnpm test:presentation`。
- UI 变更用隔离浏览器和项目示例数据检查桌面、窄屏、深浅色及相关弹层，避免读写日常浏览器中的真实简历。
- 不把 `dist/`、`node_modules/`、测试输出或个人简历数据作为源码提交；不覆盖用户已有的无关改动。
- README 面向网站使用者，保持 Logo、技术标签、功能、模板和预览介绍简洁；开发约定集中维护在本文件中，具体实现说明优先放在相关源码附近。
- 完成时说明改动、验证结果与实际未验证的部分，不把检查通过表述为已验证原生系统保存对话框。
