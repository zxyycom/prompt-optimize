# 2026-06-30 - 使用 latest release 自动发布 skill 制品

## 问题
- 现有 CI 只在运行结束后上传 workflow artifact, 没有把 `dist/prompt-optimize.zip` 发布到稳定入口。
- 用户发现当前 CI 不会自动发包, 说明“打包”和“发布”之间的边界需要成为长期维护契约。

## 背景与约束
- 本仓库主要维护一个 Codex skill 包, 可交付物是 `dist/prompt-optimize.zip`。
- 现有脚本已经通过 `pnpm run check` 复用本地校验和打包入口。
- 项目没有独立版本号和发布清单, 因此按每次提交创建不可变版本 release 会增加维护成本。
- PR 应只验证候选改动, 不应发布制品。

## 决策过程
1. 先确认 CI 当前行为: `main` push、PR 和手动触发都会打包并上传 workflow artifact, 但不会创建或更新 release。
2. 评估发布入口: workflow artifact 适合排查单次运行, 但不适合作为长期安装入口；GitHub Release 可以提供稳定下载位置。
3. 由于 skill 包暂无版本策略, 选择固定 `prompt-optimize-latest` release, 让每次 `main` 发布覆盖同名 asset。
4. 为避免 PR 获得不必要发布权限, 将打包 job 和发布 job 分离, 只有发布 job 使用写权限。

## 决定
- 采用: CI 继续在所有触发场景运行校验、打包和 workflow artifact 上传。
- 采用: `main` 分支的 `push` 和 `workflow_dispatch` 额外发布或更新 GitHub Release `prompt-optimize-latest`。
- 采用: release tag 指向最新发布提交, release asset 覆盖为当前 `dist/prompt-optimize.zip`。
- 采用: 校验脚本检查 workflow 中的发布契约关键点, 避免配置退化成只上传 artifact。
- 不采用: 为每次提交创建新的 release；当前仓库没有版本命名和变更说明机制, 会把交付入口变成流水账。
- 触发条件: 后续只要仍以单一最新 skill 包为交付目标, 沿用 fixed latest release；当需要多版本安装或回滚策略时再引入版本化 release。

## 影响
- 使用者可以从固定 release 获取最新 skill zip, 不需要进入单次 workflow run 查找 artifact。
- PR 验证和 main 发布的权限边界更清晰。
- 工具链文档需要把 artifact 与 release 的职责区分清楚。

## 验证
- `.github/workflows/package-skill.yml` 包含 `publish` job, 只在 `main` 分支的 `push` 和 `workflow_dispatch` 发布。
- `docs/tooling.md` 记录 artifact 与 latest release 的职责。
- `pnpm run validate` 检查 CI 发布契约关键点。
