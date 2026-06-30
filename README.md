# Prompt Optimize

这个仓库用于维护 `prompt-optimize` Codex skill。

## 项目定位

`prompt-optimize` 是一个面向结构化文本优化的 Codex skill。它帮助改写和设计 prompt、规则、任务、需求、模板、工作流、技能说明和 agent 指令, 目标是让这些文本目标清晰、范围明确、结构显式、边界可控、验收可检查, 并能沉淀为可复用判断。

本仓库不是应用项目。主要维护对象是可安装的 skill 包, 以及支撑该 skill 长期演进的项目级文档。

## 目录结构

- `.github/workflows/`: GitHub CI, 用于校验、打包并发布 skill 制品。
- `AGENTS.md`: Codex agent 维护本仓库时的项目级指令。
- `docs/decisions/`: 重要设计决策目录; [decision-record-index.md](docs/decisions/decision-record-index.md) 负责清单和影响面导航, [decision-record-rules.md](docs/decisions/decision-record-rules.md) 负责记录门槛、命名、状态和更新流程。
- `docs/tooling.md`: 脚本、安装、校验、打包和 CI 的 owner 文档。
- `package.json`: 本地校验、打包和交付准备脚本入口。
- `scripts/`: 项目级自动化脚本。
- `skill/prompt-optimize/`: 可安装的 skill 包。
- `skill/prompt-optimize/SKILL.md`: skill 入口、主执行流程和主动引用导航。
- `skill/prompt-optimize/references/`: skill 按需读取的参考文件和迁移期保留材料。

## Skill 内容

`skill/prompt-optimize/SKILL.md` 是入口文件, 负责说明触发条件、目标边界、主动引用策略、主执行流程、交付格式和完成检查。

`skill/prompt-optimize/references/` 存放按需读取的参考文件。主动引用文件承接以下长期 owner:

1. `principles.md`: 长期设计理由、原理解释和维护取舍。
2. `agent-tasks.md`: worker、explorer、并行 agent 和子 agent 任务的协作边界。

## 工具链

脚本、依赖安装、校验、打包和 CI 的具体标准由 [docs/tooling.md](docs/tooling.md) 承接。

## 维护约定

skill 本体保持在 `skill/prompt-optimize/` 下。仓库根目录、`docs/`、`scripts/` 和 `.github/` 只放项目级说明、agent 指令、决策记录、工具链说明、自动化脚本、CI 和仓库元数据。

修改 skill 行为、读取策略、内容 owner、引用拆分或长期维护约定时, 先按 [docs/decisions/decision-record-rules.md](docs/decisions/decision-record-rules.md) 判断是否达到记录门槛；达到门槛后在 [docs/decisions/decision-record-index.md](docs/decisions/decision-record-index.md) 维护清单入口。

项目文档只引用本仓库内的路径。需要说明外部来源、临时调查路径或一次性上下文时, 放在对话或提交说明中, 不写入长期项目文档。
