# 决策记录索引

本目录记录 `prompt-optimize` skill 修改中的重要问题、取舍和决定。决策记录的目的不是保存所有历史细节, 而是留下后续维护者需要复用的判断: 为什么要这样组织 skill、为什么某条规则属于某个 owner、为什么保留或删除某类边界。

## 为什么记录决策

skill 的修改历史本身能体现维护者对 prompt、规则和 agent 行为的判断方式。只看最终文件, 往往能知道“现在是什么”, 但不一定能知道“为什么不是另一个方案”。决策记录补上这层上下文。

记录决策主要解决这些问题:

1. 保留取舍依据: 说明一个结构、边界或规则为什么这样放置, 避免后续维护者只凭当前偏好改回旧问题。
2. 区分当前规则和历史材料: 用户反馈、坏示例、旧版描述和临时提醒先作为诊断材料, 只有沉淀为可复用判断时才进入长期文档。
3. 降低反复讨论成本: 当同类问题再次出现时, 可以直接查看已有判断, 再决定沿用、修正或替代。
4. 支持安全演进: 后续决定可以替代旧决定, 但保留旧记录能解释当时的约束、风险和影响。
5. 帮助 agent 稳定协作: agent 可以通过决策记录理解项目长期偏好, 而不是把每次对话里的临时上下文都写进规则。

决策记录不是完整变更日志。它关注会影响未来判断的原因、方案和影响; 普通文本修正、格式调整和一次性执行细节由 git diff 或对话承接。

## 影响面

一级目录使用影响面 ID。影响面 ID 是稳定责任边界, 用 kebab-case 命名, 不使用日期、阶段或一次性动作。

1. `project-documentation`: README、项目介绍、项目文档边界和仓库级说明。
2. `agent-instructions`: `AGENTS.md` 的项目级 agent 维护约定。
3. `decision-records`: 决策记录体系自身的结构、目的、命名和维护方式。
4. `project-tooling`: 本地脚本、打包方式、CI 和交付制品相关约定。

更多维护规则见 [maintenance.md](maintenance.md)。

## 当前决策

`project-documentation`:

1. [2026-06-27 - 建立项目介绍和决策记录](project-documentation/2026-06-27-establish-project-intro-and-decision-records.md)
2. [2026-06-27 - 项目文档只保留仓库内信息](project-documentation/2026-06-27-keep-project-docs-in-repo-scope.md)

`agent-instructions`:

1. [2026-06-27 - 取消固定读取清单](agent-instructions/2026-06-27-remove-fixed-reading-list.md)
2. [2026-06-27 - AGENTS 只保留稳定项目约定](agent-instructions/2026-06-27-keep-agents-stable.md)
3. [2026-06-27 - 细化 AGENTS 中的决策记录入口](agent-instructions/2026-06-27-detail-decision-entry-in-agents.md)

`decision-records`:

1. [2026-06-27 - 补充决策记录目的说明](decision-records/2026-06-27-explain-decision-record-purpose.md)
2. [2026-06-27 - 按影响面组织决策记录](decision-records/2026-06-27-structure-decisions-by-impact-area.md)

`project-tooling`:

1. [2026-06-27 - 增加可重复校验和打包脚本](project-tooling/2026-06-27-add-repeatable-validation-and-packaging-scripts.md)
2. [2026-06-27 - 在 GitHub CI 中打包 skill 制品](project-tooling/2026-06-27-package-skill-in-github-ci.md)
3. [2026-06-27 - 建立工具链 owner 文档](project-tooling/2026-06-27-establish-tooling-owner-document.md)
4. [2026-06-27 - 增加决策记录结构校验脚本](project-tooling/2026-06-27-add-decision-structure-validation-script.md)
