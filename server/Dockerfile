# ==========================================
# 阶段 1: 构建阶段 (编译原生 better-sqlite3 与 TS 代码)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 better-sqlite3 在 Alpine 下编译所需的所有 C/C++ 工具链 (必须包含 build-base)
RUN apk add --no-cache python3 make g++ build-base

# 使用 Node.js 官方内置 Corepack 激活匹配的 pnpm (避免 npm install -g 的版本冲突与权限问题)
RUN corepack enable && corepack prepare pnpm@9 --activate

# 拷贝依赖定义文件，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml* ./

# 启用 hoisted 模式（扁平化依赖结构，确保多阶段构建 COPY node_modules 不丢失软链接）
RUN pnpm config set node-linker hoisted && \
    pnpm install --no-frozen-lockfile

# 拷贝源码并编译 TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build

# 修剪开发依赖，缩减镜像体积
RUN pnpm prune --prod


# ==========================================
# 阶段 2: 生产运行阶段 (极简体积，运行内存约 35-45MB)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# 安装时区数据与运行时 C++ 依赖
RUN apk add --no-cache tzdata libstdc++
ENV TZ=Asia/Shanghai

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# 预建持久化数据目录
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
