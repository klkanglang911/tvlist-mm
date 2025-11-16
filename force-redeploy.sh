#!/bin/bash

echo "======================================"
echo "  紧急修复脚本 - 强制重新部署"
echo "======================================"
echo ""

# 创建一个临时更改来触发新部署
echo "1. 添加部署时间戳..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > .vercel-deploy-timestamp << EOF
最后部署时间: $TIMESTAMP
此文件用于触发 Vercel 重新部署
EOF

echo "2. 提交更改..."
git add .vercel-deploy-timestamp
git commit -m "🚀 触发 Vercel 重新部署 - $TIMESTAMP"

echo "3. 推送到 GitHub..."
git push origin main

echo ""
echo "======================================"
echo "  ✅ 完成"
echo "======================================"
echo ""
echo "GitHub 推送完成，Vercel 应该会在 30 秒内"
echo "自动检测到更新并开始重新部署。"
echo ""
echo "请访问 Vercel Dashboard 查看部署进度："
echo "https://vercel.com/capibalaas-projects/tvlist-mm"
echo ""
echo "部署完成后，访问："
echo "https://tvlist-mm.vercel.app/login"
echo ""
