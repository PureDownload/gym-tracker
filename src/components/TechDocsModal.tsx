import React, { useState } from 'react';
import { X, Layers, Cpu, Activity, Database, Smartphone } from 'lucide-react';

interface TechDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionKey = 'overview' | 'stack' | 'algorithms' | 'storage' | 'android';

export const TechDocsModal: React.FC<TechDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#090d16',
                fontWeight: 900,
              }}
            >
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.08rem' }}>IronTrack 技术方案与架构设计</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)' }}>
                纯前端 · 本地优先 · 科学超负荷 · 原生安卓支持
              </div>
            </div>
          </div>

          <button className="icon-btn" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div
          className="category-scroll-container"
          style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}
        >
          <button
            className={`pill-btn ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <Layers size={13} />
            架构总览
          </button>
          <button
            className={`pill-btn ${activeSection === 'stack' ? 'active' : ''}`}
            onClick={() => setActiveSection('stack')}
          >
            <Cpu size={13} />
            技术栈选型
          </button>
          <button
            className={`pill-btn ${activeSection === 'algorithms' ? 'active' : ''}`}
            onClick={() => setActiveSection('algorithms')}
          >
            <Activity size={13} />
            科学算法与超负荷
          </button>
          <button
            className={`pill-btn ${activeSection === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveSection('storage')}
          >
            <Database size={13} />
            数据持久化
          </button>
          <button
            className={`pill-btn ${activeSection === 'android' ? 'active' : ''}`}
            onClick={() => setActiveSection('android')}
          >
            <Smartphone size={13} />
            安卓打包与离线
          </button>
        </div>

        {/* Section Content */}
        <div className="modal-body" style={{ fontSize: '0.86rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="animate-fade-in">
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
                1. 项目定位与核心设计哲学
              </h4>
              <p style={{ marginBottom: '12px' }}>
                IronTrack 是一款专为力量举与健身增肌者打造的<strong>本地优先 (Local-First)</strong> 现代化单页应用。
                摆脱传统健身 App 繁杂广告、联网强制登录与慢卡顿的痛点，专注在最极端的健身房环境下提供秒级开练体验。
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.84rem' }}>⚡ 零网络依赖</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>健身房地下二层、飞行模式下 100% 离线秒开，数据永不丢失。</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.84rem' }}>📱 单手极速录入</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>出汗手滑优化，提供 +2.5kg / +1次 步进按钮与上次数据预填。</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--muscle-cardio)', fontWeight: 700, fontSize: '0.84rem' }}>🔥 力量+有氧双模</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>支持力量卧推深蹲与有氧跑步机、单车、爬楼机等自适应参数录入。</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--accent-warning)', fontWeight: 700, fontSize: '0.84rem' }}>📈 科学超负荷</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>基于 Epley 1RM 极限公式计算真实力量走势，给出科学加重/减载指导。</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: TECH STACK */}
          {activeSection === 'stack' && (
            <div className="animate-fade-in">
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
                2. 生产级技术选型矩阵
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>React 19 + TypeScript + Vite 8</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    极速热重载 (HMR)，强类型模型校验，生产打包体积经 Tree-shaking 压缩后仅 ~85KB (Gzip)，极度轻盈。
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>自研轻量化响应式 SVG 渲染引擎</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    放弃臃肿庞大的第三方图表库（如 ECharts 需数百 KB），采用数学算法直接映射生成贝塞尔曲线与渐变区域，零额外加载负担，支持触控交互。
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>HTML5 Web Audio API 纯原生音频合成</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    组间休息倒计时器到期时，直接通过声卡振荡器合成 880Hz 纯音蜂鸣与振动联动，不需要引入任何外部音频文件。
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Vanilla CSS + Modern CSS Variables</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    原生 CSS 变量深度适配深色硬核健身视觉，玻璃态 (backdrop-filter) 拟物阴影，无 Tailwind 运行时开销。
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: ALGORITHMS */}
          {activeSection === 'algorithms' && (
            <div className="animate-fade-in">
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
                3. 核心科学算法体系
              </h4>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                  📐 1RM 极限力量估算 (Epley 黄金公式)
                </div>
                <code style={{ display: 'block', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '6px' }}>
                  1RM = Weight × (1 + Reps / 30)
                </code>
                <div style={{ fontSize: '0.78rem' }}>
                  当次数为 1 时，1RM 即为本身重量。该公式消除了由于“次数变化”导致无法直观衡量力量增长的痛点（如 60kg做10次 vs 67.5kg做6次）。
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  📊 训练总容量 (Volume) 负荷计算
                </div>
                <code style={{ display: 'block', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Volume = Σ (做组重量 × 做组次数)
                </code>
                <div style={{ fontSize: '0.78rem' }}>
                  衡量训练给目标肌群带来的机械张力与代谢压力总量，仅累计打勾完成的正式生效组。
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-warning)', marginBottom: '4px' }}>
                  🤖 渐进超负荷决策决策状态机
                </div>
                <ul style={{ paddingLeft: '18px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>🟢 建议加重 +2.5kg</strong>：当最大重量提升或 1RM 增长且容量维持正向，提示肌肉已适应，给出具体的下次建议冲顶重量。</li>
                  <li><strong>🔴 力量/容量下滑</strong>：当极限力量回落或容量缩水超过 15%，触发中枢疲劳预警，建议减载 5~10% 或安排减载周 (Deload)。</li>
                  <li><strong>⚖️ 平台期维持</strong>：重量维持平稳时，建议优先增加做组次数（如 8次冲击到 12次）或在末组加入递减组。</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 4: STORAGE */}
          {activeSection === 'storage' && (
            <div className="animate-fade-in">
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
                4. 数据持久化与双重容灾设计
              </h4>
              <p style={{ marginBottom: '10px' }}>
                由于是纯前端运行，无需依赖任何后端服务器或 API 接口，所有数据均完整封存于用户本地设备。
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>IndexedDB (IronTrackDB) 主引擎</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    结构化对象存储，支持海量训练记录异步存储，读写性能极高，不会阻塞 UI 动画渲染。
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>LocalStorage 镜像容灾机制</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    每次数据变更均双写到 LocalStorage；在某些隐私无痕模式禁用 IndexedDB 时自动平滑降级。
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-warning)' }}>一键 JSON 备份与跨设备迁移</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                    支持一键导出包含版本号的 .json 文件，更换手机或清理浏览器后，导入即可 100% 完整复原。
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ANDROID & PWA */}
          {activeSection === 'android' && (
            <div className="animate-fade-in">
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
                5. 安卓原生打包与 PWA 离线方案
              </h4>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                  📦 方案一：Capacitor 6 安卓原生 APK 编译（推荐）
                </div>
                <div style={{ fontSize: '0.78rem' }}>
                  项目已集成 Capacitor 原生工程 <code>gym-tracker/android/</code>。
                  静态 Web 资产打包进 APK 本地闪存，完全脱离电脑与网络，随时随地秒开，体验与原生 App 完全一致。
                </div>
                <code style={{ display: 'block', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.75rem', marginTop: '6px' }}>
                  npm run cap:build  # 打包前端并同步至 Android 工程
                </code>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  🌐 方案二：Service Worker 离线 PWA 免安装
                </div>
                <div style={{ fontSize: '0.78rem' }}>
                  内置 <code>sw.js</code> 与 <code>manifest.json</code>，采用 Cache-First 离线优先策略。
                  部署公网后，手机浏览器加载过一次即自动固化在手机缓存中，断网飞行模式下点击主屏幕图标依然可以离线打开。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            详细文件详见项目根目录 <code>TECH_ARCHITECTURE.md</code>
          </span>
          <button className="btn-primary" style={{ width: 'auto', padding: '6px 16px', fontSize: '0.82rem' }} onClick={onClose}>
            关闭文档
          </button>
        </div>
      </div>
    </div>
  );
};
