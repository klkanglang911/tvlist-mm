# 电视直播源管理系统

一个专业的 Web 管理界面，用于管理电视直播源列表，支持分类管理、批量导入导出、版本历史回滚等功能。

## 功能特性

- ✅ **频道管理**：增删改查频道，支持搜索和分类筛选
- ✅ **分类管理**：自定义频道分类，灵活组织
- ✅ **批量导入**：支持 TXT、M3U 等多种格式
- ✅ **多格式导出**：导出为 TXT 或 M3U 格式
- ✅ **版本历史**：基于 Git 的版本控制，随时回滚
- ✅ **密码保护**：管理界面需要密码访问
- ✅ **公开访问**：生成公开的 TV 列表 URL 供 VLC 等播放器使用

## 技术栈

- **前端**: Next.js 14 (App Router) + React + TypeScript
- **样式**: Tailwind CSS
- **数据存储**: GitHub Repository（JSON 格式）
- **版本控制**: Git（GitHub API）
- **部署**: Vercel

## 快速开始

### 1. 创建 GitHub 数据仓库

首先，在 GitHub 创建一个 **Private** 仓库用于存储数据（例如：`tvlist-data`）。

### 2. 生成 GitHub Personal Access Token

1. 访问 GitHub Settings -> Developer settings -> Personal access tokens -> Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 设置权限：
   - `repo` (完整仓库访问权限)
4. 生成并保存 token

### 3. 克隆项目

```bash
git clone <your-repo-url>
cd tvlist-mm
npm install
```

### 4. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 管理员密码（自定义）
ADMIN_PASSWORD=your_secure_password

# GitHub 配置
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=tvlist-data
GITHUB_BRANCH=main
GITHUB_DATA_PATH=data/channels.json
```

### 5. 本地运行

```bash
npm run dev
```

访问 http://localhost:3000

### 6. 部署到 Vercel

#### 方式一：通过 Vercel CLI

```bash
npm install -g vercel
vercel
```

#### 方式二：通过 Vercel 网站

1. 访问 [Vercel](https://vercel.com)
2. 导入 GitHub 仓库
3. 配置环境变量（在 Settings -> Environment Variables）：
   - `ADMIN_PASSWORD`
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_BRANCH`（可选，默认 main）
   - `GITHUB_DATA_PATH`（可选，默认 data/channels.json）
4. 部署

## 使用指南

### 登录管理后台

访问部署后的网址，输入 `ADMIN_PASSWORD` 登录。

### 添加频道

1. 进入"频道管理"
2. 点击"添加频道"
3. 填写频道名称、URL 和分类
4. 保存

### 批量导入

1. 进入"导入导出"
2. 选择导入模式（追加/替换）
3. 粘贴频道列表内容
4. 点击"开始导入"

支持的格式：
```
# 格式 1：逗号分隔
CCTV-1,http://example.com/cctv1.m3u8

# 格式 2：空格分隔
CCTV-1 http://example.com/cctv1.m3u8

# 格式 3：M3U 格式
#EXTINF:-1,CCTV-1
http://example.com/cctv1.m3u8
```

### 导出频道列表

1. 进入"导入导出"
2. 选择导出格式（TXT 或 M3U）
3. 点击下载

### 版本回滚

1. 进入"版本历史"
2. 查看所有历史版本
3. 选择要回滚的版本
4. 点击"回滚到此版本"

### 在 VLC 中使用

1. 打开 VLC 播放器
2. 媒体 -> 打开网络串流
3. 输入公开访问地址：`https://your-app.vercel.app/tv.txt`
4. 播放

## 项目结构

```
tvlist-mm/
├── app/
│   ├── api/              # API 路由
│   │   ├── auth/         # 认证相关
│   │   ├── channels/     # 频道管理
│   │   ├── categories/   # 分类管理
│   │   ├── import/       # 导入
│   │   ├── export/       # 导出
│   │   └── versions/     # 版本历史
│   ├── dashboard/        # 管理后台页面
│   ├── login/            # 登录页
│   └── tv.txt/           # 公开访问的频道列表
├── lib/                  # 工具函数
│   ├── github.ts         # GitHub API 集成
│   ├── auth.ts           # 认证逻辑
│   ├── data.ts           # 数据操作
│   └── parser.ts         # 文件解析
├── types/                # TypeScript 类型定义
└── package.json
```

## 常见问题

### 1. 如何修改管理员密码？

在 Vercel 的环境变量中修改 `ADMIN_PASSWORD`，然后重新部署。

### 2. 数据存储在哪里？

所有数据以 JSON 格式存储在您指定的 GitHub 仓库中。

### 3. 如何备份数据？

数据存储在 Git 仓库中，天然支持版本控制和备份。您可以随时 clone 仓库获取完整数据。

### 4. 公开访问地址安全吗？

公开访问地址 `/tv.txt` 仅提供频道列表，不暴露任何管理功能，是安全的。

### 5. 如何添加自定义域名？

在 Vercel 项目设置中添加自定义域名即可。

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产模式运行
npm start

# 代码检查
npm run lint
```

## 技术支持

如有问题，请查看项目的 Issues 或提交新的 Issue。

## 许可

MIT License
