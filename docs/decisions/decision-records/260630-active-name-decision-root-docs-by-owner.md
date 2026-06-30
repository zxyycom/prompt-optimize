# 2026-06-30 - 用 owner 命名决策记录根文档

## 状态
- 当前状态: active
- 导致状态变化的决策: 无
- 状态说明: 作为当前决策记录根文档命名、owner 分工和状态来源链接校验规则使用。

## 问题
- `docs/decisions/README.md` 和 `docs/decisions/maintenance.md` 的文件名不能直接说明实际职责, 需要打开文件才能知道哪个负责清单、哪个负责规则。
- 项目入口没有直接引用 `docs/decisions/README.md`, 决策清单入口依赖目录约定而不是明确链接。
- 非 `active` 决策的状态来源只校验为 Markdown 链接格式, 没有确认目标决策文件是否真实存在。

## 决定
- 采用: `decision-record-index.md` 作为决策清单和影响面导航 owner, 只负责状态速查、影响面说明和决策链接。
- 采用: `decision-record-rules.md` 作为决策记录维护规则 owner, 负责记录门槛、命名、状态关系、正文结构、写法要求和更新流程。
- 采用: 项目 README 和相关维护说明直接链接到两个显式 owner 文件, 不再依赖 `docs/decisions/README.md` 的目录默认含义。
- 采用: `scripts/validate-decisions.ts` 校验非 `active` 决策的状态来源链接, 目标必须解析到 `docs/decisions/<impact-area-id>/` 下已存在的决策文件。
- 不采用: 继续使用 `README.md` 承接决策清单。原因是文件名只表达目录入口, 不能表达“决策清单和影响面导航”的实际 owner。
- 不采用: 继续使用 `maintenance.md` 承接规则。原因是文件名过泛, 不能直接说明规则范围包含门槛、命名、状态、正文结构和更新流程。
- 触发条件: 后续新增决策目录根文档、调整根文档 owner 或修改状态来源字段时, 先沿用显式 owner 命名和目标链接校验规则。

## 影响
- 浏览 `docs/decisions/` 时可以从文件名直接判断根文档职责。
- 决策清单与维护规则的 owner 分离更清晰, 索引不再重复承接记录门槛和正文结构规则。
- 决策状态引用的后续决策必须能被脚本解析和验证, 避免过期路径或拼写错误进入长期记录。

## 验证
- `docs/decisions/decision-record-index.md` 承接决策清单和影响面导航。
- `docs/decisions/decision-record-rules.md` 承接记录门槛、命名、状态和更新流程。
- `scripts/validate-decisions.ts` 校验根文档命名和非 `active` 状态来源链接目标。
