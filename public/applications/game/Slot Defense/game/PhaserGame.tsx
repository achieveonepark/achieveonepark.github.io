import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './MainScene';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from '../constants';

export const PhaserGame: React.FC = () => {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (gameRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: GRID_WIDTH * TILE_SIZE,
            height: GRID_HEIGHT * TILE_SIZE,
            parent: 'phaser-container',
            backgroundColor: '#000000',
            scene: [MainScene],
            fps: {
                target: 60,
                forceSetTimeOut: true
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            render: {
                pixelArt: false,
                antialias: true
            }
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return <div id="phaser-container" className="rounded-xl overflow-hidden shadow-2xl border border-neutral-800" />;
};