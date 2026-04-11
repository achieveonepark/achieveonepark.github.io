import React, { useCallback, useState } from 'react';
import App from './App';
import { PortfolioSite } from './components/PortfolioSite';

type ViewMode = 'web' | 'os';

const AppRoot: React.FC = () => {
    const [mode, setMode] = useState<ViewMode>('web');

    const enterOS = useCallback(() => setMode('os'), []);
    const exitOS = useCallback(() => setMode('web'), []);

    if (mode === 'web') {
        return <PortfolioSite onEnterOS={enterOS} />;
    }
    return <App onExitOS={exitOS} />;
};

export default AppRoot;
