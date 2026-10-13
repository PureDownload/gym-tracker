import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('IronTrack App Crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#090a0f',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>⚠️ 页面加载遇到异常</h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {this.state.error?.message || '运行时脚本错误'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              重置本地临时缓存
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)

// Register Service Worker for offline capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

