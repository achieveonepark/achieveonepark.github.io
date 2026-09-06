import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { PortfolioSite } from './components/PortfolioSite';

const App = lazy(() => import('./App'));

type ViewMode = 'web' | 'os';

const AppRoot: React.FC = () => {
    const [mode, setMode] = useState<ViewMode>('web');

    useEffect(() => {
        const isOS = mode === 'os';
        document.documentElement.style.overflow = isOS ? 'hidden' : '';
        document.body.style.overflow = isOS ? 'hidden' : '';
        document.title = isOS ? 'AchieveOne OS' : 'AchieveOne Portfolio';
    }, [mode]);

    const enterOS = useCallback(() => setMode('os'), []);
    const exitOS = useCallback(() => setMode('web'), []);

    if (mode === 'web') {
        return <PortfolioSite onEnterOS={enterOS} />;
    }
    return (
        <Suspense fallback={<div role="status" className="flex min-h-dvh items-center justify-center bg-neutral-950 text-cyan-200">OS 불러오는 중…</div>}>
            <App onExitOS={exitOS} />
        </Suspense>
    );
};

export default AppRoot;
