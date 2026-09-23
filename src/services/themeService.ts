import {
  type ThemeId,
  type ThemeMode,
  type ThemeState,
  PRESET_THEMES,
} from '../types/theme';

const STORAGE_THEME_ID = 'gym_tracker_theme_id';
const STORAGE_THEME_MODE = 'gym_tracker_theme_mode';

class ThemeService {
  private mode: ThemeMode = 'auto';
  private currentThemeId: ThemeId = 'cyber-dark';
  private subscribers: Array<(state: ThemeState) => void> = [];
  private mediaQueryList: MediaQueryList | null = null;
  private isInitialized = false;

  constructor() {
    // 惰性或显式初始化
  }

  /**
   * 初始化主题系统
   */
  public init(): ThemeState {
    if (this.isInitialized) {
      return this.getState();
    }
    this.isInitialized = true;

    // 1. 读取保存的模式与主题 ID
    const savedMode = localStorage.getItem(STORAGE_THEME_MODE) as ThemeMode | null;
    const savedThemeId = localStorage.getItem(STORAGE_THEME_ID) as ThemeId | null;

    if (savedMode === 'manual' && savedThemeId && this.isValidThemeId(savedThemeId)) {
      this.mode = 'manual';
      this.currentThemeId = savedThemeId;
    } else {
      // 默认跟随系统
      this.mode = 'auto';
      const systemScheme = this.getSystemColorScheme();
      this.currentThemeId = this.getDefaultThemeForScheme(systemScheme);
    }

    // 2. 监听系统深浅色切换
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (this.mode === 'auto') {
          const newScheme = this.getSystemColorScheme();
          const targetTheme = this.getDefaultThemeForScheme(newScheme);
          this.currentThemeId = targetTheme;
          this.applyToDom(this.getState());
          this.notifySubscribers();
        }
      };

      try {
        this.mediaQueryList.addEventListener('change', handleSystemChange);
      } catch {
        // 兼容旧版 WebKit
        this.mediaQueryList.addListener(handleSystemChange);
      }
    }

    // 3. 应用至 DOM
    const state = this.getState();
    this.applyToDom(state);
    return state;
  }

  /**
   * 获取当前系统颜色模式
   */
  public getSystemColorScheme(): 'dark' | 'light' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  /**
   * 根据系统颜色模式获取默认推荐皮肤
   */
  public getDefaultThemeForScheme(scheme: 'dark' | 'light'): ThemeId {
    return scheme === 'dark' ? 'cyber-dark' : 'pure-dawn';
  }

  /**
   * 手动设置指定皮肤（会自动将模式转为 manual）
   */
  public setTheme(themeId: ThemeId): void {
    if (!this.isValidThemeId(themeId)) return;

    this.mode = 'manual';
    this.currentThemeId = themeId;
    localStorage.setItem(STORAGE_THEME_MODE, 'manual');
    localStorage.setItem(STORAGE_THEME_ID, themeId);

    const state = this.getState();
    this.applyToDom(state);
    this.notifySubscribers();
  }

  /**
   * 切换跟随系统模式
   */
  public setMode(mode: ThemeMode): void {
    this.mode = mode;
    localStorage.setItem(STORAGE_THEME_MODE, mode);

    if (mode === 'auto') {
      const scheme = this.getSystemColorScheme();
      this.currentThemeId = this.getDefaultThemeForScheme(scheme);
      localStorage.removeItem(STORAGE_THEME_ID);
    } else {
      localStorage.setItem(STORAGE_THEME_ID, this.currentThemeId);
    }

    const state = this.getState();
    this.applyToDom(state);
    this.notifySubscribers();
  }

  /**
   * 获取当前完整的状态快照
   */
  public getState(): ThemeState {
    const activeTheme =
      PRESET_THEMES.find((t) => t.id === this.currentThemeId) || PRESET_THEMES[0];
    return {
      themeId: this.currentThemeId,
      mode: this.mode,
      systemColorScheme: this.getSystemColorScheme(),
      activeTheme,
    };
  }

  /**
   * 订阅状态变化
   */
  public subscribe(callback: (state: ThemeState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    const state = this.getState();
    this.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.error('Theme subscriber error:', e);
      }
    });
  }

  private isValidThemeId(id: string): id is ThemeId {
    return PRESET_THEMES.some((t) => t.id === id);
  }

  /**
   * 将主题变量写入 document 节点及移动端 meta 标签
   */
  private applyToDom(state: ThemeState): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-theme', state.themeId);
    root.setAttribute('data-color-scheme', state.activeTheme.isDark ? 'dark' : 'light');

    // 动态调整移动端状态栏与浏览器环境颜色
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', state.activeTheme.colors.bg);

    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute(
        'content',
        state.activeTheme.isDark ? 'black-translucent' : 'default'
      );
    }
  }
}

export const themeService = new ThemeService();
