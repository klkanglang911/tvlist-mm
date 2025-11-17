#!/bin/sh
set -e

# 确保 /data 目录存在并设置正确的权限
if [ -d "/data" ]; then
  echo "[Docker] Setting /data directory permissions..."
  chown -R nextjs:nodejs /data
fi

# 切换到 nextjs 用户并启动应用
echo "[Docker] Starting application as nextjs user..."
exec su-exec nextjs node server.js
