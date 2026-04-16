import { isSawObjectType, isSpikeObjectType } from './object-definitions';
const blockTypes = new Set([
    'GROUND_BLOCK',
    'HALF_GROUND_BLOCK',
    'PLATFORM_BLOCK',
    'HALF_PLATFORM_BLOCK',
    'DECORATION_BLOCK',
]);
const arrowRampTypes = new Set(['ARROW_RAMP_ASC', 'ARROW_RAMP_DESC']);
const spritePortalPathByType = {
    SHIP_PORTAL: '/portals/ship.svg',
    BALL_PORTAL: '/portals/ball.svg',
    CUBE_PORTAL: '/portals/cube.svg',
    ARROW_PORTAL: '/portals/wave.svg',
};
const spritePortalCache = new Map();
function isBlockType(type) {
    return blockTypes.has(type);
}
function isArrowRampType(type) {
    return arrowRampTypes.has(type);
}
function isSpritePortalType(type) {
    return type in spritePortalPathByType;
}
export function drawStageObjectSprite({ context, object, x, y, w, h, fillColor, strokeColor, isActive = false, isUsedOrb = false, alpha = 1, animationTimeMs = 0, editorGuideTop, editorGuideBottom, }) {
    context.save();
    context.globalAlpha = alpha;
    const normalizedRotationDegrees = normalizeQuarterRotationDegrees(object.rotation ?? 0);
    const normalizedRotation = normalizeRotation(normalizedRotationDegrees);
    if (normalizedRotation !== 0) {
        context.translate(x + w / 2, y + h / 2);
        context.rotate(normalizedRotation);
        x = -w / 2;
        y = -h / 2;
    }
    if (isSpikeObjectType(object.type)) {
        drawSpikeSprite(context, x, y, w, h, fillColor, strokeColor);
        context.restore();
        return;
    }
    if (isSawObjectType(object.type)) {
        drawSawSprite(context, object.type, x, y, w, h, fillColor, strokeColor);
        context.restore();
        return;
    }
    if (object.type === 'JUMP_ORB' || object.type === 'BLUE_ORB' || object.type === 'GRAVITY_ORB') {
        drawJumpOrbSprite(context, x, y, w, h, fillColor, strokeColor, isUsedOrb, animationTimeMs, object.type === 'GRAVITY_ORB' ? 'greenGravity' : object.type === 'BLUE_ORB' ? 'blueGravity' : 'jump');
        context.restore();
        return;
    }
    if (object.type === 'JUMP_PAD') {
        drawJumpPadSprite(context, x, y, w, h, fillColor, strokeColor, isActive, animationTimeMs);
        context.restore();
        return;
    }
    if (object.type === 'GRAVITY_PORTAL' ||
        object.type === 'SPEED_PORTAL' ||
        object.type === 'SHIP_PORTAL' ||
        object.type === 'BALL_PORTAL' ||
        object.type === 'CUBE_PORTAL' ||
        object.type === 'ARROW_PORTAL' ||
        object.type === 'FINISH_PORTAL') {
        drawPortalSprite(context, object.type, x, y, w, h, fillColor, strokeColor, isActive, normalizedRotationDegrees);
        context.restore();
        return;
    }
    if (object.type === 'MOVE_TRIGGER' ||
        object.type === 'ALPHA_TRIGGER' ||
        object.type === 'TOGGLE_TRIGGER' ||
        object.type === 'PULSE_TRIGGER' ||
        object.type === 'POST_FX_TRIGGER') {
        drawTriggerSprite(context, object, x, y, w, h, fillColor, strokeColor, isActive, editorGuideTop, editorGuideBottom);
        context.restore();
        return;
    }
    if (isBlockType(object.type)) {
        drawBlockSprite(context, x, y, w, h, fillColor, strokeColor, object.type === 'DECORATION_BLOCK');
        context.restore();
        return;
    }
    if (isArrowRampType(object.type)) {
        drawArrowRampSprite(context, object.type, x, y, w, h, fillColor, strokeColor);
        context.restore();
        return;
    }
    if (object.type === 'DASH_BLOCK') {
        drawDashBlockSprite(context, x, y, w, h);
        context.restore();
        return;
    }
    if (object.type === 'START_MARKER' || object.type === 'START_POS') {
        drawStartMarkerSprite(context, object.type, x, y, w, h, fillColor, strokeColor, editorGuideTop, editorGuideBottom);
        context.restore();
        return;
    }
    context.fillStyle = fillColor;
    context.fillRect(x, y, w, h);
    context.restore();
}
export function getStageObjectPreviewSpriteImage(type) {
    return isSpritePortalType(type) ? getSpritePortalImage(type) : null;
}
function drawBlockSprite(context, x, y, w, h, fillColor, strokeColor, decorationOnly) {
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
function drawSpikeSprite(context, x, y, w, h, fillColor, strokeColor) {
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
function drawArrowRampSprite(context, type, x, y, w, h, fillColor, strokeColor) {
    const gradient = context.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, lightenColor(fillColor, 0.22));
    gradient.addColorStop(0.55, fillColor);
    gradient.addColorStop(1, darkenColor(fillColor, 0.3));
    context.beginPath();
    if (type === 'ARROW_RAMP_ASC') {
        context.moveTo(x, y + h);
        context.lineTo(x + w, y + h);
        context.lineTo(x + w, y);
    }
    else {
        context.moveTo(x, y);
        context.lineTo(x, y + h);
        context.lineTo(x + w, y + h);
    }
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.beginPath();
    if (type === 'ARROW_RAMP_ASC') {
        context.moveTo(x + w * 0.18, y + h * 0.9);
        context.lineTo(x + w * 0.78, y + h * 0.9);
        context.lineTo(x + w * 0.78, y + h * 0.28);
    }
    else {
        context.moveTo(x + w * 0.22, y + h * 0.1);
        context.lineTo(x + w * 0.22, y + h * 0.72);
        context.lineTo(x + w * 0.82, y + h * 0.72);
    }
    context.closePath();
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.2;
    context.beginPath();
    if (type === 'ARROW_RAMP_ASC') {
        context.moveTo(x, y + h);
        context.lineTo(x + w, y);
        context.lineTo(x + w, y + h);
        context.closePath();
    }
    else {
        context.moveTo(x, y);
        context.lineTo(x, y + h);
        context.lineTo(x + w, y + h);
        context.closePath();
    }
    context.stroke();
}
function drawDashBlockSprite(context, x, y, w, h) {
    const gradient = context.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, 'rgba(120, 182, 255, 0.34)');
    gradient.addColorStop(1, 'rgba(38, 96, 187, 0.22)');
    context.fillStyle = gradient;
    context.fillRect(x, y, w, h);
    context.fillStyle = 'rgba(255,255,255,0.1)';
    context.fillRect(x + 2, y + 2, Math.max(0, w - 4), Math.max(0, h * 0.18));
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2.8;
    context.strokeRect(x + 1.5, y + 1.5, Math.max(0, w - 3), Math.max(0, h - 3));
    context.strokeStyle = 'rgba(255,255,255,0.28)';
    context.lineWidth = 1.1;
    context.strokeRect(x + 5, y + 5, Math.max(0, w - 10), Math.max(0, h - 10));
    context.fillStyle = '#18345d';
    context.font = `${Math.max(10, Math.min(w, h) * 0.36)}px Arial Black`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('D', x + w / 2, y + h / 2 + 0.5);
}
function drawSawSprite(context, type, x, y, w, h, fillColor, strokeColor) {
    const variant = getSawVariant(type);
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const outerRadius = Math.max(10, Math.min(w, h) * variant.outerRadiusFactor);
    const innerRadius = outerRadius * variant.innerRadiusFactor;
    const toothCount = variant.toothCount;
    const gradient = context.createRadialGradient(centerX, centerY, outerRadius * 0.18, centerX, centerY, outerRadius);
    gradient.addColorStop(0, lightenColor(fillColor, variant.gradientLighten));
    gradient.addColorStop(0.48, fillColor);
    gradient.addColorStop(1, darkenColor(fillColor, variant.gradientDarken));
    context.beginPath();
    for (let index = 0; index < toothCount * 2; index += 1) {
        const angle = (Math.PI * index) / toothCount - Math.PI / 2 + variant.rotationOffset;
        const radius = index % 2 === 0 ? outerRadius : innerRadius;
        const pointX = centerX + Math.cos(angle) * radius;
        const pointY = centerY + Math.sin(angle) * radius;
        if (index === 0) {
            context.moveTo(pointX, pointY);
        }
        else {
            context.lineTo(pointX, pointY);
        }
    }
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.2;
    context.stroke();
    context.fillStyle = variant.coreFill;
    context.beginPath();
    context.arc(centerX, centerY, outerRadius * variant.coreRadiusFactor, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = variant.coreStroke;
    context.lineWidth = variant.coreStrokeWidth;
    context.beginPath();
    context.arc(centerX, centerY, outerRadius * variant.innerCoreRadiusFactor, 0, Math.PI * 2);
    context.stroke();
    if (variant.centerDotFill) {
        context.fillStyle = variant.centerDotFill;
        context.beginPath();
        context.arc(centerX, centerY, outerRadius * 0.08, 0, Math.PI * 2);
        context.fill();
    }
}
function getSawVariant(type) {
    if (type === 'SAW_STAR' || type === 'SAW_STAR_MEDIUM' || type === 'SAW_STAR_LARGE') {
        return {
            toothCount: 4,
            outerRadiusFactor: 0.5,
            innerRadiusFactor: 0.42,
            coreRadiusFactor: 0.32,
            innerCoreRadiusFactor: 0.16,
            gradientLighten: 0.14,
            gradientDarken: 0.22,
            rotationOffset: Math.PI / 4,
            coreFill: 'rgba(143, 135, 255, 0.9)',
            coreStroke: 'rgba(245, 248, 255, 0.95)',
            coreStrokeWidth: 1.8,
            centerDotFill: '#20304d',
        };
    }
    if (type === 'SAW_GEAR' || type === 'SAW_GEAR_MEDIUM' || type === 'SAW_GEAR_LARGE') {
        return {
            toothCount: 12,
            outerRadiusFactor: 0.49,
            innerRadiusFactor: 0.8,
            coreRadiusFactor: 0.45,
            innerCoreRadiusFactor: 0.24,
            gradientLighten: 0.18,
            gradientDarken: 0.16,
            rotationOffset: 0,
            coreFill: 'rgba(255, 255, 255, 0.22)',
            coreStroke: 'rgba(255,255,255,0.92)',
            coreStrokeWidth: 1.6,
            centerDotFill: null,
        };
    }
    if (type === 'SAW_GLOW' || type === 'SAW_GLOW_MEDIUM' || type === 'SAW_GLOW_LARGE') {
        return {
            toothCount: 11,
            outerRadiusFactor: 0.47,
            innerRadiusFactor: 0.67,
            coreRadiusFactor: 0.4,
            innerCoreRadiusFactor: 0.12,
            gradientLighten: 0.08,
            gradientDarken: 0.12,
            rotationOffset: 0,
            coreFill: 'rgba(255,255,255,0.12)',
            coreStroke: 'rgba(255,255,255,0.92)',
            coreStrokeWidth: 1.8,
            centerDotFill: 'rgba(255,255,255,0.92)',
        };
    }
    return {
        toothCount: 10,
        outerRadiusFactor: 0.48,
        innerRadiusFactor: 0.72,
        coreRadiusFactor: 0.42,
        innerCoreRadiusFactor: 0.24,
        gradientLighten: 0.22,
        gradientDarken: 0.28,
        rotationOffset: 0,
        coreFill: 'rgba(255,255,255,0.18)',
        coreStroke: 'rgba(255,255,255,0.72)',
        coreStrokeWidth: 1.8,
        centerDotFill: null,
    };
}
function drawJumpOrbSprite(context, x, y, w, h, fillColor, strokeColor, isUsedOrb, animationTimeMs, variant) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.max(8, Math.min(w, h) * 0.42);
    const pulse = isUsedOrb ? 0.22 : 0.5 + Math.sin(animationTimeMs / 180) * 0.14;
    const isGravityVariant = variant === 'blueGravity' || variant === 'greenGravity';
    const innerRingColor = variant === 'greenGravity'
        ? 'rgba(220,236,255,0.7)'
        : variant === 'blueGravity'
            ? 'rgba(230,255,220,0.72)'
            : 'rgba(255,255,255,0.48)';
    const highlightColor = variant === 'greenGravity'
        ? 'rgba(228,240,255,0.34)'
        : variant === 'blueGravity'
            ? 'rgba(232,255,222,0.36)'
            : 'rgba(255,255,255,0.28)';
    const glow = context.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius * 1.15);
    glow.addColorStop(0, lightenColor(fillColor, 0.26 + pulse * 0.18));
    glow.addColorStop(0.62, fillColor);
    glow.addColorStop(1, isUsedOrb ? 'rgba(255,255,255,0.08)' : darkenColor(fillColor, 0.26));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    if (!isUsedOrb) {
        drawJumpOrbParticles(context, centerX, centerY, radius, fillColor, animationTimeMs, variant);
    }
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(centerX, centerY, radius - 1.5, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = innerRingColor;
    context.lineWidth = 1.8;
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.56, 0, Math.PI * 2);
    context.stroke();
    if (isGravityVariant) {
        context.strokeStyle = variant === 'greenGravity' ? 'rgba(18, 53, 112, 0.88)' : 'rgba(14, 74, 18, 0.88)';
        context.lineWidth = Math.max(2.2, radius * 0.12);
        context.beginPath();
        context.moveTo(centerX - radius * 0.22, centerY - radius * 0.24);
        context.lineTo(centerX + radius * 0.24, centerY);
        context.lineTo(centerX - radius * 0.22, centerY + radius * 0.24);
        context.stroke();
        if (variant === 'greenGravity') {
            context.beginPath();
            context.moveTo(centerX + radius * 0.08, centerY - radius * 0.28);
            context.lineTo(centerX + radius * 0.08, centerY + radius * 0.28);
            context.stroke();
        }
    }
    context.fillStyle = isUsedOrb ? 'rgba(255,255,255,0.18)' : highlightColor;
    context.beginPath();
    context.arc(centerX - radius * 0.18, centerY - radius * 0.18, radius * 0.22, 0, Math.PI * 2);
    context.fill();
}
function drawJumpOrbParticles(context, centerX, centerY, radius, fillColor, animationTimeMs, variant) {
    const particleCount = 6;
    const time = animationTimeMs / 1000;
    const trailColor = variant === 'greenGravity'
        ? mixColor(fillColor, '#dbeaff', 0.34)
        : variant === 'blueGravity'
            ? mixColor(fillColor, '#e7ffd8', 0.34)
            : mixColor(fillColor, '#ffe88c', 0.26);
    const sparkColor = variant === 'greenGravity'
        ? mixColor(fillColor, '#eff6ff', 0.7)
        : variant === 'blueGravity'
            ? mixColor(fillColor, '#ffffff', 0.72)
            : mixColor(fillColor, '#fff6b7', 0.55);
    context.save();
    context.lineCap = 'round';
    for (let index = 0; index < particleCount; index += 1) {
        const progress = ((time * 0.9 + index * 0.17) % 1 + 1) % 1;
        const angle = time * 2.7 + (index / particleCount) * Math.PI * 2;
        const startDistance = radius * (0.88 + progress * 0.18);
        const endDistance = radius * (1.18 + progress * 0.62);
        const startX = centerX + Math.cos(angle) * startDistance;
        const startY = centerY + Math.sin(angle) * startDistance;
        const endX = centerX + Math.cos(angle) * endDistance;
        const endY = centerY + Math.sin(angle) * endDistance;
        const alpha = 0.12 + (1 - progress) * 0.42;
        context.strokeStyle = toRgba(trailColor, alpha);
        context.lineWidth = Math.max(1.4, radius * (0.08 + (1 - progress) * 0.05));
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.fillStyle = sparkColor;
        context.globalAlpha = 0.24 + (1 - progress) * 0.48;
        context.beginPath();
        context.arc(endX, endY, Math.max(1.6, radius * (0.09 + (1 - progress) * 0.05)), 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
}
function drawJumpPadSprite(context, x, y, w, h, fillColor, strokeColor, isActive, animationTimeMs) {
    const time = animationTimeMs / 1000;
    const surfaceY = y + h;
    const centerX = x + w / 2;
    const domeCenterY = surfaceY + h * 0.14;
    const domeRadiusX = w * 0.46;
    const domeRadiusY = h * 0.31;
    const padTopY = surfaceY - domeRadiusY * 0.68;
    const pulse = isActive ? 0.26 : 0.52 + Math.sin(animationTimeMs / 170) * 0.1;
    const glowColor = '#f3ffab';
    const aura = context.createRadialGradient(centerX, surfaceY - h * 0.035, 0, centerX, surfaceY - h * 0.035, w * 0.72);
    aura.addColorStop(0, toRgba('#fffbc7', isActive ? 0.38 : 0.26));
    aura.addColorStop(0.46, toRgba(glowColor, 0.11 + pulse * 0.04));
    aura.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = aura;
    context.beginPath();
    context.ellipse(centerX, surfaceY - h * 0.04, w * 0.48, h * 0.17, 0, 0, Math.PI * 2);
    context.fill();
    const coreGlow = context.createRadialGradient(centerX, surfaceY - h * 0.045, 0, centerX, surfaceY - h * 0.045, w * 0.29);
    coreGlow.addColorStop(0, toRgba('#fffef6', isActive ? 0.99 : 0.94));
    coreGlow.addColorStop(0.44, toRgba('#fff56f', isActive ? 0.98 : 0.9));
    coreGlow.addColorStop(0.82, toRgba('#ffe33a', 0.58));
    coreGlow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = coreGlow;
    context.beginPath();
    context.ellipse(centerX, surfaceY - h * 0.045, w * 0.22, h * 0.08, 0, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.rect(x - w * 0.2, y - h, w * 1.4, surfaceY - (y - h));
    context.clip();
    const domeGradient = context.createLinearGradient(0, surfaceY - domeRadiusY * 1.2, 0, surfaceY + domeRadiusY);
    domeGradient.addColorStop(0, '#fffef2');
    domeGradient.addColorStop(0.3, '#fff98e');
    domeGradient.addColorStop(0.7, '#ffe228');
    domeGradient.addColorStop(1, '#fff06a');
    context.fillStyle = domeGradient;
    context.beginPath();
    context.ellipse(centerX, domeCenterY, domeRadiusX, domeRadiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = toRgba('#ffffff', isActive ? 1 : 0.95);
    context.lineWidth = Math.max(2.1, h * 0.11);
    context.beginPath();
    context.ellipse(centerX, domeCenterY, domeRadiusX * 1.04, domeRadiusY * 1.04, 0, Math.PI * 1.06, Math.PI * 1.94);
    context.stroke();
    context.strokeStyle = toRgba('#d9ff58', isActive ? 0.86 : 0.72);
    context.lineWidth = Math.max(1.4, h * 0.075);
    context.beginPath();
    context.ellipse(centerX, domeCenterY + h * 0.016, domeRadiusX * 0.84, domeRadiusY * 0.72, 0, Math.PI * 1.08, Math.PI * 1.92);
    context.stroke();
    context.restore();
    const rimGlow = context.createLinearGradient(0, surfaceY - h * 0.1, 0, surfaceY + h * 0.04);
    rimGlow.addColorStop(0, toRgba('#ffffff', 0));
    rimGlow.addColorStop(0.48, toRgba('#fffef0', isActive ? 0.84 : 0.66));
    rimGlow.addColorStop(1, toRgba('#ffe84f', 0));
    context.fillStyle = rimGlow;
    context.beginPath();
    context.ellipse(centerX, surfaceY - h * 0.01, w * 0.42, h * 0.04, 0, 0, Math.PI * 2);
    context.fill();
    drawJumpPadParticles(context, centerX, padTopY, w, h, time, glowColor, isActive);
}
function drawJumpPadParticles(context, centerX, topY, w, h, time, glowColor, isActive) {
    const particleCount = 10;
    const driftSpan = w * 0.055;
    const maxRise = h * 5.4;
    const brightColor = '#fbffda';
    const dimColor = mixColor(glowColor, '#efffb1', 0.56);
    context.save();
    for (let index = 0; index < particleCount; index += 1) {
        const progress = ((time * 0.58 + index * 0.109) % 1 + 1) % 1;
        const rise = progress * maxRise;
        const sway = Math.sin(time * 1.8 + index * 1.51) * driftSpan * (0.02 + progress * 0.11);
        const x = centerX + sway;
        const y = topY - rise;
        const size = Math.max(1, w * (0.011 + (1 - progress) * 0.022));
        const alpha = (isActive ? 0.34 : 0.2) + (1 - progress) * (isActive ? 0.48 : 0.28);
        context.globalAlpha = alpha;
        context.fillStyle = progress > 0.58 ? brightColor : dimColor;
        context.fillRect(x - size / 2, y - size / 2, size, size);
        if (progress < 0.22) {
            context.globalAlpha = alpha * 0.38;
            const trailSize = size * 0.74;
            context.fillRect(x - trailSize / 2, y + size * 0.92, trailSize, trailSize);
        }
    }
    context.restore();
}
function drawPortalSprite(context, type, x, y, w, h, fillColor, strokeColor, isActive, rotationDegrees) {
    if (isSpritePortalType(type)) {
        const sprite = getSpritePortalImage(type);
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            drawPortalSpriteImage(context, sprite, x, y, w, h, isActive, rotationDegrees);
            return;
        }
        drawSpritePortalPlaceholder(context, type, x, y, w, h, isActive);
        return;
    }
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
function getSpritePortalImage(type) {
    const cachedImage = spritePortalCache.get(type);
    if (cachedImage) {
        return cachedImage;
    }
    if (typeof Image === 'undefined') {
        return null;
    }
    const nextImage = new Image();
    nextImage.decoding = 'async';
    nextImage.src = spritePortalPathByType[type];
    spritePortalCache.set(type, nextImage);
    return nextImage;
}
function drawPortalSpriteImage(context, image, x, y, w, h, isActive, rotationDegrees) {
    const shouldSwapSpriteFrame = rotationDegrees === 90 || rotationDegrees === 270;
    const drawWidth = shouldSwapSpriteFrame ? h : w;
    const drawHeight = shouldSwapSpriteFrame ? w : h;
    const drawX = x + (w - drawWidth) / 2;
    const drawY = y + (h - drawHeight) / 2;
    context.save();
    context.imageSmoothingEnabled = true;
    if (isActive) {
        context.shadowColor = 'rgba(255,255,255,0.44)';
        context.shadowBlur = Math.max(8, w * 0.18);
    }
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
}
function drawSpritePortalPlaceholder(context, type, x, y, w, h, isActive) {
    const portalCode = type === 'SHIP_PORTAL' ? 'S' : type === 'BALL_PORTAL' ? 'B' : type === 'CUBE_PORTAL' ? 'C' : 'W';
    const fillColor = type === 'SHIP_PORTAL'
        ? '#ffb44a'
        : type === 'BALL_PORTAL'
            ? '#ffd95e'
            : type === 'CUBE_PORTAL'
                ? '#b3ff5e'
                : '#5ee7ff';
    const outerGradient = context.createLinearGradient(x, y, x, y + h);
    outerGradient.addColorStop(0, 'rgba(15, 23, 54, 0.92)');
    outerGradient.addColorStop(1, 'rgba(7, 12, 30, 0.98)');
    roundedRectPath(context, x, y, w, h, Math.min(w, h) * 0.22);
    context.fillStyle = outerGradient;
    context.fill();
    const coreGradient = context.createLinearGradient(x, y, x, y + h);
    coreGradient.addColorStop(0, lightenColor(fillColor, 0.22));
    coreGradient.addColorStop(0.58, fillColor);
    coreGradient.addColorStop(1, darkenColor(fillColor, 0.22));
    roundedRectPath(context, x + w * 0.19, y + h * 0.12, w * 0.62, h * 0.76, Math.min(w, h) * 0.18);
    context.fillStyle = coreGradient;
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.92)';
    context.lineWidth = 2;
    roundedRectPath(context, x + w * 0.19, y + h * 0.12, w * 0.62, h * 0.76, Math.min(w, h) * 0.18);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.18)';
    roundedRectPath(context, x + w * 0.26, y + h * 0.18, w * 0.48, h * 0.16, Math.min(w, h) * 0.08);
    context.fill();
    context.fillStyle = '#fffdf5';
    context.strokeStyle = '#132339';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.font = `${Math.max(8, Math.min(w, h) * 0.26)}px Arial Black`;
    context.lineWidth = Math.max(2.5, Math.min(w, h) * 0.09);
    context.strokeText(portalCode, x + w / 2, y + h * 0.56);
    context.fillText(portalCode, x + w / 2, y + h * 0.56);
    if (isActive) {
        context.strokeStyle = 'rgba(255,255,255,0.48)';
        context.lineWidth = 1.5;
        roundedRectPath(context, x + w * 0.12, y + h * 0.08, w * 0.76, h * 0.84, Math.min(w, h) * 0.18);
        context.stroke();
    }
}
function drawPortalGlyph(context, type, x, y, w, h) {
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
    }
    else if (type === 'SPEED_PORTAL') {
        drawChevronOutline(context, centerX - w * 0.08, centerY, w * 0.12, h * 0.12);
        drawChevronOutline(context, centerX + w * 0.08, centerY, w * 0.12, h * 0.12);
    }
    else if (type === 'SHIP_PORTAL') {
        context.moveTo(centerX + w * 0.12, centerY);
        context.lineTo(centerX - w * 0.12, centerY - h * 0.1);
        context.lineTo(centerX - w * 0.04, centerY);
        context.lineTo(centerX - w * 0.12, centerY + h * 0.1);
        context.closePath();
    }
    else if (type === 'BALL_PORTAL') {
        context.arc(centerX, centerY, Math.min(w, h) * 0.12, 0, Math.PI * 2);
        context.moveTo(centerX - w * 0.16, centerY);
        context.lineTo(centerX + w * 0.16, centerY);
    }
    else if (type === 'CUBE_PORTAL') {
        context.rect(centerX - w * 0.12, centerY - h * 0.12, w * 0.24, h * 0.24);
    }
    else if (type === 'ARROW_PORTAL') {
        context.moveTo(centerX - w * 0.18, centerY - h * 0.12);
        context.lineTo(centerX + w * 0.02, centerY - h * 0.12);
        context.lineTo(centerX + w * 0.02, centerY - h * 0.22);
        context.lineTo(centerX + w * 0.2, centerY);
        context.lineTo(centerX + w * 0.02, centerY + h * 0.22);
        context.lineTo(centerX + w * 0.02, centerY + h * 0.12);
        context.lineTo(centerX - w * 0.18, centerY + h * 0.12);
        context.closePath();
    }
    else if (type === 'FINISH_PORTAL') {
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
function drawTriggerSprite(context, object, x, y, w, h, fillColor, strokeColor, isActive, editorGuideTop, editorGuideBottom) {
    const type = object.type;
    const activationMode = getTriggerActivationMode(object.props.activationMode);
    const hasGuideBounds = hasFiniteGuideBounds(editorGuideTop, editorGuideBottom);
    if (hasGuideBounds) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const badgeRadius = Math.max(10, Math.min(w, h) * 0.38);
        const badgeGradient = context.createLinearGradient(centerX, centerY - badgeRadius, centerX, centerY + badgeRadius);
        const labelLines = getTriggerEditorLabelLines(object);
        const labelBottomY = y - Math.max(8, h * 0.16);
        const badgeValue = getTriggerEditorValue(object);
        badgeGradient.addColorStop(0, lightenColor(fillColor, 0.22));
        badgeGradient.addColorStop(0.52, fillColor);
        badgeGradient.addColorStop(1, darkenColor(fillColor, 0.22));
        if (activationMode === 'zone') {
            drawEditorGuideLine(context, centerX, editorGuideTop, editorGuideBottom, fillColor, strokeColor);
        }
        drawArcadeHelperLabel(context, labelLines, centerX, labelBottomY, Math.max(14, Math.min(w, h) * 0.34));
        context.fillStyle = 'rgba(20, 11, 34, 0.34)';
        context.beginPath();
        context.arc(centerX, centerY + badgeRadius * 0.12, badgeRadius * 1.14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fffdf5';
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius * 1.1, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#120d19';
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = badgeGradient;
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius * 0.84, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.24)';
        context.beginPath();
        context.ellipse(centerX, centerY - badgeRadius * 0.28, badgeRadius * 0.48, badgeRadius * 0.22, 0, 0, Math.PI * 2);
        context.fill();
        if (activationMode === 'touch') {
            context.save();
            context.strokeStyle = 'rgba(255,255,255,0.9)';
            context.lineWidth = Math.max(1.2, badgeRadius * 0.16);
            context.setLineDash([badgeRadius * 0.16, badgeRadius * 0.12]);
            context.beginPath();
            context.arc(centerX, centerY, badgeRadius * 0.58, 0, Math.PI * 2);
            context.stroke();
            context.restore();
        }
        context.fillStyle = '#fffdf5';
        context.strokeStyle = '#120d19';
        context.lineJoin = 'round';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${Math.max(12, badgeRadius * 0.9)}px Arial Black`;
        context.lineWidth = Math.max(3, badgeRadius * 0.24);
        context.strokeText(badgeValue, centerX, centerY + badgeRadius * 0.04);
        context.fillText(badgeValue, centerX, centerY + badgeRadius * 0.04);
        return;
    }
    drawCompactTriggerPreviewSprite(context, object, x, y, w, h, fillColor, activationMode, isActive);
}
function drawStartMarkerSprite(context, type, x, y, w, h, fillColor, strokeColor, editorGuideTop, editorGuideBottom) {
    const hasGuideBounds = hasFiniteGuideBounds(editorGuideTop, editorGuideBottom);
    if (hasGuideBounds) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const labelCenterX = type === 'START_POS' ? x + w * 1.42 : centerX;
        const labelBottomY = type === 'START_POS' ? centerY - h * 0.08 : y - Math.max(8, h * 0.16);
        const labelLines = type === 'START_POS' ? ['START', 'POS'] : ['START'];
        drawEditorGuideLine(context, centerX, editorGuideTop, editorGuideBottom, fillColor, strokeColor);
        drawArcadeHelperLabel(context, labelLines, labelCenterX, labelBottomY, Math.max(14, Math.min(w, h) * 0.34));
        if (type === 'START_POS') {
            return;
        }
        const badgeRadius = Math.max(10, Math.min(w, h) * 0.34);
        context.fillStyle = '#fffdf5';
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius * 1.06, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#120d19';
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius * 0.94, 0, Math.PI * 2);
        context.fill();
        const badgeGradient = context.createLinearGradient(centerX, centerY - badgeRadius, centerX, centerY + badgeRadius);
        badgeGradient.addColorStop(0, lightenColor(fillColor, 0.18));
        badgeGradient.addColorStop(0.55, fillColor);
        badgeGradient.addColorStop(1, darkenColor(fillColor, 0.2));
        context.fillStyle = badgeGradient;
        context.beginPath();
        context.arc(centerX, centerY, badgeRadius * 0.78, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.18)';
        context.beginPath();
        context.ellipse(centerX, centerY - badgeRadius * 0.24, badgeRadius * 0.44, badgeRadius * 0.18, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fffdf5';
        context.beginPath();
        context.moveTo(centerX - badgeRadius * 0.24, centerY - badgeRadius * 0.3);
        context.lineTo(centerX + badgeRadius * 0.32, centerY);
        context.lineTo(centerX - badgeRadius * 0.24, centerY + badgeRadius * 0.3);
        context.closePath();
        context.fill();
        return;
    }
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
    if (type === 'START_POS') {
        context.moveTo(x + w * 0.24, y + h * 0.24);
        context.lineTo(x + w * 0.74, y + h * 0.24);
        context.lineTo(x + w * 0.74, y + h * 0.76);
        context.lineTo(x + w * 0.24, y + h * 0.76);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(18, 36, 13, 0.85)';
        context.font = `${Math.max(9, h * 0.38)}px Arial Black`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('S', x + w * 0.49, y + h * 0.54);
        return;
    }
    context.moveTo(x + w * 0.3, y + h * 0.22);
    context.lineTo(x + w * 0.7, y + h * 0.5);
    context.lineTo(x + w * 0.3, y + h * 0.78);
    context.closePath();
    context.fill();
}
function drawChevron(context, centerX, centerY, width, height) {
    context.beginPath();
    context.moveTo(centerX - width / 2, centerY);
    context.lineTo(centerX, centerY - height / 2);
    context.lineTo(centerX + width / 2, centerY);
    context.lineTo(centerX, centerY + height / 2);
    context.closePath();
    context.fill();
}
function drawChevronOutline(context, centerX, centerY, width, height) {
    context.moveTo(centerX - width / 2, centerY - height / 2);
    context.lineTo(centerX + width / 2, centerY);
    context.lineTo(centerX - width / 2, centerY + height / 2);
}
function drawCompactTriggerPreviewSprite(context, object, x, y, w, h, fillColor, activationMode, isActive) {
    const centerX = x + w / 2;
    const badgeCenterY = y + h * 0.64;
    const badgeRadius = Math.max(7, Math.min(w, h) * 0.24);
    const label = getTriggerCompactPreviewLabel(object);
    const labelFontSize = Math.max(7, Math.min(9.5, Math.min(w, h) * 0.22));
    const badgeGradient = context.createLinearGradient(centerX, badgeCenterY - badgeRadius, centerX, badgeCenterY + badgeRadius);
    badgeGradient.addColorStop(0, lightenColor(fillColor, 0.22));
    badgeGradient.addColorStop(0.52, fillColor);
    badgeGradient.addColorStop(1, darkenColor(fillColor, 0.24));
    context.fillStyle = 'rgba(16, 11, 28, 0.3)';
    context.beginPath();
    context.arc(centerX, badgeCenterY + badgeRadius * 0.12, badgeRadius * 1.14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fffdf5';
    context.beginPath();
    context.arc(centerX, badgeCenterY, badgeRadius * 1.1, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#120d19';
    context.beginPath();
    context.arc(centerX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = badgeGradient;
    context.beginPath();
    context.arc(centerX, badgeCenterY, badgeRadius * 0.84, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.24)';
    context.beginPath();
    context.ellipse(centerX, badgeCenterY - badgeRadius * 0.28, badgeRadius * 0.46, badgeRadius * 0.2, 0, 0, Math.PI * 2);
    context.fill();
    if (activationMode === 'touch') {
        context.save();
        context.strokeStyle = 'rgba(255,255,255,0.9)';
        context.lineWidth = Math.max(1, badgeRadius * 0.16);
        context.setLineDash([badgeRadius * 0.16, badgeRadius * 0.12]);
        context.beginPath();
        context.arc(centerX, badgeCenterY, badgeRadius * 0.58, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    }
    drawCompactTriggerPreviewGlyph(context, object.type, centerX, badgeCenterY, badgeRadius);
    context.fillStyle = '#fffdf5';
    context.strokeStyle = '#120d19';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.font = `${labelFontSize}px Arial Black`;
    context.lineWidth = Math.max(2, labelFontSize * 0.28);
    context.strokeText(label, centerX, y + h * 0.18);
    context.fillText(label, centerX, y + h * 0.18);
    if (isActive) {
        context.strokeStyle = 'rgba(255,255,255,0.42)';
        context.lineWidth = 1.25;
        context.beginPath();
        context.arc(centerX, badgeCenterY, badgeRadius * 1.22, 0, Math.PI * 2);
        context.stroke();
    }
}
function drawCompactTriggerPreviewGlyph(context, type, centerX, centerY, radius) {
    context.save();
    context.strokeStyle = '#fffdf5';
    context.fillStyle = '#fffdf5';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(1.35, radius * 0.18);
    if (type === 'POST_FX_TRIGGER') {
        context.strokeStyle = '#120d19';
        context.fillStyle = '#fffdf5';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${Math.max(6.5, radius * 0.72)}px Arial Black`;
        context.lineWidth = Math.max(1.8, radius * 0.18);
        context.strokeText('FX', centerX, centerY + radius * 0.04);
        context.fillText('FX', centerX, centerY + radius * 0.04);
        context.restore();
        return;
    }
    context.beginPath();
    if (type === 'MOVE_TRIGGER') {
        drawChevronOutline(context, centerX - radius * 0.32, centerY, radius * 0.48, radius * 0.42);
        drawChevronOutline(context, centerX + radius * 0.28, centerY, radius * 0.48, radius * 0.42);
        context.moveTo(centerX - radius * 0.52, centerY);
        context.lineTo(centerX + radius * 0.52, centerY);
    }
    else if (type === 'ALPHA_TRIGGER') {
        context.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        context.moveTo(centerX, centerY - radius * 0.58);
        context.lineTo(centerX, centerY + radius * 0.58);
    }
    else if (type === 'TOGGLE_TRIGGER') {
        context.moveTo(centerX - radius * 0.5, centerY);
        context.lineTo(centerX - radius * 0.16, centerY + radius * 0.34);
        context.lineTo(centerX + radius * 0.56, centerY - radius * 0.4);
    }
    else if (type === 'PULSE_TRIGGER') {
        context.moveTo(centerX - radius * 0.62, centerY + radius * 0.06);
        context.lineTo(centerX - radius * 0.28, centerY - radius * 0.26);
        context.lineTo(centerX, centerY + radius * 0.22);
        context.lineTo(centerX + radius * 0.22, centerY - radius * 0.36);
        context.lineTo(centerX + radius * 0.58, centerY);
    }
    context.stroke();
    context.restore();
}
function roundedRectPath(context, x, y, width, height, radius) {
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
function getTriggerActivationMode(value) {
    return value === 'touch' ? 'touch' : 'zone';
}
function hasFiniteGuideBounds(top, bottom) {
    return Number.isFinite(top) && Number.isFinite(bottom) && Number(bottom) > Number(top);
}
function drawEditorGuideLine(context, centerX, top, bottom, fillColor, strokeColor) {
    context.save();
    context.lineCap = 'round';
    context.strokeStyle = toRgba(lightenColor(strokeColor, 0.16), 0.24);
    context.lineWidth = 3.8;
    context.beginPath();
    context.moveTo(centerX, top);
    context.lineTo(centerX, bottom);
    context.stroke();
    context.strokeStyle = toRgba(fillColor, 0.96);
    context.shadowColor = toRgba(fillColor, 0.34);
    context.shadowBlur = 6;
    context.lineWidth = 1.35;
    context.beginPath();
    context.moveTo(centerX, top);
    context.lineTo(centerX, bottom);
    context.stroke();
    context.restore();
}
function drawArcadeHelperLabel(context, lines, centerX, bottomY, fontSize) {
    if (!lines.length) {
        return;
    }
    const safeFontSize = Math.max(10, fontSize);
    const lineHeight = safeFontSize * 0.9;
    const firstCenterY = bottomY - lineHeight * (lines.length - 0.5);
    context.save();
    context.fillStyle = '#fffdf5';
    context.strokeStyle = '#120d19';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(4, safeFontSize * 0.24);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${safeFontSize}px Arial Black`;
    for (let index = 0; index < lines.length; index += 1) {
        const textY = firstCenterY + index * lineHeight;
        context.strokeText(lines[index], centerX, textY);
        context.fillText(lines[index], centerX, textY);
    }
    context.restore();
}
function getTriggerEditorLabelLines(object) {
    if (object.type === 'MOVE_TRIGGER') {
        return ['MOVE'];
    }
    if (object.type === 'ALPHA_TRIGGER') {
        return ['ALPHA'];
    }
    if (object.type === 'TOGGLE_TRIGGER') {
        return ['TOGGLE'];
    }
    if (object.type === 'PULSE_TRIGGER') {
        return ['PULSE'];
    }
    const effectType = typeof object.props.effectType === 'string' && object.props.effectType.trim().length > 0
        ? object.props.effectType.trim().toLowerCase()
        : 'post';
    if (effectType === 'scanlines') {
        return ['SCAN'];
    }
    if (effectType === 'grayscale') {
        return ['GRAY'];
    }
    if (effectType === 'invert') {
        return ['INVERT'];
    }
    if (effectType === 'shake') {
        return ['SHAKE'];
    }
    if (effectType === 'blur') {
        return ['BLUR'];
    }
    if (effectType === 'tint') {
        return ['TINT'];
    }
    return ['FLASH'];
}
function getTriggerEditorValue(object) {
    if (object.type === 'POST_FX_TRIGGER') {
        return 'FX';
    }
    const groupId = Number(object.props.groupId ?? object.props.paintGroupId ?? 0);
    if (!Number.isFinite(groupId)) {
        return '0';
    }
    return String(Math.max(0, Math.round(groupId))).slice(0, 3);
}
function getTriggerCompactPreviewLabel(object) {
    return getTriggerEditorLabelLines(object)[0] ?? 'TRG';
}
function lightenColor(hex, amount) {
    return mixColor(hex, '#ffffff', amount);
}
function darkenColor(hex, amount) {
    return mixColor(hex, '#000000', amount);
}
function mixColor(baseHex, mixHex, amount) {
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
function toRgba(hex, alpha) {
    const color = parseHexColor(hex);
    if (!color) {
        return hex;
    }
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}
function normalizeRotation(degrees) {
    if (!Number.isFinite(degrees)) {
        return 0;
    }
    return (degrees * Math.PI) / 180;
}
function normalizeQuarterRotationDegrees(degrees) {
    if (!Number.isFinite(degrees)) {
        return 0;
    }
    return ((Math.round(degrees / 90) * 90) % 360 + 360) % 360;
}
function parseHexColor(hex) {
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
function toHexColor(color) {
    const clampChannel = (value) => Math.max(0, Math.min(255, value));
    return `#${[color.r, color.g, color.b]
        .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
        .join('')}`;
}
