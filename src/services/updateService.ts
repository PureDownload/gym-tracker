import type { GitHubRelease, UpdateCheckResult, DownloadMirror } from '../types/update';

const GITHUB_OWNER = 'PureDownload';
const GITHUB_REPO = 'gym-tracker';
const GITHUB_API_LATEST = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const STORAGE_KEY_IGNORED = 'irontrack_ignored_update_version';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15分钟缓存，防止 GitHub API 限流

export const DOWNLOAD_MIRRORS: DownloadMirror[] = [
  {
    id: 'ghproxy',
    name: '国内高速镜像源',
    desc: '推荐国内移动网络/宽带使用，连接快、免翻墙',
    recommended: true,
    transform: (url: string) => `https://ghproxy.net/${url}`,
  },
  {
    id: 'official',
    name: '官方 GitHub 直链',
    desc: 'GitHub 官方全球节点直连，海外或国际专线推荐',
    recommended: false,
    transform: (url: string) => url,
  },
  {
    id: 'mirror_ghproxy',
    name: '备用 CDN 镜像源',
    desc: '高速备用镜像通道，主力镜像繁忙时可选用',
    recommended: false,
    transform: (url: string) => `https://mirror.ghproxy.com/${url}`,
  },
];

class UpdateService {
  private cachedResult: UpdateCheckResult | null = null;
  private lastCheckTime = 0;

  /**
   * 获取当前应用版本号
   */
  getCurrentVersion(): string {
    try {
      if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
        return __APP_VERSION__;
      }
    } catch {
      // ignore
    }
    return '1.0.0';
  }

  /**
   * 严格的语义化版本比较算法 (SemVer)
   * 返回值:
   *  1: v1 > v2
   * -1: v1 < v2
   *  0: v1 == v2
   */
  compareSemVer(v1: string, v2: string): number {
    const parse = (v: string) => {
      const clean = (v || '').trim().replace(/^[vV]/, '');
      const [core] = clean.split('-');
      const parts = core.split('.').map((p) => {
        const n = parseInt(p, 10);
        return Number.isNaN(n) ? 0 : n;
      });
      while (parts.length < 3) parts.push(0);
      return parts;
    };

    const p1 = parse(v1);
    const p2 = parse(v2);

    for (let i = 0; i < 3; i++) {
      if (p1[i] > p2[i]) return 1;
      if (p1[i] < p2[i]) return -1;
    }
    return 0;
  }

  /**
   * 忽略指定版本的更新提示
   */
  ignoreVersion(version: string): void {
    try {
      localStorage.setItem(STORAGE_KEY_IGNORED, version);
    } catch (e) {
      console.warn('Failed to save ignored version', e);
    }
  }

  /**
   * 判断指定版本是否已被用户忽略
   */
  isVersionIgnored(version: string): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY_IGNORED) === version;
    } catch {
      return false;
    }
  }

  /**
   * 清除已忽略的版本记录
   */
  clearIgnoredVersion(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_IGNORED);
    } catch {
      // ignore
    }
  }

  /**
   * 检查最新版本
   * @param force 是否强制跳过缓存直接联网请求
   */
  async checkForUpdates(force = false): Promise<UpdateCheckResult> {
    const currentVersion = this.getCurrentVersion();
    const now = Date.now();

    if (!force && this.cachedResult && now - this.lastCheckTime < CACHE_DURATION_MS) {
      return this.cachedResult;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(GITHUB_API_LATEST, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // 暂未发布任何 Release
          const noReleaseResult: UpdateCheckResult = {
            hasUpdate: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseName: '暂无发布版本',
            releaseNotes: '当前仓库暂未发布任何正式 Release 版本',
            publishedAt: new Date().toISOString(),
            downloadUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
            assetName: '',
            assetSize: 0,
            htmlUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
            isPrerelease: false,
            checkedAt: now,
          };
          this.cachedResult = noReleaseResult;
          this.lastCheckTime = now;
          return noReleaseResult;
        }

        if (response.status === 403) {
          throw new Error('GitHub API 请求频次超限，请稍候再试');
        }

        throw new Error(`网络响应错误: HTTP ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latestVersion = (release.tag_name || '').replace(/^[vV]/, '');
      const hasUpdate = this.compareSemVer(latestVersion, currentVersion) > 0;

      // 寻找 APK 资产
      const apkAsset = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'));
      const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

      const result: UpdateCheckResult = {
        hasUpdate,
        currentVersion,
        latestVersion: release.tag_name,
        releaseName: release.name || release.tag_name,
        releaseNotes: release.body || '无详细更新说明',
        publishedAt: release.published_at,
        downloadUrl,
        assetName: apkAsset?.name || `IronTrack-${release.tag_name}.apk`,
        assetSize: apkAsset?.size || 0,
        htmlUrl: release.html_url,
        isPrerelease: Boolean(release.prerelease),
        checkedAt: now,
      };

      this.cachedResult = result;
      this.lastCheckTime = now;
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? '检查更新超时，请检查网络连接' : (err.message || '无法获取更新信息');

      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: '',
        releaseNotes: '',
        publishedAt: '',
        downloadUrl: '',
        assetName: '',
        assetSize: 0,
        htmlUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
        isPrerelease: false,
        checkedAt: now,
        error: errorMsg,
      };
    }
  }

  /**
   * 格式化文件大小
   */
  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '未知大小';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  /**
   * 格式化发布日期
   */
  formatDate(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoString;
    }
  }
}

export const updateService = new UpdateService();
