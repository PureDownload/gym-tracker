import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const rootPkgPath = path.join(rootDir, 'package.json');
const serverPkgPath = path.join(rootDir, 'server/package.json');
const versionJsonPath = path.join(rootDir, 'public/version.json');

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version || '1.0.0';

const arg = process.argv[2];

if (!arg) {
  console.log(`\n❌ 请提供版本参数！`);
  console.log(`用法示例:`);
  console.log(`  npm run bump patch        (例如 1.1.3 -> 1.1.4)`);
  console.log(`  npm run bump minor        (例如 1.1.3 -> 1.2.0)`);
  console.log(`  npm run bump major        (例如 1.1.3 -> 2.0.0)`);
  console.log(`  npm run bump 1.2.0        (指定具体版本号)\n`);
  process.exit(1);
}

function calculateNextVersion(current, type) {
  const parts = current.replace(/^[vV]/, '').split('-')[0].split('.').map(Number);
  while (parts.length < 3) parts.push(0);

  if (type === 'patch') {
    parts[2] += 1;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else {
    return type.replace(/^[vV]/, '');
  }
  return parts.join('.');
}

const nextVersion = calculateNextVersion(currentVersion, arg);

console.log(`\n🚀 开始一键升级版本: v${currentVersion} -> v${nextVersion}\n`);

// 1. 更新根目录 package.json
rootPkg.version = nextVersion;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8');
console.log(`  ✅ 已更新 package.json: ${nextVersion}`);

// 2. 更新服务端 server/package.json
if (fs.existsSync(serverPkgPath)) {
  const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf-8'));
  serverPkg.version = nextVersion;
  fs.writeFileSync(serverPkgPath, JSON.stringify(serverPkg, null, 2) + '\n', 'utf-8');
  console.log(`  ✅ 已更新 server/package.json: ${nextVersion}`);
}

// 3. 更新 public/version.json
if (fs.existsSync(versionJsonPath)) {
  const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
  vJson.version = nextVersion;
  vJson.name = `IronTrack 铁脉健身 v${nextVersion}`;
  vJson.apk_name = `IronTrack-v${nextVersion}.apk`;
  vJson.download_url = `https://github.com/PureDownload/gym-tracker/releases/download/v${nextVersion}/IronTrack-v${nextVersion}.apk`;
  vJson.published_at = new Date().toISOString();
  fs.writeFileSync(versionJsonPath, JSON.stringify(vJson, null, 2) + '\n', 'utf-8');
  console.log(`  ✅ 已更新 public/version.json: ${nextVersion}`);
}

// 4. 执行 build 与 Capacitor 同步
console.log(`\n📦 正在自动编译前端并同步至 Android 原生工程...`);
try {
  execSync('npm run build && npx cap sync android', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log(`\n🎉 版本升级与产物同步成功完成！`);
} catch (err) {
  console.error(`\n⚠️ 产物编译同步失败，请检查编译输出。`, err);
  process.exit(1);
}

console.log(`\n--------------------------------------------------`);
console.log(`✨ 下一步：直接在终端执行以下 Git 命令即可推送到 GitHub：`);
console.log(`\n  git add .`);
console.log(`  git commit -m "chore(release): v${nextVersion}"`);
console.log(`  git tag v${nextVersion}`);
console.log(`  git push origin main --tags\n`);
console.log(`--------------------------------------------------\n`);
