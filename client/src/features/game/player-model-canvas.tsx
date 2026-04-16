import { useEffect, useRef } from 'react';

export type PlayerModelMode = 'cube' | 'ball' | 'ship' | 'arrow';

type PlayerModelCanvasProps = {
  mode: PlayerModelMode;
  width: number;
  height: number;
  className?: string;
};

export function PlayerModelCanvas({ mode, width, height, className }: PlayerModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    drawPlayerModel(context, mode, width, height);
  }, [height, mode, width]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

function drawPlayerModel(
  context: CanvasRenderingContext2D,
  mode: PlayerModelMode,
  width: number,
  height: number,
) {
  if (mode === 'ship') {
    const bodyLength = width * 0.84;
    const bodyHeight = height * 0.54;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const cubeSize = Math.min(width, height) * 0.3;

    context.fillStyle = '#101a2a';
    context.beginPath();
    context.moveTo(halfLength, 0);
    context.lineTo(halfLength * 0.18, -halfHeight);
    context.lineTo(-halfLength * 0.9, -halfHeight * 0.9);
    context.lineTo(-halfLength, 0);
    context.lineTo(-halfLength * 0.9, halfHeight * 0.9);
    context.lineTo(halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(halfLength * 0.94, 0);
    context.lineTo(halfLength * 0.14, -halfHeight * 0.94);
    context.lineTo(-halfLength * 0.74, -halfHeight * 0.76);
    context.lineTo(-halfLength * 0.88, 0);
    context.lineTo(-halfLength * 0.74, halfHeight * 0.76);
    context.lineTo(halfLength * 0.14, halfHeight * 0.94);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = '#67ff9f';
    context.beginPath();
    context.moveTo(-halfLength * 0.2, 0);
    context.lineTo(halfLength * 0.46, -halfHeight * 0.6);
    context.lineTo(halfLength * 0.16, 0);
    context.lineTo(halfLength * 0.46, halfHeight * 0.6);
    context.closePath();
    context.fill();

    context.fillStyle = '#dffcff';
    context.beginPath();
    context.moveTo(halfLength * 0.2, 0);
    context.lineTo(-halfLength * 0.12, -halfHeight * 0.42);
    context.lineTo(-halfLength * 0.34, 0);
    context.lineTo(-halfLength * 0.12, halfHeight * 0.42);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2.5;
    context.strokeRect(-halfLength * 0.64, -cubeSize / 2, cubeSize, cubeSize);

    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.56, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.42, -cubeSize * 0.2, cubeSize * 0.12, cubeSize * 0.12);
    context.fillRect(-halfLength * 0.56, cubeSize * 0.12, cubeSize * 0.26, cubeSize * 0.08);

    context.fillStyle = '#79f7ff';
    context.fillRect(-halfLength * 0.06, -cubeSize * 0.24, cubeSize * 0.2, cubeSize * 0.48);
    return;
  }

  if (mode === 'arrow') {
    const bodyLength = width * 0.94;
    const bodyHeight = height * 0.58;
    const halfLength = bodyLength / 2;
    const halfHeight = bodyHeight / 2;
    const pilotSize = Math.min(width, height) * 0.24;

    context.fillStyle = '#132339';
    context.beginPath();
    context.moveTo(-halfLength * 0.9, 0);
    context.lineTo(-halfLength * 0.18, -halfHeight);
    context.lineTo(halfLength, 0);
    context.lineTo(-halfLength * 0.18, halfHeight);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.moveTo(-halfLength * 0.76, 0);
    context.lineTo(-halfLength * 0.08, -halfHeight * 0.88);
    context.lineTo(halfLength * 0.92, 0);
    context.lineTo(-halfLength * 0.08, halfHeight * 0.88);
    context.closePath();
    context.fill();
    context.strokeStyle = '#182133';
    context.lineWidth = 2.6;
    context.stroke();

    context.fillStyle = '#63ffbd';
    context.beginPath();
    context.moveTo(-halfLength * 0.06, -halfHeight * 0.54);
    context.lineTo(halfLength * 0.3, 0);
    context.lineTo(-halfLength * 0.06, halfHeight * 0.54);
    context.closePath();
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.fillRect(-halfLength * 0.54, -pilotSize / 2, pilotSize, pilotSize);
    context.strokeStyle = '#182133';
    context.lineWidth = 2;
    context.strokeRect(-halfLength * 0.54, -pilotSize / 2, pilotSize, pilotSize);
    context.fillStyle = '#182133';
    context.fillRect(-halfLength * 0.48, -pilotSize * 0.2, pilotSize * 0.1, pilotSize * 0.1);
    context.fillRect(-halfLength * 0.36, -pilotSize * 0.2, pilotSize * 0.1, pilotSize * 0.1);
    context.fillRect(-halfLength * 0.48, pilotSize * 0.12, pilotSize * 0.22, pilotSize * 0.07);
    return;
  }

  if (mode === 'ball') {
    const radius = Math.min(width, height) * 0.48;

    context.fillStyle = '#132339';
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#f4f7ff';
    context.beginPath();
    context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#182133';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#ffd95e';
    context.beginPath();
    context.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#182133';
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#63ffbd';
    context.beginPath();
    context.moveTo(-radius * 0.02, -radius * 0.68);
    context.lineTo(radius * 0.46, -radius * 0.12);
    context.lineTo(radius * 0.02, radius * 0.02);
    context.lineTo(radius * 0.58, radius * 0.54);
    context.lineTo(radius * 0.08, radius * 0.18);
    context.lineTo(-radius * 0.46, radius * 0.68);
    context.lineTo(-radius * 0.02, radius * 0.12);
    context.lineTo(-radius * 0.58, -radius * 0.42);
    context.closePath();
    context.fill();

    context.strokeStyle = 'rgba(24,33,51,0.72)';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-radius * 0.78, 0);
    context.lineTo(radius * 0.78, 0);
    context.moveTo(0, -radius * 0.78);
    context.lineTo(0, radius * 0.78);
    context.stroke();

    context.fillStyle = '#182133';
    context.fillRect(-radius * 0.34, -radius * 0.18, radius * 0.14, radius * 0.14);
    context.fillRect(radius * 0.08, -radius * 0.18, radius * 0.14, radius * 0.14);
    context.fillRect(-radius * 0.24, radius * 0.18, radius * 0.44, radius * 0.08);
    return;
  }

  context.fillStyle = '#f4f7ff';
  context.fillRect(-width / 2, -height / 2, width, height);
  context.strokeStyle = '#182133';
  context.lineWidth = 3;
  context.strokeRect(-width / 2, -height / 2, width, height);

  context.fillStyle = '#182133';
  context.fillRect(-width * 0.18, -height * 0.18, width * 0.12, height * 0.12);
  context.fillRect(width * 0.06, -height * 0.18, width * 0.12, height * 0.12);
  context.fillRect(-width * 0.18, height * 0.12, width * 0.36, height * 0.08);
}
