export type ThemeId =
  | 'cyber-dark'
  | 'obsidian-gold'
  | 'ocean-abyss'
  | 'neon-matrix'
  | 'pure-dawn'
  | 'titanium-frost'
  | 'sakura-breeze';

export type ThemeMode = 'auto' | 'manual';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  enName: string;
  description: string;
  isDark: boolean;
  colors: {
    bg: string;
    surface: string;
    card: string;
    accent: string;
    secondary: string;
    text: string;
  };
  previewGradient: string;
}

export const PRESET_THEMES: ThemeOption[] = [
  // --- 深色主题 ---
  {
    id: 'cyber-dark',
    name: '暗夜极客',
    enName: 'Cyber Dark',
    description: '铁脉经典深色，深蓝底色与翡翠绿能量点缀',
    isDark: true,
    colors: {
      bg: '#090d16',
      surface: '#111726',
      card: '#161e31',
      accent: '#10b981',
      secondary: '#06b6d4',
      text: '#f8fafc',
    },
    previewGradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    id: 'obsidian-gold',
    name: '黑金尊享',
    enName: 'Obsidian Gold',
    description: 'AMOLED 纯黑底色与香槟金，重金属奢华力量感',
    isDark: true,
    colors: {
      bg: '#070709',
      surface: '#111115',
      card: '#1a1a23',
      accent: '#f59e0b',
      secondary: '#fbbf24',
      text: '#fef3c7',
    },
    previewGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    id: 'ocean-abyss',
    name: '深海迷航',
    enName: 'Ocean Abyss',
    description: '浩瀚深海蓝调搭配蔚蓝天际，冷静克制专注训练',
    isDark: true,
    colors: {
      bg: '#060f1e',
      surface: '#0d1b30',
      card: '#12243e',
      accent: '#0ea5e9',
      secondary: '#2dd4bf',
      text: '#f0f9ff',
    },
    previewGradient: 'linear-gradient(135deg, #0ea5e9, #2dd4bf)',
  },
  {
    id: 'neon-matrix',
    name: '赛博霓虹',
    enName: 'Neon Matrix',
    description: '暗夜幻紫与烈焰荧光，高燃荷尔蒙与潮流电光',
    isDark: true,
    colors: {
      bg: '#0c0717',
      surface: '#160d29',
      card: '#20133a',
      accent: '#a855f7',
      secondary: '#f43f5e',
      text: '#faf5ff',
    },
    previewGradient: 'linear-gradient(135deg, #a855f7, #f43f5e)',
  },

  // --- 浅色主题 ---
  {
    id: 'pure-dawn',
    name: '纯净晨曦',
    enName: 'Pure Dawn',
    description: '纯净白昼与生机绿意，高呼吸感晨光通透体验',
    isDark: false,
    colors: {
      bg: '#f1f5f9',
      surface: '#ffffff',
      card: '#ffffff',
      accent: '#059669',
      secondary: '#0891b2',
      text: '#0f172a',
    },
    previewGradient: 'linear-gradient(135deg, #059669, #0891b2)',
  },
  {
    id: 'titanium-frost',
    name: '钛金银霜',
    enName: 'Titanium Frost',
    description: '冷萃金属灰搭配极光钴蓝，现代精英极简科技风',
    isDark: false,
    colors: {
      bg: '#eaeff5',
      surface: '#ffffff',
      card: '#ffffff',
      accent: '#2563eb',
      secondary: '#0284c7',
      text: '#1e293b',
    },
    previewGradient: 'linear-gradient(135deg, #2563eb, #38bdf8)',
  },
  {
    id: 'sakura-breeze',
    name: '暖柔春樱',
    enName: 'Sakura Breeze',
    description: '柔和温润粉白与玫瑰珊瑚粉，护眼舒适治愈感受',
    isDark: false,
    colors: {
      bg: '#fdf4f5',
      surface: '#ffffff',
      card: '#ffffff',
      accent: '#e11d48',
      secondary: '#db2777',
      text: '#2a171b',
    },
    previewGradient: 'linear-gradient(135deg, #e11d48, #db2777)',
  },
];

export interface ThemeState {
  themeId: ThemeId;
  mode: ThemeMode;
  systemColorScheme: 'dark' | 'light';
  activeTheme: ThemeOption;
}
