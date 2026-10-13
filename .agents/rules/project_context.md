# Project Context & Environment Rules

Refer to the primary project manual located at [AGENTS.md](../../AGENTS.md) for full architecture and technical constraints.

Key Summary for Agents:
1. **Target Hardware**: Intel Celeron J1900 mini-PC (Debian, Docker, Tailscale, Low RAM < 256MB limit).
2. **Server Tech**: Node.js 20+, Express, TypeScript, `better-sqlite3` (WAL mode).
3. **Admin Web**: React 19 + TypeScript + Vite, statically served by Express at `/admin`.
4. **App Client**: React 19 + TypeScript + Vanilla CSS + Capacitor 6 Android APK.
5. **Roles**: `admin` and `user`. Admin can log into both the PC admin dashboard and the mobile gym app.
6. **Deployment Pipeline**: GitHub Actions (`.github/workflows/docker-server.yml`) builds `linux/amd64` image and pushes to Aliyun ACR. Watchtower on J1900 auto-pulls and updates.
