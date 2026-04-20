import { useEffect, useRef } from 'react';
import type { PlayerSkinData } from '../../types/models';
import { drawPlayerModelSprite, usePlayerSkinsQuery } from './player-skins';

export type PlayerModelMode = 'cube' | 'ball' | 'ship' | 'arrow';

type PlayerModelCanvasProps = {
  mode: PlayerModelMode;
  width: number;
  height: number;
  className?: string;
  skinOverride?: PlayerSkinData | null;
  showHitboxOverlay?: boolean;
};

export function PlayerModelCanvas({
  mode,
  width,
  height,
  className,
  skinOverride,
  showHitboxOverlay = false,
}: PlayerModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerSkinsQuery = usePlayerSkinsQuery();
  const skinData = skinOverride ?? playerSkinsQuery.data?.skins?.[mode] ?? null;

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

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
