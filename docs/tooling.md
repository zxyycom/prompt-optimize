# 项目工具链

本文件是本仓库脚本、依赖安装、校验、打包和 CI 的 owner 文档。README 只保留入口说明, AGENTS 只引用本文件, 具体标准在这里维护。

## 职责边界

本文件负责:

1. package scripts 的用途和命名。
2. pnpm 与 Bun 的职责分工。
3. `scripts/` 下自动化脚本的基础标准。
4. 本地校验、打包和可交付制品规则。
5. GitHub CI 如何复用本地入口并发布可交付制品。

本文件不负责 skill 行为、引用内容、决策记录格式或 agent 项目级协作规则。

## 工具分工

1. pnpm 管安装: `packageManager` 使用 pnpm, 锁文件使用 `pnpm-lock.yaml`, CI 安装依赖使用 `pnpm install --frozen-lockfile`。
2. Bun 管脚本调度和执行: 本地和 CI 通过 `bun run <script>` 调用 package scripts; package scripts 内部直接调用 Bun 执行 TypeScript 脚本。
3. package scripts 是统一入口: 本地和 CI 都通过 package scripts 调用脚本, 不维护另一套命令。

## 脚本入口

当前脚本入口:

1. `bun run validate`: 校验 skill 入口、内部链接、决策记录结构和项目文档边界。
2. `bun run validate:decisions`: 单独校验 `docs/decisions/` 的目录、文件结构、索引链接和状态来源链接目标。
3. `bun run pack:skill`: 将 `skill/prompt-optimize/` 打包为 `dist/prompt-optimize.zip`。
4. `bun run check`: 先校验, 再打包。
5. `bun run deploy:package`: 生成本地可交付 zip 制品, 不写入仓库外目录；CI 发布由 workflow 负责。

需要直接排查脚本问题时, 可以用 `bun scripts/<script>.ts` 运行单个脚本。

## 脚本标准

1. 脚本使用 TypeScript 编写, 放在 `scripts/`。
2. 脚本应优先使用 Bun 和 Node 兼容的标准 API, 避免为简单校验和打包引入依赖。
3. 脚本默认只读写仓库内路径; 需要生成产物时输出到 `dist/`。
4. 打包脚本只打包 `skill/prompt-optimize/`, 不把项目文档、CI、脚本或仓库元数据放进 skill zip。
5. 校验脚本应覆盖长期容易漂移的约定, 例如 skill 入口、内部链接、决策记录结构、决策状态来源链接和项目文档边界。
6. Markdown 链接提取使用 `mdast-util-from-markdown` 解析 Markdown AST; 脚本只负责仓库路径、状态来源和项目约束校验。
7. Markdown 链接目标必须是仓库内路径且目标存在; `#anchor` 必须匹配目标 Markdown 文件中的标题锚点。
8. 针对可独立维护的结构, 提供可单独运行的校验脚本; 总校验复用同一规则。

## CI 标准

GitHub CI 复用本地入口:

1. 安装 Bun, 用于执行 TypeScript 脚本。
2. 安装 pnpm, 用于依赖安装。
3. 运行 `pnpm install --frozen-lockfile`。
4. 运行 `bun run check`。
5. 上传 `dist/prompt-optimize.zip` 作为 workflow artifact, 方便从单次运行中排查制品。
6. 对 `main` 分支的 `push` 和 `workflow_dispatch`, 发布或更新 GitHub Release `prompt-optimize-latest`, 并上传 `dist/prompt-optimize.zip`。

CI 发布使用固定 release tag `prompt-optimize-latest`。该 tag 指向最新发布提交, release asset 始终覆盖为当前 `dist/prompt-optimize.zip`。PR 只运行校验、打包和 artifact 上传, 不发布 release。
