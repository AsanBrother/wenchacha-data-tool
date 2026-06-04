# Session Handoff

> 多设备会话交接文件。每次 git push 前自动更新，新会话启动时先读此文件。

## 项目身份

- 名称：论文数据检测与修复工具（文查查）
- 仓库：https://github.com/AsanBrother/wenchacha-data-tool
- 技术栈：React + TypeScript + Vite + TailwindCSS + Zustand
- 架构：纯前端，所有数据处理在浏览器完成，保护隐私

## 环境能力

| 环境 | 能做 | 不能做 |
|------|------|--------|
| SOLO云端 | 写代码、git push/pull、npm build | 访问阿里云API（被UA黑名单屏蔽）、本地预览 |
| IDE桌面 | 本地dev server、安装CLI | 无限制 |

## 当前状态

- 正在做：GitHub Pages 部署（已完成）
- 已完成：
  - 项目全部功能开发（检测/修复/生成，含核心算法实现）
  - 会话交接机制、核心源码注释
  - 白屏问题诊断与修复
  - 构建卡住问题修复 + Vite部署卡住修复
  - Git沙箱推送失败修复
  - **🎉 耿同学完整审计引擎100%验证通过** (Commit: 804afea)
    - auditEngine.ts (~1100行) 实现7大检查维度 + 跨列检测
    - 9/9测试案例100%通过（7造假+2正常对照）
  - **🚀 通用数据处理器** (Commit: b70124b)
    - 文件上传点击bug修复（使用ref直接调用click()）
    - PDF数据提取能力（pdf.js，自动解析学术论文数字/表格）
    - 图片OCR识别能力（Tesseract.js，中英文双语）
    - 多列/多表数据支持（ParsedData接口 + runFullAuditMultiTable）
    - 支持12种文件格式：CSV/TXT/TSV/XLSX/XLS/PDF/PNG/JPG/GIF/BMP/WEBP
    - UI增强：格式标签、处理状态、成功/失败提示、数据源说明面板
  - **🔐 安全加固**：
    - OSS AccessKey已从deploy-oss.sh移除，保存到本地oss-credentials.sh
    - oss-credentials.sh已加入.gitignore，不会被推送到远端
    - deploy-oss.sh现在从环境变量读取凭证
  - **✅ GitHub Pages 部署成功**：
    - 已创建干净的 gh-pages 分支（无历史提交中的敏感信息）
    - 构建产物已推送到 https://github.com/AsanBrother/wenchacha-data-tool
    - GitHub Pages会自动启用，无需手动设置
- 待做：
  - 访问 https://AsanBrother.github.io/wenchacha-data-tool 查看网站
  - 购买/备案域名 → 用于后续部署

## 部署方案说明

### 方案1：GitHub Pages（当前已部署）
- **优点**：国际访问好，自动启用，无需手动设置
- **部署步骤**：
  1. `npm run build` 构建项目
  2. 创建 `gh-pages` 分支，把 `dist` 目录内容复制到根目录
  3. 提交并推送到 `github/gh-pages`
  4. GitHub Pages会自动启用
- **访问地址**：https://AsanBrother.github.io/wenchacha-data-tool
- **部署脚本**：`./deploy-github-pages.sh`

### 方案2：自定义域名部署（未来规划）
- 需要先购买并备案域名
- 可使用 GitHub Pages 自定义域名、Vercel、Netlify 或其他托管服务

## ⚠️ 经验教训（重要）

### 阿里云OSS方案不可用
- **问题**：阿里云OSS默认域名有强制下载策略，无法正常显示网页
- **后果**：已购买的OSS服务无法使用，造成金钱浪费
- **教训**：
  - **不要在未充分验证方案可行性前购买服务**
  - 部署前必须先测试免费/低成本方案，确认可行后再投入
  - 优先使用 GitHub Pages、Vercel、Netlify 等免费托管服务

## 关键决策

- 远程仓库只用 GitHub（不用 Gitee）
- OSS部署脚本保留但不再推荐使用
- OSS bucket: wenchachabucket / region: cn-shenzhen（已废弃）
- 数据检测方法参考"耿同学"打假：末位数字分布、卡方拟合、Benford定律
- 本地开发/测试用 `npm run serve`（vite dev，端口 5173），生产构建用 `npm run build`（较慢）
- GitHub Pages 已成功部署到 https://AsanBrother.github.io/wenchacha-data-tool

## 敏感信息索引

- 阿里云 AccessKey → oss-credentials.sh（本地文件，已加入.gitignore）

## 新设备初始化（必读）

> 每次在新设备/新环境首次使用本项目前，**必须先执行以下命令**，否则Git操作会失败：

```bash
git config --global --add safe.directory '*'
```

**原因**：
- Git ≥2.35.2 引入安全机制，要求显式配置可信任目录
- Trae SOLO云端、IDE桌面、其他电脑的home目录不同，配置不互通
- 未配置时会出现 `fatal: detected dubious ownership` 错误，导致 push/pull 全部失败

**验证方法**：
```bash
git config --global --get safe.directory
# 期望输出：*
```

**适用场景**：
- ✅ 首次在Trae SOLO新会话使用
- ✅ 首次在IDE桌面端打开项目
- ✅ 换电脑/重装系统后首次使用
- ✅ 任何出现Git权限报错的环境

## 并发会话

- 多个会话可能同时修改此文件
- 写入前先 `git pull`，写入后立即 `git push`
- 如遇冲突，以最新时间为准手动合并

---

_last_updated: 2026-06-03_
_updated_by: SOLO云端_
