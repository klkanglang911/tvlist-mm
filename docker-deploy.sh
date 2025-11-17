#!/bin/bash

# ========================================
# tvlist-mm Docker 一键部署脚本
# ========================================

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印信息函数
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ========================================
# 检查依赖
# ========================================
echo "========================================"
echo "tvlist-mm Docker 部署脚本"
echo "========================================"
echo ""

info "检查 Docker 是否已安装..."
if ! command -v docker &> /dev/null; then
    error "Docker 未安装！请先安装 Docker。"
    exit 1
fi
info "✓ Docker 已安装: $(docker --version)"

info "检查 Docker Compose 是否已安装..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose 未安装！请先安装 Docker Compose。"
    exit 1
fi
info "✓ Docker Compose 已安装"

# ========================================
# 检查环境变量文件
# ========================================
echo ""
info "检查环境变量配置..."

if [ ! -f .env ]; then
    warn ".env 文件不存在！"
    echo ""
    echo "请按照以下步骤创建 .env 文件："
    echo "1. 复制示例文件: cp .env.docker.example .env"
    echo "2. 编辑 .env 文件，填写实际的配置值"
    echo "3. 重新运行此脚本"
    echo ""
    exit 1
fi

info "✓ .env 文件已存在"

# ========================================
# 停止并删除旧容器
# ========================================
echo ""
info "停止并删除旧容器（如果存在）..."

if docker ps -a | grep -q tvlist-mm; then
    docker-compose down
    info "✓ 旧容器已停止并删除"
else
    info "✓ 没有旧容器需要删除"
fi

# ========================================
# 构建镜像
# ========================================
echo ""
info "开始构建 Docker 镜像..."
info "这可能需要几分钟时间，请耐心等待..."

if docker-compose build; then
    info "✓ Docker 镜像构建成功！"
else
    error "Docker 镜像构建失败！"
    exit 1
fi

# ========================================
# 启动容器
# ========================================
echo ""
info "启动容器..."

if docker-compose up -d; then
    info "✓ 容器启动成功！"
else
    error "容器启动失败！"
    exit 1
fi

# ========================================
# 等待服务就绪
# ========================================
echo ""
info "等待服务启动（最多等待 60 秒）..."

WAIT_TIME=0
MAX_WAIT=60

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
        info "✓ 服务已就绪！"
        break
    fi

    sleep 2
    WAIT_TIME=$((WAIT_TIME + 2))

    if [ $((WAIT_TIME % 10)) -eq 0 ]; then
        info "等待中... ($WAIT_TIME/$MAX_WAIT 秒)"
    fi
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    warn "服务启动超时，但容器可能仍在启动中。"
    warn "请稍后手动检查: docker logs tvlist-mm"
fi

# ========================================
# 显示状态
# ========================================
echo ""
info "容器状态："
docker ps | grep tvlist-mm || echo "容器未运行"

# ========================================
# 完成提示
# ========================================
echo ""
echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "下一步："
echo "1. 在 1Panel 中配置反向代理（参见 DOCKER_DEPLOYMENT.md）"
echo "2. 配置 SSL 证书"
echo "3. 访问您的域名测试"
echo ""
echo "常用命令："
echo "  查看日志: docker logs -f tvlist-mm"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"
echo ""
info "完整文档请参阅: DOCKER_DEPLOYMENT.md"
echo ""
