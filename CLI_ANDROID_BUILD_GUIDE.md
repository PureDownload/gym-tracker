# 零 IDE 纯命令行打包 Android APK 实战指南
> 适合完全不懂安卓原生开发的新手、前端工程师与极客开发者的“保姆级教程”。
> 告别 4GB+ 笨重的 Android Studio，本地轻量化编译 + GitHub 云端全自动化构建任选。

---

## 目录
- [0. 核心概念：为什么根本不需要 Android Studio？](#0-核心概念为什么根本不需要-android-studio)
- [1. 第一阶段：基础环境体检与极速安装（新手必读）](#1-第一阶段基础环境体检与极速安装新手必读)
  - [1.1 检测与安装 Node.js 环境](#11-检测与安装-nodejs-环境)
  - [1.2 检测与安装 Homebrew（Mac 必备神器）](#12-检测与安装-homebrewmac-必备神器)
  - [1.3 检测与安装 Java JDK 环境](#13-检测与安装-java-jdk-环境)
  - [1.4 检测与安装 Git 环境](#14-检测与安装-git-环境)
- [2. 方案一：Mac 本地纯命令行构建 APK（下载仅约 200MB，极速导出）](#2-方案一mac-本地纯命令行构建-apk下载仅约-200mb极速导出)
  - [步骤 1：一键安装 Android 纯命令行工具包](#步骤-1一键安装-android-纯命令行工具包)
  - [步骤 2：一键配置环境变量（免手动翻找路径）](#步骤-2一键配置环境变量免手动翻找路径)
  - [步骤 3：纯命令行静默下载构建构件与协议授权](#步骤-3纯命令行静默下载构建构件与协议授权)
  - [步骤 4：在项目中声明 SDK 路径（local.properties）](#步骤-4在项目中声明-sdk-路径localproperties)
  - [步骤 5：在 package.json 注入一键打包快捷指令](#步骤-5在-packagejson-注入一键打包快捷指令)
  - [步骤 6：一键执行编译与真机安装测试](#步骤-6一键执行编译与真机安装测试)
  - [本地常见报错与避坑宝典 (FAQ)](#本地常见报错与避坑宝典-faq)
- [3. 方案二：GitHub Actions 云端全自动打包（本地 0 安装，彻底解放电脑）](#3-方案二github-actions-云端全自动打包本地-0-安装彻底解放电脑)
  - [步骤 1：创建 GitHub Actions 工作流文件](#步骤-1创建-github-actions-工作流文件)
  - [步骤 2：把代码推送到 GitHub 仓库](#步骤-2把代码推送到-github-仓库)
  - [步骤 3：触发云端编译并实时查看日志](#步骤-3触发云端编译并实时查看日志)
  - [步骤 4：下载生成的 APK 并安装到手机](#步骤-4下载生成的-apk-并安装到手机)
- [4. 两种方案横向对比（我该选哪种？）](#4-两种方案横向对比我该选哪种)

---

## 0. 核心概念：为什么根本不需要 Android Studio？

很多新手以为打包安卓 App 必须安装 Google 的 **Android Studio**，但其实：
1. **Android Studio** 只是一个带界面的“代码编辑器”（UI 外壳），安装包体积高达 1.5GB+，解压后占用 4~6GB 硬盘，运行时还要占用好几个 G 的运行内存。
2. 真正负责把代码、网页和资源打包成 `.apk` 文件的，底层只有两个工具：
   - **Java / JDK**（负责跑构建程序）
   - **Android SDK 命令行工具**（包含 `sdkmanager`、`aapt`、`d8` 等无头编译工具）
3. 只要有了这两个工具，在终端敲一行命令即可打包，不仅清爽、省电、不占硬盘，还能轻易接入自动化脚本。

---

## 1. 第一阶段：基础环境体检与极速安装（新手必读）

请打开 Mac 自带的 **终端 (Terminal)** 或 iTerm2，跟着下面的步骤逐项检查。

### 1.1 检测与安装 Node.js 环境

#### 🔍 检测命令：
```bash
node -v
npm -v
```
- **正常结果示例**：输出了版本号，如 `v20.x.x` 或 `v18.x.x`。
- **如果提示 `command not found: node`**：
  - 打开官网 [nodejs.org](https://nodejs.org/) 下载 LTS 版本一键安装包安装，或者通过 Homebrew 安装：
    ```bash
    brew install node
    ```

---

### 1.2 检测与安装 Homebrew（Mac 必备神器）

Homebrew 是 Mac 上最强大的包管理工具，后续的 Java、Android 命令行工具都可以通过它一行命令搞定。

#### 🔍 检测命令：
```bash
brew -v
```
- **正常结果示例**：输出 `Homebrew 4.x.x`。
- **如果提示 `command not found: brew`**：
  - **国内网络极速安装命令（自动配置镜像源，极力推荐）**：
    ```bash
    /bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
    ```
    （运行后按照屏幕提示按数字选择清华大学或中科大镜像源，一路回车输入电脑密码即可完成）
  - **海外/官方网络安装命令**：
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```

---

### 1.3 检测与安装 Java JDK 环境

Android 编译依赖 Java 运行环境（推荐 **JDK 17** 或 **JDK 21**，当前 Android 生态最佳稳定版）。

#### 🔍 检测命令：
```bash
java -version
```
- **正常结果示例**：
  ```
  openjdk version "17.0.x" ...
  或者
  java version "23.0.1" ...
  ```
  如果输出了版本信息，说明已经有 Java 环境了。
- **如果提示 `command not found: java` 或版本过旧**：
  - 用 Homebrew 一键安装业界最主流的 Eclipse Temurin JDK 17：
    ```bash
    brew install --cask temurin@17
    ```
  - 安装完成后，再次运行 `java -version` 确认显示成功。

---

### 1.4 检测与安装 Git 环境

#### 🔍 检测命令：
```bash
git --version
```
- **正常结果示例**：`git version 2.x.x`
- **如果未安装**：
  ```bash
  xcode-select --install
  # 或者
  brew install git
  ```

---

## 2. 方案一：Mac 本地纯命令行构建 APK（下载仅约 200MB，极速导出）

> **方案优势**：
> - 完全不启动、不安装 Android Studio。
> - 只下载核心编译套件，耗时仅需 3~5 分钟。
> - 配置好后，每次修改代码只需敲一行命令，10 秒生成 APK。

### 步骤 1：一键安装 Android 纯命令行工具包
在终端输入以下命令：
```bash
brew install --cask android-commandlinetools
```
> **说明**：Homebrew 会自动将纯命令行工具下载并解压到 `/opt/homebrew/share/android-commandlinetools`。

---

### 步骤 2：一键配置环境变量（免手动翻找路径）

复制并执行整段命令，将 Android SDK 目录规范化并写入你的 `~/.zshrc`：

```bash
# 1. 创建本地专属的 SDK 放置目录
mkdir -p ~/Library/Android/sdk

# 2. 写入全局环境变量配置
cat << 'EOF' >> ~/.zshrc

# >>> Android CLI SDK 配置开始 >>>
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin
# <<< Android CLI SDK 配置结束 <<<
EOF

# 3. 立即重载生效
source ~/.zshrc
```

#### 🔍 检验是否配置成功：
输入：
```bash
sdkmanager --version
```
如果输出了一串数字版本号（例如 `15.x.x`），说明环境变量已经彻底配置成功！

---

### 步骤 3：纯命令行静默下载构建构件与协议授权

不需要任何弹窗点击，终端执行以下两行命令：

```bash
# 1. 自动同意所有 Google SDK 许可协议
yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses

# 2. 静默下载编译 APK 必备的核心组件（体积仅约 100MB）
sdkmanager --sdk_root=$ANDROID_HOME "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

> 💡 **小贴士**：
> 如果后续项目需要 Android 15，只需将数字替换执行：
> `sdkmanager --sdk_root=$ANDROID_HOME "platforms;android-35" "build-tools;35.0.0"`

---

### 步骤 4：在项目中声明 SDK 路径（local.properties）

Android 工程需要一个 `local.properties` 文件来指引 SDK 所在位置。
进入本工程目录，直接一条命令生成：

```bash
cd /Users/chunxiao/Documents/web/me/LangChainProject/gym-tracker
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

#### 🔍 验证文件内容：
```bash
cat android/local.properties
```
应显示：`sdk.dir=/Users/你的用户名/Library/Android/sdk`。

---

### 步骤 5：在 package.json 注入一键打包快捷指令

打开项目根目录的 `package.json`，在 `"scripts"` 区域加上一行 `"build:apk"`：

```json
"scripts": {
  "dev": "vite --host",
  "build": "tsc -b && vite build",
  "cap:build": "npm run build && cap sync android",
  "build:apk": "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug"
}
```

> **原理解析**：这一行快捷命令一次性串联了三件事：
> 1. `npm run build`：把 React/Vue 前端工程编译打包为最新的静态文件（生成 `dist` 目录）。
> 2. `npx cap sync android`：把静态文件同步复制到 Android 原生工程的 assets 目录中。
> 3. `cd android && ./gradlew assembleDebug`：调用 Gradle 原生编译引擎，将项目压制成 APK 安装包。

---

### 步骤 6：一键执行编译与真机安装测试

在项目根目录（`gym-tracker/`）执行：

```bash
# 使用 pnpm 或 npm 均可：
pnpm run build:apk
# 或
npm run build:apk
```

你会看到终端飞速滚动编译日志，最后看到高亮提示：
```
BUILD SUCCESSFUL in 8s
```

#### 📦 你的 APK 在哪里？
编译完成的安装包存放在：
```bash
gym-tracker/android/app/build/outputs/apk/debug/app-debug.apk
```

#### 📲 如何安装到手机？
- **方式 A（USB 极客一键秒装）**：
  1. 安卓手机用数据线连电脑，开启手机的“开发者模式 -> USB 调试”。
  2. 终端执行：
     ```bash
     adb install -r android/app/build/outputs/apk/debug/app-debug.apk
     ```
  3. 手机屏幕瞬间自动跳出安装提示并安装成功！
- **方式 B（无线传输）**：
  直接把 `app-debug.apk` 微信文件传输助手、QQ 发送给手机，点击安装即可！

---

### 本地常见报错与避坑宝典 (FAQ)

#### Q1: 提示 `Permission denied: ./gradlew` 权限不足？
- **原因**：Gradle 包装器脚本丢失了可执行权限。
- **解决办法**：
  ```bash
  chmod +x android/gradlew
  ```

#### Q2: 提示 `SDK location not found`？
- **原因**：找不到 Android SDK 路径。
- **解决办法**：重新执行[步骤 4]，确保 `android/local.properties` 文件存在，且里面写入了正确的 `sdk.dir=/Users/你的用户名/Library/Android/sdk`。

#### Q3: 提示 `Licenses for package Android SDK Platform ... not accepted`？
- **原因**：Google 协议未同意。
- **解决办法**：
  ```bash
  yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses
  ```

---

## 3. 方案二：GitHub Actions 云端全自动打包（本地 0 安装，彻底解放电脑）

> **方案优势**：
> - **电脑本地 0 占用**：不需要安装 Java，不需要安装 Android SDK，不需要配置环境变量。
> - **随时随地构建**：无论是换了新电脑、在 Windows/Mac/Linux 任何机器上，只要改了前端代码推到 GitHub，云端 2 分钟全自动为你打包出 APK。
> - **自动化与归档**：历史版本都有记录，随时随地在手机网页上点开下载。

---

### 步骤 1：创建 GitHub Actions 工作流文件

在项目根目录下，创建文件夹 `.github/workflows/`，并在里面新建一个名为 `build-apk.yml` 的文件。

完整文件内容如下（可直接复制粘贴）：

```yaml
name: 自动构建 Android APK

on:
  # 1. 每次向 main 或 master 分支推送代码时自动构建
  push:
    branches: [ main, master ]
  # 2. 允许在 GitHub 网页上手动点击按钮触发构建
  workflow_dispatch:

# 权限配置：允许写入 Releases
permissions:
  contents: write

jobs:
  build-apk:
    name: 编译 Android APK 安装包
    runs-on: ubuntu-latest

    steps:
      # 第一步：拉取仓库源码
      - name: 检出源码
        uses: actions/checkout@v4

      # 第二步：安装 Node.js 环境
      - name: 配置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # 第三步：安装 Java JDK 17 环境
      - name: 配置 Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      # 第四步：配置 Android SDK 环境（GitHub 虚拟机已预装，此处配置缓存与工具）
      - name: 配置 Android SDK
        uses: android-actions/setup-android@v3

      # 第五步：安装前端依赖
      - name: 安装前端依赖
        run: |
          npm ci || npm install

      # 第六步：前端项目编译打包并同步至 Capacitor 安卓工程
      - name: 编译前端并同步 Capacitor
        run: |
          npm run build
          npx cap sync android

      # 第七步：使用 Gradle 编译 Debug APK
      - name: 执行 Gradle 纯命令行打包
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --stacktrace

      # 第八步：将生成的 APK 上传为可下载产物 (Artifact)
      - name: 保存生成的 APK
        uses: actions/upload-artifact@v4
        with:
          name: IronTrack-Debug-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30 # 保留 30 天供随时下载
```

---

### 步骤 2：把代码推送到 GitHub 仓库

如果你还没建立远程 Git 仓库，只需在终端操作：

```bash
# 1. 初始化 git（如果未初始化）
git init

# 2. 提交当前修改
git add .
git commit -m "feat: 添加免 IDE 命令行与 GitHub Actions 自动打包配置"

# 3. 关联你的 GitHub 仓库（将下面的地址换成你的实际 GitHub 仓库 URL）
# git remote add origin https://github.com/你的用户名/你的仓库名.git

# 4. 推送到远程
# git push -u origin main
```

---

### 步骤 3：触发云端编译并实时查看日志

1. 打开你的 GitHub 仓库页面。
2. 点击顶部的 **Actions** 标签页。
3. 你会看到左侧有一个名为 **“自动构建 Android APK”** 的工作流：
   - 如果刚推了代码，它已经在自动运行；
   - 也可以点击它，在右侧点击 **Run workflow** 按钮进行手动触发。
4. 点击进入构建任务，可以看到 GitHub 的 Ubuntu 虚拟机正在实时为你：安装依赖 -> 编译 React -> 同步原生工程 -> 编译 APK。
5. 全程通常只需 **1 分半到 2 分钟**，最后显示漂亮的绿勾 ✅ **Success**。

---

### 步骤 4：下载生成的 APK 并安装到手机

1. 构建完成后，在当前运行记录页面的最下方，找到 **Artifacts (构建产物)** 区域。
2. 你会看到一个名为 **`IronTrack-Debug-APK`** 的文件，点击它即可直接下载成一个 `.zip` 压缩包。
3. 解压出来就是最终的 `app-debug.apk`！
4. 发送到手机即可畅快体验。

> 🌟 **极客高阶玩法**：
> 如果安装了 GitHub 官方命令行工具 `gh`，你甚至连网页都不用打开，直接在终端敲：
> ```bash
> gh run download --name IronTrack-Debug-APK
> ```
> 就能自动把云端打包好的 APK 下载到当前目录！

---

## 4. 两种方案横向对比（我该选哪种？）

| 对比维度 | 方案一：Mac 本地无头 CLI 打包 | 方案二：GitHub Actions 云端全自动打包 |
| :--- | :--- | :--- |
| **安装难度** | ⭐️⭐️（执行 3 条 brew 与 sdkmanager 命令） | ⭐️（只需放一个 `.yml` 文件并推送代码） |
| **本地空间占用** | 约 300MB ~ 500MB | **0 空间占用**（完全不消耗本地硬盘） |
| **打包速度** | **极快**（8~15 秒一键生成） | 约 1.5 ~ 2 分钟（需排队分配云端容器） |
| **网络要求** | 仅首次下载 SDK 工具包需网络，后续离线可用 | 必须能够连接 GitHub 并推送代码 |
| **适用人群** | 经常改动前端代码、想秒级编译真机调试的开发者 | 极简主义者、Mac 硬盘较小、换机频繁或团队协作交付 |

---

> 💡 **总结建议**：
> - 平时日常在本地开发调试，推荐使用 **方案一**，按一下回车十几秒出包，开发体验丝滑。
> - 项目发布里程碑或不想让本地电脑变脏时，使用 **方案二**，代码一推云端全自动处理，安心喝咖啡。
