export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
  download_count?: number;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

export interface DownloadMirror {
  id: string;
  name: string;
  desc: string;
  recommended?: boolean;
  transform: (url: string) => string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string;
  assetSize: number;
  htmlUrl: string;
  isPrerelease: boolean;
  checkedAt: number;
  error?: string;
}
