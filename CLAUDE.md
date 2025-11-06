# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求

所有与用户的交流必须使用**中文**。

## 工作流程和规则

### 1. 需求分析与方案设计

作为专业程序员，需要：
- 将用户提出的产品需求转化为可实施的技术开发方案
- 针对需求提供专业的技术建议和多种实现方案（如适用）
- 详细说明每个方案的优缺点、技术栈选择、实现难度等
- 等待用户确认方案后再开始实施
- **重要**：不要自作主张选择方案，必须由用户来做最终决定

### 2. 沟通原则

- 遇到任何不确定的问题，必须主动询问用户
- 不要假设或猜测用户的意图
- 及时反馈开发进度和遇到的问题

### 3. 版本控制规范

当用户要求"设定版本号"时，必须执行以下流程：

1. **代码备份**：保存当前阶段的完整项目代码
2. **更新说明**：记录本版本的所有变更内容，包括：
   - 新增功能
   - 修复的问题
   - 修改的模块
   - 已知问题（如有）
3. **Git 操作**：
   - 确保所有更改已提交
   - 使用语义化版本号创建 tag（如 v1.0.0, v1.1.0 等）
   - 提交格式：清晰描述本次版本的主要变更
4. **版本记录**：维护 CHANGELOG.md 或版本历史文档

这样做是为了在需要时可以快速回滚到稳定版本。

### 4. 开发和测试规范

#### 代码修改原则（重要）

- **单一职责**：每次只修改与当前需求直接相关的模块
- **影响范围控制**：严格避免擅自改动其他无关模块
- **风险评估**：如果发现必须要改动其他模块，并且可能产生连带影响：
  - **立即停止**
  - 向用户说明需要改动的模块、原因以及可能的影响
  - **等待用户确认**后再进行改动
  - 记录所有改动的模块和理由

#### 测试要求

每次新增或修改功能后：

1. **必须进行单元测试**
2. 测试内容包括：
   - 基本功能是否正常
   - 边界情况处理
   - 错误处理逻辑
   - 与现有功能的兼容性
3. 如发现问题，自行修复并重新测试
4. 确认无误后再向用户汇报完成

#### 测试检查清单

- [ ] 新功能按预期工作
- [ ] 没有破坏现有功能
- [ ] 错误处理完善
- [ ] 代码质量符合项目规范
- [ ] 没有未经授权修改其他模块

## 项目信息

**项目名称**：tvlist-mm（电视直播源管理系统）
**项目路径**：/Users/popo/Desktop/ccVideCode/tvlist-mm
**项目描述**：一个专业的 Web 管理界面，用于管理电视直播源列表，支持分类管理、批量导入导出、版本历史回滚等功能

### 技术栈

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI 样式**: Tailwind CSS
- **数据存储**: GitHub Repository（JSON 格式，通过 GitHub API 操作）
- **版本控制**: Git（基于 GitHub 的版本历史）
- **认证方式**: 环境变量密码 + Cookie Session
- **部署平台**: Vercel（Serverless）

### 项目架构

#### 目录结构
```
tvlist-mm/
├── app/
│   ├── api/                    # API 路由（Next.js API Routes）
│   │   ├── auth/              # 认证相关 API
│   │   │   ├── login/         # 登录
│   │   │   ├── logout/        # 登出
│   │   │   └── verify/        # 验证登录状态
│   │   ├── channels/          # 频道管理 API
│   │   │   ├── route.ts       # CRUD 操作
│   │   │   └── batch/         # 批量更新
│   │   ├── categories/        # 分类管理 API
│   │   ├── import/            # 导入 API
│   │   ├── export/            # 导出 API
│   │   ├── versions/          # 版本历史 API
│   │   │   ├── route.ts       # 获取历史
│   │   │   └── rollback/      # 回滚版本
│   │   └── tv.txt/            # 公开访问的频道列表
│   ├── dashboard/             # 管理后台页面（需认证）
│   │   ├── page.tsx          # 频道管理主页
│   │   ├── categories/       # 分类管理页面
│   │   ├── import-export/    # 导入导出页面
│   │   └── versions/         # 版本历史页面
│   ├── login/                # 登录页面
│   ├── page.tsx              # 首页（重定向到登录）
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── lib/                      # 工具函数库
│   ├── github.ts            # GitHub API 封装
│   ├── auth.ts              # 认证逻辑
│   ├── data.ts              # 数据读写操作
│   └── parser.ts            # 文件格式解析（TXT/M3U）
├── types/                   # TypeScript 类型定义
│   └── index.ts
├── .env.example             # 环境变量示例
└── package.json
```

