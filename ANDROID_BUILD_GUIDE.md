# IronTrack 铁脉健身 · 安卓 (Android) 打包与运行指南

本项目为纯前端单页架构，原生集成了 **Capacitor 6** 与 **PWA (渐进式 Web 应用)** 双重跨端能力：
- **方案一（标准原生 App）**：通过 Capacitor 构建标准的安卓原生工程，一键编译导出 `.apk` 安装包。
- **方案二（极速免安装 App）**：通过局域网在安卓手机 Chrome 浏览器中点击“添加到主屏幕”，无需安装 Android Studio 即可秒变独立 App。

---

## 方案一：使用 Capacitor 打包 Android APK

### 1. 准备环境
- **Node.js**：v18+ (当前系统已就绪)
- **JDK**：推荐 JDK 17 或 JDK 21
- **Android Studio**（推荐）或 Android SDK 命令行工具

### 2. 构建与同步命令
每次修改前端代码后，只需在 `gym-tracker/` 目录下执行：
```bash
npm run cap:build
```
> 此命令会自动执行 `npm run build` 生成最新静态产物，并调用 `cap sync android` 同步至原生安卓工程 `android/` 中。

---

### 3. 生成 APK 安装包

#### 途径 A：使用 Android Studio 图形化导出（最直观）
1. 打开 Android Studio。
2. 选择 **Open an Existing Project**，打开本项目的 `gym-tracker/android` 目录。
3. 等待 Gradle 自动索引与依赖同步完成（首次加载约需 1~3 分钟）。
4. 在顶部菜单栏点击：
   - **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**。
5. 编译完成后，Android Studio 右下角会弹出提示：
   - 点击 **locate** 即可在文件管理器中找到编译好的 `app-debug.apk`。
6. 将此 `.apk` 文件通过微信、QQ、网盘或 USB 发送到安卓手机上，点击即可直接安装运行！

---

