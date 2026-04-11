import React, { useCallback, useEffect, useState } from 'react';
import App from './App';
import { PortfolioSite } from './components/PortfolioSite';

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
    return <App onExitOS={exitOS} />;
};

export default AppRoot;
