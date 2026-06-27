# 2026-06-27 - 增加决策记录结构校验脚本

问题:
- 决策记录目录有固定结构, 但之前只能通过总校验间接发现问题。
- 维护决策记录时, 需要一个可以单独运行的工具, 快速确认 `docs/decisions/` 的目录、索引和文件格式是否一致。

决策过程:
- 决策记录结构属于独立维护面, 适合提供专门脚本入口。
- 总校验仍应覆盖决策记录, 但不能复制一套规则, 否则后续容易出现两边标准不一致。
- 校验重点放在稳定结构: 根目录文件、影响面目录、文件名、正文段落顺序和索引链接。

决定:
- 新增 `scripts/validate-decisions.ts`。
- 新增 package script `validate:decisions`。
- `scripts/validate.ts` 复用 `validate-decisions.ts` 导出的校验逻辑。

影响:
- 维护者可以用 `pnpm run validate:decisions` 单独检查决策记录结构。
- `pnpm run validate` 和 `pnpm run check` 仍会覆盖同一套决策记录结构规则。

验证:
- 运行 `pnpm run validate:decisions`。
- 运行 `pnpm run check`。
