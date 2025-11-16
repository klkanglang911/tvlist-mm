# 关闭 Vercel Deployment Protection - 详细步骤指南

## 第一步：登录 Vercel

1. 打开浏览器（Chrome、Safari 或 Edge）
2. 访问网址：**https://vercel.com**
3. 点击右上角的 **"Login"** 按钮
4. 使用你的 GitHub 账号登录（如果已登录则跳过此步）

---

## 第二步：找到你的项目

登录后，你会看到 Dashboard 页面：

1. 在页面中找到项目列表
2. 找到名为 **"tvlist-mm"** 的项目
3. **点击项目名称**进入项目详情页

💡 提示：项目卡片通常显示项目名称、域名和最近部署时间

---

## 第三步：进入项目设置

在项目页面顶部，你会看到几个标签：

```
Deployments  |  Analytics  |  Logs  |  Settings  |  ...
```

1. **点击 "Settings"** 标签（通常在右侧）

---

## 第四步：找到 Deployment Protection 设置

进入 Settings 后，左侧会显示一个菜单，包含多个选项：

```
General
Domains
Git
Environment Variables
Deployment Protection  ← 找这个！
Functions
Security
...
```

1. 在左侧菜单中，向下滚动找到 **"Deployment Protection"**
2. **点击 "Deployment Protection"**

💡 提示：如果找不到，也可能叫 "Protection" 或在 "Security" 下面

---

## 第五步：关闭保护

现在你应该看到 Deployment Protection 的设置页面。

### 可能的界面情况 A：标准保护

如果你看到类似这样的选项：

```
○ Off (Disabled)
● Standard Protection (Currently Selected)
○ Only Preview Deployments
```

**操作：**
1. 找到 **"Off"** 或 **"Disabled"** 选项
2. 点击选择它（圆圈会变成选中状态）
3. 页面可能会自动保存，或者需要点击 **"Save"** 按钮

### 可能的界面情况 B：Vercel Authentication

如果你看到：

```
Vercel Authentication

[Toggle Switch: ON]  ← 这里是开关

When enabled, visitors must authenticate with Vercel to access deployments.
```

**操作：**
1. 找到开关按钮（Toggle Switch）
2. **点击开关，将它从 ON 切换到 OFF**
3. 开关会变成灰色或不同颜色，表示已关闭

### 可能的界面情况 C：Protection Mode 下拉菜单

如果你看到一个下拉菜单：

```
Protection Mode: [Standard Protection ▼]
```

**操作：**
1. 点击下拉菜单
2. 选择 **"Off"** 或 **"Disabled"**
3. 点击 **"Save"** 或 **"Update"** 按钮

---

## 第六步：确认保存

1. 查看页面顶部或底部是否有 **"Save"** 或 **"Save Changes"** 按钮
2. 如果有，**点击保存**
3. 等待页面显示 "Settings saved" 或类似的成功提示

---

## 第七步：触发新部署（重要！）

关闭保护后，需要触发一次新的部署以应用更改：

1. 点击页面顶部的 **"Deployments"** 标签
2. 你会看到部署历史列表
3. 找到右上角的 **"Redeploy"** 按钮（或者在最新部署右侧的 "..." 三点菜单）
4. 点击 **"Redeploy"**
5. 在弹出的对话框中：
   - 确认分支是 **main**
   - **不要**勾选 "Use existing Build Cache"（我们要重新构建）
   - 点击 **"Redeploy"** 确认

---

## 第八步：等待部署完成

1. 页面会自动跳转到新部署的详情页
2. 你会看到部署状态：
   ```
   Building... → Queued → Building → Deploying → Ready
   ```
3. 等待状态变为 **"Ready"**（绿色对勾 ✓）
4. 通常需要 **1-2 分钟**

---

## 第九步：测试访问

部署完成后：

1. 在部署页面找到部署的 URL，类似：
   ```
   https://tvlist-mm-xxx.vercel.app
   ```
2. 点击 **"Visit"** 按钮或直接访问：
   ```
   https://tvlist-mm-xxx.vercel.app/login
   ```
3. 这次应该能直接看到登录页面，不再显示 "Authentication Required"

---

## 第十步：测试登录

1. 在登录页面输入密码：**Capibalaa@0711**
2. 点击 **"登录"** 按钮
3. 应该成功跳转到 Dashboard 管理界面

---

## 🎯 快速检查清单

在操作过程中，请确认：

- [ ] 已登录 Vercel
- [ ] 找到 tvlist-mm 项目
- [ ] 进入 Settings 页面
- [ ] 找到 Deployment Protection 设置
- [ ] 关闭保护（OFF/Disabled）
- [ ] 保存设置
- [ ] 触发新部署（Redeploy）
- [ ] 等待部署完成（Ready）
- [ ] 测试访问应用
- [ ] 测试登录功能

---

## ❓ 常见问题

### Q1: 找不到 "Deployment Protection" 选项

**可能的位置：**
- Settings → Deployment Protection
- Settings → Security → Deployment Protection
- Settings → Protection

**如果还是找不到：**
- 尝试在 Settings 页面按 Ctrl+F (或 Cmd+F) 搜索 "Protection"

### Q2: 关闭保护后仍然看到 "Authentication Required"

**原因：**需要重新部署

**解决：**
1. 确保已保存设置
2. 重新执行第七步（触发新部署）
3. 清除浏览器缓存或使用无痕模式测试

### Q3: 不确定是否已经关闭

**检查方法：**
- 在 Settings → Deployment Protection 页面
- 查看是否显示 "Off" 或 "Disabled" 状态
- 或开关处于关闭位置（灰色）

---

## 📞 需要帮助？

如果在任何步骤遇到困难：

1. **截图给我看**：截取你当前看到的 Vercel 页面
2. **描述问题**：告诉我卡在哪一步
3. **尝试备用方案**：运行我之前创建的 force-redeploy.sh 脚本

---

## ✅ 成功标志

当你看到以下情况，说明成功了：

1. 访问 Vercel 应用 URL，直接看到**登录页面**（而不是 "Authentication Required"）
2. 输入密码能够成功登录
3. 可以正常使用所有功能（添加频道、导出等）

---

生成时间：2025-11-16
帮助文档版本：v1.0
