# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求

所有与用户的交流必须使用**中文**。

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 开发模式（需要配置 .env.local）
npm run build    # 构建生产版本
npm start        # 启动生产服务器
npm run lint     # 代码检查
```

## 技术栈

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI 样式**: Tailwind CSS
- **数据存储**: SQLite (better-sqlite3)
- **定时任务**: node-cron
- **认证方式**: 环境变量密码 + Cookie Session
- **部署方式**: Docker（VPS）或 Vercel

## 项目架构

### 核心模块 (lib/)

| 模块 | 职责 |
|------|------|
| `database.ts` | SQLite 数据库操作，表结构定义，CRUD 封装 |
| `auth.ts` | 密码验证、Session token 生成/验证（24小时有效期） |
| `data.ts` | 统一数据读写接口，频道/分类/设置的操作封装 |
| `parser.ts` | 直播源格式解析（TXT、M3U）和导出格式生成 |
| `channel-checker.ts` | 频道状态检测（在线/离线）、响应时间测量 |
| `scheduler.ts` | 定时任务管理（基于 node-cron） |
| `webhook.ts` | 通知推送（企业微信、钉钉、飞书、自定义 webhook） |

### 数据流

```
前端页面 → API Routes (app/api/) → lib/ 工具函数 → SQLite 数据库
```

### API 端点概览

**认证**: `/api/auth/{login,logout,verify}`
**频道**: `/api/channels` (CRUD) + `/api/channels/batch` + `/api/channels/batch-delete` + `/api/channels/test`
**分类**: `/api/categories` (CRUD) + `/api/categories/reorder`
**导入导出**: `/api/import` + `/api/import/preview` + `/api/import/test-channel` + `/api/export`
**访问密钥**: `/api/access-keys`
**系统设置**: `/api/schedule` + `/api/webhook` + `/api/webhook/test` + `/api/tv-txt-url`
**公开访问**: `/tv.txt?key=xxx`

### 环境变量

```env
ADMIN_PASSWORD=xxx           # 管理员密码
DATABASE_PATH=/data/tvlist.db  # SQLite 数据库路径
ENABLE_HTTPS=false           # HTTP 时设 false，HTTPS 时设 true
TV_TXT_ACCESS_KEY=xxx        # 主访问密钥
TV_TXT_SECONDARY_KEYS=       # 备用密钥（逗号分隔）
TV_TXT_RATE_LIMIT=60         # 每小时限流次数
```

## 工作流程和规则

### 需求分析与方案设计

- 将用户需求转化为技术开发方案
- 提供多种实现方案（如适用），说明优缺点
- **等待用户确认方案后再开始实施**

### 代码修改原则

- **单一职责**：每次只修改与当前需求直接相关的模块
- **影响范围控制**：如需改动其他模块，先向用户说明原因和影响，等待确认
- 修改 `ChannelData` 类型时，同步更新 `lib/data.ts` 中的默认数据
- 需要认证的 API 必须调用 `checkAuth()` 或 `verifyToken()`

### 版本控制规范

当用户要求"设定版本号"时：
1. 确保所有更改已提交
2. 使用语义化版本号创建 tag（如 v1.0.0）
3. 更新 package.json 和 CHANGELOG/README 中的版本信息

### 测试要求

每次功能修改后验证：
- [ ] 新功能按预期工作
- [ ] 没有破坏现有功能
- [ ] 错误处理完善
