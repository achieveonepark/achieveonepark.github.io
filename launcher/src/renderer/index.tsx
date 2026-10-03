import React from 'react';
import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <div className="fatal"><h1>편집기를 다시 열어 주세요.</h1><p>저장한 초안은 PC에 보관되어 있어요.</p><button onClick={() => location.reload()}>다시 열기</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><Studio /></ErrorBoundary>);
