import type { LevelData } from '../../types/models';

type DrawStageObjectOptions = {
  context: CanvasRenderingContext2D;
  object: LevelData['objects'][number];
  x: number;
  y: number;
  w: number;
  h: number;
  fillColor: string;
  strokeColor: string;
  isActive?: boolean;
  isUsedOrb?: boolean;
};

type BlockObjectType =
  | 'GROUND_BLOCK'
  | 'HALF_GROUND_BLOCK'
  | 'PLATFORM_BLOCK'
  | 'HALF_PLATFORM_BLOCK'
  | 'DECORATION_BLOCK';

const blockTypes = new Set<BlockObjectType>([
  'GROUND_BLOCK',
  'HALF_GROUND_BLOCK',
  'PLATFORM_BLOCK',
  'HALF_PLATFORM_BLOCK',
  'DECORATION_BLOCK',
]);

function isBlockType(type: LevelData['objects'][number]['type']): type is BlockObjectType {
  return blockTypes.has(type as BlockObjectType);
}

export function drawStageObjectSprite({
  context,
  object,
  x,
  y,
  w,
  h,
  fillColor,
  strokeColor,
  isActive = false,
  isUsedOrb = false,
}: DrawStageObjectOptions) {
  context.save();

  if (object.type === 'SPIKE') {
    drawSpikeSprite(context, x, y, w, h, fillColor, strokeColor);
    context.restore();
    return;
  }

  if (object.type === 'JUMP_ORB') {
    drawJumpOrbSprite(context, x, y, w, h, fillColor, strokeColor, isUsedOrb);
    context.restore();
    return;
  }

  if (object.type === 'JUMP_PAD') {
    drawJumpPadSprite(context, x, y, w, h, fillColor, strokeColor, isActive);
    context.restore();
    return;
  }

  if (
    object.type === 'GRAVITY_PORTAL' ||
    object.type === 'SPEED_PORTAL' ||
    object.type === 'SHIP_PORTAL' ||
    object.type === 'CUBE_PORTAL' ||
    object.type === 'FINISH_PORTAL'
  ) {
    drawPortalSprite(context, object.type, x, y, w, h, fillColor, strokeColor, isActive);
    context.restore();
    return;
  }

  if (isBlockType(object.type)) {
    drawBlockSprite(context, x, y, w, h, fillColor, strokeColor, object.type === 'DECORATION_BLOCK');
    context.restore();
    return;
  }

  if (object.type === 'START_MARKER') {
    drawStartMarkerSprite(context, x, y, w, h, fillColor, strokeColor);
    context.restore();
    return;
  }

  context.fillStyle = fillColor;
  context.fillRect(x, y, w, h);
  context.restore();
}

function drawBlockSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
  decorationOnly: boolean,
) {
  const gradient = context.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, lightenColor(fillColor, decorationOnly ? 0.16 : 0.24));
  gradient.addColorStop(0.55, fillColor);
  gradient.addColorStop(1, darkenColor(fillColor, decorationOnly ? 0.22 : 0.32));
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);

  context.fillStyle = 'rgba(255,255,255,0.16)';
  context.fillRect(x + 2, y + 2, Math.max(0, w - 4), Math.max(3, h * 0.16));

  context.fillStyle = decorationOnly ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)';
  context.fillRect(x + w * 0.12, y + h * 0.24, Math.max(4, w * 0.76), Math.max(3, h * 0.08));

  context.strokeStyle = strokeColor;
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));

  context.strokeStyle = decorationOnly ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.18)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x + w * 0.24, y + 1);
  context.lineTo(x + w * 0.24, y + h - 1);
  context.moveTo(x + w * 0.52, y + 1);
  context.lineTo(x + w * 0.52, y + h - 1);
  context.stroke();
}

function drawSpikeSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
) {
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, lightenColor(fillColor, 0.18));
  gradient.addColorStop(1, darkenColor(fillColor, 0.28));

  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(x, y + h);
  context.lineTo(x + w / 2, y);
  context.lineTo(x + w, y + h);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.beginPath();
  context.moveTo(x + w * 0.22, y + h * 0.84);
  context.lineTo(x + w / 2, y + h * 0.18);
  context.lineTo(x + w * 0.68, y + h * 0.84);
  context.closePath();
  context.fill();

  context.strokeStyle = strokeColor;
  context.lineWidth = 2;
  context.stroke();
}

function drawJumpOrbSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
  isUsedOrb: boolean,
) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.max(8, Math.min(w, h) * 0.42);
  const glow = context.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius * 1.15);
  glow.addColorStop(0, lightenColor(fillColor, 0.32));
  glow.addColorStop(0.62, fillColor);
  glow.addColorStop(1, isUsedOrb ? 'rgba(255,255,255,0.08)' : darkenColor(fillColor, 0.26));

  context.fillStyle = glow;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = strokeColor;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(centerX, centerY, radius - 1.5, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = 'rgba(255,255,255,0.48)';
  context.lineWidth = 1.8;
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.56, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = isUsedOrb ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)';
  context.beginPath();
  context.arc(centerX - radius * 0.18, centerY - radius * 0.18, radius * 0.22, 0, Math.PI * 2);
  context.fill();
}

function drawJumpPadSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
  isActive: boolean,
) {
  const gradient = context.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, lightenColor(fillColor, 0.18));
  gradient.addColorStop(1, darkenColor(fillColor, 0.28));

  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(x + w * 0.08, y + h);
  context.lineTo(x + w * 0.18, y + h * 0.18);
  context.lineTo(x + w * 0.82, y + h * 0.18);
  context.lineTo(x + w * 0.92, y + h);
  context.closePath();
  context.fill();

  context.strokeStyle = strokeColor;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = isActive ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.22)';
  drawChevron(context, x + w * 0.36, y + h * 0.52, w * 0.16, h * 0.22);
  drawChevron(context, x + w * 0.54, y + h * 0.52, w * 0.16, h * 0.22);
}

