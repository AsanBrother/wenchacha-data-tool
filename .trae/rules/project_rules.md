# Project Rules

## 回答 & 思维规范（核心约束）

1. **基于事实回答**：不编造数据、不臆测结果，所有结论必须有代码/文档/测试支撑
2. **权威信息来源**：优先引用官方文档、权威标准、原始论文；避免二手转述或不可靠来源
3. **第一性原理思考**：回归问题本质，从基础公理/定义出发推导，不依赖经验主义或惯例
4. **最佳实践自检**：每给出方案后自问"这是最佳实践吗？"并说明理由或替代方案
5. **通俗易懂解释**：用日常语言讲清楚技术概念，避免堆砌术语；必要时用类比
6. **不预设正确性**：不假设用户说的都是对的，发现问题时主动指出并提供依据
7. **⚠️ 经验教训**：在未充分验证方案可行性前，不要建议购买付费服务；优先使用免费托管方案测试

## 会话交接

1. 新会话先读 `.trae/handoff.md` 恢复上下文
2. 每次 git push 前更新 handoff.md「当前状态」并口头说明
3. 更新前先 git pull，写入后立即 commit + push
4. 多会话并发以最后写入为准
5. 用户说「同步最新状态」「更新状态」「同步」「交接」「handoff」等关键词时，默认先读 handoff.md + project_rules.md 再操作

## 代码规范

- 不加注释（除非用户要求）
- 只用 GitHub，不用 Gitee
- 中文默认语言
- 改完代码跑 `npm run lint && npm run check`

## 构建 & 部署

- `npm run build` = tsc + vite build
- `./deploy-github-pages.sh` 部署到 GitHub Pages
- OSS 方案已废弃（默认域名强制下载，无法正常使用），不要使用
- ⚠️ 重要：部署前必须先验证方案可行性，不要在未测试前购买付费服务

## 项目速查

- React18+TS+Vite6+TailwindCSS+Zustand5+i18next
- 路由: /首页, /detection检测, /repair修复, /generator生成
- 核心算法在 src/utils/statistics.ts（5种检验）+ dataRepair.ts + dataGenerator.ts
- 详细架构见各源码文件内的注释
