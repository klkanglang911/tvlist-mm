# 快速入门指南

本指南帮助您在 5 分钟内完成项目的本地运行。

## 前置准备

### 1. 创建 GitHub 数据仓库

1. 访问 https://github.com/new
2. 创建一个新的 **Private** 仓库，名称如 `tvlist-data`
3. 不要勾选任何初始化选项
4. 点击 "Create repository"

### 2. 初始化数据仓库

在终端中执行：

```bash
# 克隆刚创建的空仓库
git clone https://github.com/你的用户名/tvlist-data.git
cd tvlist-data

# 创建数据文件
mkdir -p data
cat > data/channels.json << 'EOF'
{
  "channels": [],
  "categories": [
    {"id": "cctv", "name": "央视频道", "order": 1},
    {"id": "satellite", "name": "卫视频道", "order": 2},
    {"id": "local", "name": "地方台", "order": 3},
    {"id": "other", "name": "其他", "order": 4}
  ],
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00.000Z"
}
EOF

# 提交到 GitHub
git add .
git commit -m "Initial data"
git push origin main
```

### 3. 生成 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 名称：`tvlist-mm`
4. 过期时间：No expiration（建议）
5. 权限：勾选 `repo`（完整仓库权限）
6. 点击 "Generate token"
7. **复制并保存** token（格式：`ghp_xxxxxxxxxxxx`）

## 本地运行

### 1. 安装依赖

```bash
cd tvlist-mm
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
ADMIN_PASSWORD=admin123                    # 管理员密码（自定义）
GITHUB_TOKEN=ghp_your_token_here          # 刚才生成的 token
GITHUB_OWNER=your_github_username          # 你的 GitHub 用户名
GITHUB_REPO=tvlist-data                    # 数据仓库名称
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 登录并测试

1. 自动跳转到登录页
2. 输入 `ADMIN_PASSWORD` 中设置的密码
3. 进入管理后台
4. 尝试添加一个测试频道

## 验证安装

### 检查数据是否保存

访问你的数据仓库：
```
https://github.com/你的用户名/tvlist-data
```

查看 `data/channels.json`，应该能看到新的 commit。

### 测试公开访问

访问 http://localhost:3000/tv.txt

应该能看到生成的频道列表。

## 常见问题

### 问题 1：登录后显示 "获取数据失败"

**原因**：GitHub Token 或仓库配置有误

**解决**：
1. 检查 `.env.local` 中的所有变量是否正确
2. 确认 GitHub Token 有 `repo` 权限
3. 确认数据仓库已创建并初始化

### 问题 2：无法保存频道

**原因**：GitHub API 权限问题

**解决**：
1. 重新生成 GitHub Token，确保勾选 `repo` 权限
2. 检查数据仓库是否存在 `data/channels.json` 文件

### 问题 3：端口 3000 被占用

**解决**：
```bash
# 使用其他端口
PORT=3001 npm run dev
```

## 下一步

本地测试成功后，可以：

1. **部署到 Vercel**：查看 `DEPLOYMENT.md`
2. **导入现有频道列表**：进入"导入导出"页面
3. **配置自定义域名**：在 Vercel 项目设置中配置

## 获取帮助

- 查看完整文档：`README.md`
- 部署指南：`DEPLOYMENT.md`
- 项目架构：`CLAUDE.md`
