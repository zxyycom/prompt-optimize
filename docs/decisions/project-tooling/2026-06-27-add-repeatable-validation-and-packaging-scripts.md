# 2026-06-27 - 增加可重复校验和打包脚本

问题:
- 之前的校验依赖手动阅读、搜索和临时命令, 不容易确认后续修改是否破坏了 skill 入口、内部链接或决策记录结构。
- skill 需要生成可交付制品, 但不应把部署逻辑写成访问仓库外目录或依赖本机环境的流程。

决策过程:
- 使用 package scripts 作为统一入口。
- pnpm 负责依赖安装和锁文件, Bun 负责直接运行 TypeScript 脚本。
- 自动化脚本保持无第三方依赖, 以免为了校验和打包引入额外安装成本。
- 打包脚本只读取 `skill/prompt-optimize/`, 输出到仓库内 `dist/`, 不复制到用户目录, 也不连接外部地址。

决定:
- 新增 `scripts/validate.ts`, 校验 skill frontmatter、Markdown 内部链接、决策记录结构和项目文档边界。
- 新增 `scripts/pack-skill.ts`, 将 `skill/prompt-optimize/` 打包为 `dist/prompt-optimize.zip`。
- 在 `package.json` 中提供 `validate`、`pack:skill`、`check` 和 `deploy:package` 脚本。

影响:
- 后续修改可以用 `pnpm run check` 做一致验证, 具体脚本由 Bun 执行。
- `deploy:package` 表示生成可交付 zip, 不代表写入仓库外安装位置。

验证:
- 运行 `pnpm install --frozen-lockfile` 和 `pnpm run check`。
