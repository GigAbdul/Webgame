import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { drawPlayerModelSprite, usePlayerSkinsQuery } from './player-skins';
import { useSelectedPlayerSkinRecord } from './player-skin-selection';
export function PlayerModelCanvas({ mode, width, height, className, skinOverride, skinSource = 'default', showHitboxOverlay = false, }) {
    const canvasRef = useRef(null);
    const playerSkinsQuery = usePlayerSkinsQuery();
    const selectedPlayerSkinRecord = useSelectedPlayerSkinRecord();
    const publishedSkinData = playerSkinsQuery.data?.skins?.[mode] ?? null;
    const skinData = skinOverride ??
        (skinSource === 'published'
            ? publishedSkinData
            : skinSource === 'selected'
                ? selectedPlayerSkinRecord[mode] ?? null
                : null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
        canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = true;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.translate(width / 2, height / 2);
        drawPlayerModelSprite(context, mode, width, height, {
            skinData,
            showHitboxOverlay,
        });
    }, [height, mode, showHitboxOverlay, skinData, width]);
    return _jsx("canvas", { ref: canvasRef, className: className, "aria-hidden": "true" });
}
