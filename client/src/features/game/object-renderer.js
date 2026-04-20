import { getBlockFamily, getBlockStrokeMask, isBlockObjectType, isSawObjectType, isSpikeObjectType, } from './object-definitions';
const arrowRampTypes = new Set(['ARROW_RAMP_ASC', 'ARROW_RAMP_DESC']);
const decorationSpriteTypes = new Set([
    'DECOR_FLAME',
    'DECOR_TORCH',
    'DECOR_CHAIN',
    'DECOR_CRYSTAL',
    'DECOR_LANTERN',
    'DECOR_PLANET',
    'DECOR_RING_PLANET',
    'DECOR_STAR_CLUSTER',
    'DECOR_SATELLITE',
    'DECOR_COMET',
]);
const spritePortalPathByType = {
    GRAVITY_PORTAL: '/portals/gravity-flip.svg',
    GRAVITY_FLIP_PORTAL: '/portals/gravity-flip.svg',
    GRAVITY_RETURN_PORTAL: '/portals/gravity-return.svg',
    SHIP_PORTAL: '/portals/ship.svg',
    BALL_PORTAL: '/portals/ball.svg',
    CUBE_PORTAL: '/portals/cube.svg',
    ARROW_PORTAL: '/portals/wave.svg',
};
const spritePortalCache = new Map();
function isArrowRampType(type) {
    return arrowRampTypes.has(type);
}
function isSpritePortalType(type) {
    return type in spritePortalPathByType;
}
function isDecorationSpriteType(type) {
    return decorationSpriteTypes.has(type);
}
export function drawStageObjectSprite({ context, object, neighborObjects, x, y, w, h, fillColor, strokeColor, isActive = false, isUsedOrb = false, alpha = 1, animationTimeMs = 0, editorGuideTop, editorGuideBottom, }) {
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
    if (isDecorationSpriteType(object.type)) {
        drawDecorationSprite(context, object.type, x, y, w, h, fillColor, strokeColor, animationTimeMs);
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
    if (object.type === 'GRAVITY_FLIP_PORTAL' ||
        object.type === 'GRAVITY_RETURN_PORTAL' ||
        object.type === 'GRAVITY_PORTAL' ||
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
    if (isBlockObjectType(object.type)) {
        drawBlockSprite(context, object, neighborObjects, x, y, w, h, fillColor, strokeColor, object.type === 'DECORATION_BLOCK');
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
function drawBlockSprite(context, object, neighborObjects, x, y, w, h, fillColor, strokeColor, decorationOnly) {
    const seamlessNeighborMask = getSeamlessNeighborMask(object, neighborObjects);
    const fillBleed = decorationOnly ? 0.75 : 1;
    const fillX = x - (seamlessNeighborMask.left ? fillBleed : 0);
    const fillY = y - (seamlessNeighborMask.top ? fillBleed : 0);
    const fillW = w + (seamlessNeighborMask.left ? fillBleed : 0) + (seamlessNeighborMask.right ? fillBleed : 0);
    const fillH = h + (seamlessNeighborMask.top ? fillBleed : 0) + (seamlessNeighborMask.bottom ? fillBleed : 0);
    const fillRect = snapRectToDevicePixels(context, fillX, fillY, fillW, fillH);
    context.fillStyle = fillColor;
    context.fillRect(fillRect.x, fillRect.y, fillRect.w, fillRect.h);
    const strokeMask = getMergedBlockStrokeMask(object, seamlessNeighborMask);
    if (strokeMask && (strokeMask.top || strokeMask.bottom || strokeMask.left || strokeMask.right)) {
        const strokeRect = snapRectToDevicePixels(context, x, y, Math.max(0, w), Math.max(0, h));
        context.fillStyle = strokeColor;
        drawBlockStrokeSides(context, strokeRect.x, strokeRect.y, strokeRect.w, strokeRect.h, strokeMask, seamlessNeighborMask);
    }
}
const BLOCK_NEIGHBOR_EPSILON = 0.001;
function getMergedBlockStrokeMask(object, seamlessNeighborMask) {
    const baseMask = getBlockStrokeMask(object.type);
    if (!baseMask) {
        return null;
    }
    return {
        top: baseMask.top && !seamlessNeighborMask.top,
        bottom: baseMask.bottom && !seamlessNeighborMask.bottom,
        left: baseMask.left && !seamlessNeighborMask.left,
        right: baseMask.right && !seamlessNeighborMask.right,
    };
}
function getSeamlessNeighborMask(object, neighborObjects) {
    const family = getBlockFamily(object.type);
    if (!neighborObjects?.length || !family) {
        return {
            top: false,
            bottom: false,
            left: false,
            right: false,
        };
    }
    return {
        top: hasSeamlessBlockNeighbor(object, family, neighborObjects, 'top'),
        bottom: hasSeamlessBlockNeighbor(object, family, neighborObjects, 'bottom'),
        left: hasSeamlessBlockNeighbor(object, family, neighborObjects, 'left'),
        right: hasSeamlessBlockNeighbor(object, family, neighborObjects, 'right'),
    };
}
function hasSeamlessBlockNeighbor(object, family, neighborObjects, side) {
    return neighborObjects.some((neighbor) => {
        if (neighbor.id === object.id || !isBlockObjectType(neighbor.type) || getBlockFamily(neighbor.type) !== family) {
            return false;
        }
        if (side === 'top') {
            return (nearlyEqual(neighbor.y + neighbor.h, object.y) &&
                neighbor.x <= object.x + BLOCK_NEIGHBOR_EPSILON &&
                neighbor.x + neighbor.w >= object.x + object.w - BLOCK_NEIGHBOR_EPSILON);
        }
        if (side === 'bottom') {
            return (nearlyEqual(object.y + object.h, neighbor.y) &&
                neighbor.x <= object.x + BLOCK_NEIGHBOR_EPSILON &&
                neighbor.x + neighbor.w >= object.x + object.w - BLOCK_NEIGHBOR_EPSILON);
        }
        if (side === 'left') {
            return (nearlyEqual(neighbor.x + neighbor.w, object.x) &&
                neighbor.y <= object.y + BLOCK_NEIGHBOR_EPSILON &&
                neighbor.y + neighbor.h >= object.y + object.h - BLOCK_NEIGHBOR_EPSILON);
        }
        return (nearlyEqual(object.x + object.w, neighbor.x) &&
            neighbor.y <= object.y + BLOCK_NEIGHBOR_EPSILON &&
            neighbor.y + neighbor.h >= object.y + object.h - BLOCK_NEIGHBOR_EPSILON);
    });
}
function nearlyEqual(a, b) {
    return Math.abs(a - b) <= BLOCK_NEIGHBOR_EPSILON;
}
function snapRectToDevicePixels(context, x, y, w, h) {
    const transform = context.getTransform();
    const scaleX = Math.max(1, Math.hypot(transform.a, transform.b));
    const scaleY = Math.max(1, Math.hypot(transform.c, transform.d));
    const minX = Math.floor(x * scaleX) / scaleX;
    const minY = Math.floor(y * scaleY) / scaleY;
    const maxX = Math.ceil((x + w) * scaleX) / scaleX;
    const maxY = Math.ceil((y + h) * scaleY) / scaleY;
    return {
        x: minX,
        y: minY,
        w: Math.max(0, maxX - minX),
        h: Math.max(0, maxY - minY),
    };
}
function drawBlockStrokeSides(context, x, y, w, h, strokeMask, seamlessNeighborMask) {
    const thickness = getResponsiveStrokeThickness(w, h);
    const jointBleed = thickness;
    const outerBleed = thickness > 1 ? 1 : 0;
    if (strokeMask.top) {
        context.fillRect(x - (seamlessNeighborMask.left ? jointBleed : 0), y - outerBleed, w + (seamlessNeighborMask.left ? jointBleed : 0) + (seamlessNeighborMask.right ? jointBleed : 0), thickness + outerBleed);
    }
    if (strokeMask.bottom) {
        context.fillRect(x - (seamlessNeighborMask.left ? jointBleed : 0), y + h - thickness, w + (seamlessNeighborMask.left ? jointBleed : 0) + (seamlessNeighborMask.right ? jointBleed : 0), thickness + outerBleed);
    }
    if (strokeMask.left) {
        context.fillRect(x - outerBleed, y - (seamlessNeighborMask.top ? jointBleed : 0), thickness + outerBleed, h + (seamlessNeighborMask.top ? jointBleed : 0) + (seamlessNeighborMask.bottom ? jointBleed : 0));
    }
    if (strokeMask.right) {
        context.fillRect(x + w - thickness, y - (seamlessNeighborMask.top ? jointBleed : 0), thickness + outerBleed, h + (seamlessNeighborMask.top ? jointBleed : 0) + (seamlessNeighborMask.bottom ? jointBleed : 0));
    }
}
function drawSpikeSprite(context, x, y, w, h, fillColor, strokeColor) {
    const spikeRect = snapRectToDevicePixels(context, x, y, w, h);
    const strokeThickness = getResponsiveStrokeThickness(spikeRect.w, spikeRect.h);
    context.fillStyle = fillColor;
    context.beginPath();
    context.moveTo(spikeRect.x, spikeRect.y + spikeRect.h);
    context.lineTo(spikeRect.x + spikeRect.w / 2, spikeRect.y);
    context.lineTo(spikeRect.x + spikeRect.w, spikeRect.y + spikeRect.h);
    context.closePath();
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeThickness;
    context.lineJoin = 'miter';
    context.miterLimit = 2;
    context.stroke();
}
function getResponsiveStrokeThickness(w, h, maxThickness = 2) {
    return Math.max(1, Math.min(maxThickness, Math.round(Math.min(w, h) * 0.08)));
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
function drawJumpOrbSprite(context, x, y, w, h, fillColor, strokeColor, isUsedOrb, _animationTimeMs, variant) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.max(8, Math.min(w, h) * 0.42);
    const isGravityVariant = variant === 'blueGravity' || variant === 'greenGravity';
    const orbGradient = context.createLinearGradient(centerX, y + h * 0.08, centerX, y + h * 0.92);
    orbGradient.addColorStop(0, lightenColor(fillColor, isUsedOrb ? 0.18 : 0.1));
    orbGradient.addColorStop(1, darkenColor(fillColor, isUsedOrb ? 0.18 : 0.08));
    context.fillStyle = orbGradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = toRgba('#ffffff', isUsedOrb ? 0.32 : 0.55);
    context.lineWidth = 1.3;
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.62, 0, Math.PI * 2);
    context.stroke();
    if (isGravityVariant) {
        context.strokeStyle = strokeColor;
        context.lineWidth = Math.max(2, radius * 0.12);
        context.lineCap = 'round';
        context.lineJoin = 'round';
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
    else {
        context.fillStyle = toRgba('#ffffff', isUsedOrb ? 0.2 : 0.38);
        context.beginPath();
        context.arc(centerX, centerY, radius * 0.2, 0, Math.PI * 2);
        context.fill();
    }
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
    const portalCode = type === 'GRAVITY_PORTAL' || type === 'GRAVITY_FLIP_PORTAL'
        ? 'GF'
        : type === 'GRAVITY_RETURN_PORTAL'
            ? 'GR'
            : type === 'SHIP_PORTAL'
                ? 'S'
                : type === 'BALL_PORTAL'
                    ? 'B'
                    : type === 'CUBE_PORTAL'
                        ? 'C'
                        : 'W';
    const fillColor = type === 'GRAVITY_PORTAL' || type === 'GRAVITY_FLIP_PORTAL'
        ? '#eeff00'
        : type === 'GRAVITY_RETURN_PORTAL'
            ? '#51ffe7'
            : type === 'SHIP_PORTAL'
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
function drawDecorationSprite(context, type, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    switch (type) {
        case 'DECOR_FLAME':
            drawFlameDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs);
            return;
        case 'DECOR_TORCH':
            drawTorchDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs);
            return;
        case 'DECOR_CHAIN':
            drawChainDecoration(context, x, y, w, h, fillColor, strokeColor);
            return;
        case 'DECOR_CRYSTAL':
            drawCrystalDecoration(context, x, y, w, h, fillColor, strokeColor);
            return;
        case 'DECOR_LANTERN':
            drawLanternDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs);
            return;
        case 'DECOR_PLANET':
            drawPlanetDecoration(context, x, y, w, h, fillColor, strokeColor);
            return;
        case 'DECOR_RING_PLANET':
            drawRingPlanetDecoration(context, x, y, w, h, fillColor, strokeColor);
            return;
        case 'DECOR_STAR_CLUSTER':
            drawStarClusterDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs);
            return;
        case 'DECOR_SATELLITE':
            drawSatelliteDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs);
            return;
        case 'DECOR_COMET':
            drawCometDecoration(context, x, y, w, h, fillColor, strokeColor);
            return;
    }
}
function drawFlameDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    const centerX = x + w / 2;
    const baseY = y + h * 0.84;
    const flicker = 1 + Math.sin(animationTimeMs / 150) * 0.05 + Math.sin(animationTimeMs / 72) * 0.03;
    const sway = Math.sin(animationTimeMs / 210) * w * 0.035;
    const glow = context.createRadialGradient(centerX, baseY - h * 0.12, w * 0.06, centerX, baseY - h * 0.12, Math.max(w, h) * 0.58);
    glow.addColorStop(0, toRgba(lightenColor(fillColor, 0.2), 0.46));
    glow.addColorStop(0.46, toRgba(fillColor, 0.24));
    glow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.ellipse(centerX, baseY - h * 0.06, w * 0.48, h * 0.38, 0, 0, Math.PI * 2);
    context.fill();
    const logFill = context.createLinearGradient(x, baseY - h * 0.02, x + w, baseY + h * 0.08);
    logFill.addColorStop(0, '#6f4022');
    logFill.addColorStop(1, '#2e170d');
    context.fillStyle = logFill;
    roundedRectPath(context, x + w * 0.18, baseY - h * 0.02, w * 0.3, h * 0.11, Math.min(w, h) * 0.08);
    context.fill();
    roundedRectPath(context, x + w * 0.5, baseY - h * 0.04, w * 0.26, h * 0.1, Math.min(w, h) * 0.08);
    context.fill();
    const outerGradient = context.createLinearGradient(centerX, y + h * 0.12, centerX, baseY);
    outerGradient.addColorStop(0, lightenColor(fillColor, 0.5));
    outerGradient.addColorStop(0.36, fillColor);
    outerGradient.addColorStop(1, darkenColor(fillColor, 0.32));
    drawFlameShape(context, centerX, baseY, w * 0.44, h * 0.6 * flicker, sway);
    context.fillStyle = outerGradient;
    context.fill();
    context.strokeStyle = toRgba(strokeColor, 0.86);
    context.lineWidth = Math.max(1.2, Math.min(w, h) * 0.06);
    context.stroke();
    const innerGradient = context.createLinearGradient(centerX, y + h * 0.22, centerX, baseY);
    innerGradient.addColorStop(0, '#fff4bf');
    innerGradient.addColorStop(0.55, lightenColor(fillColor, 0.32));
    innerGradient.addColorStop(1, '#ff9c4d');
    drawFlameShape(context, centerX + sway * 0.4, baseY - h * 0.02, w * 0.22, h * 0.34 * flicker, -sway * 0.35);
    context.fillStyle = innerGradient;
    context.fill();
    context.fillStyle = toRgba('#fff8d9', 0.85);
    context.beginPath();
    context.arc(x + w * 0.38, y + h * 0.38, Math.max(1.2, w * 0.035), 0, Math.PI * 2);
    context.arc(x + w * 0.63, y + h * 0.3, Math.max(1.4, w * 0.042), 0, Math.PI * 2);
    context.fill();
}
function drawTorchDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    const centerX = x + w / 2;
    const handleX = centerX - w * 0.08;
    const handleY = y + h * 0.34;
    const handleW = w * 0.16;
    const handleH = h * 0.52;
    const handleGradient = context.createLinearGradient(handleX, handleY, handleX, handleY + handleH);
    handleGradient.addColorStop(0, '#855535');
    handleGradient.addColorStop(1, '#422312');
    roundedRectPath(context, handleX, handleY, handleW, handleH, Math.min(w, h) * 0.08);
    context.fillStyle = handleGradient;
    context.fill();
    const bracketY = y + h * 0.28;
    roundedRectPath(context, centerX - w * 0.16, bracketY, w * 0.32, h * 0.1, Math.min(w, h) * 0.08);
    context.fillStyle = darkenColor(strokeColor, 0.14);
    context.fill();
    context.strokeStyle = lightenColor(strokeColor, 0.2);
    context.lineWidth = Math.max(1.2, Math.min(w, h) * 0.05);
    context.stroke();
    const glow = context.createRadialGradient(centerX, y + h * 0.22, w * 0.04, centerX, y + h * 0.22, Math.max(w, h) * 0.42);
    glow.addColorStop(0, toRgba(lightenColor(fillColor, 0.18), 0.48));
    glow.addColorStop(0.5, toRgba(fillColor, 0.22));
    glow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.ellipse(centerX, y + h * 0.24, w * 0.34, h * 0.28, 0, 0, Math.PI * 2);
    context.fill();
    const flicker = 1 + Math.sin(animationTimeMs / 160) * 0.05;
    const sway = Math.sin(animationTimeMs / 230) * w * 0.025;
    const outerGradient = context.createLinearGradient(centerX, y + h * 0.02, centerX, y + h * 0.34);
    outerGradient.addColorStop(0, '#fff7cc');
    outerGradient.addColorStop(0.46, fillColor);
    outerGradient.addColorStop(1, '#d14e1f');
    drawFlameShape(context, centerX, y + h * 0.32, w * 0.22, h * 0.27 * flicker, sway);
    context.fillStyle = outerGradient;
    context.fill();
    context.strokeStyle = toRgba(strokeColor, 0.8);
    context.lineWidth = Math.max(1, Math.min(w, h) * 0.045);
    context.stroke();
    const innerGradient = context.createLinearGradient(centerX, y + h * 0.06, centerX, y + h * 0.3);
    innerGradient.addColorStop(0, '#fffdf4');
    innerGradient.addColorStop(1, '#ffb968');
    drawFlameShape(context, centerX + sway * 0.35, y + h * 0.3, w * 0.11, h * 0.16 * flicker, -sway * 0.22);
    context.fillStyle = innerGradient;
    context.fill();
}
function drawChainDecoration(context, x, y, w, h, fillColor, strokeColor) {
    const capH = Math.max(3, h * 0.07);
    roundedRectPath(context, x + w * 0.08, y, w * 0.84, capH, Math.min(w, h) * 0.08);
    context.fillStyle = darkenColor(fillColor, 0.42);
    context.fill();
    const centerX = x + w / 2;
    const chainTop = y + capH + h * 0.02;
    const linkCount = Math.max(3, Math.round(h / Math.max(w * 1.1, 12)));
    const step = (h - capH - h * 0.06) / linkCount;
    const linkRadiusX = Math.max(2, w * 0.22);
    const linkRadiusY = Math.max(4, step * 0.28);
    context.lineWidth = Math.max(1.3, Math.min(w, h) * 0.06);
    context.strokeStyle = strokeColor;
    for (let index = 0; index < linkCount; index += 1) {
        const centerY = chainTop + step * (index + 0.5);
        const rotation = index % 2 === 0 ? 0 : Math.PI / 2;
        context.beginPath();
        context.ellipse(centerX, centerY, linkRadiusX, linkRadiusY, rotation, 0, Math.PI * 2);
        context.fillStyle = toRgba(fillColor, 0.18 + (index % 2) * 0.05);
        context.fill();
        context.stroke();
    }
}
function drawCrystalDecoration(context, x, y, w, h, fillColor, strokeColor) {
    const centerX = x + w / 2;
    const baseY = y + h * 0.88;
    const glow = context.createRadialGradient(centerX, y + h * 0.56, w * 0.06, centerX, y + h * 0.56, Math.max(w, h) * 0.52);
    glow.addColorStop(0, toRgba(lightenColor(fillColor, 0.2), 0.34));
    glow.addColorStop(0.58, toRgba(fillColor, 0.12));
    glow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.ellipse(centerX, y + h * 0.6, w * 0.42, h * 0.34, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(centerX, y + h * 0.08);
    context.lineTo(x + w * 0.68, y + h * 0.34);
    context.lineTo(x + w * 0.58, baseY);
    context.lineTo(x + w * 0.42, baseY);
    context.lineTo(x + w * 0.32, y + h * 0.34);
    context.closePath();
    const mainGradient = context.createLinearGradient(centerX, y + h * 0.08, centerX, baseY);
    mainGradient.addColorStop(0, lightenColor(fillColor, 0.52));
    mainGradient.addColorStop(0.38, fillColor);
    mainGradient.addColorStop(1, darkenColor(fillColor, 0.24));
    context.fillStyle = mainGradient;
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = Math.max(1.2, Math.min(w, h) * 0.05);
    context.stroke();
    context.beginPath();
    context.moveTo(x + w * 0.22, y + h * 0.42);
    context.lineTo(x + w * 0.34, y + h * 0.24);
    context.lineTo(x + w * 0.42, baseY);
    context.lineTo(x + w * 0.24, y + h * 0.8);
    context.closePath();
    context.fillStyle = toRgba(lightenColor(fillColor, 0.24), 0.85);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x + w * 0.78, y + h * 0.42);
    context.lineTo(x + w * 0.66, y + h * 0.24);
    context.lineTo(x + w * 0.58, baseY);
    context.lineTo(x + w * 0.76, y + h * 0.8);
    context.closePath();
    context.fillStyle = toRgba(darkenColor(fillColor, 0.08), 0.88);
    context.fill();
    context.stroke();
    context.strokeStyle = toRgba('#ffffff', 0.52);
    context.lineWidth = Math.max(1, Math.min(w, h) * 0.03);
    context.beginPath();
    context.moveTo(centerX, y + h * 0.14);
    context.lineTo(centerX, baseY);
    context.moveTo(x + w * 0.36, y + h * 0.34);
    context.lineTo(centerX, y + h * 0.18);
    context.lineTo(x + w * 0.64, y + h * 0.34);
    context.stroke();
}
function drawLanternDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    const centerX = x + w / 2;
    const frameX = x + w * 0.24;
    const frameY = y + h * 0.28;
    const frameW = w * 0.52;
    const frameH = h * 0.5;
    const flicker = 0.84 + Math.sin(animationTimeMs / 170) * 0.06 + Math.sin(animationTimeMs / 95) * 0.04;
    context.strokeStyle = strokeColor;
    context.lineWidth = Math.max(1.2, Math.min(w, h) * 0.05);
    context.beginPath();
    context.moveTo(centerX, y + h * 0.04);
    context.lineTo(centerX, frameY);
    context.stroke();
    context.beginPath();
    context.arc(centerX, y + h * 0.11, w * 0.12, Math.PI, 0);
    context.stroke();
    roundedRectPath(context, frameX, frameY, frameW, frameH, Math.min(w, h) * 0.14);
    context.fillStyle = darkenColor(strokeColor, 0.16);
    context.fill();
    context.stroke();
    const innerGlow = context.createRadialGradient(centerX, frameY + frameH * 0.52, w * 0.05, centerX, frameY + frameH * 0.52, Math.max(frameW, frameH) * 0.56);
    innerGlow.addColorStop(0, toRgba('#fff8d8', 0.78 * flicker));
    innerGlow.addColorStop(0.38, toRgba(lightenColor(fillColor, 0.22), 0.56 * flicker));
    innerGlow.addColorStop(1, toRgba(fillColor, 0.08));
    roundedRectPath(context, frameX + frameW * 0.14, frameY + frameH * 0.12, frameW * 0.72, frameH * 0.72, Math.min(w, h) * 0.1);
    context.fillStyle = innerGlow;
    context.fill();
    context.beginPath();
    context.moveTo(centerX, frameY + frameH * 0.08);
    context.lineTo(centerX, frameY + frameH * 0.92);
    context.moveTo(frameX + frameW * 0.12, frameY + frameH * 0.52);
    context.lineTo(frameX + frameW * 0.88, frameY + frameH * 0.52);
    context.stroke();
    roundedRectPath(context, frameX + frameW * 0.1, frameY - h * 0.06, frameW * 0.8, h * 0.08, Math.min(w, h) * 0.08);
    context.fillStyle = lightenColor(strokeColor, 0.08);
    context.fill();
    context.beginPath();
    context.moveTo(centerX, frameY + frameH);
    context.lineTo(centerX - w * 0.08, y + h * 0.92);
    context.lineTo(centerX + w * 0.08, y + h * 0.92);
    context.closePath();
    context.fillStyle = strokeColor;
    context.fill();
}
function drawPlanetDecoration(context, x, y, w, h, fillColor, strokeColor) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.min(w, h) * 0.42;
    const glow = context.createRadialGradient(centerX, centerY, radius * 0.12, centerX, centerY, radius * 1.7);
    glow.addColorStop(0, toRgba(lightenColor(fillColor, 0.28), 0.34));
    glow.addColorStop(0.48, toRgba(fillColor, 0.16));
    glow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, radius * 1.7, 0, Math.PI * 2);
    context.fill();
    const sphereGradient = context.createRadialGradient(centerX - radius * 0.28, centerY - radius * 0.32, radius * 0.08, centerX, centerY, radius);
    sphereGradient.addColorStop(0, lightenColor(fillColor, 0.45));
    sphereGradient.addColorStop(0.42, lightenColor(fillColor, 0.12));
    sphereGradient.addColorStop(1, darkenColor(fillColor, 0.24));
    context.fillStyle = sphereGradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = Math.max(1.4, radius * 0.12);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = toRgba(darkenColor(fillColor, 0.22), 0.58);
    context.beginPath();
    context.ellipse(centerX - radius * 0.2, centerY + radius * 0.08, radius * 0.24, radius * 0.14, -0.4, 0, Math.PI * 2);
    context.ellipse(centerX + radius * 0.28, centerY - radius * 0.12, radius * 0.17, radius * 0.1, 0.3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = toRgba('#ffffff', 0.38);
    context.lineWidth = Math.max(1, radius * 0.06);
    context.beginPath();
    context.arc(centerX - radius * 0.04, centerY - radius * 0.02, radius * 0.82, Math.PI * 1.08, Math.PI * 1.82);
    context.stroke();
}
function drawRingPlanetDecoration(context, x, y, w, h, fillColor, strokeColor) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const ringColor = lightenColor(fillColor, 0.4);
    const ringShadow = darkenColor(strokeColor, 0.12);
    context.save();
    context.strokeStyle = toRgba(ringShadow, 0.55);
    context.lineWidth = Math.max(3, Math.min(w, h) * 0.12);
    context.beginPath();
    context.ellipse(centerX, centerY, w * 0.46, h * 0.16, -0.22, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = toRgba(ringColor, 0.85);
    context.lineWidth = Math.max(2, Math.min(w, h) * 0.08);
    context.beginPath();
    context.ellipse(centerX, centerY, w * 0.46, h * 0.16, -0.22, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    drawPlanetDecoration(context, x + w * 0.18, y + h * 0.04, w * 0.64, h * 0.92, fillColor, strokeColor);
    context.strokeStyle = toRgba('#fff7e6', 0.72);
    context.lineWidth = Math.max(1.6, Math.min(w, h) * 0.055);
    context.beginPath();
    context.ellipse(centerX, centerY, w * 0.44, h * 0.14, -0.22, Math.PI * 0.08, Math.PI * 0.92);
    context.stroke();
}
function drawStarClusterDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const pulse = 0.86 + Math.sin(animationTimeMs / 240) * 0.08;
    const glow = context.createRadialGradient(centerX, centerY, w * 0.06, centerX, centerY, Math.max(w, h) * 0.6);
    glow.addColorStop(0, toRgba('#ffffff', 0.34 * pulse));
    glow.addColorStop(0.42, toRgba(fillColor, 0.18 * pulse));
    glow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.ellipse(centerX, centerY, w * 0.46, h * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    drawSparkStar(context, x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.3, fillColor, strokeColor, pulse);
    drawSparkStar(context, x + w * 0.26, y + h * 0.7, Math.min(w, h) * 0.16, '#ffffff', strokeColor, 0.92);
    drawSparkStar(context, x + w * 0.76, y + h * 0.24, Math.min(w, h) * 0.18, lightenColor(fillColor, 0.32), strokeColor, 0.94);
    context.fillStyle = toRgba('#ffffff', 0.92);
    context.beginPath();
    context.arc(x + w * 0.16, y + h * 0.3, Math.max(1.2, w * 0.03), 0, Math.PI * 2);
    context.arc(x + w * 0.86, y + h * 0.62, Math.max(1.4, w * 0.038), 0, Math.PI * 2);
    context.fill();
}
function drawSatelliteDecoration(context, x, y, w, h, fillColor, strokeColor, animationTimeMs) {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const bodyX = x + w * 0.36;
    const bodyY = y + h * 0.24;
    const bodyW = w * 0.28;
    const bodyH = h * 0.52;
    const panelW = w * 0.24;
    const panelH = h * 0.36;
    const lightPulse = 0.72 + Math.sin(animationTimeMs / 180) * 0.18;
    const panelGradient = context.createLinearGradient(x, centerY, x + panelW, centerY);
    panelGradient.addColorStop(0, darkenColor(fillColor, 0.18));
    panelGradient.addColorStop(1, lightenColor(fillColor, 0.18));
    context.fillStyle = panelGradient;
    roundedRectPath(context, x + w * 0.04, centerY - panelH / 2, panelW, panelH, Math.min(w, h) * 0.06);
    context.fill();
    roundedRectPath(context, x + w * 0.72, centerY - panelH / 2, panelW, panelH, Math.min(w, h) * 0.06);
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = Math.max(1.2, Math.min(w, h) * 0.05);
    roundedRectPath(context, x + w * 0.04, centerY - panelH / 2, panelW, panelH, Math.min(w, h) * 0.06);
    context.stroke();
    roundedRectPath(context, x + w * 0.72, centerY - panelH / 2, panelW, panelH, Math.min(w, h) * 0.06);
    context.stroke();
    context.beginPath();
    context.moveTo(x + w * 0.28, centerY);
    context.lineTo(bodyX, centerY);
    context.moveTo(bodyX + bodyW, centerY);
    context.lineTo(x + w * 0.72, centerY);
    context.stroke();
    const bodyGradient = context.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY + bodyH);
    bodyGradient.addColorStop(0, lightenColor('#d7e9ff', 0.04));
    bodyGradient.addColorStop(1, '#7d96b8');
    context.fillStyle = bodyGradient;
    roundedRectPath(context, bodyX, bodyY, bodyW, bodyH, Math.min(w, h) * 0.08);
    context.fill();
    context.stroke();
    context.fillStyle = '#213452';
    context.fillRect(bodyX + bodyW * 0.18, bodyY + bodyH * 0.2, bodyW * 0.64, bodyH * 0.18);
    context.fillRect(bodyX + bodyW * 0.22, bodyY + bodyH * 0.5, bodyW * 0.56, bodyH * 0.1);
    context.strokeStyle = strokeColor;
    context.beginPath();
    context.moveTo(bodyX + bodyW / 2, bodyY + bodyH);
    context.lineTo(bodyX + bodyW / 2, y + h * 0.92);
    context.stroke();
    context.beginPath();
    context.arc(bodyX + bodyW / 2, y + h * 0.92, w * 0.07, Math.PI, 0);
    context.stroke();
    context.fillStyle = toRgba('#ff6a7d', 0.72 + lightPulse * 0.18);
    context.beginPath();
    context.arc(bodyX + bodyW * 0.82, bodyY + bodyH * 0.24, Math.max(1.6, Math.min(w, h) * 0.04), 0, Math.PI * 2);
    context.fill();
}
function drawCometDecoration(context, x, y, w, h, fillColor, strokeColor) {
    const headX = x + w * 0.72;
    const headY = y + h * 0.38;
    const headRadius = Math.min(w, h) * 0.18;
    const tailGradient = context.createLinearGradient(x + w * 0.04, y + h * 0.82, headX, headY);
    tailGradient.addColorStop(0, toRgba(fillColor, 0));
    tailGradient.addColorStop(0.45, toRgba(fillColor, 0.2));
    tailGradient.addColorStop(1, toRgba(lightenColor(fillColor, 0.22), 0.6));
    context.fillStyle = tailGradient;
    context.beginPath();
    context.moveTo(x + w * 0.04, y + h * 0.86);
    context.quadraticCurveTo(x + w * 0.42, y + h * 0.56, headX - headRadius * 1.4, headY + headRadius * 0.2);
    context.lineTo(headX - headRadius * 1.8, headY + headRadius * 0.8);
    context.quadraticCurveTo(x + w * 0.34, y + h * 0.94, x + w * 0.04, y + h * 0.86);
    context.closePath();
    context.fill();
    const tailCore = context.createLinearGradient(x + w * 0.16, y + h * 0.76, headX, headY);
    tailCore.addColorStop(0, toRgba('#ffffff', 0));
    tailCore.addColorStop(0.5, toRgba(lightenColor(fillColor, 0.34), 0.24));
    tailCore.addColorStop(1, toRgba('#ffffff', 0.68));
    context.fillStyle = tailCore;
    context.beginPath();
    context.moveTo(x + w * 0.16, y + h * 0.78);
    context.quadraticCurveTo(x + w * 0.46, y + h * 0.58, headX - headRadius * 0.9, headY + headRadius * 0.02);
    context.lineTo(headX - headRadius * 1.08, headY + headRadius * 0.28);
    context.quadraticCurveTo(x + w * 0.42, y + h * 0.84, x + w * 0.16, y + h * 0.78);
    context.closePath();
    context.fill();
    const headGlow = context.createRadialGradient(headX, headY, headRadius * 0.12, headX, headY, headRadius * 2.4);
    headGlow.addColorStop(0, toRgba('#ffffff', 0.72));
    headGlow.addColorStop(0.38, toRgba(lightenColor(fillColor, 0.32), 0.34));
    headGlow.addColorStop(1, toRgba(fillColor, 0));
    context.fillStyle = headGlow;
    context.beginPath();
    context.arc(headX, headY, headRadius * 2.4, 0, Math.PI * 2);
    context.fill();
    const headGradient = context.createRadialGradient(headX - headRadius * 0.28, headY - headRadius * 0.3, headRadius * 0.08, headX, headY, headRadius);
    headGradient.addColorStop(0, '#ffffff');
    headGradient.addColorStop(0.52, lightenColor(fillColor, 0.28));
    headGradient.addColorStop(1, darkenColor(fillColor, 0.18));
    context.fillStyle = headGradient;
    context.beginPath();
    context.arc(headX, headY, headRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = Math.max(1, headRadius * 0.24);
    context.beginPath();
    context.arc(headX, headY, headRadius, 0, Math.PI * 2);
    context.stroke();
}
function drawSparkStar(context, centerX, centerY, radius, fillColor, strokeColor, pulse = 1) {
    const verticalRadius = radius * (1.12 * pulse);
    const horizontalRadius = radius * 0.7;
    context.strokeStyle = toRgba(strokeColor, 0.82);
    context.lineWidth = Math.max(1.2, radius * 0.12);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(centerX, centerY - verticalRadius);
    context.lineTo(centerX, centerY + verticalRadius);
    context.moveTo(centerX - horizontalRadius, centerY);
    context.lineTo(centerX + horizontalRadius, centerY);
    context.stroke();
    context.strokeStyle = toRgba(fillColor, 0.9);
    context.lineWidth = Math.max(1, radius * 0.08);
    context.beginPath();
    context.moveTo(centerX - radius * 0.44, centerY - radius * 0.44);
    context.lineTo(centerX + radius * 0.44, centerY + radius * 0.44);
    context.moveTo(centerX + radius * 0.44, centerY - radius * 0.44);
    context.lineTo(centerX - radius * 0.44, centerY + radius * 0.44);
    context.stroke();
    context.fillStyle = toRgba(fillColor, 0.96);
    context.beginPath();
    context.arc(centerX, centerY, Math.max(1.4, radius * 0.16), 0, Math.PI * 2);
    context.fill();
}
function drawFlameShape(context, centerX, baseY, width, height, sway = 0) {
    context.beginPath();
    context.moveTo(centerX, baseY);
    context.bezierCurveTo(centerX - width * 0.62, baseY - height * 0.18, centerX - width * 0.58 + sway, baseY - height * 0.72, centerX + sway * 0.24, baseY - height);
    context.bezierCurveTo(centerX + width * 0.18 + sway, baseY - height * 0.68, centerX + width * 0.58, baseY - height * 0.22, centerX, baseY);
    context.closePath();
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
