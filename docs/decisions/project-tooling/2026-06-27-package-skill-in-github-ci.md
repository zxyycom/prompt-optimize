# 2026-06-27 - 在 GitHub CI 中打包 skill 制品

问题:
- 只靠本地打包会让制品生成依赖维护者的手动习惯, 容易出现未校验或打包内容不一致的问题。
- skill 的可交付结果应该能从仓库自动生成, 方便后续下载和检查。

决策过程:
- CI 使用与本地相同的 package script, 避免维护两套校验和打包逻辑。
- CI 使用 pnpm 安装依赖, 使用 Bun 执行脚本。
- CI 只生成并上传 zip artifact, 不做外部部署, 保持项目边界清晰。
- workflow 触发范围覆盖 push、pull request 和手动触发, 兼顾日常修改和临时打包。

决定:
- 新增 `.github/workflows/package-skill.yml`。
- workflow 运行 `pnpm install --frozen-lockfile` 和 `pnpm run check`, 生成 `dist/prompt-optimize.zip`。
- 上传 artifact 名称为 `prompt-optimize-skill`。

影响:
- 每次主要分支更新、PR 或手动触发时, 都能得到同一套校验后的 skill zip。
- 后续如果打包规则变化, 优先修改本地脚本, CI 继续复用该入口。

验证:
- 通过本地 `pnpm install --frozen-lockfile` 和 `pnpm run check` 验证 CI 调用的脚本入口可运行。
