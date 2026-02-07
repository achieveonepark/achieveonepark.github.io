import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: ''
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unknown render error'
    };
  }

  componentDidCatch(error: Error): void {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>Game failed to start</h1>
            <p style={{ opacity: 0.8, marginBottom: '12px' }}>{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#e2e8f0',
                padding: '10px 16px',
                cursor: 'pointer'
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
