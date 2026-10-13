#!/bin/bash
set -e

# ==============================================================================
# IronTrack J1900 Debian Docker 一键部署脚本
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}    🏋️ IronTrack 后端服务 - J1900 Debian Docker 部署   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. 检查 Docker 环境
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 Docker！${NC}"
    echo -e "${YELLOW}👉 请先在 Debian 运行以下官方脚本一键安装 Docker:${NC}"
    echo "   curl -fsSL https://get.docker.com | bash"
    echo "   sudo usermod -aG docker \$USER"
    exit 1
fi

# 2. 判断 docker compose 命令
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}❌ 错误: 未检测到 docker compose 插件或 docker-compose 命令！${NC}"
    echo -e "${YELLOW}👉 Debian 安装 compose 插件:${NC}"
    echo "   sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
    exit 1
fi

# 3. 准备数据持久化目录
echo -e "${BLUE}📁 正在确认持久化数据目录...${NC}"
mkdir -p data

# 4. 检查 .env 配置文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️ 未检测到 .env 配置文件，将使用默认配置生成...${NC}"
    cp .env.example .env 2>/dev/null || cat <<EOF > .env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=irontrack_j1900_$(date +%s)_secret_key
DATA_DIR=./data
EOF
    echo -e "${GREEN}✅ 已自动生成 .env 配置文件${NC}"
fi

# 5. 构建并启动容器
echo -e "${BLUE}🚀 正在构建并启动 Docker 容器 (基于 x86_64 原生优化编译)...${NC}"
$COMPOSE up -d --build

# 6. 显示运行状态
echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 部署成功！容器已在后台运行${NC}"
echo -e "${GREEN}======================================================${NC}"
$COMPOSE ps

# 7. 显示访问信息
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "你的J1900局域网IP")
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")

echo ""
echo -e "${YELLOW}📌 服务与管理后台访问地址:${NC}"
echo "   局域网接口 : http://${LOCAL_IP}:3001"
echo "   PC管理后台 : http://${LOCAL_IP}:3001/admin"
if [ -n "$TAILSCALE_IP" ]; then
    echo "   Tailscale  : http://${TAILSCALE_IP}:3001"
    echo "   Tailscale后台: http://${TAILSCALE_IP}:3001/admin"
fi

echo ""
echo -e "${YELLOW}🛠️ 常用运维管理命令:${NC}"
echo "   查看实时日志: $COMPOSE logs -f"
echo "   停止服务    : $COMPOSE down"
echo "   重启服务    : $COMPOSE restart"
echo "   数据文件备份: cp data/irontrack.db ./irontrack_backup_\$(date +%Y%m%d).db"
echo ""