#### 途径 B：纯命令行一键编译 APK（极客方式，无需启动 IDE）
> 📖 **完整小白指南与云端自动构建**：详见专项教程 [零 IDE 纯命令行打包实战指南 (CLI_ANDROID_BUILD_GUIDE.md)](file:///Users/chunxiao/Documents/web/me/LangChainProject/gym-tracker/CLI_ANDROID_BUILD_GUIDE.md)（包含 Java / SDK 纯命令行一键环境配置与 GitHub Actions 0 安装云端打包）。

如果您已配置好 `ANDROID_HOME` 与 Java 环境，也可直接在项目根目录运行：
```bash
pnpm run build:apk
```
或者进入 `android/` 目录执行 Gradle：

```bash
cd /Users/chunxiao/Documents/web/me/LangChainProject/gym-tracker/android

# macOS / Linux:
./gradlew assembleDebug

# Windows:
# gradlew.bat assembleDebug
```
编译生成的 APK 存放路径为：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

如果手机已通过 USB 连接并开启了“开发者选项 -> USB 调试”，可用 `adb` 命令一键安装到手机：
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

#### 途径 C：直接联调真机运行
在 `gym-tracker/` 根目录下执行：
```bash
npx cap run android
```
系统会自动检测连接的安卓真机或模拟器，并自动安装启动应用。

---

## 方案二：手机浏览器 PWA 免打包安装（3 秒在真机运行）

如果您暂时没有安装 Android Studio，可以直接使用 PWA 方式在安卓手机上拥有原生级体验：

1. **在电脑终端启动开发服务器（允许局域网访问）**：
   ```bash
   npm run dev
   ```
   终端会输出类似于：
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.100:5173/
   ```

2. **手机访问**：
   - 确保手机与电脑连接同一个 WiFi 热点。
   - 打开安卓手机自带的 **Chrome**、**Edge** 或系统浏览器。
   - 输入上面的 `Network` 地址（如 `http://192.168.1.100:5173/`）。

3. **添加到桌面**：
   - 点击浏览器右上角菜单（三个点）。
   - 点击 **“添加到主屏幕” (Add to Home screen)** 或 **“安装应用”**。
   - 手机桌面会立即生成 **IronTrack** 健身图标！
   - 从桌面点击打开后：**无浏览器地址栏、全屏运行、深色状态栏一体化**，体验与原生 App 完全一致，离线也能正常打开。

---

## 方案三：通过 GitHub 自动发布（公网网页 + 云端一键打 APK）

项目已配置完整的 GitHub Actions 持续集成工作流，只需将代码推送到 GitHub，即可实现**零本地环境安装**的自动化双端发布：

### 1. 发布公网网页版 (GitHub Pages)

无需购买服务器或域名，GitHub 免费为您提供全球 CDN 加速的静态站点托管服务。

- **自动工作流文件**：[.github/workflows/deploy-pages.yml](file:///.github/workflows/deploy-pages.yml)
- **公网访问地址**：
  ```
  https://<你的GitHub用户名>.github.io/gym-tracker/
  ```
  *(例如：`https://puredownload.github.io/gym-tracker/`)*

#### 首次开启步骤（仅需配置一次）：
1. 在浏览器打开你的 GitHub 仓库主页。
2. 点击顶部导航栏的 **Settings** -> 左侧菜单选择 **Pages**。
3. 在 **Build and deployment** 下方的 **Source** 下拉菜单中：
   - 将默认的 `Deploy from a branch` 修改为 **`GitHub Actions`**。
4. 后续只要执行 `git push` 推送代码到 `main` / `master` 分支，GitHub 会自动编译前端并发布上线。
5. 手机/电脑直接打开该网址，手机浏览器同样支持点击“**添加到主屏幕**”秒变独立 WebApp！

---

### 2. 云端自动化构建 Android APK (GitHub Actions)

无需在本地电脑配置任何庞大的 Android Studio、Android SDK 或 Java 环境，GitHub 云端虚拟机为您自动完成全套编译打包。

- **自动工作流文件**：[.github/workflows/build-apk.yml](file:///.github/workflows/build-apk.yml)
- **下载生成的 APK**：
  1. 打开 GitHub 仓库，点击顶部菜单的 **Actions**。
  2. 点击最近一次运行成功的任务（名称为 **`编译 Android APK 安装包`**）。
  3. 滚动到页面底部的 **Artifacts** 区域。
  4. 点击 **`IronTrack-Debug-APK`** 即可直接下载编译生成的 `app-debug.apk`。
  5. 将 APK 发送至安卓手机（如通过微信/QQ传输或网盘），点击即可直接安装。

---

## ⚠️ 关键注意事项与避坑指南

### 1. 版本环境兼容矩阵（重中之重）
新版本 Capacitor / Vite 对运行时版本有严格要求，修改 CI 脚本或本地编译时必须严格遵循以下版本匹配：
- **Node.js**：必须 **`>= 22.0.0`**（Capacitor 7/8 CLI 的硬性要求，否则报错 `The Capacitor CLI requires NodeJS >=22.0.0`）。
- **Java JDK**：必须 **`JDK 21`**（Capacitor 7/8 Android 原生库目标代码版本为 Java 21，若使用 JDK 17 会报 `error: invalid source release: 21` 错误）。
- **Gradle**：推荐 `Gradle 8.14+`，并使用 `--no-daemon` 参数避免在 CI 容器环境中偶发 OOM 崩溃。

### 2. GitHub Pages 路径适配 (`vite.config.ts`)
- GitHub Pages 项目通常托管在子路径（如 `/gym-tracker/`）。
- 在 `vite.config.ts` 中必须设置 `base: './'`（相对路径），确保无论在根目录、子目录还是本地 Capacitor 原生 WebView 中，CSS、JS 与图片资源均能以相对路径正确加载，避免页面白屏。

### 3. 数据持久化与多端同步机制
- **数据保存在哪里？**：本项目采用客户端本地存储（IndexedDB / LocalStorage），所有数据（训练日志、自定义动作、体重）均严格保存在手机本地或当前浏览器中，**不经过任何第三方服务器，注重极致隐私**。
- **换设备/版本升级如何转移数据？**：
  - 点击应用右上角的 **“数据库” (备份恢复)** 图标。
  - 点击 **“导出备份数据”**，会生成一个包含全部记录的 `.json` 备份文件。
  - 在新手机、新浏览器或重新安装的 App 中点击 **“导入恢复数据”** 即可 100% 完整迁移。
- **公网网页版与 APK 数据互通提示**：
  - 由于浏览器安全沙盒限制，网页版（Chrome）与本地安装的 APK 是彼此独立的存储容器。
  - 若需在网页版与 APK 之间同步，通过上述“导出 JSON -> 导入”即可无缝转移。

---

## 核心功能与使用技巧

1. **部位与动作快速选择（力量 + 有氧专属模式）**：
   - 在“记训练”页面，点击动作标题即可弹出包含 40+ 经典力量与有氧项目的动作库。
   - 支持按胸、背、腿、肩、臂、核心、**有氧**快速切换药丸标签，动作支持点击 📌 一键置顶。
   - **智能有氧模式**：当选择有氧动作（跑步机、路跑、爬楼机、划船机、椭圆机、单车等）时，录入界面自动自适应切换为：**时长 (分钟)**、**距离 (公里)**、**热量 (kcal)**、**心率**，并提供 `+5分`、`+10分`、`+0.5km`、`+1km` 等快捷胶囊按钮。
2. **高效打字与微调**：
   - 每次选择动作后，系统会自动读取您上次练该动作的重量/时长与组数作为参考基准。
   - 提供 `+2.5kg`、`+5kg`、`-2.5kg`、`+1次` 等一键步进胶囊按钮，大幅减少健身房中双手出汗打字的繁琐。
3. **训练日历与往月归档**：
   - 底部“日历”Tab 直观展示整月哪天练了力量或有氧、哪天是休息日。
   - 统计本月训练天数与推拉吨位，支持点击任意日期查看详情或一键复制复用。
   - 往月记录默认折叠，节省视觉空间，点击展开查看历史月份打卡概况。
4. **可视化趋势与超负荷 / 耐力建议**：
   - 力量动作：展示最高做组重量、估算 1RM、单次总容量曲线，并给出加重/减重超负荷判断。
   - 有氧动作：智能切换为 **有氧时长走势**、**运动距离走势**、**卡路里消耗走势**，并给出心肺耐力提升建议与 Zone 2 燃脂指导。
5. **本地数据导出与导入**：
   - 点击右上角数据库图标，可随时导出包含所有训练日记与自定义动作的 `.json` 备份文件。
   - 更换新手机或清理浏览器后，只需导入该 JSON 文件即可 100% 完整恢复。
