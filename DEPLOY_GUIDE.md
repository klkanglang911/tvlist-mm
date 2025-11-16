# Vercel 部署步骤（2025-11-16）

## 当前状态

✅ 代码已推送到 GitHub
✅ Vercel 项目已配置
✅ 环境变量已设置

## 通过 Vercel Dashboard 部署（推荐）

### 步骤 1：访问 Vercel Dashboard

1. 打开浏览器，访问：https://vercel.com
2. 使用你的账号登录（GitHub 账号）

### 步骤 2：找到项目

1. 在 Dashboard 中找到 `tvlist-mm` 项目
2. 点击进入项目页面

### 步骤 3：触发新部署

**方法 A：等待自动部署（可能需要 1-2 分钟）**
- Vercel 应该会自动检测到新的 GitHub 推送
- 在 "Deployments" 标签查看是否有新的部署正在进行

**方法 B：手动触发部署**
1. 点击顶部的 "Deployments" 标签
2. 找到最近的部署记录
3. 点击右侧的 "..." 菜单
4. 选择 "Redeploy" -> "Use existing Build Cache" -> "Redeploy"

### 步骤 4：等待部署完成

- 部署通常需要 1-2 分钟
- 你会看到部署状态从 "Building" -> "Ready"
- 成功后会显示绿色的 ✓ Ready 状态

### 步骤 5：访问生产环境

部署完成后，你的应用将可通过以下地址访问：

**主域名（Production）：**
```
https://tvlist-mm-[your-id].vercel.app
```

**登录页面：**
```
https://tvlist-mm-[your-id].vercel.app/login
```

**公开频道列表：**
```
https://tvlist-mm-[your-id].vercel.app/tv.txt
```

## 验证部署

### 1. 测试登录功能

1. 访问登录页面
2. 输入密码：`Capibalaa@0711`
3. 点击登录
4. 应该成功跳转到 Dashboard

### 2. 测试功能

- ✅ 频道管理：添加、编辑、删除频道
- ✅ 分类管理：管理频道分类
- ✅ 导入导出：测试 TXT/M3U 格式导出
- ✅ 版本历史：查看 Git 提交历史

### 3. 检查数据存储

访问你的 GitHub 数据仓库：
```
https://github.com/capibalaa/tvlist-data
```

验证 `data/channels.json` 是否有新的提交记录。

## 查看部署日志

如果遇到问题，可以查看部署日志：

1. 在 Vercel 项目页面，点击 "Deployments"
2. 点击具体的部署记录
3. 查看 "Build Logs" 和 "Functions Logs"

## 环境变量检查

如果登录失败或功能异常，检查环境变量：

1. 在项目页面点击 "Settings"
2. 点击 "Environment Variables"
3. 确认以下变量已设置：
   - `ADMIN_PASSWORD` = `Capibalaa@0711`
   - `GITHUB_TOKEN` = `ghp_***（你的 GitHub Token）`
   - `GITHUB_OWNER` = `capibalaa`
   - `GITHUB_REPO` = `tvlist-data`
   - `GITHUB_BRANCH` = `main`
   - `GITHUB_DATA_PATH` = `data/channels.json`

4. 确保所有变量都勾选了 "Production"

## 更新部署（未来）

每次修改代码后：

1. **提交并推送代码到 GitHub：**
   ```bash
   git add .
   git commit -m "你的提交信息"
   git push origin main
   ```

2. **Vercel 会自动部署：**
   - 通常在推送后 30 秒内开始构建
   - 1-2 分钟完成部署

## 问题排查

### 问题 1：自动部署未触发

**解决方案：**
1. 检查 Vercel 项目设置中的 "Git" 选项
2. 确认 GitHub 集成已正确配置
3. 手动触发部署（使用 Redeploy）

### 问题 2：构建失败

**解决方案：**
1. 查看构建日志查找错误
2. 确认 `package.json` 中的依赖正确
3. 检查 Node.js 版本兼容性

### 问题 3：登录后无法访问

**解决方案：**
1. 检查浏览器控制台是否有错误
2. 确认环境变量正确设置
3. 检查 Cookie 是否被正确设置

## 本次部署的重要更新

- 🔐 修复了登录功能，使用安全的后端 API 验证
- ✅ 移除了不安全的客户端密码验证
- ✅ 删除了 vercel.json（环境变量现在在 Vercel Dashboard 配置）
- ✅ 更新了 .gitignore

## 支持

如有问题，可以：
1. 查看 `DEPLOYMENT.md` 获取详细部署文档
2. 查看 Vercel 日志获取错误信息
3. 检查 GitHub Issues

---

生成时间：2025-11-16
部署环境：Vercel
项目版本：v1.0.2