function drawPortalSprite(
  context: CanvasRenderingContext2D,
  type: LevelData['objects'][number]['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
  isActive: boolean,
) {
  const outerGradient = context.createLinearGradient(x, y, x, y + h);
  outerGradient.addColorStop(0, darkenColor(fillColor, 0.34));
  outerGradient.addColorStop(1, darkenColor(fillColor, 0.52));
  roundedRectPath(context, x, y, w, h, Math.min(w, h) * 0.22);
  context.fillStyle = outerGradient;
  context.fill();

  const innerGlow = context.createLinearGradient(x, y, x, y + h);
  innerGlow.addColorStop(0, lightenColor(fillColor, 0.28));
  innerGlow.addColorStop(0.5, fillColor);
  innerGlow.addColorStop(1, darkenColor(fillColor, 0.2));
  roundedRectPath(context, x + w * 0.14, y + h * 0.08, w * 0.72, h * 0.84, Math.min(w, h) * 0.18);
  context.fillStyle = innerGlow;
  context.fill();

  context.strokeStyle = strokeColor;
  context.lineWidth = 2.2;
  roundedRectPath(context, x + w * 0.14, y + h * 0.08, w * 0.72, h * 0.84, Math.min(w, h) * 0.18);
  context.stroke();

  context.strokeStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(x + w / 2, y + h / 2, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.beginPath();
  context.ellipse(x + w / 2, y + h / 2, w * 0.14, h * 0.2, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.88)';
  context.lineWidth = 2;
  drawPortalGlyph(context, type, x, y, w, h);
}

function drawPortalGlyph(
  context: CanvasRenderingContext2D,
  type: LevelData['objects'][number]['type'],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  context.beginPath();

  if (type === 'GRAVITY_PORTAL') {
    context.moveTo(centerX, centerY - h * 0.18);
    context.lineTo(centerX - w * 0.1, centerY - h * 0.04);
    context.moveTo(centerX, centerY - h * 0.18);
    context.lineTo(centerX + w * 0.1, centerY - h * 0.04);
    context.moveTo(centerX, centerY + h * 0.18);
    context.lineTo(centerX - w * 0.1, centerY + h * 0.04);
    context.moveTo(centerX, centerY + h * 0.18);
    context.lineTo(centerX + w * 0.1, centerY + h * 0.04);
    context.moveTo(centerX, centerY - h * 0.14);
    context.lineTo(centerX, centerY + h * 0.14);
  } else if (type === 'SPEED_PORTAL') {
    drawChevronOutline(context, centerX - w * 0.08, centerY, w * 0.12, h * 0.12);
    drawChevronOutline(context, centerX + w * 0.08, centerY, w * 0.12, h * 0.12);
  } else if (type === 'SHIP_PORTAL') {
    context.moveTo(centerX + w * 0.12, centerY);
    context.lineTo(centerX - w * 0.12, centerY - h * 0.1);
    context.lineTo(centerX - w * 0.04, centerY);
    context.lineTo(centerX - w * 0.12, centerY + h * 0.1);
    context.closePath();
  } else if (type === 'CUBE_PORTAL') {
    context.rect(centerX - w * 0.12, centerY - h * 0.12, w * 0.24, h * 0.24);
  } else if (type === 'FINISH_PORTAL') {
    context.moveTo(centerX, centerY - h * 0.16);
    context.lineTo(centerX + w * 0.08, centerY - h * 0.02);
    context.lineTo(centerX + w * 0.16, centerY - h * 0.02);
    context.lineTo(centerX + w * 0.1, centerY + h * 0.06);
    context.lineTo(centerX + w * 0.13, centerY + h * 0.16);
    context.lineTo(centerX, centerY + h * 0.1);
    context.lineTo(centerX - w * 0.13, centerY + h * 0.16);
    context.lineTo(centerX - w * 0.1, centerY + h * 0.06);
    context.lineTo(centerX - w * 0.16, centerY - h * 0.02);
    context.lineTo(centerX - w * 0.08, centerY - h * 0.02);
    context.closePath();
  }

  context.stroke();
}

function drawStartMarkerSprite(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  strokeColor: string,
) {
  const gradient = context.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, lightenColor(fillColor, 0.2));
  gradient.addColorStop(1, darkenColor(fillColor, 0.2));
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);
  context.strokeStyle = strokeColor;
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.beginPath();
  context.moveTo(x + w * 0.3, y + h * 0.22);
  context.lineTo(x + w * 0.7, y + h * 0.5);
  context.lineTo(x + w * 0.3, y + h * 0.78);
  context.closePath();
  context.fill();
}

function drawChevron(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  context.beginPath();
  context.moveTo(centerX - width / 2, centerY);
  context.lineTo(centerX, centerY - height / 2);
  context.lineTo(centerX + width / 2, centerY);
  context.lineTo(centerX, centerY + height / 2);
  context.closePath();
  context.fill();
}

function drawChevronOutline(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  context.moveTo(centerX - width / 2, centerY - height / 2);
  context.lineTo(centerX + width / 2, centerY);
  context.lineTo(centerX - width / 2, centerY + height / 2);
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function lightenColor(hex: string, amount: number) {
  return mixColor(hex, '#ffffff', amount);
}

function darkenColor(hex: string, amount: number) {
  return mixColor(hex, '#000000', amount);
}

function mixColor(baseHex: string, mixHex: string, amount: number) {
  const base = parseHexColor(baseHex);
  const mix = parseHexColor(mixHex);

  if (!base || !mix) {
    return baseHex;
  }

  return toHexColor({
    r: Math.round(base.r + (mix.r - base.r) * amount),
    g: Math.round(base.g + (mix.g - base.g) * amount),
    b: Math.round(base.b + (mix.b - base.b) * amount),
  });
}

function parseHexColor(hex: string) {
  const normalized = hex.trim().replace('#', '');

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexColor(color: { r: number; g: number; b: number }) {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, value));
  return `#${[color.r, color.g, color.b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}
