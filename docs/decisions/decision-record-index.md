# 决策记录清单

本文件是 `docs/decisions/` 的导航 owner, 负责列出影响面、状态速查和具体决策链接。记录门槛、文件命名、状态关系、正文结构和更新流程由 [decision-record-rules.md](decision-record-rules.md) 承接。

## 阅读方式

1. 先按“影响面”确定要查的长期责任边界。
2. 在“决策清单”中查看对应记录; 文件名前缀中的状态表示当前有效性。
3. 非 `active` 决策的替代、修订或失效来源, 以决策文件 `## 状态` 中的后续决策链接为准。

## 状态速查

每个决策文件名包含状态段: `YYMMDD-<status>-short-title.md`, 例如 `260627-active-short-title.md`。状态只做目录浏览时的快速判断; 具体关系以决策文件的 `## 状态` 为准。

状态值:

1. `active`: 当前仍完整生效。
2. `amended`: 仍有回放价值, 但部分规则、命名或适用方式已被后续决策修订。
3. `superseded`: 已被后续决策替代, 不再作为当前规则执行。
4. `invalidated`: 因后续发现冲突、前提错误或无效结论而不再作为依据。

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

1. [active: 2026-06-30 - 用 owner 命名决策记录根文档](decision-records/260630-active-name-decision-root-docs-by-owner.md)
2. [active: 2026-06-30 - 使用短日期命名并允许短决策结构](decision-records/260630-active-use-compact-decision-records.md)
3. [amended: 2026-06-30 - 给决策记录增加状态和关系](decision-records/260630-amended-track-decision-status-and-relations.md)
4. [amended: 2026-06-27 - 建立决策记录策略](decision-records/260627-amended-establish-decision-record-policy.md)

`project-tooling`:

1. [active: 2026-06-30 - 使用 latest release 自动发布 skill 制品](project-tooling/260630-active-publish-skill-package-as-latest-release.md)

`skill-references`:

1. [active: 2026-06-30 - 将核心流程合并回入口](skill-references/260630-active-merge-core-flow-into-entry.md)
2. [superseded: 2026-06-30 - 将改写规则重组为管线](skill-references/260630-superseded-reorganize-rewrite-rules-as-pipeline.md)