#### 数据流

1. **用户操作** → 前端页面（React）
2. **前端请求** → Next.js API Routes
3. **API 处理** → lib/ 工具函数
4. **数据操作** → GitHub API（读写 JSON 文件）
5. **版本控制** → Git Commit（自动记录）

#### 核心模块说明

**lib/github.ts**：
- 使用 Octokit 与 GitHub API 交互
- 提供文件读写、历史查询、版本回滚功能
- 所有数据变更自动创建 Git commit

**lib/parser.ts**：
- 支持多种直播源格式解析（TXT、M3U）
- 生成 VLC 兼容的输出格式
- URL 验证

**lib/auth.ts**：
- 简单的密码验证（环境变量）
- Session token 生成和验证（基于时间戳）
- Token 有效期 24 小时

**lib/data.ts**：
- 统一的数据读写接口
- 默认数据结构管理

### 常用命令

```bash
# 安装依赖
npm install

# 开发模式（需要配置 .env.local）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 环境变量配置

项目需要以下环境变量（复制 `.env.example` 为 `.env.local`）：

```env
# 管理员密码
ADMIN_PASSWORD=your_password

# GitHub 配置
GITHUB_TOKEN=ghp_your_token          # Personal Access Token (需要 repo 权限)
GITHUB_OWNER=your_username            # GitHub 用户名
GITHUB_REPO=tvlist-data              # 数据仓库名称
GITHUB_BRANCH=main                   # Git 分支（可选）
GITHUB_DATA_PATH=data/channels.json  # 数据文件路径（可选）
```

### 数据存储格式

频道数据存储在 GitHub 仓库的 JSON 文件中：

```json
{
  "channels": [
    {
      "id": "uuid",
      "name": "频道名称",
      "url": "http://example.com/stream.m3u8",
      "category": "分类名称",
      "order": 0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "categories": [
    {
      "id": "uuid",
      "name": "分类名称",
      "order": 0
    }
  ],
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00Z"
}
```

### API 端点说明

#### 认证相关
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/verify` - 验证登录状态

#### 频道管理
- `GET /api/channels` - 获取所有频道
- `POST /api/channels` - 添加频道（需认证）
- `PUT /api/channels` - 更新频道（需认证）
- `DELETE /api/channels?id=xxx` - 删除频道（需认证）
- `POST /api/channels/batch` - 批量更新顺序（需认证）

#### 分类管理
- `GET /api/categories` - 获取所有分类
- `POST /api/categories` - 添加分类（需认证）
- `PUT /api/categories` - 更新分类（需认证）
- `DELETE /api/categories?id=xxx` - 删除分类（需认证）

#### 导入导出
- `POST /api/import` - 导入频道（需认证）
- `GET /api/export?format=txt|m3u` - 导出频道列表

#### 版本历史
- `GET /api/versions` - 获取版本历史
- `POST /api/versions/rollback` - 回滚到指定版本（需认证）

#### 公开访问
- `GET /tv.txt` - 公开的频道列表（无需认证）

### 部署说明

项目使用 Vercel 部署，详细步骤见 `DEPLOYMENT.md`。

关键点：
1. 需要创建 GitHub 数据仓库
2. 需要配置环境变量
3. Vercel 会自动构建和部署
4. 支持自定义域名

### 开发注意事项

1. **修改数据结构**：如需修改 `ChannelData` 类型，确保同步更新 `lib/data.ts` 中的默认数据
2. **添加 API**：在 `app/api/` 下创建新的 `route.ts` 文件
3. **认证保护**：需要认证的 API 必须调用 `checkAuth()` 或 `verifyToken()`
4. **Git 提交信息**：所有数据变更的 commit message 要清晰描述操作
5. **错误处理**：所有 API 都应该有 try-catch 错误处理

## 注意事项

1. 始终保持与用户的中文沟通
2. 做决策前先征求用户意见
3. 改动代码要谨慎，特别是跨模块的修改
4. 版本管理要规范，确保可追溯和可回滚
5. 测试要充分，确保代码质量. 





