#!/bin/bash

# GitHub Pages 一键部署脚本
# 使用方法：./deploy-github-pages.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GitHub Pages 一键部署${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查是否在git仓库中
if [ ! -d ".git" ]; then
    echo -e "${RED}✗ 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否有github远程
if ! git remote | grep -q "github"; then
    echo -e "${YELLOW}⚠ 未检测到GitHub远程仓库${NC}"
    echo -e "${YELLOW}  请先添加GitHub远程仓库：${NC}"
    echo -e "${YELLOW}  git remote add github https://github.com/用户名/仓库名.git${NC}"
    exit 1
fi

# 步骤1：构建项目
echo ""
echo -e "${YELLOW}[1/4] 构建项目...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  安装依赖...${NC}"
    npm install --ignore-engines
fi

npx vite build

if [ ! -d "dist" ]; then
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 项目构建成功${NC}"

# 步骤2：检查gh-pages分支是否存在
echo ""
echo -e "${YELLOW}[2/4] 准备部署分支...${NC}"

if git show-ref --quiet refs/heads/gh-pages; then
    echo -e "${GREEN}✓ gh-pages分支已存在${NC}"
else
    echo -e "${YELLOW}  创建gh-pages分支...${NC}"
    git checkout --orphan gh-pages
    git reset --hard
    git commit --allow-empty -m "Initial commit for gh-pages"
    git push -u github gh-pages
    git checkout main
    echo -e "${GREEN}✓ gh-pages分支创建成功${NC}"
fi

# 步骤3：部署到gh-pages分支
echo ""
echo -e "${YELLOW}[3/4] 部署到gh-pages分支...${NC}"

# 使用git subtree
if git subtree push --prefix dist github gh-pages 2>/dev/null; then
    echo -e "${GREEN}✓ 使用subtree部署成功${NC}"
else
    echo -e "${YELLOW}  subtree失败，使用替代方法...${NC}"
    
    # 使用git worktree
    if [ -d ".git/worktrees/gh-pages" ]; then
        git worktree remove gh-pages 2>/dev/null || true
        rm -rf gh-pages
    fi
    
    git worktree add gh-pages gh-pages
    rm -rf gh-pages/*
    cp -r dist/* gh-pages/
    cd gh-pages
    
    git add -A
    git commit -m "Deploy to GitHub Pages $(date '+%Y-%m-%d %H:%M:%S')"
    git push github gh-pages
    cd ..
    git worktree remove gh-pages
    rm -rf gh-pages
    echo -e "${GREEN}✓ 使用worktree部署成功${NC}"
fi

# 步骤4：显示访问地址
echo ""
echo -e "${YELLOW}[4/4] 获取访问地址...${NC}"

GIT_REMOTE=$(git remote get-url github)
GIT_REPO=$(echo "$GIT_REMOTE" | sed -E 's#.*github.com[:/](.*)\.git#\1#')
GITHUB_URL="https://$(echo "$GIT_REPO" | cut -d'/' -f1).github.io/$(echo "$GIT_REPO" | cut -d'/' -f2)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         🎉 部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}访问地址：${NC}"
echo -e "  $GITHUB_URL"
echo ""
echo -e "${YELLOW}注意事项：${NC}"
echo -e "  1. 部署可能需要1-5分钟生效，请耐心等待"
echo -e "  2. GitHub Pages通常自动启用，无需额外配置"
echo -e "  3. 如需确认，请访问：https://github.com/$GIT_REPO/settings/pages"
echo -e "  4. 确保在设置中选择：Branch: gh-pages, Folder: / (root)"
echo ""
