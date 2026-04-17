export const levelObjectDefinitions = {
    GROUND_BLOCK: {
        label: 'Ground',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    GROUND_BLOCK_TOP: {
        label: 'Ground Top',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    GROUND_BLOCK_TOP_BOTTOM: {
        label: 'Ground Top/Bottom',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    GROUND_BLOCK_TOP_LEFT: {
        label: 'Ground Top/Left',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    GROUND_BLOCK_TOP_RIGHT: {
        label: 'Ground Top/Right',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    GROUND_BLOCK_PASS: {
        label: 'Ground Ghost',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK: {
        label: 'Platform',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK_TOP: {
        label: 'Platform Top',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK_TOP_BOTTOM: {
        label: 'Platform Top/Bottom',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK_TOP_LEFT: {
        label: 'Platform Top/Left',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK_TOP_RIGHT: {
        label: 'Platform Top/Right',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: true,
        lethal: false,
        effect: null,
    },
    PLATFORM_BLOCK_PASS: {
        label: 'Platform Ghost',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    HALF_GROUND_BLOCK: {
        label: 'Half Ground',
        color: '#31f0ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 0.5 },
        collides: true,
        lethal: false,
        effect: null,
    },
    HALF_PLATFORM_BLOCK: {
        label: 'Half Platform',
        color: '#7af0a5',
        strokeColor: '#103428',
        defaultSize: { w: 1, h: 0.5 },
        collides: true,
        lethal: false,
        effect: null,
    },
    ARROW_RAMP_ASC: {
        label: 'Arrow Ramp /',
        color: '#8ecbff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    ARROW_RAMP_DESC: {
        label: 'Arrow Ramp \\',
        color: '#8ecbff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    DASH_BLOCK: {
        label: 'Dash Block',
        color: '#6ff9ff',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    SPIKE: {
        label: 'Spike',
        color: '#000000',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SPIKE_FLAT: {
        label: 'Flat Spike',
        color: '#000000',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 0.5 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SPIKE_SMALL: {
        label: 'Small Spike',
        color: '#000000',
        strokeColor: '#ffffff',
        defaultSize: { w: 0.72, h: 0.72 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SPIKE_TINY: {
        label: 'Tiny Spike',
        color: '#000000',
        strokeColor: '#ffffff',
        defaultSize: { w: 0.46, h: 0.46 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_BLADE: {
        label: 'Saw Blade S',
        color: '#151821',
        strokeColor: '#eef3ff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_BLADE_MEDIUM: {
        label: 'Saw Blade M',
        color: '#151821',
        strokeColor: '#eef3ff',
        defaultSize: { w: 1.45, h: 1.45 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_BLADE_LARGE: {
        label: 'Saw Blade L',
        color: '#151821',
        strokeColor: '#eef3ff',
        defaultSize: { w: 1.9, h: 1.9 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_STAR: {
        label: 'Star Saw S',
        color: '#262832',
        strokeColor: '#f4f7ff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_STAR_MEDIUM: {
        label: 'Star Saw M',
        color: '#262832',
        strokeColor: '#f4f7ff',
        defaultSize: { w: 1.45, h: 1.45 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_STAR_LARGE: {
        label: 'Star Saw L',
        color: '#262832',
        strokeColor: '#f4f7ff',
        defaultSize: { w: 1.9, h: 1.9 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GEAR: {
        label: 'Gear Saw S',
        color: '#d9dcff',
        strokeColor: '#6c78a9',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GEAR_MEDIUM: {
        label: 'Gear Saw M',
        color: '#d9dcff',
        strokeColor: '#6c78a9',
        defaultSize: { w: 1.45, h: 1.45 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GEAR_LARGE: {
        label: 'Gear Saw L',
        color: '#d9dcff',
        strokeColor: '#6c78a9',
        defaultSize: { w: 1.9, h: 1.9 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GLOW: {
        label: 'Glow Saw S',
        color: '#fafcff',
        strokeColor: '#d0d7ef',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GLOW_MEDIUM: {
        label: 'Glow Saw M',
        color: '#fafcff',
        strokeColor: '#d0d7ef',
        defaultSize: { w: 1.45, h: 1.45 },
        collides: false,
        lethal: true,
        effect: null,
    },
    SAW_GLOW_LARGE: {
        label: 'Glow Saw L',
        color: '#fafcff',
        strokeColor: '#d0d7ef',
        defaultSize: { w: 1.9, h: 1.9 },
        collides: false,
        lethal: true,
        effect: null,
    },
    JUMP_PAD: {
        label: 'Jump Pad',
        color: '#ccff4d',
        strokeColor: '#173300',
        defaultSize: { w: 1, h: 0.5 },
        collides: false,
        lethal: false,
        effect: 'jumpPad',
    },
    JUMP_ORB: {
        label: 'Jump Orb',
        color: '#ffd54d',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'jumpOrb',
    },
    BLUE_ORB: {
        label: 'Blue Orb',
        color: '#60f55a',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'gravityOrb',
    },
    GRAVITY_ORB: {
        label: 'Green Orb',
        color: '#4da6ff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'gravityOrb',
    },
    GRAVITY_FLIP_PORTAL: {
        label: 'Gravity Flip',
        color: '#eeff00',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'gravity',
    },
    GRAVITY_RETURN_PORTAL: {
        label: 'Gravity Return',
        color: '#51ffe7',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'gravity',
    },
    GRAVITY_PORTAL: {
        label: 'Gravity Legacy',
        color: '#9d8cff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'gravity',
    },
    SPEED_PORTAL: {
        label: 'Speed',
        color: '#ff944d',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'speed',
    },
    SHIP_PORTAL: {
        label: 'Ship',
        color: '#67e6ff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'shipMode',
    },
    BALL_PORTAL: {
        label: 'Ball',
        color: '#ffd95e',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'ballMode',
    },
    CUBE_PORTAL: {
        label: 'Cube',
        color: '#b3ff5e',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'cubeMode',
    },
    ARROW_PORTAL: {
        label: 'Arrow',
        color: '#5ee7ff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'arrowMode',
    },
    FINISH_PORTAL: {
        label: 'Finish',
        color: '#ffffff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 2 },
        collides: false,
        lethal: false,
        effect: 'finish',
    },
    MOVE_TRIGGER: {
        label: 'Move Trigger',
        color: '#58d6ff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'moveTrigger',
    },
    ALPHA_TRIGGER: {
        label: 'Alpha Trigger',
        color: '#f7e85f',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'alphaTrigger',
    },
    TOGGLE_TRIGGER: {
        label: 'Toggle Trigger',
        color: '#8cff8f',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'toggleTrigger',
    },
    PULSE_TRIGGER: {
        label: 'Pulse Trigger',
        color: '#ff8cf2',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'pulseTrigger',
    },
    POST_FX_TRIGGER: {
        label: 'Post FX Trigger',
        color: '#8d9cff',
        strokeColor: '#ffffff',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: 'postFxTrigger',
    },
    DECORATION_BLOCK: {
        label: 'Decoration',
        color: '#31506f',
        strokeColor: '#0f1b31',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_FLAME: {
        label: 'Flame',
        color: '#ff9248',
        strokeColor: '#742417',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_TORCH: {
        label: 'Torch',
        color: '#ffc85f',
        strokeColor: '#3d2a1a',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_CHAIN: {
        label: 'Chain',
        color: '#8ca9cf',
        strokeColor: '#233149',
        defaultSize: { w: 0.4, h: 2 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_CRYSTAL: {
        label: 'Crystal',
        color: '#79efff',
        strokeColor: '#14365c',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_LANTERN: {
        label: 'Lantern',
        color: '#ffd76d',
        strokeColor: '#2a344d',
        defaultSize: { w: 1, h: 1.2 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_PLANET: {
        label: 'Planet',
        color: '#71b8ff',
        strokeColor: '#1a2850',
        defaultSize: { w: 1.4, h: 1.4 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_RING_PLANET: {
        label: 'Ring Planet',
        color: '#c795ff',
        strokeColor: '#24183f',
        defaultSize: { w: 1.9, h: 1.4 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_STAR_CLUSTER: {
        label: 'Star Cluster',
        color: '#fff1b8',
        strokeColor: '#6d5b2d',
        defaultSize: { w: 1.2, h: 1.2 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_SATELLITE: {
        label: 'Satellite',
        color: '#9ddcff',
        strokeColor: '#1b3557',
        defaultSize: { w: 1.8, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    DECOR_COMET: {
        label: 'Comet',
        color: '#8ffff1',
        strokeColor: '#173451',
        defaultSize: { w: 1.8, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    START_MARKER: {
        label: 'Start',
        color: '#31f0ff',
        strokeColor: '#132339',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
    START_POS: {
        label: 'Start Pos',
        color: '#caff45',
        strokeColor: '#173300',
        defaultSize: { w: 1, h: 1 },
        collides: false,
        lethal: false,
        effect: null,
    },
};
const NO_BLOCK_SIDE_MASK = {
    top: false,
    bottom: false,
    left: false,
    right: false,
};
const FULL_BLOCK_SIDE_MASK = {
    top: true,
    bottom: true,
    left: true,
    right: true,
};
const TOP_BLOCK_SIDE_MASK = {
    top: true,
    bottom: false,
    left: false,
    right: false,
};
const TOP_BOTTOM_BLOCK_SIDE_MASK = {
    top: true,
    bottom: true,
    left: false,
    right: false,
};
const TOP_LEFT_BLOCK_SIDE_MASK = {
    top: true,
    bottom: false,
    left: true,
    right: false,
};
const TOP_RIGHT_BLOCK_SIDE_MASK = {
    top: true,
    bottom: false,
    left: false,
    right: true,
};
const blockProfilesByType = {
    GROUND_BLOCK: {
        family: 'ground',
        strokeMask: FULL_BLOCK_SIDE_MASK,
        collisionMask: FULL_BLOCK_SIDE_MASK,
    },
    GROUND_BLOCK_TOP: {
        family: 'ground',
        strokeMask: TOP_BLOCK_SIDE_MASK,
        collisionMask: TOP_BLOCK_SIDE_MASK,
    },
    GROUND_BLOCK_TOP_BOTTOM: {
        family: 'ground',
        strokeMask: TOP_BOTTOM_BLOCK_SIDE_MASK,
        collisionMask: TOP_BOTTOM_BLOCK_SIDE_MASK,
    },
    GROUND_BLOCK_TOP_LEFT: {
        family: 'ground',
        strokeMask: TOP_LEFT_BLOCK_SIDE_MASK,
        collisionMask: TOP_LEFT_BLOCK_SIDE_MASK,
    },
    GROUND_BLOCK_TOP_RIGHT: {
        family: 'ground',
        strokeMask: TOP_RIGHT_BLOCK_SIDE_MASK,
        collisionMask: TOP_RIGHT_BLOCK_SIDE_MASK,
    },
    GROUND_BLOCK_PASS: {
        family: 'ground',
        strokeMask: NO_BLOCK_SIDE_MASK,
        collisionMask: NO_BLOCK_SIDE_MASK,
    },
    HALF_GROUND_BLOCK: {
        family: 'ground',
        strokeMask: FULL_BLOCK_SIDE_MASK,
        collisionMask: FULL_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK: {
        family: 'platform',
        strokeMask: FULL_BLOCK_SIDE_MASK,
        collisionMask: FULL_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK_TOP: {
        family: 'platform',
        strokeMask: TOP_BLOCK_SIDE_MASK,
        collisionMask: TOP_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK_TOP_BOTTOM: {
        family: 'platform',
        strokeMask: TOP_BOTTOM_BLOCK_SIDE_MASK,
        collisionMask: TOP_BOTTOM_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK_TOP_LEFT: {
        family: 'platform',
        strokeMask: TOP_LEFT_BLOCK_SIDE_MASK,
        collisionMask: TOP_LEFT_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK_TOP_RIGHT: {
        family: 'platform',
        strokeMask: TOP_RIGHT_BLOCK_SIDE_MASK,
        collisionMask: TOP_RIGHT_BLOCK_SIDE_MASK,
    },
    PLATFORM_BLOCK_PASS: {
        family: 'platform',
        strokeMask: NO_BLOCK_SIDE_MASK,
        collisionMask: NO_BLOCK_SIDE_MASK,
    },
    HALF_PLATFORM_BLOCK: {
        family: 'platform',
        strokeMask: FULL_BLOCK_SIDE_MASK,
        collisionMask: FULL_BLOCK_SIDE_MASK,
    },
    DECORATION_BLOCK: {
        family: 'decoration',
        strokeMask: FULL_BLOCK_SIDE_MASK,
        collisionMask: NO_BLOCK_SIDE_MASK,
    },
};
export const objectPaletteOrder = Object.keys(levelObjectDefinitions);
export const PAINT_GROUP_SLOT_COUNT = 6;
export const FIXED_LEVEL_START_X = 2;
export const FIXED_LEVEL_START_Y = 8;
export const AUTO_LEVEL_FINISH_PADDING_UNITS = 10;
export const spikeObjectTypes = ['SPIKE', 'SPIKE_FLAT', 'SPIKE_SMALL', 'SPIKE_TINY'];
export const sawObjectTypes = [
    'SAW_BLADE',
    'SAW_BLADE_MEDIUM',
    'SAW_BLADE_LARGE',
    'SAW_STAR',
    'SAW_STAR_MEDIUM',
    'SAW_STAR_LARGE',
    'SAW_GEAR',
    'SAW_GEAR_MEDIUM',
    'SAW_GEAR_LARGE',
    'SAW_GLOW',
    'SAW_GLOW_MEDIUM',
    'SAW_GLOW_LARGE',
];
export const decorationObjectTypes = [
    'DECORATION_BLOCK',
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
    'START_MARKER',
    'START_POS',
];
const triggerObjectTypes = new Set([
    'MOVE_TRIGGER',
    'ALPHA_TRIGGER',
    'TOGGLE_TRIGGER',
    'PULSE_TRIGGER',
    'POST_FX_TRIGGER',
]);
const decorationObjectTypeSet = new Set(decorationObjectTypes);
const nonPaintableObjectTypes = new Set([
    ...triggerObjectTypes,
    'START_MARKER',
    'START_POS',
]);
const legacyRunAnchorObjectTypes = new Set(['START_MARKER', 'FINISH_PORTAL']);
const autoFinishIgnoredObjectTypes = new Set(['START_MARKER', 'FINISH_PORTAL', 'START_POS']);
const JUMP_PAD_LEGACY_TOP_ALIGN_EPSILON = 0.001;
export const SPIKE_HITBOX_NARROW_FACTOR = 0.17;
export const SPIKE_HITBOX_LONG_FACTOR = 0.5;
export const SPIKE_HITBOX_TIP_INSET_FACTOR = 0.28;
export function isPaintableObjectType(type) {
    return !nonPaintableObjectTypes.has(type);
}
export function isSpikeObjectType(type) {
    return spikeObjectTypes.includes(type);
}
export function isSawObjectType(type) {
    return sawObjectTypes.includes(type);
}
export function isDecorationObjectType(type) {
    return decorationObjectTypeSet.has(type);
}
export function isBlockObjectType(type) {
    return type in blockProfilesByType;
}
export function getBlockStrokeMask(type) {
    return blockProfilesByType[type]?.strokeMask ?? null;
}
export function getBlockCollisionMask(type) {
    return blockProfilesByType[type]?.collisionMask ?? null;
}
export function getBlockFamily(type) {
    return blockProfilesByType[type]?.family ?? null;
}
export function hasBlockSupport(mask) {
    return Boolean(mask && (mask.top || mask.bottom || mask.left || mask.right));
}
export function isCollidableBlockType(type) {
    return hasBlockSupport(getBlockCollisionMask(type));
}
export function isGroundFamilyBlockType(type) {
    return blockProfilesByType[type]?.family === 'ground';
}
export function isPassThroughBlockType(type) {
    return blockProfilesByType[type]?.family !== 'decoration' && isBlockObjectType(type) && !hasBlockSupport(getBlockCollisionMask(type));
}
export function isTriggerObjectType(type) {
    return triggerObjectTypes.has(type);
}
export function isLegacyRunAnchorObjectType(type) {
    return legacyRunAnchorObjectTypes.has(type);
}
export function getSpikeHitboxRect(object) {
    const normalizedRotation = normalizeQuarterRotation(object.rotation ?? 0);
    const crossInsetFactor = (1 - SPIKE_HITBOX_NARROW_FACTOR) / 2;
    const tipInsetFactor = SPIKE_HITBOX_TIP_INSET_FACTOR;
    const longFactor = SPIKE_HITBOX_LONG_FACTOR;
    const narrowFactor = SPIKE_HITBOX_NARROW_FACTOR;
    if (normalizedRotation === 90) {
        return {
            x: object.x + object.w * tipInsetFactor,
            y: object.y + object.h * crossInsetFactor,
            w: object.w * longFactor,
            h: object.h * narrowFactor,
        };
    }
    if (normalizedRotation === 180) {
        return {
            x: object.x + object.w * crossInsetFactor,
            y: object.y + object.h * (1 - tipInsetFactor - longFactor),
            w: object.w * narrowFactor,
            h: object.h * longFactor,
        };
    }
    if (normalizedRotation === 270) {
        return {
            x: object.x + object.w * (1 - tipInsetFactor - longFactor),
            y: object.y + object.h * crossInsetFactor,
            w: object.w * longFactor,
            h: object.h * narrowFactor,
        };
    }
    return {
        x: object.x + object.w * crossInsetFactor,
        y: object.y + object.h * tipInsetFactor,
        w: object.w * narrowFactor,
        h: object.h * longFactor,
    };
}
function normalizeQuarterRotation(value) {
    const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
    return normalized === 360 ? 0 : normalized;
}
function normalizeObjectPlacement(object) {
    if (object.type === 'JUMP_PAD' &&
        Math.abs(object.y - Math.round(object.y)) <= JUMP_PAD_LEGACY_TOP_ALIGN_EPSILON) {
        return {
            ...object,
            y: object.y + 0.5,
        };
    }
    if (object.type === 'POST_FX_TRIGGER' &&
        Math.abs(object.w - 1.5) <= 0.001 &&
        Math.abs(object.h - 1.5) <= 0.001) {
        return {
            ...object,
            x: object.x + 0.25,
            y: object.y + 0.25,
            w: 1,
            h: 1,
        };
    }
    return object;
}
export function stripLegacyRunAnchorObjects(objects) {
    return objects
        .filter((object) => !isLegacyRunAnchorObjectType(object.type))
        .map((object) => normalizeObjectPlacement(object));
}
export function computeAutoLevelFinishX(levelData) {
    const maxContinuationX = levelData.objects.reduce((maxX, object) => {
        if (autoFinishIgnoredObjectTypes.has(object.type)) {
            return maxX;
        }
        return Math.max(maxX, object.x + object.w);
    }, FIXED_LEVEL_START_X);
    return Math.max(FIXED_LEVEL_START_X + AUTO_LEVEL_FINISH_PADDING_UNITS, Math.ceil(maxContinuationX + AUTO_LEVEL_FINISH_PADDING_UNITS));
}
export function getObjectPaintGroupId(object) {
    const rawGroupId = object?.props.paintGroupId;
    const numericGroupId = typeof rawGroupId === 'number'
        ? rawGroupId
        : typeof rawGroupId === 'string'
            ? Number(rawGroupId)
            : NaN;
    return Number.isInteger(numericGroupId) && numericGroupId > 0 ? numericGroupId : null;
}
export function getColorGroupById(colorGroups, groupId) {
    if (!groupId || !colorGroups?.length) {
        return null;
    }
    return colorGroups.find((group) => group.id === groupId) ?? null;
}
export function getObjectFillColor(object, colorGroups) {
    const linkedGroup = getColorGroupById(colorGroups, getObjectPaintGroupId(object));
    if (linkedGroup) {
        return linkedGroup.fillColor;
    }
    const customFillColor = object.props.fillColor;
    return typeof customFillColor === 'string' && customFillColor.trim().length > 0
        ? customFillColor
        : levelObjectDefinitions[object.type].color;
}
export function getObjectStrokeColor(object, colorGroups) {
    const linkedGroup = getColorGroupById(colorGroups, getObjectPaintGroupId(object));
    if (linkedGroup) {
        return linkedGroup.strokeColor;
    }
    const customStrokeColor = object.props.strokeColor;
    return typeof customStrokeColor === 'string' && customStrokeColor.trim().length > 0
        ? customStrokeColor
        : levelObjectDefinitions[object.type].strokeColor;
}
function makeObject(id, type, x, y) {
    const definition = levelObjectDefinitions[type];
    return {
        id,
        type,
        x,
        y,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        rotation: 0,
        layer: isDecorationObjectType(type) ? 'decoration' : 'gameplay',
        editorLayer: 1,
        props: {},
    };
}
export function createEmptyLevelData(theme = 'neon-grid') {
    return {
        meta: {
            gridSize: 32,
            lengthUnits: 120,
            theme,
            background: 'default',
            music: 'placeholder-track-01',
            musicOffsetMs: 0,
            version: 1,
            colorGroups: [],
        },
        player: {
            startX: FIXED_LEVEL_START_X,
            startY: FIXED_LEVEL_START_Y,
            mode: 'cube',
            baseSpeed: 1,
            gravity: 1,
        },
        objects: [],
        finish: {
            x: FIXED_LEVEL_START_X + AUTO_LEVEL_FINISH_PADDING_UNITS,
            y: FIXED_LEVEL_START_Y,
        },
    };
}
