#!/usr/bin/env bash

# ==============================================================================
# 🏋️‍♂️ IronTrack (铁脉健身) · 一键启动前后端全栈开发环境
# ==============================================================================

# 设置终端颜色
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${GREEN}${BOLD}"
echo "========================================================"
echo "    🏋️‍♂️ IronTrack (铁脉健身) · 前后端全栈服务启动中...    "
echo "========================================================"
echo -e "${NC}"

# 获取当前项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 检查 pnpm 是否存在
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 pnpm，请先安装 pnpm (npm install -g pnpm 或 brew install pnpm)${NC}"
    exit 1
fi

# 确保服务端依赖已安装
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 检测到 server/node_modules 缺失，正在安装服务端依赖...${NC}"
    pnpm --dir server install
fi

# 确保前端依赖已安装
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 检测到前端 node_modules 缺失，正在安装前端依赖...${NC}"
    pnpm install
fi

# 进程 PID 变量
BACKEND_PID=""
FRONTEND_PID=""

# 退出信号捕捉函数 (保证 Ctrl+C 时前后端同时优雅退出，不残留孤儿进程)
cleanup() {
    echo -e "\n${YELLOW}🛑 正在安全关闭 IronTrack 服务...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    # 额外确保可能残留的端口占用被清理
    pkill -P $$ 2>/dev/null
    echo -e "${GREEN}✨ 所有服务已退出，下蹲起立，下次训练再见！${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. 启动后端 Express API 服务 (端口: 3001)
echo -e "${CYAN}🚀 [1/2] 正在启动后端 Express API 服务 (端口: 3001)...${NC}"
pnpm --dir server dev &
BACKEND_PID=$!

# 等待后端启动初始化完成
sleep 1.5

# 2. 启动前端 Vite 开发服务器 (支持移动端与工位端)
echo -e "${CYAN}⚡ [2/2] 正在启动前端 Vite 开发服务器...${NC}"
pnpm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}${BOLD}========================================================"
echo -e "       🎉 IronTrack 前后端开发服务已就绪！               "
echo -e "========================================================${NC}"
echo -e "📱 前端主界面:      ${CYAN}http://localhost:5173/ 或 5174${NC}"
echo -e "🖥️ 工位工作台直达:  ${CYAN}http://localhost:5173/#desk 或 5174/#desk${NC}"
echo -e "🛡️ PC 管理后台:     ${CYAN}http://localhost:3001/admin${NC}"
echo -e "📡 后端健康检查:    ${CYAN}http://localhost:3001/api/health${NC}"
echo -e "${YELLOW}👉 按 Ctrl+C 可一键同时退出所有服务${NC}\n"

# 等待后台任务运行
wait
