# ========================================
# 阶段 1: 依赖安装
# ========================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm install --legacy-peer-deps

# ========================================
# 阶段 2: 构建应用
# ========================================
FROM node:18-alpine AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量（构建时使用）
ENV NEXT_TELEMETRY_DISABLED 1

# 构建应用（使用 standalone 模式）
RUN npm run build

# ========================================
# 阶段 3: 生产运行
# ========================================
FROM node:18-alpine AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 安装 su-exec 用于用户切换
RUN apk add --no-cache su-exec

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制启动脚本（使用 echo 避免 Windows CRLF 问题）
RUN printf '#!/bin/sh\nset -e\nif [ -d "/data" ]; then\n  echo "[Docker] Setting /data directory permissions..."\n  chown -R nextjs:nodejs /data\nfi\necho "[Docker] Starting application as nextjs user..."\nexec su-exec nextjs node server.js\n' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建数据目录并设置权限
RUN mkdir -p /data && chown -R nextjs:nodejs /data

# 设置文件权限
RUN chown -R nextjs:nodejs /app

# 注意：不切换用户，以 root 启动以便修改 Volume 权限
# USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV DATABASE_PATH "/data/tvlist.db"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/verify', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 401 ? 0 : 1)})"

# 使用启动脚本
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
