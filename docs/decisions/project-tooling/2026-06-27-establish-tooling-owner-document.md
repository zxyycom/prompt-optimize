# 2026-06-27 - 建立工具链 owner 文档

问题:
- 脚本、安装、校验、打包和 CI 的细节如果分散在 README、AGENTS 和决策记录中, 后续修改时容易出现重复维护和说法不一致。
- AGENTS 应保持稳定项目级约定, 不适合承接具体脚本命令和工具链细节。

决策过程:
- README 适合做项目入口, 只保留工具链文档链接和摘要。
- AGENTS 适合告诉 agent 去哪里看 owner, 不展开具体命令。
- 脚本相关标准需要一个独立 owner 文档, 同时覆盖 pnpm/Bun 分工、脚本入口、基础标准和 CI 复用方式。

决定:
- 新增 `docs/tooling.md` 作为脚本、依赖安装、校验、打包和 CI 的 owner 文档。
- README 只引用 `docs/tooling.md`。
- AGENTS 只说明脚本和 CI 细节由 `docs/tooling.md` 承接, 不再写具体命令。

影响:
- 后续修改工具链时优先更新 `docs/tooling.md`, 再同步必要的入口摘要。
- AGENTS 保持稳定, 不因脚本命令变化而频繁修改。

验证:
- 检查 README、AGENTS 和 CI 中的工具链信息没有重复展开同一规则。
