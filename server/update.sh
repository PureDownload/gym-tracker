#!/bin/bash
set -e

# ==============================================================================
# IronTrack J1900 Debian Docker 服务安全更新脚本
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}    🔄 IronTrack 后端服务 - J1900 安全平滑更新       ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. 自动备份当前数据库 (防止更新异常导致数据受损)
if [ -f data/irontrack.db ]; then
    BACKUP_FILE="data/irontrack_backup_$(date +%Y%m%d_%H%M%S).db"
    echo -e "${YELLOW}💾 [1/4] 正在创建数据快照备份: ${BACKUP_FILE}...${NC}"
    cp data/irontrack.db "${BACKUP_FILE}"
    echo -e "${GREEN}✅ 备份成功！${NC}"
else
    echo -e "${BLUE}ℹ️ 未检测到现有数据库文件，跳过备份。${NC}"
fi

# 2. 检查 docker compose 工具
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}❌ 错误: 未检测到 docker compose 命令！${NC}"
    exit 1
fi

# 3. 拉取最新云端镜像或本地重构
echo -e "${BLUE}📥 [2/4] 正在从镜像仓库拉取最新镜像 (或检查本地构建)...${NC}"
if grep -q "SERVER_IMAGE" .env 2>/dev/null; then
    $COMPOSE pull gym-tracker-server || echo -e "${YELLOW}⚠️ 远程拉取未命中或未登录，回退本地检查...${NC}"
fi

# 4. 平滑替换容器 (原子级切换，停机时间 < 2 秒)
echo -e "${BLUE}🚀 [3/4] 正在应用新镜像平滑重启容器...${NC}"
$COMPOSE up -d gym-tracker-server

# 5. 清理虚悬镜像 (释放 J1900 宝贵磁盘空间)
echo -e "${BLUE}🧹 [4/4] 正在清理过期虚悬镜像 (Dangling images)...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 恭喜！后端服务已平滑更新至最新版本${NC}"
echo -e "${GREEN}======================================================${NC}"
$COMPOSE ps

echo ""
echo -e "${YELLOW}📝 检查实时日志请运行:${NC} $COMPOSE logs -f --tail 50"
echo ""
