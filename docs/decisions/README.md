# 决策记录索引

本目录记录 `prompt-optimize` skill 和维护项目的关键设计决策。决策记录不是变更日志, 也不是每次执行工作的流水账；它只保存后续维护需要回放的判断: 当时遇到什么问题、有哪些约束、为什么采用当前方案、这个方案怎样影响后续维护。

## 为什么记录决策

skill 的修改历史本身能体现维护者对 prompt、规则和 agent 行为的判断方式。只看最终文件, 往往能知道“现在是什么”, 但不一定能知道“为什么不是另一个方案”。决策记录补上这层上下文。

记录决策主要解决这些问题:

1. 保留取舍依据: 说明一个结构、边界或规则为什么这样放置, 避免后续维护者只凭当前偏好改回旧问题。
2. 区分当前规则和历史材料: 用户反馈、坏示例、旧版描述和临时提醒先作为诊断材料, 只有沉淀为可复用判断时才进入长期文档。
3. 降低反复讨论成本: 当同类问题再次出现时, 可以直接查看已有判断, 再决定沿用、修正或替代。
4. 支持安全演进: 后续决定可以替代旧决定, 但保留旧记录能解释当时的约束、风险和影响。
5. 帮助 agent 稳定协作: agent 可以通过决策记录理解项目长期偏好, 而不是把每次对话里的临时上下文都写进规则。

## 记录门槛

skill 相关决策可以比项目级决策稍细, 因为 skill 的触发条件、读取策略、内容 owner、规则边界和验收标准会直接影响后续输出。只要改动会改变后续如何判断、如何写规则或如何组织引用, 就可以记录。

项目级决策门槛更高。只有改变长期维护契约、目录边界、自动化交付方式或跨文件 owner 的决定才记录。普通文案修正、格式调整、链接修复、脚本内部实现步骤、CI 单步调整和一次性执行细节不进入决策记录。

完整规则、正文结构和校验要求见 [maintenance.md](maintenance.md)。

## 决策状态

每个决策文件名包含状态段: `YYMMDD-<status>-short-title.md`, 例如 `260627-active-short-title.md`。状态只做当前有效性的快速判断; 具体关系以决策文件的 `## 状态` 为准。

状态值:

1. `active`: 当前仍完整生效。
2. `amended`: 仍有回放价值, 但部分规则、命名或适用方式已被后续决策修订。
3. `superseded`: 已被后续决策替代, 不再作为当前规则执行。
4. `invalidated`: 因后续发现冲突、前提错误或无效结论而不再作为依据。

短决策可以省略 `## 背景与约束` 和 `## 决策过程`; 需要回放上下文、关键备选或多轮收敛时再使用完整结构。

## 影响面

一级目录使用影响面 ID。影响面 ID 是稳定责任边界, 用 kebab-case 命名, 不使用日期、阶段或一次性动作。

当前影响面:

1. `decision-records`: 决策记录体系自身的结构、目的、命名、门槛和维护方式。
2. `project-tooling`: 本地脚本、打包方式、CI 和交付制品的长期契约。
3. `skill-references`: skill 引用文件的 owner 分工、结构拆分和跨文件关系。

可能出现的影响面示例:

1. `skill-behavior`: skill 触发条件、执行流程、输出边界或完成检查。

## 决策清单

`decision-records`:

1. [active: 2026-06-30 - 使用短日期命名并允许短决策结构](decision-records/260630-active-use-compact-decision-records.md)
2. [amended: 2026-06-30 - 给决策记录增加状态和关系](decision-records/260630-amended-track-decision-status-and-relations.md)
3. [amended: 2026-06-27 - 建立决策记录策略](decision-records/260627-amended-establish-decision-record-policy.md)

`project-tooling`:

1. [active: 2026-06-30 - 使用 latest release 自动发布 skill 制品](project-tooling/260630-active-publish-skill-package-as-latest-release.md)

`skill-references`:

1. [active: 2026-06-30 - 将核心流程合并回入口](skill-references/260630-active-merge-core-flow-into-entry.md)
2. [superseded: 2026-06-30 - 将改写规则重组为管线](skill-references/260630-superseded-reorganize-rewrite-rules-as-pipeline.md)
