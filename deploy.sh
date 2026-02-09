#!/bin/bash

# ========================================
# tvlist-mm 一键部署/更新脚本
# 使用方法: ./deploy.sh [选项]
# 选项:
#   --no-backup    跳过数据库备份
#   --clean        清理旧镜像和缓存
#   --force        强制重新构建（不使用缓存）
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="tvlist-mm"
CONTAINER_NAME="tvlist-mm"
BACKUP_DIR="./backups"
MAX_BACKUPS=5
DEFAULT_PORT=5867

# 解析参数
NO_BACKUP=false
CLEAN_BUILD=false
FORCE_BUILD=false

for arg in "$@"; do
    case $arg in
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --force)
            FORCE_BUILD=true
            shift
            ;;
        *)
            ;;
    esac
done

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查环境
check_environment() {
    print_info "检查环境..."

    check_command docker
    check_command docker-compose
    check_command git

    # 检查 .env 文件
    if [ ! -f .env ]; then
        if [ -f .env.docker.example ]; then
            print_warning ".env 文件不存在，从模板创建..."
            cp .env.docker.example .env
            print_warning "请编辑 .env 文件配置必要的环境变量后重新运行此脚本"
            exit 1
        else
            print_error ".env 文件不存在，请先配置环境变量"
            exit 1
        fi
    fi

    # 检查必要的环境变量
    source .env
    if [ -z "$ADMIN_PASSWORD" ]; then
        print_error "ADMIN_PASSWORD 未设置，请在 .env 文件中配置"
        exit 1
    fi

    print_success "环境检查通过"
}

# 备份数据库
backup_database() {
    if [ "$NO_BACKUP" = true ]; then
        print_info "跳过数据库备份"
        return
    fi

    print_info "备份数据库..."

    # 创建备份目录
    mkdir -p "$BACKUP_DIR"

    # 检查容器是否存在
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="$BACKUP_DIR/tvlist_backup_$TIMESTAMP.db"

        # 从容器复制数据库
        if docker cp ${CONTAINER_NAME}:/data/tvlist.db "$BACKUP_FILE" 2>/dev/null; then
            print_success "数据库备份成功: $BACKUP_FILE"

            # 清理旧备份（保留最近 N 个）
            ls -t $BACKUP_DIR/tvlist_backup_*.db 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
            print_info "保留最近 $MAX_BACKUPS 个备份"
        else
            print_warning "无法备份数据库（可能是首次部署）"
        fi
    else
        print_info "容器不存在，跳过备份（首次部署）"
    fi
}

# 拉取最新代码
pull_latest_code() {
    print_info "拉取最新代码..."

    # 保存当前提交
    OLD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

    # 拉取代码
    git fetch origin main
    git reset --hard origin/main

    # 获取新提交
    NEW_COMMIT=$(git rev-parse HEAD)

    if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
        print_info "代码已是最新版本"
    else
        print_success "代码更新成功"
        print_info "更新内容:"
        git log --oneline ${OLD_COMMIT}..${NEW_COMMIT} 2>/dev/null || git log --oneline -5
    fi
}

# 停止旧容器
stop_container() {
    print_info "停止旧容器..."

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker-compose stop
        print_success "容器已停止"
    else
        print_info "容器未运行"
    fi
}

# 构建并启动容器
build_and_start() {
    print_info "构建并启动容器..."

    BUILD_ARGS=""
    if [ "$FORCE_BUILD" = true ]; then
        BUILD_ARGS="--no-cache"
        print_info "使用强制构建模式（不使用缓存）"
    fi

    # 构建镜像
    docker-compose build $BUILD_ARGS

    # 启动容器
    docker-compose up -d

    print_success "容器启动成功"
}

# 清理旧资源
cleanup() {
    if [ "$CLEAN_BUILD" = true ]; then
        print_info "清理旧镜像和缓存..."

        # 删除悬空镜像
        docker image prune -f

        # 删除未使用的构建缓存
        docker builder prune -f

        print_success "清理完成"
    fi
}

# 验证部署
verify_deployment() {
    print_info "验证部署..."

    # 读取端口配置
    source .env 2>/dev/null || true
    PORT=${HOST_PORT:-$DEFAULT_PORT}

    # 等待容器启动
    sleep 5

    # 检查容器状态
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME})
        if [ "$CONTAINER_STATUS" = "running" ]; then
            print_success "容器运行正常"

            # 等待应用完全启动
            print_info "等待应用启动..."
            sleep 10

            # 健康检查
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/api/auth/verify | grep -q "200\|401"; then
                print_success "应用健康检查通过"
            else
                print_warning "应用健康检查未通过，请检查日志"
            fi
        else
            print_error "容器状态异常: $CONTAINER_STATUS"
            docker logs --tail 50 ${CONTAINER_NAME}
            exit 1
        fi
    else
        print_error "容器未启动"
        exit 1
    fi
}

# 显示部署信息
show_info() {
    # 读取端口配置
    source .env 2>/dev/null || true
    PORT=${HOST_PORT:-$DEFAULT_PORT}

    echo ""
    echo "=========================================="
    print_success "部署完成！"
    echo "=========================================="
    echo ""
    echo "访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_IP'):${PORT}"
    echo ""
    echo "常用命令:"
    echo "  查看日志:     docker logs -f ${CONTAINER_NAME}"
    echo "  重启容器:     docker-compose restart"
    echo "  停止容器:     docker-compose stop"
    echo "  查看状态:     docker-compose ps"
    echo ""
    echo "日志配置:"
    echo "  日志级别:     LOG_LEVEL=warn (可在 .env 中修改)"
    echo "  日志大小限制: 5MB x 3 = 最大 15MB"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "   ${PROJECT_NAME} 一键部署脚本"
    echo "=========================================="
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    check_environment
    backup_database
    pull_latest_code
    stop_container
    build_and_start
    cleanup
    verify_deployment
    show_info
}

# 运行主函数
main
