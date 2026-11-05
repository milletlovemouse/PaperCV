# 参与贡献

欢迎修复问题、完善体验和提交建议。项目结构、数据兼容与打印约定见 [AGENTS.md](AGENTS.md)。

## 开发与检查

使用 Node.js 20.19+ 和 pnpm；pnpm 版本由 `package.json` 的 `packageManager` 声明。

```bash
pnpm install
pnpm dev
```

文本文件统一使用 LF 换行，由 `.gitattributes` 维护。安装依赖时会通过 `prepare` 自动安装 Git hooks。提交前仅处理暂存文件；完整检查与构建可在本地运行，也会由 CI 执行：

```bash
pnpm check
pnpm build
```

分页、字体、模板或打印相关改动还应在构建后运行 `pnpm test:print`，其他专项测试见 `AGENTS.md`。

## 提交信息

使用 Conventional Commits，支持中文或英文说明：

```text
type(scope): 简要说明
```

`scope` 可省略；标题不超过 100 个字符，说明具体改动，避免使用“更新”“修复一些问题”等笼统描述。

| 类型       | 用途                                                     |
| ---------- | -------------------------------------------------------- |
| `feat`     | 新增功能                                                 |
| `fix`      | 修复问题                                                 |
| `perf`     | 性能或体积优化                                           |
| `refactor` | 不改变现有行为的重构                                     |
| `style`    | 代码格式调整；视觉功能改动按实际用途使用 `feat` 或 `fix` |
| `docs`     | 文档与展示资源                                           |
| `test`     | 测试用例和测试工具                                       |
| `build`    | 依赖、打包配置和构建工具                                 |
| `ci`       | GitHub Actions 等流水线                                  |
| `chore`    | 其他维护工作                                             |
| `revert`   | 撤销先前改动                                             |

常用 scope：`editor`、`preview`、`print`、`import`、`rich-text`、`model`、`ui`、`deps`。不限制 scope 列表，可按实际模块扩展。

```text
feat(editor): 支持复制工作经历
fix(print): 使用简历名称作为 PDF 默认文件名
perf(fonts): 减少字体加载请求
build(deps): 更新开发依赖
docs: 更新网站预览截图
ci: 添加 GitHub Pages 部署
```

存在不兼容改动时，用 `!` 标记，并在正文中说明影响及迁移方式：

```text
feat(model)!: 调整简历数据结构

BREAKING CHANGE: 描述不兼容之处，以及旧数据需要如何迁移。
```

单次提交围绕一个明确目的组织。仅暂存当前任务相关的文件，提交信息与实际内容保持一致。

## 自动校验

- `pre-commit`：lint-staged 仅对暂存的受支持文本文件执行 Prettier，保留未暂存的编辑；遵循 `.prettierignore`。
- `commit-msg`：commitlint 校验提交标题和格式；失败后按提示修改信息，重新提交。
- PR：标题使用相同规范，GitHub Actions 在创建、修改标题或更新代码时自动校验。
- 构建 CI：执行格式检查、类型检查、单元测试与生产构建。

单独检查一条提交信息：

```bash
printf '%s\n' 'fix(print): 修复打印文件名' | pnpm commitlint
```

## Pull Request

从功能分支提交 PR，聚焦单一目标，按模板说明问题、改动后的行为和实际验证结果。界面变更附上使用示例数据生成的截图，避免包含个人简历信息。

建议使用 Squash and merge，以符合规范的 PR 标题作为最终提交标题。合并策略和必需检查由仓库维护者在 GitHub 设置；本地配置不会自动启用分支保护。
