# 部署配置指南

本文档详细说明如何将电视直播源管理系统部署到 Vercel。

## 准备工作

### 1. 创建 GitHub 数据仓库

用于存储频道数据的仓库（建议使用 Private 仓库）：

1. 访问 https://github.com/new
2. 仓库名称：`tvlist-data`（或其他名称）
3. 设置为 **Private**
4. 不要初始化 README
5. 创建仓库

### 2. 生成 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" -> "Generate new token (classic)"
3. Token 名称：`tvlist-mm-token`
4. 设置过期时间（建议选择 No expiration）
5. 选择权限：
   - ✅ `repo`（完整仓库访问）
6. 点击 "Generate token"
7. **立即复制并保存 token**（只显示一次）

### 3. 初始化数据仓库

在本地执行以下命令：

```bash
# 克隆数据仓库
git clone https://github.com/你的用户名/tvlist-data.git
cd tvlist-data

# 创建数据目录和文件
mkdir -p data
cat > data/channels.json << 'EOF'
{
  "channels": [],
  "categories": [
    {
      "id": "cctv",
      "name": "央视频道",
      "order": 1
    },
    {
      "id": "satellite",
      "name": "卫视频道",
      "order": 2
    },
    {
      "id": "local",
      "name": "地方台",
      "order": 3
    },
    {
      "id": "other",
      "name": "其他",
      "order": 4
    }
  ],
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00.000Z"
}
EOF

# 提交并推送
git add .
git commit -m "Initial data structure"
git push origin main
```

## 部署到 Vercel

### 方式一：通过 Vercel 网站部署（推荐）

1. **登录 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." -> "Project"
   - 选择 `tvlist-mm` 仓库
   - 点击 "Import"

3. **配置项目**
   - Framework Preset: Next.js (自动检测)
   - Root Directory: `./`
   - 保持默认构建设置

4. **配置环境变量**

   在 "Environment Variables" 部分添加：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `ADMIN_PASSWORD` | 您的密码 | 管理后台登录密码 |
   | `GITHUB_TOKEN` | ghp_xxx | GitHub Personal Access Token |
   | `GITHUB_OWNER` | 您的 GitHub 用户名 | 数据仓库所有者 |
   | `GITHUB_REPO` | tvlist-data | 数据仓库名称 |
   | `GITHUB_BRANCH` | main | 分支名（可选） |
   | `GITHUB_DATA_PATH` | data/channels.json | 数据文件路径（可选） |

   **重要**：所有环境变量都选择 "Production", "Preview", "Development"

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成（约 1-2 分钟）

6. **访问应用**
   - 部署完成后，点击 "Visit" 或访问分配的域名
   - 默认域名：`your-project.vercel.app`

### 方式二：通过 Vercel CLI 部署

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   cd tvlist-mm
   vercel
   ```

4. **设置环境变量**
   ```bash
   vercel env add ADMIN_PASSWORD
   vercel env add GITHUB_TOKEN
   vercel env add GITHUB_OWNER
   vercel env add GITHUB_REPO
   ```

5. **重新部署**
   ```bash
   vercel --prod
   ```

## 部署后配置

### 1. 添加自定义域名（可选）

1. 在 Vercel 项目设置中选择 "Domains"
2. 输入您的域名
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效

### 2. 测试部署

1. **访问首页**：应该自动跳转到登录页
2. **登录管理后台**：使用 `ADMIN_PASSWORD` 登录
3. **添加测试频道**：验证数据能否正常保存
4. **访问公开地址**：`https://your-domain.com/tv.txt`

### 3. 验证 GitHub 数据同步

访问您的数据仓库：
```
https://github.com/你的用户名/tvlist-data
```

检查 `data/channels.json` 是否有新的 commit。

## 环境变量说明

### 必需变量

- **ADMIN_PASSWORD**: 管理员密码
  - 示例：`mySecurePassword123`
  - 建议使用复杂密码

- **GITHUB_TOKEN**: GitHub Personal Access Token
  - 格式：`ghp_xxxxxxxxxxxxxxxxxxxx`
  - 需要 `repo` 权限

- **GITHUB_OWNER**: GitHub 用户名
  - 示例：`your-username`

- **GITHUB_REPO**: 数据仓库名称
  - 示例：`tvlist-data`

### 可选变量

- **GITHUB_BRANCH**: Git 分支
  - 默认：`main`
  - 可以使用其他分支

- **GITHUB_DATA_PATH**: 数据文件路径
  - 默认：`data/channels.json`
  - 可以自定义路径

## 更新部署

### 自动部署

Vercel 已配置自动部署：
- 每次推送到 `main` 分支会自动部署到生产环境
- 每次推送到其他分支会创建预览部署

### 手动部署

在 Vercel Dashboard 中：
1. 选择项目
2. 点击 "Deployments"
3. 点击最新部署右侧的 "..." -> "Redeploy"

## 常见问题

### 1. 部署失败

**原因**：环境变量未正确配置

**解决**：
1. 检查所有必需的环境变量是否都已设置
2. 确认 GitHub Token 有效且有正确的权限
3. 查看部署日志获取详细错误信息

### 2. 登录失败

**原因**：ADMIN_PASSWORD 环境变量未设置

**解决**：
1. 在 Vercel 项目设置中添加 `ADMIN_PASSWORD`
2. 重新部署项目

### 3. 无法保存数据

**原因**：GitHub Token 权限不足或数据仓库不存在

**解决**：
1. 确认数据仓库已创建
2. 确认 Token 有 `repo` 权限
3. 确认 GITHUB_OWNER 和 GITHUB_REPO 正确

### 4. 版本历史为空

**原因**：数据文件没有 commit 历史

**解决**：
1. 确认数据仓库已初始化
2. 确认 `data/channels.json` 文件存在
3. 手动添加几个频道，触发 commit

## 监控和维护

### 查看部署日志

1. 访问 Vercel Dashboard
2. 选择项目
3. 点击 "Deployments"
4. 查看具体部署的日志

### 查看运行时日志

1. 在 Vercel 项目页面
2. 点击 "Logs"
3. 实时查看应用日志

### 性能监控

Vercel 自动提供：
- 请求分析
- 性能指标
- 错误追踪

访问项目的 "Analytics" 标签查看。

## 备份和恢复

### 数据备份

数据存储在 GitHub 仓库中，天然支持版本控制：

```bash
# 克隆数据仓库作为备份
git clone https://github.com/你的用户名/tvlist-data.git backup

# 定期拉取最新数据
cd backup
git pull
```

### 恢复数据

如果需要恢复到某个历史版本：

1. 在管理后台的"版本历史"页面操作
2. 或者在 Git 仓库中手动回滚：
   ```bash
   git revert <commit-hash>
   git push
   ```

## 安全建议

1. **使用强密码**：ADMIN_PASSWORD 应该足够复杂
2. **保护 Token**：不要将 GitHub Token 提交到代码仓库
3. **定期更新**：定期更新依赖包和 Token
4. **监控访问**：定期查看 Vercel 日志，监控异常访问
5. **数据仓库权限**：数据仓库设置为 Private

## 成本

使用 Vercel 免费计划：
- 100 GB 带宽/月
- 无限部署
- 自动 HTTPS
- 全球 CDN

对于个人使用完全免费且足够。

## 下一步

部署完成后：
1. 开始添加频道数据
2. 配置分类
3. 在 VLC 中测试公开访问地址
4. （可选）配置自定义域名
