import React from 'react';
import {
  Sparkles,
  Cloud,
  Layers,
  Palette,
  Calculator,
  Flame,
  CheckCircle2,
  Download,
  RefreshCw,
  History,
  FileCode2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { UpdateCheckResult } from '../types/update';

interface VersionNotesViewProps {
  currentVersion: string;
  updateData: UpdateCheckResult | null;
  isChecking: boolean;
  onCheckUpdate: () => void;
  onNavigateToTechDocs?: () => void;
}

export const VersionNotesView: React.FC<VersionNotesViewProps> = ({
  currentVersion,
  updateData,
  isChecking,
  onCheckUpdate,
  onNavigateToTechDocs,
}) => {
  return (
    <div className="version-notes-container animate-fade-in">
      {/* 1. Version Hero Banner */}
      <div className="version-hero-card">
        <div className="version-hero-header">
          <div className="version-pill-group">
            <span className="version-badge-pill current">当前版本 v{currentVersion}</span>
            <span className="version-badge-pill milestone">重大里程碑</span>
          </div>
          <span className="version-release-date">2026 年 9 月更新</span>
        </div>

        <h1 className="version-hero-title">IronTrack 铁脉健身 v1.1.0</h1>
        <p className="version-hero-subtitle">
          双端私有云无缝互通 · 训练台 HUD 现代化重塑 · 力量工具箱与多款专属皮肤
        </p>

        {/* Action Bar */}
        <div className="version-action-bar">
          <button
            type="button"
            className="version-action-btn primary"
            onClick={onCheckUpdate}
            disabled={isChecking}
          >
            <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? '正在连接 GitHub 检测...' : '检测最新版本'}</span>
          </button>

          {updateData?.downloadUrl && (
            <a
              href={updateData.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="version-action-btn secondary"
            >
              <Download size={15} />
              <span>下载 Release APK</span>
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
          )}
        </div>

        {/* Update Notice if newer exists */}
        {updateData?.hasUpdate && (
          <div className="version-has-update-notice">
            <Sparkles size={16} color="var(--accent-warning)" />
            <span>
              检测到远程已发布新版本 <strong>{updateData.latestVersion}</strong>，包含最新修复与增强。
            </span>
          </div>
        )}
      </div>

      {/* 2. Major Highlights Section */}
      <div className="version-section">
        <div className="version-section-header">
          <Zap size={18} color="var(--accent-primary)" />
          <h3>v1.1.0 核心研发成果一览</h3>
        </div>

        <div className="version-features-grid">
          {/* Feature 1: Private Cloud */}
          <div className="version-feature-card">
            <div className="version-feature-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Cloud size={22} />
            </div>
            <div className="version-feature-content">
              <div className="version-feature-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                私有云与双端架构
              </div>
              <h4 className="version-feature-title">小主机私有云无缝自动同步</h4>
              <p className="version-feature-desc">
                专为追求数据私密性的铁友打造。基于 Node + SQLite 服务端与 Docker Compose，支持工控小主机（如 J1900）或家庭 NAS 部署。
              </p>
              <ul className="version-feature-points">
                <li><strong>Local-First 离线优先</strong>：本地 IndexedDB 零延迟响应，离线训练完整可用</li>
                <li><strong>智能冲突解决</strong>：采用毫秒级 LWW (Last-Write-Wins) 多终端协同合并</li>
                <li><strong>实时探针看板</strong>：动态感知网络延迟（Ping）、在线状态与自动静默同步</li>
              </ul>
            </div>
          </div>

          {/* Feature 2: Workout Logger HUD */}
          <div className="version-feature-card">
            <div className="version-feature-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)' }}>
              <Flame size={22} />
            </div>
            <div className="version-feature-content">
              <div className="version-feature-badge" style={{ color: 'var(--accent-primary)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                交互重塑
              </div>
              <h4 className="version-feature-title">训练记录台 HUD 仪表盘与紧凑交互</h4>
              <p className="version-feature-desc">
                告别繁琐翻找与慢节奏输入。将核心训练数据实时投影于顶部悬浮仪表盘，组间记录时间缩短 60%。
              </p>
              <ul className="version-feature-points">
                <li><strong>HUD 实时动态仪表盘</strong>：顶部秒级呈现当前总吨位、完成组数、卡路里与训练用时</li>
                <li><strong>紧凑型组数表</strong>：高密度视觉布局，一键勾选完成，支持 RPE 自觉疲劳度标注</li>
                <li><strong>有氧训练专属面板</strong>：跑步机、椭圆机、划船机专属配速、距离、心率模式</li>
                <li><strong>渐进超负荷对比</strong>：自动调取上一练成绩，打破历史记录（PR）自动高亮</li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Themes & Skins */}
          <div className="version-feature-card">
            <div className="version-feature-icon-box" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
              <Palette size={22} />
            </div>
            <div className="version-feature-content">
              <div className="version-feature-badge" style={{ color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                视觉美学
              </div>
              <h4 className="version-feature-title">多款高颜值专业皮肤方案 (Theme Engine)</h4>
              <p className="version-feature-desc">
                运动不应单调。全新内置深度调优的多套配色方案，兼具硬核工业风与流光溢彩的现代设计。
              </p>
              <ul className="version-feature-points">
                <li><strong>多款精选主题</strong>：深邃暗黑（极简护眼）、赛博朋克（霓虹动感）、深海翡翠（静谧专注）、暮光落霞（活力充沛）</li>
                <li><strong>随心模式切换</strong>：深色模式、浅色模式与系统模式无缝自动跟随</li>
                <li><strong>全局视觉重构</strong>：全站 CSS Token 驱动，高质感磨砂玻璃拟态与细腻流光</li>
              </ul>
            </div>
          </div>

          {/* Feature 4: Pro Tools */}
          <div className="version-feature-card">
            <div className="version-feature-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Calculator size={22} />
            </div>
            <div className="version-feature-content">
              <div className="version-feature-badge" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                专业工具箱
              </div>
              <h4 className="version-feature-title">力量进阶工具箱与身材围度打卡</h4>
              <p className="version-feature-desc">
                从热身准备到练后复盘，打造专业力量举与形体雕刻全流程闭环辅助工具。
              </p>
              <ul className="version-feature-points">
                <li><strong>科学热身计算器</strong>：输入正式组重量，智能推导空杆激活、神经爬坡阶梯组与组间休息</li>
                <li><strong>分化模版管理系统</strong>：内置 PPL 推拉腿、上下肢等经典分化，支持自定义创编与一键载入</li>
                <li><strong>身材围度与体测历史</strong>：体重、体脂、臂围、胸围、腰围多维趋势跟踪</li>
                <li><strong>训练打卡战报海报</strong>：一键生成高颜值结业战报海报，方便朋友圈与健友圈分享</li>
              </ul>
            </div>
          </div>

          {/* Feature 5: Sub-page Architecture */}
          <div className="version-feature-card">
            <div className="version-feature-icon-box" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              <Layers size={22} />
            </div>
            <div className="version-feature-content">
              <div className="version-feature-badge" style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                架构升级
              </div>
              <h4 className="version-feature-title">全面优化为原生规范的二级页面体验</h4>
              <p className="version-feature-desc">
                告别过去在小浮层弹框（Modal）中反复滚动的不适感，“我的”中心全量升级为舒展的原生二级页面。
              </p>
              <ul className="version-feature-points">
                <li><strong>吸顶平滑返回导航</strong>：优雅回退按钮与清晰层级标题，沉浸感大幅增强</li>
                <li><strong>全屏卡片流布局</strong>：私有云、备份导出、主题皮肤、体测、版本说明均享舒展视觉空间</li>
                <li><strong>双端自适应</strong>：同时完美适配手机屏幕与宽屏电脑显示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Version Timeline / History Comparison */}
      <div className="version-section">
        <div className="version-section-header">
          <History size={18} color="var(--accent-primary)" />
          <h3>版本演进历程与对比</h3>
        </div>

        <div className="version-timeline">
          {/* v1.1.0 */}
          <div className="version-timeline-item current">
            <div className="version-timeline-dot">
              <CheckCircle2 size={16} />
            </div>
            <div className="version-timeline-card">
              <div className="version-timeline-header">
                <span className="version-timeline-ver">v1.1.0 (Current)</span>
                <span className="version-timeline-tag milestone">里程碑大版本</span>
                <span className="version-timeline-time">2026-09</span>
              </div>
              <p className="version-timeline-summary">
                全栈升级：构建私有云双端架构，重构训练台 HUD 与组数录入体验，推出主题引擎、热身计算器、分化模版与原生二级页面。
              </p>
            </div>
          </div>

          {/* v1.0.1 */}
          <div className="version-timeline-item">
            <div className="version-timeline-dot" />
            <div className="version-timeline-card">
              <div className="version-timeline-header">
                <span className="version-timeline-ver">v1.0.1</span>
                <span className="version-timeline-tag">小版本</span>
                <span className="version-timeline-time">2026-09</span>
              </div>
              <p className="version-timeline-summary">
                自动化更新：接入 GitHub Releases 自动构建 APK 流程，引入模糊背景视效与基础更新检测弹框。
              </p>
            </div>
          </div>

          {/* v1.0.0 */}
          <div className="version-timeline-item">
            <div className="version-timeline-dot" />
            <div className="version-timeline-card">
              <div className="version-timeline-header">
                <span className="version-timeline-ver">v1.0.0</span>
                <span className="version-timeline-tag">初始版本</span>
                <span className="version-timeline-time">2026-09</span>
              </div>
              <p className="version-timeline-summary">
                创世发布：实现本地 IndexedDB 离线训练记录、内置动作库、训练历史日历以及 JSON 本地数据导入导出备份。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tech Architecture Card */}
      {onNavigateToTechDocs && (
        <div className="version-tech-link-card" onClick={onNavigateToTechDocs}>
          <div className="version-tech-link-left">
            <div className="version-tech-link-icon">
              <FileCode2 size={20} color="#38bdf8" />
            </div>
            <div>
              <div className="version-tech-link-title">离线优先与全栈架构设计白皮书</div>
              <div className="version-tech-link-desc">查看 SQLite、IndexedDB、Capacitor 原生设计与网络协议规范</div>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      )}

      {/* 5. Footer Security & Copyright */}
      <div className="version-footer">
        <ShieldCheck size={14} color="var(--accent-primary)" />
        <span>IronTrack · 100% 数据归用户所有 · 纯净无广告 · 专注力量进阶</span>
      </div>
    </div>
  );
};
