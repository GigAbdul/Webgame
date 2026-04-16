import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, FieldLabel, Input, Panel, Select, Textarea } from '../../components/ui';
import { BASE_HORIZONTAL_SPEED, GameCanvas, buildPreviewBootstrap } from '../game/game-canvas';
import { FIXED_LEVEL_START_X, FIXED_LEVEL_START_Y, computeAutoLevelFinishX, PAINT_GROUP_SLOT_COUNT, createEmptyLevelData, getColorGroupById, getObjectFillColor, getObjectPaintGroupId, getSpikeHitboxRect, getObjectStrokeColor, isPaintableObjectType, isSpikeObjectType, isSawObjectType, stripLegacyRunAnchorObjects, isTriggerObjectType, levelObjectDefinitions, } from '../game/object-definitions';
import { readStoredMusicVolume, resolveLevelMusic } from '../game/level-music';
import { drawStageObjectSprite, getStageObjectPreviewSpriteImage } from '../game/object-renderer';
import { getPlayerHitboxLayout } from '../game/player-physics';
import { SHIP_FLIGHT_CEILING_Y, SHIP_FLIGHT_FLOOR_Y, getPlayerModeLabel } from '../game/player-mode-config';
import { getDefaultStageGroundColor, getStageGroundPalette, getStageThemePalette } from '../game/stage-theme-palette';
import { readLocalEditorDraft, writeLocalEditorDraft } from './local-draft-storage';
import { cn } from '../../utils/cn';
function getTriggerSetupTitle(type) {
    switch (type) {
        case 'MOVE_TRIGGER':
            return 'Setup Move Command';
        case 'ALPHA_TRIGGER':
            return 'Setup Alpha Trigger';
        case 'TOGGLE_TRIGGER':
            return 'Setup Toggle Trigger';
        case 'PULSE_TRIGGER':
            return 'Setup Pulse Trigger';
        case 'POST_FX_TRIGGER':
            return 'Setup Post FX Trigger';
        default:
            return 'Trigger Setup';
    }
}
function getDefaultTriggerDurationMs(type) {
    return type === 'MOVE_TRIGGER' ? 650 : 900;
}
function EditorStageBackIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--back", "aria-hidden": "true", children: [_jsx("path", { d: "M38 16 19 32l19 16", fill: "none", stroke: "#fffbe7", strokeWidth: "8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M22 32h24", fill: "none", stroke: "#fffbe7", strokeWidth: "8", strokeLinecap: "round" })] }));
}
function EditorStageUndoIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--undo", "aria-hidden": "true", children: [_jsx("path", { d: "M27 20H16v11", fill: "none", stroke: "#d7f1ff", strokeWidth: "7", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M18 30c3-8 10-12 19-12 9 0 15 5 15 14 0 8-6 14-15 14h-8", fill: "none", stroke: "#d7f1ff", strokeWidth: "7", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function EditorStageRedoIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--redo", "aria-hidden": "true", children: [_jsx("path", { d: "M37 20h11v11", fill: "none", stroke: "#d7e5ff", strokeWidth: "7", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M46 30c-3-8-10-12-19-12-9 0-15 5-15 14 0 8 6 14 15 14h8", fill: "none", stroke: "#d7e5ff", strokeWidth: "7", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function EditorStageTrashIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--trash", "aria-hidden": "true", children: [_jsx("path", { d: "M24 16h16l2 5H22l2-5Z", fill: "#f2f4f8", stroke: "#1e2635", strokeWidth: "3.5", strokeLinejoin: "round" }), _jsx("path", { d: "M20 21h24v28c0 2.8-2.2 5-5 5H25c-2.8 0-5-2.2-5-5V21Z", fill: "#d8dde6", stroke: "#1e2635", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("path", { d: "M27 27v19M32 27v19M37 27v19", fill: "none", stroke: "#1e2635", strokeWidth: "4", strokeLinecap: "round" }), _jsx("path", { d: "M17 21h30", fill: "none", stroke: "#1e2635", strokeWidth: "4.5", strokeLinecap: "round" })] }));
}
function EditorStageMusicIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--music", "aria-hidden": "true", children: [_jsx("path", { d: "M16 14 47 32 16 50Z", fill: "#ffd44a", stroke: "#172242", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("path", { d: "M31 23v16.5c0 3-2.5 5.5-5.5 5.5S20 42.5 20 39.5 22.5 34 25.5 34c1.2 0 2.3.3 3.2.9V25.6l11-2.7v12.6c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5S31.2 30 34.2 30c1.1 0 2.1.3 3 .8v-5.4L31 27Z", fill: "#f8fbff", stroke: "#14315f", strokeWidth: "2", strokeLinejoin: "round" })] }));
}
function EditorStageTestPlayIcon() {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--test", "aria-hidden": "true", children: [_jsx("path", { d: "M18 14 48 32 18 50Z", fill: "#ffd44a", stroke: "#172242", strokeWidth: "4", strokeLinejoin: "round" }), _jsx("rect", { x: "13", y: "25", width: "13", height: "13", rx: "2.5", fill: "#d7dde7", stroke: "#172242", strokeWidth: "3.5" })] }));
}
function EditorStageZoomIcon({ mode }) {
    return (_jsxs("svg", { viewBox: "0 0 64 64", className: "editor-stage-icon editor-stage-icon--zoom", "aria-hidden": "true", children: [_jsx("circle", { cx: "27", cy: "27", r: "15", fill: "none", stroke: "#fffbe7", strokeWidth: "7" }), _jsx("path", { d: "M38 38l12 12", fill: "none", stroke: "#fffbe7", strokeWidth: "7", strokeLinecap: "round" }), _jsx("path", { d: "M20 27h14", fill: "none", stroke: "#173300", strokeWidth: "6", strokeLinecap: "round" }), mode === 'in' ? _jsx("path", { d: "M27 20v14", fill: "none", stroke: "#173300", strokeWidth: "6", strokeLinecap: "round" }) : null] }));
}
const themePresets = [
    { value: 'neon-grid', label: 'Neon Grid' },
    { value: 'cyber-night', label: 'Cyber Night' },
    { value: 'sunset-burn', label: 'Sunset Burn' },
    { value: 'acid-void', label: 'Acid Void' },
    { value: 'deep-space', label: 'Deep Space' },
];
const postFxEffectOptions = [
    { value: 'flash', label: 'Flash' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'invert', label: 'Invert' },
    { value: 'scanlines', label: 'Scanlines' },
    { value: 'blur', label: 'Blur' },
    { value: 'shake', label: 'Shake' },
    { value: 'tint', label: 'Tint Wash' },
];
const triggerActivationModeOptions = [
    { value: 'zone', label: 'Cross Line' },
    { value: 'touch', label: 'Touch Object' },
];
const moveTriggerEasingOptions = [
    { value: 'none', label: 'None' },
    { value: 'easeIn', label: 'Ease In' },
    { value: 'easeOut', label: 'Ease Out' },
    { value: 'easeInOut', label: 'Ease In Out' },
];
const editorSolidHitboxTypes = new Set([
    'GROUND_BLOCK',
    'HALF_GROUND_BLOCK',
    'PLATFORM_BLOCK',
    'HALF_PLATFORM_BLOCK',
]);
const editorOrbHitboxTypes = new Set(['JUMP_ORB', 'BLUE_ORB', 'GRAVITY_ORB']);
const editorPortalHitboxTypes = new Set([
    'GRAVITY_PORTAL',
    'SPEED_PORTAL',
    'SHIP_PORTAL',
    'BALL_PORTAL',
    'CUBE_PORTAL',
    'ARROW_PORTAL',
    'FINISH_PORTAL',
]);
const paletteGroups = [
    { title: 'Controls', items: ['select', 'pan'] },
    {
        title: 'Blocks',
        items: [
            'GROUND_BLOCK',
            'HALF_GROUND_BLOCK',
            'PLATFORM_BLOCK',
            'HALF_PLATFORM_BLOCK',
            'ARROW_RAMP_ASC',
            'ARROW_RAMP_DESC',
            'DECORATION_BLOCK',
        ],
    },
    { title: 'Helpers', items: ['DASH_BLOCK'] },
    {
        title: 'Obstacles',
        items: [
            'SPIKE',
            'SPIKE_FLAT',
            'SPIKE_SMALL',
            'SPIKE_TINY',
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
        ],
    },
    { title: 'Boosts', items: ['JUMP_PAD', 'JUMP_ORB', 'BLUE_ORB', 'GRAVITY_ORB'] },
    {
        title: 'Portals',
        items: ['GRAVITY_PORTAL', 'SPEED_PORTAL', 'SHIP_PORTAL', 'BALL_PORTAL', 'CUBE_PORTAL', 'ARROW_PORTAL'],
    },
    { title: 'Triggers', items: ['MOVE_TRIGGER', 'ALPHA_TRIGGER', 'TOGGLE_TRIGGER', 'PULSE_TRIGGER', 'POST_FX_TRIGGER'] },
    { title: 'Preview', items: ['START_POS'] },
];
const desktopPaletteGroups = paletteGroups.filter((group) => group.title !== 'Controls');
const toolDescriptions = {
    select: 'Pick, move and inspect objects',
    pan: 'Hold Space or drag to move around',
    GROUND_BLOCK: 'Safe floor for the run',
    HALF_GROUND_BLOCK: 'Half-height floor piece',
    PLATFORM_BLOCK: 'Extra landable block',
    HALF_PLATFORM_BLOCK: 'Half-height platform piece',
    ARROW_RAMP_ASC: 'Diagonal wall for arrow routes',
    ARROW_RAMP_DESC: 'Opposite diagonal wall for arrow routes',
    DASH_BLOCK: 'Editor-only safe zone for arrow contact on floor and ceiling blocks',
    SPIKE: 'Primary hazard',
    SPIKE_FLAT: 'Wide low-profile spike',
    SPIKE_SMALL: 'Compact spike hazard',
    SPIKE_TINY: 'Tiny spike hazard',
    SAW_BLADE: 'Small circular saw',
    SAW_BLADE_MEDIUM: 'Medium circular saw',
    SAW_BLADE_LARGE: 'Large circular saw',
    SAW_STAR: 'Small star-shaped saw',
    SAW_STAR_MEDIUM: 'Medium star-shaped saw',
    SAW_STAR_LARGE: 'Large star-shaped saw',
    SAW_GEAR: 'Small gear saw',
    SAW_GEAR_MEDIUM: 'Medium gear saw',
    SAW_GEAR_LARGE: 'Large gear saw',
    SAW_GLOW: 'Small glow saw',
    SAW_GLOW_MEDIUM: 'Medium glow saw',
    SAW_GLOW_LARGE: 'Large glow saw',
    JUMP_PAD: 'Forces an upward bounce',
    JUMP_ORB: 'Mid-air extra jump',
    BLUE_ORB: 'Flips gravity without giving a jump boost',
    GRAVITY_ORB: 'Flips gravity, then launches the player in the new direction',
    GRAVITY_PORTAL: 'Flips gravity',
    SPEED_PORTAL: 'Changes run speed',
    SHIP_PORTAL: 'Switches into ship mode',
    BALL_PORTAL: 'Switches into ball mode',
    CUBE_PORTAL: 'Returns to cube mode',
    ARROW_PORTAL: 'Switches into arrow mode',
    FINISH_PORTAL: 'Legacy finish marker',
    MOVE_TRIGGER: 'Moves a paint group during the run',
    ALPHA_TRIGGER: 'Changes group opacity',
    TOGGLE_TRIGGER: 'Shows or hides a group',
    PULSE_TRIGGER: 'Pulses a group color for a short burst',
    POST_FX_TRIGGER: 'Applies fullscreen post-processing effects during the run',
    DECORATION_BLOCK: 'Visual block only',
    START_MARKER: 'Legacy spawn point',
    START_POS: 'Preview checkpoint for editor testing',
};
const EDITOR_CANVAS_WIDTH = 1180;
const EDITOR_CANVAS_HEIGHT = 560;
const EDITOR_CANVAS_ASPECT_RATIO = EDITOR_CANVAS_WIDTH / EDITOR_CANVAS_HEIGHT;
const EDITOR_DEFAULT_PAN_X = 60;
const EDITOR_DEFAULT_PAN_Y = 80;
const EDITOR_SCROLL_PADDING_UNITS = 6;
const MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_EDITOR_HISTORY_STEPS = 40;
function syncDerivedLevelData(next) {
    next.objects = stripLegacyRunAnchorObjects(next.objects);
    next.player.startX = FIXED_LEVEL_START_X;
    next.player.startY = FIXED_LEVEL_START_Y;
    for (const object of next.objects) {
        object.editorLayer = object.editorLayer === 2 ? 2 : 1;
    }
    const autoFinishX = computeAutoLevelFinishX(next);
    next.finish = {
        x: autoFinishX,
        y: FIXED_LEVEL_START_Y,
    };
    const maxX = Math.max(autoFinishX + 6, ...next.objects.map((object) => object.x + object.w + 12));
    next.meta.lengthUnits = Math.max(60, Math.ceil(maxX));
    return next;
}
function getPaletteGroupTitle(tool) {
    return paletteGroups.find((group) => group.items.includes(tool))?.title ?? 'Blocks';
}
function getPaletteGroupButtonLabel(title) {
    switch (title) {
        case 'Controls':
            return 'Ctrl';
        case 'Helpers':
            return 'Helper';
        case 'Obstacles':
            return 'Hazards';
        case 'Boosts':
            return 'Boost';
        case 'Portals':
            return 'Portal';
        case 'Triggers':
            return 'Trigger';
        case 'Preview':
            return 'Start Pos';
        default:
            return title;
    }
}
function getDesktopPalettePreviewTool(groupTitle) {
    switch (groupTitle) {
        case 'Blocks':
            return 'GROUND_BLOCK';
        case 'Helpers':
            return 'DASH_BLOCK';
        case 'Obstacles':
            return 'SPIKE';
        case 'Boosts':
            return 'JUMP_PAD';
        case 'Portals':
            return 'GRAVITY_PORTAL';
        case 'Triggers':
            return 'MOVE_TRIGGER';
        case 'Preview':
            return 'START_POS';
        default:
            return 'GROUND_BLOCK';
    }
}
function canUseDragPlacementTool(tool) {
    return (tool !== 'select' &&
        tool !== 'pan' &&
        tool !== 'START_MARKER' &&
        tool !== 'START_POS' &&
        tool !== 'FINISH_PORTAL' &&
        tool !== 'MOVE_TRIGGER' &&
        tool !== 'ALPHA_TRIGGER' &&
        tool !== 'TOGGLE_TRIGGER' &&
        tool !== 'PULSE_TRIGGER' &&
        tool !== 'POST_FX_TRIGGER');
}
function getPlacementStrokeKey(type, x, y, editorLayer) {
    return `${editorLayer}:${type}:${x}:${y}`;
}
function getDefaultPlacementPosition(type, x, y) {
    const definition = levelObjectDefinitions[type];
    if (type === 'JUMP_PAD') {
        return {
            x,
            y: y + Math.max(0, 1 - definition.defaultSize.h),
        };
    }
    if (isSpikeObjectType(type)) {
        return {
            x: x + Math.max(0, (1 - definition.defaultSize.w) / 2),
            y: y + Math.max(0, 1 - definition.defaultSize.h),
        };
    }
    if (isSawObjectType(type) && (definition.defaultSize.w < 1 || definition.defaultSize.h < 1)) {
        return {
            x: x + Math.max(0, (1 - definition.defaultSize.w) / 2),
            y: y + Math.max(0, (1 - definition.defaultSize.h) / 2),
        };
    }
    return { x, y };
}
function isHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}
function getEditorColorInputValue(value, fallback) {
    return isHexColor(value) ? value : fallback;
}
function parseEditorHexColor(value) {
    const normalized = value.trim().replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        return null;
    }
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}
function toEditorHexColor(color) {
    return `#${[color.r, color.g, color.b]
        .map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0'))
        .join('')}`;
}
function rgbToHsv(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        }
        else if (max === g) {
            hue = 60 * ((b - r) / delta + 2);
        }
        else {
            hue = 60 * ((r - g) / delta + 4);
        }
    }
    return {
        h: (hue + 360) % 360,
        s: max === 0 ? 0 : delta / max,
        v: max,
    };
}
function hsvToRgb(color) {
    const hue = ((color.h % 360) + 360) % 360;
    const saturation = clamp(color.s, 0, 2);
    const value = clamp(color.v, 0, 2);
    const chroma = value * saturation;
    const segment = hue / 60;
    const x = chroma * (1 - Math.abs((segment % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;
    if (segment >= 0 && segment < 1) {
        r = chroma;
        g = x;
    }
    else if (segment < 2) {
        r = x;
        g = chroma;
    }
    else if (segment < 3) {
        g = chroma;
        b = x;
    }
    else if (segment < 4) {
        g = x;
        b = chroma;
    }
    else if (segment < 5) {
        r = x;
        b = chroma;
    }
    else {
        r = chroma;
        b = x;
    }
    const match = value - chroma;
    return {
        r: Math.round((r + match) * 255),
        g: Math.round((g + match) * 255),
        b: Math.round((b + match) * 255),
    };
}
function applyHsvToHex(value, hsvState) {
    const parsed = parseEditorHexColor(value);
    if (!parsed) {
        return value;
    }
    const base = rgbToHsv(parsed);
    return toEditorHexColor(hsvToRgb({
        h: base.h + hsvState.hue,
        s: base.s * hsvState.saturation,
        v: base.v * hsvState.brightness,
    }));
}
function isDirectMusicSource(value) {
    return (value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/') ||
        value.startsWith('blob:') ||
        value.startsWith('data:audio/'));
}
function getInitialMusicUrlInput(music) {
    return isDirectMusicSource(music) && !music.startsWith('data:audio/') ? music : '';
}
function inferMusicLabel(source) {
    const trimmedSource = source.trim();
    if (!trimmedSource) {
        return 'Custom Track';
    }
    if (trimmedSource.startsWith('data:audio/')) {
        return 'Uploaded Track';
    }
    const lastSegment = trimmedSource.split('/').pop() ?? trimmedSource;
    return decodeURIComponent(lastSegment) || 'Custom Track';
}
function createInitialEditorState(initialLevel, draftStorageKey) {
    const localDraft = readLocalEditorDraft(draftStorageKey);
    if (localDraft) {
        return {
            title: localDraft.title,
            description: localDraft.description,
            theme: localDraft.theme,
            levelData: syncDerivedLevelData(structuredClone(localDraft.dataJson)),
            restoredFromLocal: true,
        };
    }
    const baseLevelData = initialLevel?.dataJson
        ? syncDerivedLevelData(structuredClone(initialLevel.dataJson))
        : createEmptyLevelData(initialLevel?.theme ?? 'neon-grid');
    return {
        title: initialLevel?.title ?? 'Untitled Level',
        description: initialLevel?.description ?? '',
        theme: initialLevel?.theme ?? 'neon-grid',
        levelData: baseLevelData,
        restoredFromLocal: false,
    };
}
export function LevelEditor({ initialLevel, draftStorageKey, saveLabel = 'Save Draft', onClose, onSave, onSubmit, }) {
    const initialEditorState = useMemo(() => createInitialEditorState(initialLevel, draftStorageKey), [initialLevel, draftStorageKey]);
    const [title, setTitle] = useState(initialEditorState.title);
    const [description, setDescription] = useState(initialEditorState.description);
    const [theme, setTheme] = useState(initialEditorState.theme);
    const [levelData, setLevelData] = useState(initialEditorState.levelData);
    const [history, setHistory] = useState([initialEditorState.levelData]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [selectedTool, setSelectedTool] = useState('select');
    const [selectedObjectId, setSelectedObjectId] = useState(null);
    const [selectedObjectIds, setSelectedObjectIds] = useState([]);
    const [dragPreviewState, setDragPreviewState] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const [activePaletteGroup, setActivePaletteGroup] = useState('Blocks');
    const [paletteDrawerGroup, setPaletteDrawerGroup] = useState(null);
    const [placementMode, setPlacementMode] = useState('single');
    const [editorWorkspaceMode, setEditorWorkspaceMode] = useState('build');
    const [hasLayerTwo, setHasLayerTwo] = useState(initialEditorState.levelData.objects.some((object) => object.editorLayer === 2));
    const [activeEditorLayer, setActiveEditorLayer] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
    const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
    const [canvasViewport, setCanvasViewport] = useState({ width: EDITOR_CANVAS_WIDTH, height: EDITOR_CANVAS_HEIGHT });
    const [showPreview, setShowPreview] = useState(false);
    const [isInlineTestMode, setIsInlineTestMode] = useState(false);
    const [inlineTestRunSeed, setInlineTestRunSeed] = useState(0);
    const [inlineTestDeathMarker, setInlineTestDeathMarker] = useState(null);
    const [inlineTestPathPoints, setInlineTestPathPoints] = useState([]);
    const [inlineTestStopSignal, setInlineTestStopSignal] = useState(0);
    const [inlineTestShowTriggersOnPlayMode, setInlineTestShowTriggersOnPlayMode] = useState(false);
    const [editorShowHitboxes, setEditorShowHitboxes] = useState(false);
    const [isMusicSyncPreviewActive, setIsMusicSyncPreviewActive] = useState(false);
    const [musicSyncPreviewElapsedMs, setMusicSyncPreviewElapsedMs] = useState(0);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [isMobileSettingsExpanded, setIsMobileSettingsExpanded] = useState(false);
    const [showDesktopSetup, setShowDesktopSetup] = useState(false);
    const [isEditorPauseMenuOpen, setIsEditorPauseMenuOpen] = useState(false);
    const [previewRunSeed, setPreviewRunSeed] = useState(0);
    const [isPaintPopupOpen, setIsPaintPopupOpen] = useState(false);
    const [isTriggerPopupOpen, setIsTriggerPopupOpen] = useState(false);
    const [isPaintHsvPopupOpen, setIsPaintHsvPopupOpen] = useState(false);
    const [paintHsvState, setPaintHsvState] = useState({
        hue: 0,
        saturation: 1,
        brightness: 1,
    });
    const [activePaintGroupId, setActivePaintGroupId] = useState(null);
    const [musicUrlInput, setMusicUrlInput] = useState(() => getInitialMusicUrlInput(initialEditorState.levelData.meta.music));
    const [musicLabelInput, setMusicLabelInput] = useState(initialEditorState.levelData.meta.musicLabel ?? '');
    const [saveState, setSaveState] = useState('idle');
    const [message, setMessage] = useState(initialEditorState.restoredFromLocal ? 'Local draft restored.' : '');
    const paintHsvBaseColorsRef = useRef(null);
    const canvasRef = useRef(null);
    const stageFrameRef = useRef(null);
    const settingsPanelRef = useRef(null);
    const dragRef = useRef(null);
    const isSpacePressedRef = useRef(false);
    const liveLevelDataRef = useRef(levelData);
    const dragPreviewStateRef = useRef(null);
    const touchPointsRef = useRef(new Map());
    const touchGestureRef = useRef(null);
    const paintStrokeCellsRef = useRef(new Set());
    const paintStrokeDirtyRef = useRef(false);
    const musicSyncAudioRef = useRef(null);
    const musicSyncFrameRef = useRef(null);
    const loadedDraftStorageKeyRef = useRef(draftStorageKey);
    useEffect(() => {
        if (loadedDraftStorageKeyRef.current === draftStorageKey) {
            return;
        }
        loadedDraftStorageKeyRef.current = draftStorageKey;
        const nextEditorState = createInitialEditorState(initialLevel, draftStorageKey);
        setTitle(nextEditorState.title);
        setDescription(nextEditorState.description);
        setTheme(nextEditorState.theme);
        setLevelData(nextEditorState.levelData);
        setHistory([nextEditorState.levelData]);
        setHistoryIndex(0);
        setSelectedTool('select');
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        setSelectionBox(null);
        setActivePaletteGroup('Blocks');
        setPaletteDrawerGroup(null);
        setEditorWorkspaceMode('build');
        setHasLayerTwo(nextEditorState.levelData.objects.some((object) => object.editorLayer === 2));
        setActiveEditorLayer(1);
        setZoom(1);
        setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
        setCursorWorld({ x: 0, y: 0 });
        setShowPreview(false);
        setIsInlineTestMode(false);
        setInlineTestRunSeed(0);
        setInlineTestDeathMarker(null);
        setInlineTestPathPoints([]);
        setInlineTestStopSignal(0);
        setInlineTestShowTriggersOnPlayMode(false);
        if (musicSyncFrameRef.current !== null) {
            window.cancelAnimationFrame(musicSyncFrameRef.current);
            musicSyncFrameRef.current = null;
        }
        if (musicSyncAudioRef.current) {
            musicSyncAudioRef.current.pause();
            musicSyncAudioRef.current.src = '';
            musicSyncAudioRef.current = null;
        }
        setIsMusicSyncPreviewActive(false);
        setMusicSyncPreviewElapsedMs(0);
        setShowDesktopSetup(false);
        setIsEditorPauseMenuOpen(false);
        setPreviewRunSeed(0);
        setIsPaintPopupOpen(false);
        setIsTriggerPopupOpen(false);
        setIsPaintHsvPopupOpen(false);
        setPaintHsvState({ hue: 0, saturation: 1, brightness: 1 });
        paintHsvBaseColorsRef.current = null;
        setActivePaintGroupId(null);
        setMusicUrlInput(getInitialMusicUrlInput(nextEditorState.levelData.meta.music));
        setMusicLabelInput(nextEditorState.levelData.meta.musicLabel ?? '');
        setSaveState('idle');
        setMessage(nextEditorState.restoredFromLocal ? 'Local draft restored.' : '');
    }, [draftStorageKey, initialLevel]);
    useEffect(() => {
        liveLevelDataRef.current = levelData;
    }, [levelData]);
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const mediaQuery = window.matchMedia('(max-width: 860px), (pointer: coarse)');
        const syncMobileLayout = () => {
            setIsMobileLayout(mediaQuery.matches);
        };
        syncMobileLayout();
        mediaQuery.addEventListener('change', syncMobileLayout);
        return () => {
            mediaQuery.removeEventListener('change', syncMobileLayout);
        };
    }, []);
    useEffect(() => {
        document.body.classList.toggle('editor-mobile-preview-open', showPreview);
        return () => {
            document.body.classList.remove('editor-mobile-preview-open');
        };
    }, [showPreview]);
    useEffect(() => {
        return () => {
            if (musicSyncFrameRef.current !== null) {
                window.cancelAnimationFrame(musicSyncFrameRef.current);
            }
            if (musicSyncAudioRef.current) {
                musicSyncAudioRef.current.pause();
                musicSyncAudioRef.current.src = '';
            }
        };
    }, []);
    const applySelection = useCallback((nextIds, nextPrimaryId) => {
        const uniqueIds = [...new Set(nextIds)];
        const primaryId = nextPrimaryId && uniqueIds.includes(nextPrimaryId)
            ? nextPrimaryId
            : uniqueIds[0] ?? null;
        setSelectedObjectIds(uniqueIds);
        setSelectedObjectId(primaryId);
    }, []);
    const clearSelection = useCallback(() => {
        applySelection([], null);
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        setSelectionBox(null);
    }, [applySelection]);
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            writeLocalEditorDraft(draftStorageKey, {
                title,
                description,
                theme,
                dataJson: levelData,
                levelId: initialLevel?.id ?? null,
            });
        }, 1200);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [description, draftStorageKey, initialLevel?.id, levelData, theme, title]);
    const selectedObject = useMemo(() => {
        const baseObject = levelData.objects.find((object) => object.id === selectedObjectId) ?? null;
        if (!baseObject) {
            return null;
        }
        const previewPosition = dragPreviewState?.positions[baseObject.id];
        if (previewPosition) {
            return {
                ...baseObject,
                x: previewPosition.x,
                y: previewPosition.y,
            };
        }
        return baseObject;
    }, [dragPreviewState, levelData.objects, selectedObjectId]);
    const selectedObjectIdSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
    const selectedObjects = useMemo(() => levelData.objects.filter((object) => selectedObjectIdSet.has(object.id)).map((object) => {
        const previewPosition = dragPreviewState?.positions[object.id];
        if (previewPosition) {
            return {
                ...object,
                x: previewPosition.x,
                y: previewPosition.y,
            };
        }
        return object;
    }), [dragPreviewState, levelData.objects, selectedObjectIdSet]);
    const selectedDefinition = useMemo(() => (selectedObject ? levelObjectDefinitions[selectedObject.type] : null), [selectedObject]);
    const activeToolDescription = toolDescriptions[selectedTool];
    const activeToolLabel = selectedTool === 'select' ? 'Select' : selectedTool === 'pan' ? 'Pan' : levelObjectDefinitions[selectedTool].label;
    const paletteDrawer = useMemo(() => paletteGroups.find((group) => group.title === paletteDrawerGroup) ?? null, [paletteDrawerGroup]);
    const stageThemePalette = useMemo(() => getStageThemePalette(theme), [theme]);
    const resolvedGroundColor = useMemo(() => getStageGroundPalette(theme, levelData.meta.groundColor).base, [levelData.meta.groundColor, theme]);
    const colorGroups = useMemo(() => levelData.meta.colorGroups ?? [], [levelData.meta.colorGroups]);
    const resolvedMusic = useMemo(() => resolveLevelMusic(levelData.meta), [levelData.meta]);
    const selectionLabel = selectedObjects.length > 1
        ? `${selectedObjects.length} objects`
        : selectedObject
            ? selectedDefinition?.label ?? selectedObject.type
            : 'Nothing selected';
    const paintableSelectedObject = selectedObject && isPaintableObjectType(selectedObject.type) ? selectedObject : null;
    const paintableSelectedObjects = useMemo(() => selectedObjects.filter((object) => isPaintableObjectType(object.type)), [selectedObjects]);
    const selectedTriggerObject = selectedObjects.length === 1 && selectedObject && isTriggerObjectType(selectedObject.type) ? selectedObject : null;
    const selectedPaintGroupTriggerObject = selectedTriggerObject && selectedTriggerObject.type !== 'POST_FX_TRIGGER' ? selectedTriggerObject : null;
    const selectedPaintGroupId = getObjectPaintGroupId(paintableSelectedObject);
    const selectedPaintFillColor = paintableSelectedObject
        ? getObjectFillColor(paintableSelectedObject, colorGroups)
        : '#ffffff';
    const selectedPaintStrokeColor = paintableSelectedObject
        ? getObjectStrokeColor(paintableSelectedObject, colorGroups)
        : '#ffffff';
    const normalizedSelectedRotation = normalizeQuarterRotation(selectedObject?.rotation ?? 0);
    const activePaintTool = selectedTool !== 'select' && selectedTool !== 'pan' && isPaintableObjectType(selectedTool) ? selectedTool : null;
    const canOpenPaintPopup = Boolean(paintableSelectedObjects.length > 0 || activePaintTool);
    const canOpenSelectedObjectPaintPopup = paintableSelectedObjects.length > 0;
    const isSelectedObjectPaintPopupOpen = Boolean(isPaintPopupOpen && paintableSelectedObject);
    const canOpenTriggerPopup = Boolean(selectedTriggerObject);
    const isEditObjectPopupOpen = Boolean(isSelectedObjectPaintPopupOpen || isTriggerPopupOpen);
    const nextFreePaintGroupId = useMemo(() => {
        const occupiedIds = new Set((levelData.meta.colorGroups ?? []).map((group) => group.id));
        for (const object of levelData.objects) {
            const groupId = getObjectPaintGroupId(object);
            if (groupId) {
                occupiedIds.add(groupId);
            }
        }
        for (let groupId = 1; groupId <= PAINT_GROUP_SLOT_COUNT; groupId += 1) {
            if (!occupiedIds.has(groupId)) {
                return groupId;
            }
        }
        return null;
    }, [levelData.meta.colorGroups, levelData.objects]);
    const placementModeLabel = placementMode === 'drag' ? 'Drag' : 'Single';
    const dragPlacementAvailable = canUseDragPlacementTool(selectedTool);
    const activeEditorLayerLabel = `Layer ${activeEditorLayer}`;
    const desktopActivePaletteGroupTitle = desktopPaletteGroups.some((group) => group.title === activePaletteGroup)
        ? activePaletteGroup
        : 'Blocks';
    const desktopPaletteDrawer = desktopPaletteGroups.find((group) => group.title === desktopActivePaletteGroupTitle) ?? desktopPaletteGroups[0] ?? null;
    const trayPaletteGroup = isMobileLayout ? paletteDrawer : desktopPaletteDrawer;
    const desktopPaletteGroupIndex = Math.max(0, desktopPaletteGroups.findIndex((group) => group.title === desktopActivePaletteGroupTitle));
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const historyPosition = `${historyIndex + 1}/${history.length}`;
    const selectionSummary = selectedObjects.length > 1
        ? `${selectedObjects.length} objects selected`
        : selectedObject
            ? `${selectedDefinition?.label ?? selectedObject.type} at ${selectedObject.x}, ${selectedObject.y}`
            : 'No object selected';
    const objectCount = String(levelData.objects.length);
    const saveButtonLabel = saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Retry' : 'Save';
    const musicOffsetMsValue = Math.max(0, Number(levelData.meta.musicOffsetMs ?? 0) || 0);
    const startPosObjects = useMemo(() => levelData.objects.filter((object) => object.type === 'START_POS'), [levelData.objects]);
    const startPosCount = startPosObjects.length;
    const hasStartPositions = startPosCount > 0;
    const activePreviewStartPos = hasStartPositions ? startPosObjects[startPosObjects.length - 1] : null;
    const musicSyncBootstrap = useMemo(() => buildPreviewBootstrap(levelData, activePreviewStartPos
        ? {
            x: activePreviewStartPos.x,
            y: activePreviewStartPos.y,
        }
        : null), [activePreviewStartPos, levelData]);
    const musicSyncPreview = useMemo(() => buildEditorMusicSyncPreview(levelData, musicSyncBootstrap, musicSyncPreviewElapsedMs), [levelData, musicSyncBootstrap, musicSyncPreviewElapsedMs]);
    const stageCell = levelData.meta.gridSize * zoom;
    const visibleStageUnits = canvasViewport.width / stageCell;
    const horizontalScrollMax = Math.max(0, levelData.meta.lengthUnits + EDITOR_SCROLL_PADDING_UNITS - visibleStageUnits);
    const horizontalScrollValue = clamp((EDITOR_DEFAULT_PAN_X - pan.x) / stageCell, 0, horizontalScrollMax);
    const commitLevelData = useCallback((next, options) => {
        const normalized = syncDerivedLevelData(next);
        const shouldPushHistory = options?.pushHistory ?? true;
        if (shouldPushHistory) {
            const trimmedHistory = history.slice(0, historyIndex + 1);
            const nextHistory = [...trimmedHistory, normalized];
            const cappedHistory = nextHistory.length > MAX_EDITOR_HISTORY_STEPS
                ? nextHistory.slice(nextHistory.length - MAX_EDITOR_HISTORY_STEPS)
                : nextHistory;
            setHistory(cappedHistory);
            setHistoryIndex(cappedHistory.length - 1);
        }
        liveLevelDataRef.current = normalized;
        setLevelData(normalized);
    }, [history, historyIndex]);
    useEffect(() => {
        setActivePaletteGroup(getPaletteGroupTitle(selectedTool));
    }, [selectedTool]);
    useEffect(() => {
        if (!paintableSelectedObjects.length && !activePaintTool) {
            setIsPaintPopupOpen(false);
        }
    }, [activePaintTool, paintableSelectedObjects.length]);
    useEffect(() => {
        if (!isPaintPopupOpen || !paintableSelectedObject) {
            setIsPaintHsvPopupOpen(false);
            setPaintHsvState({ hue: 0, saturation: 1, brightness: 1 });
            paintHsvBaseColorsRef.current = null;
        }
    }, [isPaintPopupOpen, paintableSelectedObject]);
    useEffect(() => {
        if (!selectedTriggerObject) {
            setIsTriggerPopupOpen(false);
        }
    }, [selectedTriggerObject]);
    useEffect(() => {
        const availableIds = new Set(levelData.objects.map((object) => object.id));
        const nextIds = selectedObjectIds.filter((id) => availableIds.has(id));
        const nextPrimaryId = selectedObjectId && availableIds.has(selectedObjectId) ? selectedObjectId : nextIds[0] ?? null;
        if (nextIds.length !== selectedObjectIds.length || nextPrimaryId !== selectedObjectId) {
            applySelection(nextIds, nextPrimaryId);
        }
    }, [applySelection, levelData.objects, selectedObjectId, selectedObjectIds]);
    useEffect(() => {
        if (activePaintGroupId && !getColorGroupById(colorGroups, activePaintGroupId)) {
            setActivePaintGroupId(null);
        }
    }, [activePaintGroupId, colorGroups]);
    useEffect(() => {
        if (!hasLayerTwo && activeEditorLayer !== 1) {
            setActiveEditorLayer(1);
        }
    }, [activeEditorLayer, hasLayerTwo]);
    const stopMusicSyncPreview = useCallback((nextMessage) => {
        if (musicSyncFrameRef.current !== null) {
            window.cancelAnimationFrame(musicSyncFrameRef.current);
            musicSyncFrameRef.current = null;
        }
        if (musicSyncAudioRef.current) {
            musicSyncAudioRef.current.pause();
            musicSyncAudioRef.current.src = '';
            musicSyncAudioRef.current = null;
        }
        setIsMusicSyncPreviewActive(false);
        setMusicSyncPreviewElapsedMs(0);
        if (nextMessage) {
            setMessage(nextMessage);
        }
    }, []);
    const launchMusicSyncPreview = useCallback((forceRestart = false) => {
        if (!resolvedMusic.src) {
            setMessage('Attach a music track first, then start the sync preview.');
            return;
        }
        if (isMusicSyncPreviewActive && !forceRestart) {
            stopMusicSyncPreview('Music sync preview stopped.');
            return;
        }
        if (musicSyncFrameRef.current !== null) {
            window.cancelAnimationFrame(musicSyncFrameRef.current);
            musicSyncFrameRef.current = null;
        }
        if (musicSyncAudioRef.current) {
            musicSyncAudioRef.current.pause();
            musicSyncAudioRef.current.src = '';
            musicSyncAudioRef.current = null;
        }
        setShowPreview(false);
        setShowDesktopSetup(false);
        setMusicSyncPreviewElapsedMs(0);
        setIsMusicSyncPreviewActive(true);
        const nextAudio = new Audio(resolvedMusic.src);
        const playbackStartMs = Math.max(0, musicOffsetMsValue + musicSyncBootstrap.elapsedMs);
        nextAudio.preload = 'auto';
        nextAudio.volume = readStoredMusicVolume();
        musicSyncAudioRef.current = nextAudio;
        const syncPlaybackTime = () => {
            if (musicSyncAudioRef.current !== nextAudio) {
                return;
            }
            const elapsedMs = Math.max(0, nextAudio.currentTime * 1000 - playbackStartMs);
            setMusicSyncPreviewElapsedMs(elapsedMs);
            musicSyncFrameRef.current = window.requestAnimationFrame(syncPlaybackTime);
        };
        const startPlayback = () => {
            const duration = Number.isFinite(nextAudio.duration) && nextAudio.duration > 0 ? nextAudio.duration : null;
            const safeCurrentTime = duration
                ? Math.min(playbackStartMs / 1000, Math.max(0, duration - 0.05))
                : playbackStartMs / 1000;
            nextAudio.currentTime = Math.max(0, safeCurrentTime);
            void nextAudio
                .play()
                .then(() => {
                if (musicSyncAudioRef.current !== nextAudio) {
                    return;
                }
                syncPlaybackTime();
            })
                .catch(() => {
                stopMusicSyncPreview('The browser could not start the music sync preview.');
            });
        };
        nextAudio.addEventListener('ended', () => {
            if (musicSyncAudioRef.current !== nextAudio) {
                return;
            }
            stopMusicSyncPreview('Music sync preview finished.');
        }, { once: true });
        if (nextAudio.readyState >= 1) {
            startPlayback();
        }
        else {
            nextAudio.addEventListener('loadedmetadata', startPlayback, { once: true });
        }
        setMessage('Music sync preview started.');
    }, [isMusicSyncPreviewActive, musicOffsetMsValue, musicSyncBootstrap.elapsedMs, resolvedMusic.src, stopMusicSyncPreview]);
    const toggleGameplayPreview = useCallback(() => {
        if (isMusicSyncPreviewActive) {
            stopMusicSyncPreview();
        }
        setShowPreview((current) => !current);
    }, [isMusicSyncPreviewActive, stopMusicSyncPreview]);
    const openGameplayPreview = useCallback(() => {
        if (isMusicSyncPreviewActive) {
            stopMusicSyncPreview();
        }
        setShowPreview(true);
        setPreviewRunSeed((current) => current + 1);
    }, [isMusicSyncPreviewActive, stopMusicSyncPreview]);
    useEffect(() => {
        if ((showPreview || isInlineTestMode) && isMusicSyncPreviewActive) {
            stopMusicSyncPreview();
        }
    }, [isInlineTestMode, isMusicSyncPreviewActive, showPreview, stopMusicSyncPreview]);
    useEffect(() => {
        if ((showPreview || isInlineTestMode) && isEditorPauseMenuOpen) {
            setIsEditorPauseMenuOpen(false);
        }
    }, [isEditorPauseMenuOpen, isInlineTestMode, showPreview]);
    useEffect(() => {
        const stageFrame = stageFrameRef.current;
        if (!stageFrame) {
            return;
        }
        const updateViewport = () => {
            const styles = window.getComputedStyle(stageFrame);
            const paddingX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
            const paddingY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
            const availableWidth = Math.max(640, Math.floor(stageFrame.clientWidth - paddingX));
            const availableHeight = Math.max(420, Math.floor(stageFrame.clientHeight - paddingY));
            let nextWidth = availableWidth;
            let nextHeight = Math.floor(nextWidth / EDITOR_CANVAS_ASPECT_RATIO);
            if (nextHeight > availableHeight) {
                nextHeight = availableHeight;
                nextWidth = Math.floor(nextHeight * EDITOR_CANVAS_ASPECT_RATIO);
            }
            setCanvasViewport({
                width: nextWidth,
                height: nextHeight,
            });
        };
        updateViewport();
        const observer = new ResizeObserver(() => {
            updateViewport();
        });
        observer.observe(stageFrame);
        return () => {
            observer.disconnect();
        };
    }, []);
    useEffect(() => {
        const handleKeyDown = (event) => {
            const isEditableTarget = isTextInputLike(event.target);
            const isPreviewGameplayKey = (showPreview || isInlineTestMode) && ['Space', 'ArrowUp', 'KeyW'].includes(event.code);
            if (event.code === 'Space' && !isEditableTarget && !showPreview && !isInlineTestMode) {
                isSpacePressedRef.current = true;
            }
            if (!isEditableTarget && !showPreview && !isInlineTestMode && event.key === 'Escape') {
                event.preventDefault();
                clearSelection();
                setIsEditorPauseMenuOpen((current) => !current);
                return;
            }
            if (isEditableTarget) {
                return;
            }
            if (isPreviewGameplayKey) {
                return;
            }
            if (isEditorPauseMenuOpen) {
                event.preventDefault();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
                event.preventDefault();
                if (historyIndex > 0) {
                    const nextIndex = historyIndex - 1;
                    setSelectionBox(null);
                    dragPreviewStateRef.current = null;
                    setDragPreviewState(null);
                    setHistoryIndex(nextIndex);
                    liveLevelDataRef.current = history[nextIndex];
                    setLevelData(history[nextIndex]);
                }
            }
            if ((event.ctrlKey || event.metaKey) &&
                (event.code === 'KeyY' || (event.shiftKey && event.code === 'KeyZ'))) {
                event.preventDefault();
                if (historyIndex < history.length - 1) {
                    const nextIndex = historyIndex + 1;
                    setSelectionBox(null);
                    dragPreviewStateRef.current = null;
                    setDragPreviewState(null);
                    setHistoryIndex(nextIndex);
                    liveLevelDataRef.current = history[nextIndex];
                    setLevelData(history[nextIndex]);
                }
            }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD' && selectedObject) {
                event.preventDefault();
                const next = structuredClone(liveLevelDataRef.current);
                const selectedIdsSet = new Set(selectedObjectIds);
                const cloneIds = [];
                for (const source of next.objects.filter((object) => selectedIdsSet.has(object.id))) {
                    if (source.type === 'START_MARKER' || source.type === 'FINISH_PORTAL') {
                        continue;
                    }
                    const clone = structuredClone(source);
                    clone.id = `${clone.id}-copy-${Date.now()}-${cloneIds.length}`;
                    clone.x += 1;
                    next.objects.push(clone);
                    cloneIds.push(clone.id);
                }
                if (!cloneIds.length) {
                    return;
                }
                commitLevelData(next);
                applySelection(cloneIds, cloneIds[0]);
            }
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjectIds.length) {
                event.preventDefault();
                const next = structuredClone(liveLevelDataRef.current);
                const selectedIdsSet = new Set(selectedObjectIds);
                next.objects = next.objects.filter((object) => {
                    if (!selectedIdsSet.has(object.id)) {
                        return true;
                    }
                    return object.type === 'START_MARKER' || object.type === 'FINISH_PORTAL';
                });
                commitLevelData(next);
                clearSelection();
            }
            if (!showPreview && !isInlineTestMode && selectedObjectIds.length && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                const delta = {
                    ArrowUp: { x: 0, y: -1 },
                    ArrowDown: { x: 0, y: 1 },
                    ArrowLeft: { x: -1, y: 0 },
                    ArrowRight: { x: 1, y: 0 },
                }[event.key];
                const next = structuredClone(liveLevelDataRef.current);
                const selectedIdsSet = new Set(selectedObjectIds);
                let movedAny = false;
                for (const object of next.objects) {
                    if (!selectedIdsSet.has(object.id)) {
                        continue;
                    }
                    object.x += delta.x;
                    object.y += delta.y;
                    movedAny = true;
                    if (object.type === 'START_MARKER') {
                        next.player.startX = object.x;
                        next.player.startY = object.y;
                    }
                    if (object.type === 'FINISH_PORTAL') {
                        next.finish.x = object.x;
                        next.finish.y = object.y;
                    }
                }
                if (movedAny) {
                    commitLevelData(next);
                }
            }
        };
        const handleKeyUp = (event) => {
            if (event.code === 'Space') {
                isSpacePressedRef.current = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [applySelection, clearSelection, commitLevelData, history, historyIndex, isEditorPauseMenuOpen, isInlineTestMode, selectedObject, selectedObjectIds, showPreview]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const width = canvasViewport.width;
        const height = canvasViewport.height;
        const renderScale = getCanvasRenderScale();
        canvas.width = Math.max(1, Math.floor(width * renderScale));
        canvas.height = Math.max(1, Math.floor(height * renderScale));
        canvas.dataset.logicalWidth = String(width);
        canvas.dataset.logicalHeight = String(height);
        context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        context.imageSmoothingEnabled = true;
        const stageTheme = getStageThemePalette(levelData.meta.theme);
        context.clearRect(0, 0, width, height);
        const backdrop = context.createLinearGradient(0, 0, 0, height);
        backdrop.addColorStop(0, stageTheme.editorGradientTop);
        backdrop.addColorStop(0.6, stageTheme.editorGradientMid);
        backdrop.addColorStop(1, stageTheme.editorGradientBottom);
        context.fillStyle = backdrop;
        context.fillRect(0, 0, width, height);
        const editorGlow = context.createRadialGradient(width * 0.76, height * 0.2, 0, width * 0.76, height * 0.2, width * 0.42);
        editorGlow.addColorStop(0, stageTheme.editorGlowColor);
        editorGlow.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = editorGlow;
        context.fillRect(0, 0, width, height);
        context.fillStyle = stageTheme.editorStarColor;
        for (let index = 0; index < 42; index += 1) {
            const starX = (index * 137.41) % width;
            const starY = (index * 89.73) % (height * 0.82);
            const size = index % 6 === 0 ? 2.4 : index % 3 === 0 ? 1.7 : 1.1;
            context.fillRect(starX, starY, size, size);
        }
        const cell = levelData.meta.gridSize * zoom;
        context.strokeStyle = stageTheme.editorGridLine;
        for (let x = ((pan.x % cell) + cell) % cell; x < width; x += cell) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }
        for (let y = ((pan.y % cell) + cell) % cell; y < height; y += cell) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        if (levelData.player.mode === 'ship') {
            const ceilingY = worldToScreen(0, SHIP_FLIGHT_CEILING_Y, pan.x, pan.y, cell).y;
            const floorY = worldToScreen(0, SHIP_FLIGHT_FLOOR_Y, pan.x, pan.y, cell).y;
            context.fillStyle = 'rgba(5, 10, 28, 0.28)';
            context.fillRect(0, 0, width, Math.max(0, ceilingY));
            context.fillRect(0, floorY, width, Math.max(0, height - floorY));
            context.strokeStyle = 'rgba(202,255,69,0.78)';
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(0, ceilingY);
            context.lineTo(width, ceilingY);
            context.moveTo(0, floorY);
            context.lineTo(width, floorY);
            context.stroke();
        }
        const permanentFloorY = worldToScreen(0, SHIP_FLIGHT_FLOOR_Y, pan.x, pan.y, cell).y;
        drawEditorPermanentStageFloor(context, width, height, permanentFloorY, cell, pan.x, getStageGroundPalette(levelData.meta.theme, levelData.meta.groundColor));
        const orderedObjects = [
            ...levelData.objects.filter((object) => object.editorLayer === activeEditorLayer),
            ...levelData.objects.filter((object) => object.editorLayer !== activeEditorLayer),
        ];
        for (const object of orderedObjects) {
            const previewPosition = dragPreviewState?.positions[object.id];
            const drawableObject = previewPosition
                ? {
                    ...object,
                    x: previewPosition.x,
                    y: previewPosition.y,
                }
                : object;
            const { x, y } = worldToScreen(drawableObject.x, drawableObject.y, pan.x, pan.y, cell);
            const w = drawableObject.w * cell;
            const h = drawableObject.h * cell;
            const fillColor = getObjectFillColor(drawableObject, colorGroups);
            const strokeColor = getObjectStrokeColor(drawableObject, colorGroups);
            const isInactiveEditorLayer = drawableObject.editorLayer !== activeEditorLayer;
            context.save();
            if (isInactiveEditorLayer) {
                context.filter = 'brightness(0.72) saturate(0.86)';
            }
            drawStageObjectSprite({
                context,
                object: drawableObject,
                x,
                y,
                w,
                h,
                fillColor,
                strokeColor,
                alpha: isInactiveEditorLayer ? 0.35 : 1,
                editorGuideTop: 0,
                editorGuideBottom: height,
            });
            context.restore();
            if (editorShowHitboxes) {
                drawEditorObjectHitbox(context, drawableObject, levelData.player.mode, pan.x, pan.y, cell, height, isInactiveEditorLayer ? 0.42 : 1);
            }
            if (selectedObjectIdSet.has(drawableObject.id)) {
                context.strokeStyle = drawableObject.id === selectedObjectId ? '#ffffff' : 'rgba(130, 246, 255, 0.86)';
                context.lineWidth = drawableObject.id === selectedObjectId ? 2 : 1.5;
                context.strokeRect(x - 2, y - 2, w + 4, h + 4);
            }
        }
        const spawnMarkerDefinition = levelObjectDefinitions.START_MARKER;
        const spawnMarkerObject = {
            id: 'editor-player-spawn-marker',
            type: 'START_MARKER',
            x: levelData.player.startX,
            y: levelData.player.startY,
            w: spawnMarkerDefinition.defaultSize.w,
            h: spawnMarkerDefinition.defaultSize.h,
            rotation: 0,
            layer: 'decoration',
            editorLayer: activeEditorLayer,
            props: {},
        };
        const spawnMarkerScreen = worldToScreen(spawnMarkerObject.x, spawnMarkerObject.y, pan.x, pan.y, cell);
        context.save();
        context.shadowColor = 'rgba(49, 240, 255, 0.28)';
        context.shadowBlur = Math.max(10, cell * 0.45);
        drawStageObjectSprite({
            context,
            object: spawnMarkerObject,
            x: spawnMarkerScreen.x,
            y: spawnMarkerScreen.y,
            w: spawnMarkerObject.w * cell,
            h: spawnMarkerObject.h * cell,
            fillColor: getObjectFillColor(spawnMarkerObject, colorGroups),
            strokeColor: getObjectStrokeColor(spawnMarkerObject, colorGroups),
            alpha: 0.96,
            editorGuideTop: 0,
            editorGuideBottom: height,
        });
        context.restore();
        if (editorShowHitboxes) {
            drawEditorPlayerHitbox(context, levelData.player.mode, levelData.player.startX, levelData.player.startY, pan.x, pan.y, cell);
        }
        if (isMusicSyncPreviewActive) {
            drawEditorMusicSyncGuide(context, width, height, pan.x, pan.y, cell, musicSyncPreview, musicSyncPreviewElapsedMs);
        }
        if (selectionBox) {
            const left = Math.min(selectionBox.startScreenX, selectionBox.endScreenX);
            const top = Math.min(selectionBox.startScreenY, selectionBox.endScreenY);
            const width = Math.abs(selectionBox.endScreenX - selectionBox.startScreenX);
            const height = Math.abs(selectionBox.endScreenY - selectionBox.startScreenY);
            context.save();
            context.fillStyle = 'rgba(130, 246, 255, 0.14)';
            context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
            context.lineWidth = 2;
            context.setLineDash([7, 5]);
            context.fillRect(left, top, width, height);
            context.strokeRect(left, top, width, height);
            context.restore();
        }
        if (inlineTestPathPoints.length > 1) {
            context.save();
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.lineWidth = Math.max(3, cell * 0.12);
            context.strokeStyle = 'rgba(103, 255, 73, 0.88)';
            context.shadowColor = 'rgba(117, 255, 74, 0.34)';
            context.shadowBlur = cell * 0.3;
            context.beginPath();
            let segmentStarted = false;
            for (let index = 0; index < inlineTestPathPoints.length; index += 1) {
                const point = inlineTestPathPoints[index];
                if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                    segmentStarted = false;
                    continue;
                }
                const screenPoint = worldToScreen(point.x, point.y, pan.x, pan.y, cell);
                if (!segmentStarted) {
                    context.moveTo(screenPoint.x, screenPoint.y);
                    segmentStarted = true;
                }
                else {
                    context.lineTo(screenPoint.x, screenPoint.y);
                }
            }
            context.stroke();
            context.lineWidth = Math.max(1.25, cell * 0.04);
            context.strokeStyle = 'rgba(216, 255, 199, 0.86)';
            context.shadowBlur = 0;
            context.stroke();
            context.restore();
        }
        if (inlineTestDeathMarker) {
            const marker = worldToScreen(inlineTestDeathMarker.x, inlineTestDeathMarker.y, pan.x, pan.y, cell);
            const size = Math.max(14, cell * 0.38);
            context.save();
            context.translate(marker.x, marker.y);
            context.strokeStyle = '#ff476d';
            context.lineWidth = Math.max(3, cell * 0.08);
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(-size, -size);
            context.lineTo(size, size);
            context.moveTo(size, -size);
            context.lineTo(-size, size);
            context.stroke();
            context.strokeStyle = 'rgba(255, 255, 255, 0.82)';
            context.lineWidth = Math.max(1.5, cell * 0.03);
            context.strokeRect(-size * 0.68, -size * 0.68, size * 1.36, size * 1.36);
            context.restore();
        }
    }, [
        activeEditorLayer,
        canvasViewport.height,
        canvasViewport.width,
        colorGroups,
        dragPreviewState,
        inlineTestDeathMarker,
        inlineTestPathPoints,
        isMusicSyncPreviewActive,
        levelData,
        musicSyncPreview,
        musicSyncPreviewElapsedMs,
        pan,
        selectedObjectId,
        selectedObjectIdSet,
        selectionBox,
        zoom,
    ]);
    const updateLevelData = useCallback((mutator, options) => {
        const next = structuredClone(liveLevelDataRef.current);
        mutator(next);
        commitLevelData(next, options);
    }, [commitLevelData]);
    const performUndo = () => {
        if (historyIndex === 0) {
            return;
        }
        const nextIndex = historyIndex - 1;
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        setHistoryIndex(nextIndex);
        liveLevelDataRef.current = history[nextIndex];
        setLevelData(history[nextIndex]);
    };
    const performRedo = () => {
        if (historyIndex >= history.length - 1) {
            return;
        }
        const nextIndex = historyIndex + 1;
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        setHistoryIndex(nextIndex);
        liveLevelDataRef.current = history[nextIndex];
        setLevelData(history[nextIndex]);
    };
    const placeObject = (type, x, y, options) => {
        const placement = getDefaultPlacementPosition(type, x, y);
        const placementKey = getPlacementStrokeKey(type, placement.x, placement.y, activeEditorLayer);
        if (options?.trackStroke && paintStrokeCellsRef.current.has(placementKey)) {
            return false;
        }
        if ((type === 'START_MARKER' && liveLevelDataRef.current.player.startX === placement.x && liveLevelDataRef.current.player.startY === placement.y) ||
            (type === 'FINISH_PORTAL' && liveLevelDataRef.current.finish.x === placement.x && liveLevelDataRef.current.finish.y === placement.y) ||
            liveLevelDataRef.current.objects.some((object) => object.type === type &&
                object.x === placement.x &&
                object.y === placement.y &&
                object.editorLayer === activeEditorLayer)) {
            if (options?.trackStroke) {
                paintStrokeCellsRef.current.add(placementKey);
            }
            return false;
        }
        const next = structuredClone(liveLevelDataRef.current);
        if (type === 'START_MARKER') {
            next.player.startX = placement.x;
            next.player.startY = placement.y;
            next.objects = next.objects.filter((object) => object.type !== 'START_MARKER');
        }
        if (type === 'FINISH_PORTAL') {
            next.finish = { x: placement.x, y: placement.y };
            next.objects = next.objects.filter((object) => object.type !== 'FINISH_PORTAL');
        }
        const definition = levelObjectDefinitions[type];
        const triggerDefaults = type === 'MOVE_TRIGGER'
            ? { activationMode: 'zone', groupId: 1, moveX: 2, moveY: 0, durationMs: 650, easing: 'none' }
            : type === 'ALPHA_TRIGGER'
                ? { activationMode: 'zone', groupId: 1, alpha: 0.35 }
                : type === 'TOGGLE_TRIGGER'
                    ? { activationMode: 'zone', groupId: 1, enabled: false }
                    : type === 'PULSE_TRIGGER'
                        ? { activationMode: 'zone', groupId: 1, fillColor: '#ffffff', strokeColor: '#ffffff', durationMs: 900 }
                        : type === 'POST_FX_TRIGGER'
                            ? {
                                effectType: 'flash',
                                activationMode: 'zone',
                                durationMs: 900,
                                intensity: 0.75,
                                primaryColor: '#ffffff',
                                secondaryColor: '#7c3aed',
                                blurAmount: 8,
                                scanlineDensity: 0.45,
                                shakePower: 0.85,
                            }
                            : isSawObjectType(type)
                                ? { rotationSpeed: 240 }
                                : {};
        const object = {
            id: `${type.toLowerCase()}-${Date.now()}`,
            type,
            x: placement.x,
            y: placement.y,
            w: definition.defaultSize.w,
            h: definition.defaultSize.h,
            rotation: 0,
            layer: type === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
            editorLayer: activeEditorLayer,
            props: {
                ...triggerDefaults,
                ...(isPaintableObjectType(type) && activePaintGroupId
                    ? {
                        paintGroupId: activePaintGroupId,
                    }
                    : {}),
            },
        };
        next.objects.push(object);
        if (options?.trackStroke) {
            paintStrokeCellsRef.current.add(placementKey);
        }
        if (options?.selectPlacedObject ?? true) {
            applySelection([object.id], object.id);
        }
        commitLevelData(next, { pushHistory: options?.pushHistory ?? true });
        return true;
    };
    const duplicateSelected = () => {
        if (!selectedObjectIds.length) {
            return;
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(selectedObjectIds);
            const cloneIds = [];
            for (const source of draft.objects.filter((object) => selectedIdsSet.has(object.id))) {
                if (source.type === 'START_MARKER' || source.type === 'FINISH_PORTAL') {
                    continue;
                }
                const clone = structuredClone(source);
                clone.id = `${clone.id}-copy-${Date.now()}-${cloneIds.length}`;
                clone.x += 1;
                draft.objects.push(clone);
                cloneIds.push(clone.id);
            }
            if (cloneIds.length) {
                applySelection(cloneIds, cloneIds[0]);
            }
        });
    };
    const deleteSelected = () => {
        if (!selectedObjectIds.length) {
            return;
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(selectedObjectIds);
            draft.objects = draft.objects.filter((object) => {
                if (!selectedIdsSet.has(object.id)) {
                    return true;
                }
                return object.type === 'START_MARKER' || object.type === 'FINISH_PORTAL';
            });
        });
        clearSelection();
    };
    const applyThemePreset = (nextTheme) => {
        const previousTheme = theme;
        setTheme(nextTheme);
        updateLevelData((draft) => {
            const currentGroundColor = getEditorColorInputValue(typeof draft.meta.groundColor === 'string' ? draft.meta.groundColor : '', getDefaultStageGroundColor(previousTheme));
            draft.meta = {
                ...draft.meta,
                theme: nextTheme,
                background: nextTheme,
            };
            if (currentGroundColor.toLowerCase() === getDefaultStageGroundColor(previousTheme).toLowerCase()) {
                delete draft.meta.groundColor;
            }
        });
    };
    const setPlayerMode = (nextMode) => {
        updateLevelData((draft) => {
            draft.player.mode = nextMode;
        });
    };
    const updateSelectedObject = (mutator) => {
        if (!selectedObjectId) {
            return;
        }
        updateLevelData((draft) => {
            const object = draft.objects.find((entry) => entry.id === selectedObjectId);
            if (!object) {
                return;
            }
            mutator(object, draft);
            if (object.type === 'START_MARKER') {
                draft.player.startX = object.x;
                draft.player.startY = object.y;
            }
            if (object.type === 'FINISH_PORTAL') {
                draft.finish.x = object.x;
                draft.finish.y = object.y;
            }
        });
    };
    const updateSelectedObjects = (mutator) => {
        if (!selectedObjectIds.length) {
            return;
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(selectedObjectIds);
            const objects = draft.objects.filter((entry) => selectedIdsSet.has(entry.id));
            if (!objects.length) {
                return;
            }
            mutator(objects, draft);
            for (const object of objects) {
                if (object.type === 'START_MARKER') {
                    draft.player.startX = object.x;
                    draft.player.startY = object.y;
                }
                if (object.type === 'FINISH_PORTAL') {
                    draft.finish.x = object.x;
                    draft.finish.y = object.y;
                }
            }
        });
    };
    const updateSelectedObjectNumeric = (field, rawValue, options) => {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            return;
        }
        const min = options?.min ?? Number.NEGATIVE_INFINITY;
        const max = options?.max ?? Number.POSITIVE_INFINITY;
        const step = options?.step ?? 1;
        const snappedValue = Math.round(numericValue / step) * step;
        const clampedValue = clamp(snappedValue, min, max);
        updateSelectedObject((object) => {
            object[field] = clampedValue;
        });
    };
    const rotateSelectedObject = (direction) => {
        if (selectedObjects.length > 1) {
            updateSelectedObjects((objects) => {
                const bounds = getObjectSelectionBounds(objects);
                const pivotX = (bounds.left + bounds.right) / 2;
                const pivotY = (bounds.top + bounds.bottom) / 2;
                for (const object of objects) {
                    const previousRotation = normalizeQuarterRotation(object.rotation);
                    const nextRotation = normalizeQuarterRotation(previousRotation + 90 * direction);
                    const previousQuarterTurns = ((previousRotation / 90) % 4 + 4) % 4;
                    const nextQuarterTurns = ((nextRotation / 90) % 4 + 4) % 4;
                    const toggledOrientation = previousQuarterTurns % 2 !== nextQuarterTurns % 2;
                    const centerX = object.x + object.w / 2;
                    const centerY = object.y + object.h / 2;
                    const rotatedCenter = rotateObjectCenterAroundPivot(centerX, centerY, pivotX, pivotY, direction);
                    const nextWidth = toggledOrientation && Math.abs(object.w - object.h) > 0.001 ? object.h : object.w;
                    const nextHeight = toggledOrientation && Math.abs(object.w - object.h) > 0.001 ? object.w : object.h;
                    object.rotation = nextRotation;
                    object.w = nextWidth;
                    object.h = nextHeight;
                    object.x = roundToStep(rotatedCenter.x - nextWidth / 2, 0.25);
                    object.y = roundToStep(rotatedCenter.y - nextHeight / 2, 0.25);
                }
            });
            return;
        }
        updateSelectedObject((object) => {
            const previousRotation = normalizeQuarterRotation(object.rotation);
            const nextRotation = normalizeQuarterRotation(previousRotation + 90 * direction);
            const previousQuarterTurns = ((previousRotation / 90) % 4 + 4) % 4;
            const nextQuarterTurns = ((nextRotation / 90) % 4 + 4) % 4;
            const toggledOrientation = previousQuarterTurns % 2 !== nextQuarterTurns % 2;
            object.rotation = nextRotation;
            if (toggledOrientation && Math.abs(object.w - object.h) > 0.001) {
                const previousWidth = object.w;
                object.w = object.h;
                object.h = previousWidth;
            }
        });
    };
    const updateSelectedObjectLayer = (nextLayer) => {
        updateSelectedObject((object) => {
            object.layer = nextLayer;
        });
    };
    const updateSelectedObjectEditorLayer = (nextEditorLayer) => {
        if (nextEditorLayer === 2) {
            setHasLayerTwo(true);
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(selectedObjectIds);
            for (const object of draft.objects) {
                if (!selectedIdsSet.has(object.id)) {
                    continue;
                }
                object.editorLayer = nextEditorLayer;
            }
        });
    };
    const updateSelectedTriggerNumericProp = (key, rawValue, options) => {
        if (!selectedTriggerObject) {
            return;
        }
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            return;
        }
        const min = options?.min ?? Number.NEGATIVE_INFINITY;
        const max = options?.max ?? Number.POSITIVE_INFINITY;
        const clampedValue = clamp(numericValue, min, max);
        updateSelectedObject((object) => {
            object.props = {
                ...object.props,
                [key]: clampedValue,
            };
        });
    };
    const updateSelectedTriggerStringProp = (key, value) => {
        if (!selectedTriggerObject) {
            return;
        }
        updateSelectedObject((object) => {
            object.props = {
                ...object.props,
                [key]: value,
            };
        });
    };
    const updateSelectedTriggerBooleanProp = (key, value) => {
        if (!selectedTriggerObject) {
            return;
        }
        updateSelectedObject((object) => {
            object.props = {
                ...object.props,
                [key]: value,
            };
        });
    };
    const updateSelectedTriggerDurationSeconds = (rawValue) => {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            return;
        }
        updateSelectedTriggerNumericProp('durationMs', String(Math.max(0.01, numericValue) * 1000), { min: 1 });
    };
    const nudgeSelectedTriggerGroupId = (delta) => {
        if (!selectedPaintGroupTriggerObject) {
            return;
        }
        const currentGroupId = Number(selectedPaintGroupTriggerObject.props.groupId ?? 1);
        updateSelectedTriggerNumericProp('groupId', String(currentGroupId + delta), {
            min: 1,
            max: PAINT_GROUP_SLOT_COUNT,
        });
    };
    const restartPreviewFromMusicOffset = () => {
        launchMusicSyncPreview(true);
    };
    const applyCustomMusicUrl = () => {
        const trimmedUrl = musicUrlInput.trim();
        const nextLabel = musicLabelInput.trim() || (trimmedUrl ? inferMusicLabel(trimmedUrl) : undefined);
        updateLevelData((draft) => {
            draft.meta.music = trimmedUrl || 'none';
            if (nextLabel) {
                draft.meta.musicLabel = nextLabel;
            }
            else {
                delete draft.meta.musicLabel;
            }
        });
        setMusicLabelInput(nextLabel ?? '');
        setMessage(trimmedUrl ? 'Custom music URL attached to the level.' : 'Music cleared from the level.');
    };
    const clearLevelMusic = () => {
        updateLevelData((draft) => {
            draft.meta.music = 'none';
            delete draft.meta.musicLabel;
        });
        setMusicUrlInput('');
        setMusicLabelInput('');
        setMessage('Music cleared from the level.');
    };
    const handleMusicFilePicked = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (file.size > MAX_CUSTOM_MUSIC_FILE_SIZE_BYTES) {
            setMessage('Music file is too large. Keep it under 8 MB.');
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                setMessage('Could not read the selected music file.');
                return;
            }
            const nextLabel = musicLabelInput.trim() || file.name;
            updateLevelData((draft) => {
                draft.meta.music = reader.result;
                draft.meta.musicLabel = nextLabel;
            });
            setMusicUrlInput('');
            setMusicLabelInput(nextLabel);
            setMessage(`Custom music loaded: ${file.name}.`);
        };
        reader.onerror = () => {
            setMessage('Could not read the selected music file.');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    const updateSelectedObjectPaintColors = (nextColors, options) => {
        if (!selectedObjectId) {
            return;
        }
        updateLevelData((draft) => {
            const object = draft.objects.find((entry) => entry.id === selectedObjectId);
            if (!object || !isPaintableObjectType(object.type)) {
                return;
            }
            const linkedGroupId = getObjectPaintGroupId(object);
            if (linkedGroupId) {
                const currentGroups = draft.meta.colorGroups ?? [];
                const existingGroup = getColorGroupById(currentGroups, linkedGroupId);
                const fallbackFillColor = getObjectFillColor(object, currentGroups);
                const fallbackStrokeColor = getObjectStrokeColor(object, currentGroups);
                const nextGroups = currentGroups.filter((group) => group.id !== linkedGroupId);
                nextGroups.push({
                    id: linkedGroupId,
                    fillColor: nextColors.fillColor ?? existingGroup?.fillColor ?? fallbackFillColor,
                    strokeColor: nextColors.strokeColor ?? existingGroup?.strokeColor ?? fallbackStrokeColor,
                });
                nextGroups.sort((left, right) => left.id - right.id);
                draft.meta.colorGroups = nextGroups;
                return;
            }
            object.props = {
                ...object.props,
                ...(nextColors.fillColor ? { fillColor: nextColors.fillColor } : {}),
                ...(nextColors.strokeColor ? { strokeColor: nextColors.strokeColor } : {}),
            };
        }, options);
    };
    const updateSelectedObjectPaint = (field, value, options) => {
        updateSelectedObjectPaintColors({ [field]: value }, options);
    };
    const resetSelectedObjectPaintToDefault = () => {
        if (!paintableSelectedObject) {
            return;
        }
        const definition = levelObjectDefinitions[paintableSelectedObject.type];
        updateSelectedObjectPaintColors({
            fillColor: definition.color,
            strokeColor: definition.strokeColor,
        });
    };
    const assignSelectedObjectToPaintGroup = (groupId) => {
        if (!paintableSelectedObjects.length) {
            return;
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));
            const currentGroups = draft.meta.colorGroups ?? [];
            const existingGroup = currentGroups.find((group) => group.id === groupId);
            if (!existingGroup) {
                const anchorObject = paintableSelectedObjects[0];
                const fillColor = getObjectFillColor(anchorObject, currentGroups);
                const strokeColor = getObjectStrokeColor(anchorObject, currentGroups);
                const nextGroups = [...currentGroups, { id: groupId, fillColor, strokeColor }];
                nextGroups.sort((left, right) => left.id - right.id);
                draft.meta.colorGroups = nextGroups;
            }
            for (const object of draft.objects) {
                if (!selectedIdsSet.has(object.id) || !isPaintableObjectType(object.type)) {
                    continue;
                }
                object.props = {
                    ...object.props,
                    paintGroupId: groupId,
                };
                delete object.props.fillColor;
                delete object.props.strokeColor;
            }
        });
        setActivePaintGroupId(groupId);
    };
    const detachSelectedObjectFromPaintGroup = () => {
        if (!paintableSelectedObjects.length) {
            return;
        }
        updateLevelData((draft) => {
            const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));
            for (const object of draft.objects) {
                if (!selectedIdsSet.has(object.id) || !isPaintableObjectType(object.type)) {
                    continue;
                }
                const fillColor = getObjectFillColor(object, draft.meta.colorGroups ?? []);
                const strokeColor = getObjectStrokeColor(object, draft.meta.colorGroups ?? []);
                object.props = {
                    ...object.props,
                    fillColor,
                    strokeColor,
                };
                delete object.props.paintGroupId;
            }
        });
    };
    const assignSelectedObjectToNextFreePaintGroup = () => {
        if (!paintableSelectedObjects.length) {
            return;
        }
        if (!nextFreePaintGroupId) {
            setMessage('No free color groups are available right now.');
            return;
        }
        assignSelectedObjectToPaintGroup(nextFreePaintGroupId);
    };
    const toggleEditObjectPopup = () => {
        setEditorWorkspaceMode('edit');
        setSelectedTool('select');
        if (selectedTriggerObject) {
            setIsPaintPopupOpen(false);
            setIsPaintHsvPopupOpen(false);
            setIsTriggerPopupOpen((current) => !current);
            return;
        }
        if (!canOpenSelectedObjectPaintPopup) {
            return;
        }
        setIsTriggerPopupOpen(false);
        setIsPaintPopupOpen((current) => (current && paintableSelectedObject ? false : true));
    };
    const openSelectedObjectPaintHsv = () => {
        if (!paintableSelectedObject) {
            return;
        }
        paintHsvBaseColorsRef.current = {
            fillColor: selectedPaintFillColor,
            strokeColor: selectedPaintStrokeColor,
        };
        setPaintHsvState({
            hue: 0,
            saturation: 1,
            brightness: 1,
        });
        setIsPaintHsvPopupOpen(true);
    };
    const resetSelectedObjectPaintHsv = () => {
        const baseColors = paintHsvBaseColorsRef.current;
        if (!baseColors) {
            return;
        }
        setPaintHsvState({
            hue: 0,
            saturation: 1,
            brightness: 1,
        });
        updateSelectedObjectPaintColors({
            fillColor: baseColors.fillColor,
            strokeColor: baseColors.strokeColor,
        }, { pushHistory: false });
    };
    const applySelectedObjectPaintHsv = (nextState) => {
        const baseColors = paintHsvBaseColorsRef.current;
        if (!baseColors) {
            return;
        }
        updateSelectedObjectPaintColors({
            fillColor: applyHsvToHex(baseColors.fillColor, nextState),
            strokeColor: applyHsvToHex(baseColors.strokeColor, nextState),
        }, { pushHistory: false });
    };
    const handleSelectedObjectPaintHsvChange = (patch) => {
        setPaintHsvState((current) => {
            const nextState = {
                ...current,
                ...patch,
            };
            applySelectedObjectPaintHsv(nextState);
            return nextState;
        });
    };
    const confirmSelectedObjectPaintHsv = () => {
        const hasAdjustment = Math.abs(paintHsvState.hue) > 0.001 ||
            Math.abs(paintHsvState.saturation - 1) > 0.001 ||
            Math.abs(paintHsvState.brightness - 1) > 0.001;
        if (hasAdjustment) {
            commitLevelData(structuredClone(liveLevelDataRef.current));
        }
        setIsPaintHsvPopupOpen(false);
    };
    const beginTouchGesture = () => {
        const touchPoints = [...touchPointsRef.current.values()];
        if (touchPoints.length < 2) {
            touchGestureRef.current = null;
            return;
        }
        const [firstPoint, secondPoint] = touchPoints;
        touchGestureRef.current = {
            startDistance: getPointerDistance(firstPoint, secondPoint),
            startZoom: zoom,
            startPanX: pan.x,
            startPanY: pan.y,
            startCenterX: (firstPoint.x + secondPoint.x) / 2,
            startCenterY: (firstPoint.y + secondPoint.y) / 2,
        };
    };
    const handlePointerDown = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        if (isSelectedObjectPaintPopupOpen || isPaintHsvPopupOpen || isTriggerPopupOpen) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const { screenX, screenY } = getCanvasScreenPoint(canvas, event.clientX, event.clientY);
        const cell = levelData.meta.gridSize * zoom;
        const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);
        setCursorWorld({
            x: Math.floor(world.x),
            y: Math.floor(world.y),
        });
        if (event.button === 2) {
            if (selectedTool === 'select') {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragPreviewStateRef.current = null;
                setDragPreviewState(null);
                const nextSelectionBox = {
                    startScreenX: screenX,
                    startScreenY: screenY,
                    endScreenX: screenX,
                    endScreenY: screenY,
                };
                dragRef.current = {
                    mode: 'box-select',
                    startScreenX: screenX,
                    startScreenY: screenY,
                };
                setSelectionBox(nextSelectionBox);
            }
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        if (event.pointerType === 'touch') {
            touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (touchPointsRef.current.size >= 2) {
                dragRef.current = null;
                beginTouchGesture();
                return;
            }
        }
        if (event.button === 1) {
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = {
                mode: 'pan',
                originX: event.clientX,
                originY: event.clientY,
                startPanX: pan.x,
                startPanY: pan.y,
            };
            return;
        }
        if (selectedTool === 'pan' || isSpacePressedRef.current) {
            dragRef.current = {
                mode: 'pan',
                originX: event.clientX,
                originY: event.clientY,
                startPanX: pan.x,
                startPanY: pan.y,
            };
            return;
        }
        if (selectedTool === 'select') {
            const hitObject = [...levelData.objects]
                .filter((object) => object.editorLayer === activeEditorLayer)
                .reverse()
                .find((object) => pointInsideObject(world.x, world.y, object));
            if (hitObject) {
                const nextSelectedIds = selectedObjectIdSet.has(hitObject.id) && selectedObjectIds.length > 1 ? selectedObjectIds : [hitObject.id];
                const originPositions = Object.fromEntries(levelData.objects
                    .filter((object) => nextSelectedIds.includes(object.id))
                    .map((object) => [object.id, { x: object.x, y: object.y }]));
                applySelection(nextSelectedIds, hitObject.id);
                setSelectionBox(null);
                const previewState = {
                    positions: originPositions,
                };
                dragPreviewStateRef.current = previewState;
                setDragPreviewState(previewState);
                dragRef.current = {
                    mode: 'move',
                    objectId: hitObject.id,
                    offsetX: world.x - hitObject.x,
                    offsetY: world.y - hitObject.y,
                    originX: hitObject.x,
                    originY: hitObject.y,
                    selectedIds: nextSelectedIds,
                    originPositions,
                };
            }
            else {
                clearSelection();
            }
            return;
        }
        if (placementMode === 'drag' && canUseDragPlacementTool(selectedTool)) {
            paintStrokeCellsRef.current = new Set();
            paintStrokeDirtyRef.current = false;
            dragRef.current = {
                mode: 'paint',
                tool: selectedTool,
            };
            paintStrokeDirtyRef.current =
                placeObject(selectedTool, Math.floor(world.x), Math.floor(world.y), {
                    pushHistory: false,
                    selectPlacedObject: false,
                    trackStroke: true,
                }) || paintStrokeDirtyRef.current;
            return;
        }
        placeObject(selectedTool, Math.floor(world.x), Math.floor(world.y));
    };
    const handlePointerMove = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const { screenX, screenY } = getCanvasScreenPoint(canvas, event.clientX, event.clientY);
        const cell = levelData.meta.gridSize * zoom;
        const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);
        setCursorWorld({
            x: Math.floor(world.x),
            y: Math.floor(world.y),
        });
        if (event.pointerType === 'touch' && touchPointsRef.current.has(event.pointerId)) {
            touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (touchPointsRef.current.size >= 2) {
                event.preventDefault();
                if (!touchGestureRef.current) {
                    beginTouchGesture();
                }
                const touchPoints = [...touchPointsRef.current.values()];
                const [firstPoint, secondPoint] = touchPoints;
                if (firstPoint && secondPoint && touchGestureRef.current) {
                    const centerX = (firstPoint.x + secondPoint.x) / 2;
                    const centerY = (firstPoint.y + secondPoint.y) / 2;
                    const distance = getPointerDistance(firstPoint, secondPoint);
                    const zoomFactor = touchGestureRef.current.startDistance > 0 ? distance / touchGestureRef.current.startDistance : 1;
                    setZoom(clamp(roundToStep(touchGestureRef.current.startZoom * zoomFactor, 0.01), 0.45, 2.4));
                    setPan({
                        x: touchGestureRef.current.startPanX + (centerX - touchGestureRef.current.startCenterX),
                        y: touchGestureRef.current.startPanY + (centerY - touchGestureRef.current.startCenterY),
                    });
                }
                dragRef.current = null;
                return;
            }
        }
        const dragState = dragRef.current;
        if (event.buttons & 4) {
            if (!dragState || dragState.mode !== 'pan') {
                dragRef.current = {
                    mode: 'pan',
                    originX: event.clientX,
                    originY: event.clientY,
                    startPanX: pan.x,
                    startPanY: pan.y,
                };
                return;
            }
            setPan({
                x: dragState.startPanX + (event.clientX - dragState.originX),
                y: dragState.startPanY + (event.clientY - dragState.originY),
            });
            return;
        }
        if (!dragState) {
            return;
        }
        if (dragState.mode === 'pan') {
            setPan({
                x: dragState.startPanX + (event.clientX - dragState.originX),
                y: dragState.startPanY + (event.clientY - dragState.originY),
            });
            return;
        }
        if (dragState.mode === 'box-select') {
            setSelectionBox({
                startScreenX: dragState.startScreenX,
                startScreenY: dragState.startScreenY,
                endScreenX: screenX,
                endScreenY: screenY,
            });
            return;
        }
        if (dragState.mode === 'paint') {
            paintStrokeDirtyRef.current =
                placeObject(dragState.tool, Math.floor(world.x), Math.floor(world.y), {
                    pushHistory: false,
                    selectPlacedObject: false,
                    trackStroke: true,
                }) || paintStrokeDirtyRef.current;
            return;
        }
        if (dragState.mode === 'move') {
            const nextX = Math.floor(world.x - dragState.offsetX);
            const nextY = Math.floor(world.y - dragState.offsetY);
            const deltaX = nextX - dragState.originX;
            const deltaY = nextY - dragState.originY;
            const nextPreviewState = {
                positions: Object.fromEntries(dragState.selectedIds.map((id) => [
                    id,
                    {
                        x: dragState.originPositions[id].x + deltaX,
                        y: dragState.originPositions[id].y + deltaY,
                    },
                ])),
            };
            const currentPreview = dragPreviewStateRef.current;
            if (dragPreviewStatesEqual(currentPreview, nextPreviewState)) {
                return;
            }
            dragPreviewStateRef.current = nextPreviewState;
            setDragPreviewState(nextPreviewState);
        }
    };
    const handlePointerUp = (event) => {
        if (event && touchPointsRef.current.has(event.pointerId)) {
            touchPointsRef.current.delete(event.pointerId);
            if (touchPointsRef.current.size < 2) {
                touchGestureRef.current = null;
            }
        }
        const dragState = dragRef.current;
        if (dragState?.mode === 'box-select') {
            const nextSelectionBox = selectionBox ??
                {
                    startScreenX: dragState.startScreenX,
                    startScreenY: dragState.startScreenY,
                    endScreenX: dragState.startScreenX,
                    endScreenY: dragState.startScreenY,
                };
            const normalizedBox = normalizeSelectionBox(nextSelectionBox);
            const cell = levelData.meta.gridSize * zoom;
            const matchedIds = [...levelData.objects]
                .filter((object) => {
                if (object.editorLayer !== activeEditorLayer) {
                    return false;
                }
                const { x, y } = worldToScreen(object.x, object.y, pan.x, pan.y, cell);
                return rectanglesIntersect(normalizedBox, {
                    left: x,
                    top: y,
                    right: x + object.w * cell,
                    bottom: y + object.h * cell,
                });
            })
                .map((object) => object.id);
            applySelection(matchedIds, matchedIds[matchedIds.length - 1] ?? null);
        }
        if (dragState?.mode === 'move') {
            const previewState = dragPreviewStateRef.current;
            if (previewState &&
                dragState.selectedIds.some((id) => {
                    const origin = dragState.originPositions[id];
                    const preview = previewState.positions[id];
                    return preview && (preview.x !== origin.x || preview.y !== origin.y);
                })) {
                const next = structuredClone(liveLevelDataRef.current);
                const selectedIdsSet = new Set(dragState.selectedIds);
                for (const object of next.objects) {
                    if (!selectedIdsSet.has(object.id)) {
                        continue;
                    }
                    const preview = previewState.positions[object.id];
                    if (!preview) {
                        continue;
                    }
                    object.x = preview.x;
                    object.y = preview.y;
                    if (object.type === 'START_MARKER') {
                        next.player.startX = object.x;
                        next.player.startY = object.y;
                    }
                    if (object.type === 'FINISH_PORTAL') {
                        next.finish.x = object.x;
                        next.finish.y = object.y;
                    }
                }
                commitLevelData(next);
            }
        }
        if (dragState?.mode === 'paint') {
            if (paintStrokeDirtyRef.current) {
                commitLevelData(structuredClone(liveLevelDataRef.current));
            }
            paintStrokeCellsRef.current = new Set();
            paintStrokeDirtyRef.current = false;
        }
        if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragPreviewStateRef.current = null;
        setDragPreviewState(null);
        setSelectionBox(null);
        dragRef.current = null;
    };
    const applyWheelZoom = (deltaY) => {
        setZoom((current) => Math.min(2.4, Math.max(0.45, current + (deltaY < 0 ? 0.1 : -0.1))));
    };
    const setHorizontalScrollPosition = useCallback((nextScroll) => {
        const clampedScroll = clamp(nextScroll, 0, horizontalScrollMax);
        setPan((current) => ({
            ...current,
            x: EDITOR_DEFAULT_PAN_X - clampedScroll * stageCell,
        }));
    }, [horizontalScrollMax, stageCell]);
    const handleToolSelect = (tool) => {
        setSelectedTool(tool);
        setActivePaletteGroup(getPaletteGroupTitle(tool));
        setPaletteDrawerGroup(null);
    };
    const handleEditorLayerSelect = (nextLayer) => {
        if (nextLayer === 2 && !hasLayerTwo) {
            return;
        }
        setActiveEditorLayer(nextLayer);
        clearSelection();
    };
    const handleAddLayerTwo = () => {
        setHasLayerTwo(true);
        setActiveEditorLayer(2);
        clearSelection();
        setMessage('Layer 2 enabled. Layer 1 is now dimmed while you build on top.');
    };
    const handlePaletteGroupClick = (groupTitle) => {
        setActivePaletteGroup(groupTitle);
        setPaletteDrawerGroup((current) => (current === groupTitle ? null : groupTitle));
    };
    const handleDesktopPaletteGroupSelect = (groupTitle) => {
        setEditorWorkspaceMode('build');
        setActivePaletteGroup(groupTitle);
        setPaletteDrawerGroup(groupTitle);
    };
    const cycleDesktopPaletteGroup = (direction) => {
        if (!desktopPaletteGroups.length) {
            return;
        }
        const nextIndex = (desktopPaletteGroupIndex + direction + desktopPaletteGroups.length) % desktopPaletteGroups.length;
        const nextGroup = desktopPaletteGroups[nextIndex];
        handleDesktopPaletteGroupSelect(nextGroup.title);
    };
    const startInlineTestMode = () => {
        stopMusicSyncPreview();
        setShowPreview(false);
        setShowDesktopSetup(false);
        setIsPaintPopupOpen(false);
        setIsTriggerPopupOpen(false);
        setIsInlineTestMode(true);
        setInlineTestDeathMarker(null);
        setInlineTestPathPoints([]);
        setInlineTestRunSeed((current) => current + 1);
        setMessage('');
    };
    const stopInlineTestMode = (nextMessage) => {
        setIsInlineTestMode(false);
        if (nextMessage) {
            setMessage(nextMessage);
        }
    };
    const requestInlineTestStop = () => {
        setInlineTestStopSignal((current) => current + 1);
    };
    const openSetupPanel = () => {
        if (isMobileLayout) {
            setIsMobileSettingsExpanded(true);
            settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setShowDesktopSetup(true);
    };
    useEffect(() => {
        const stageFrame = stageFrameRef.current;
        if (!stageFrame) {
            return;
        }
        const handleStageWheel = (event) => {
            if (isInlineTestMode) {
                return;
            }
            const target = event.target;
            if (!(target instanceof Node) || !stageFrame.contains(target)) {
                return;
            }
            if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                event.preventDefault();
                event.stopPropagation();
                const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
                setHorizontalScrollPosition(horizontalScrollValue + delta / stageCell);
                return;
            }
            if (!event.ctrlKey && !event.metaKey) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            applyWheelZoom(event.deltaY);
        };
        stageFrame.addEventListener('wheel', handleStageWheel, { passive: false, capture: true });
        return () => {
            stageFrame.removeEventListener('wheel', handleStageWheel, true);
        };
    }, [horizontalScrollValue, isInlineTestMode, setHorizontalScrollPosition, stageCell]);
    const handleSave = async () => {
        setSaveState('saving');
        setMessage('');
        try {
            const dataToSave = structuredClone(levelData);
            dataToSave.meta.theme = theme;
            dataToSave.meta.background = theme;
            await onSave({
                title,
                description,
                theme,
                dataJson: dataToSave,
            });
            setSaveState('saved');
            setMessage('Level saved successfully.');
            return true;
        }
        catch (error) {
            setSaveState('error');
            setMessage(error instanceof Error ? error.message : 'Failed to save level');
            return false;
        }
    };
    const handleSubmit = async () => {
        if (!onSubmit) {
            return;
        }
        if (hasStartPositions) {
            setMessage('Remove all Start Pos markers before publishing the level.');
            return;
        }
        try {
            await onSubmit();
            setMessage('Level submitted for admin review.');
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Failed to submit level');
        }
    };
    const closeEditorPauseMenu = () => {
        setIsEditorPauseMenuOpen(false);
    };
    const handlePauseSave = async () => {
        const didSave = await handleSave();
        if (didSave) {
            setIsEditorPauseMenuOpen(false);
        }
    };
    const handlePauseSaveAndPlay = async () => {
        const didSave = await handleSave();
        if (!didSave) {
            return;
        }
        setIsEditorPauseMenuOpen(false);
        openGameplayPreview();
    };
    const handlePauseSaveAndExit = async () => {
        const didSave = await handleSave();
        if (!didSave) {
            return;
        }
        setIsEditorPauseMenuOpen(false);
        if (onClose) {
            onClose();
        }
    };
    const handlePauseExit = () => {
        setIsEditorPauseMenuOpen(false);
        if (onClose) {
            onClose();
        }
    };
    const deleteAllStartPositions = () => {
        if (!hasStartPositions) {
            return;
        }
        updateLevelData((draft) => {
            draft.objects = draft.objects.filter((object) => object.type !== 'START_POS');
        });
        setMessage('All Start Pos markers were removed from the level.');
    };
    return (_jsxs("div", { className: cn('arcade-editor-workstation editor-workbench flex flex-col space-y-5', isInlineTestMode ? 'editor-workbench--inline-test' : '', isMobileLayout ? 'editor-workbench--mobile' : ''), children: [_jsxs(Panel, { className: "arcade-editor-topbar editor-workbench-toolbar game-screen bg-transparent", children: [_jsxs("div", { className: "editor-workbench-toolbar-main", children: [_jsxs("div", { className: "editor-workbench-heading", children: [_jsx("p", { className: "editor-workbench-kicker font-display text-[11px] tracking-[0.26em] text-[#ffd44a]", children: "Forge Workstation" }), _jsx("h3", { className: "editor-workbench-title mt-2 font-display text-3xl text-white", children: title }), _jsx("p", { className: "editor-workbench-subcopy mt-2 max-w-3xl text-sm leading-7 text-white/72", children: "Compact build surface with on-stage tools, quick paint access, and instant preview." })] }), _jsxs("div", { className: "editor-primary-actions", children: [onClose ? (_jsx("button", { type: "button", className: "editor-close-button", onClick: onClose, "aria-label": "Close editor", title: "Close editor", children: _jsx("span", { "aria-hidden": "true", children: "\u00D7" }) })) : null, _jsx(Button, { onClick: handleSave, disabled: saveState === 'saving', children: saveState === 'saving' ? 'Saving...' : saveLabel }), onSubmit ? (_jsx(Button, { variant: "secondary", onClick: handleSubmit, disabled: hasStartPositions, title: hasStartPositions ? 'Remove all Start Pos markers before publishing' : undefined, children: "Submit for Review" })) : null, _jsx(Button, { variant: "ghost", onClick: toggleGameplayPreview, children: showPreview ? 'Hide Preview' : 'Preview' })] })] }), _jsxs("div", { className: "editor-workbench-toolbar-meta", children: [_jsx(HintChip, { label: "Tool", value: activeToolLabel }), _jsx(HintChip, { label: "Build Layer", value: activeEditorLayerLabel }), _jsx(HintChip, { label: "Selected", value: selectionLabel }), _jsx(HintChip, { label: "History", value: historyPosition }), _jsx(HintChip, { label: "Theme", value: theme }), _jsx(HintChip, { label: "Objects", value: objectCount })] })] }), _jsxs(Panel, { className: "arcade-editor-stage-panel editor-stage-shell game-screen bg-transparent", children: [_jsxs("div", { ref: stageFrameRef, className: "editor-canvas-frame", style: {
                            '--editor-stage-top': stageThemePalette.editorGradientTop,
                            '--editor-stage-mid': stageThemePalette.editorGradientMid,
                            '--editor-stage-bottom': stageThemePalette.editorGradientBottom,
                        }, children: [isMobileLayout ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--hud", children: _jsxs("div", { className: "editor-canvas-hud-bar", children: [_jsx(HintChip, { label: "Tool", value: activeToolLabel }), _jsx(HintChip, { label: "Selected", value: selectionSummary }), _jsx(HintChip, { label: "Layer", value: activeEditorLayerLabel }), _jsx(HintChip, { label: "Place", value: placementModeLabel }), _jsx(HintChip, { label: "Zoom", value: `${zoom.toFixed(2)}x` }), _jsx(HintChip, { label: "Cursor", value: `${cursorWorld.x}, ${cursorWorld.y}` })] }) }), _jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--left", children: _jsx("div", { className: "editor-canvas-rail editor-canvas-rail--categories", children: paletteGroups.map((group) => (_jsx("button", { type: "button", className: cn('editor-canvas-rail-button', activePaletteGroup === group.title ? 'is-active' : ''), onClick: () => handlePaletteGroupClick(group.title), title: group.title, children: getPaletteGroupButtonLabel(group.title) }, group.title))) }) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--desktop-top", children: _jsxs("div", { className: "editor-stage-topbar", children: [_jsxs("div", { className: "editor-stage-topbar-cluster editor-stage-topbar-cluster--left", children: [onClose ? (_jsx("button", { type: "button", className: "editor-stage-orb-button", onClick: onClose, "aria-label": "Close editor", title: "Close editor", children: _jsx(EditorStageBackIcon, {}) })) : null, _jsx("button", { type: "button", className: "editor-stage-orb-button", onClick: performUndo, disabled: !canUndo, title: "Undo", children: _jsx(EditorStageUndoIcon, {}) }), _jsx("button", { type: "button", className: "editor-stage-orb-button", onClick: performRedo, disabled: !canRedo, title: "Redo", children: _jsx(EditorStageRedoIcon, {}) }), _jsx("button", { type: "button", className: "editor-stage-orb-button editor-stage-orb-button--danger", onClick: deleteSelected, disabled: !selectedObjectIds.length, title: "Delete selected", children: _jsx(EditorStageTrashIcon, {}) })] }), _jsxs("div", { className: "editor-stage-scrollbar-shell", children: [_jsx("button", { type: "button", className: "editor-stage-orb-button editor-stage-orb-button--slider", onClick: () => {
                                                                setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
                                                                setZoom(1);
                                                            }, title: "Reset camera", children: "\u2194" }), _jsxs("div", { className: "editor-stage-scrollbar-track editor-stage-scrollbar-track--desktop", children: [_jsxs("div", { className: "editor-stage-scrollbar-copy", children: [_jsx("span", { children: "Stage Scroll" }), _jsxs("strong", { children: [Math.round(horizontalScrollValue), " / ", Math.max(0, Math.round(horizontalScrollMax))] })] }), _jsx("input", { type: "range", min: 0, max: Math.max(horizontalScrollMax, 0), step: 1, value: horizontalScrollValue, disabled: horizontalScrollMax <= 0, className: "editor-horizontal-scroll editor-horizontal-scroll--desktop", "aria-label": "Horizontal stage scroll", onChange: (event) => setHorizontalScrollPosition(Number(event.target.value)) })] })] }), _jsxs("div", { className: "editor-stage-topbar-cluster editor-stage-topbar-cluster--right", children: [_jsx("button", { type: "button", className: "editor-stage-orb-button", onClick: openSetupPanel, title: "Open setup", children: "\u2699" }), _jsx("button", { type: "button", className: cn('editor-stage-orb-button', showPreview ? 'is-active' : ''), onClick: toggleGameplayPreview, title: "Open test preview", children: showPreview ? '■' : '▶' })] })] }) }), _jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--desktop-left", children: _jsxs("div", { className: "editor-stage-utility-stack", children: [_jsx("button", { type: "button", className: cn('editor-stage-utility-button', isMusicSyncPreviewActive ? 'is-active' : ''), onClick: () => launchMusicSyncPreview(), title: "Start music sync preview", children: _jsx(EditorStageMusicIcon, {}) }), _jsx("button", { type: "button", className: cn('editor-stage-utility-button', isInlineTestMode ? 'is-active' : ''), onClick: startInlineTestMode, title: "Start editor test play", children: _jsx(EditorStageTestPlayIcon, {}) }), _jsx("button", { type: "button", className: "editor-stage-utility-button", onClick: () => setZoom((current) => Math.min(2.4, current + 0.1)), title: "Zoom in", children: _jsx(EditorStageZoomIcon, { mode: "in" }) }), _jsx("button", { type: "button", className: "editor-stage-utility-button", onClick: () => setZoom((current) => Math.max(0.45, current - 0.1)), title: "Zoom out", children: _jsx(EditorStageZoomIcon, { mode: "out" }) })] }) })] })), _jsx("canvas", { ref: canvasRef, className: "editor-stage-canvas cursor-crosshair border-[4px] border-[#39105f] bg-[#130326]", "aria-label": "Level editor stage", style: {
                                    width: `${canvasViewport.width}px`,
                                    height: `${canvasViewport.height}px`,
                                }, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp, onPointerLeave: handlePointerUp, onContextMenu: (event) => event.preventDefault(), onAuxClick: (event) => {
                                    if (event.button === 1) {
                                        event.preventDefault();
                                    }
                                } }), isInlineTestMode ? (_jsxs("div", { className: "editor-inline-test-shell", role: "dialog", "aria-modal": "true", "aria-label": "Editor test play", children: [_jsxs("label", { className: "editor-inline-test-toggle", children: [_jsx("input", { type: "checkbox", checked: inlineTestShowTriggersOnPlayMode, onChange: (event) => setInlineTestShowTriggersOnPlayMode(event.target.checked) }), _jsx("span", { children: "Show triggers on play mode" })] }), _jsx("button", { type: "button", className: "editor-inline-test-stop", onClick: requestInlineTestStop, title: "Stop editor test play", "aria-label": "Stop editor test play", children: "Stop" }), _jsx(GameCanvas, { levelData: levelData, runId: `editor-inline-test-${inlineTestRunSeed}`, attemptNumber: 1, previewStartPosEnabled: true, previewStartPosInheritPortalState: false, showTriggersInPlayMode: inlineTestShowTriggersOnPlayMode, showHitboxes: editorShowHitboxes, stopSignal: inlineTestStopSignal, showRunPath: true, fullscreen: true, className: "editor-inline-test-runtime", onFail: ({ deathX, deathY, pathPoints }) => {
                                            setInlineTestPathPoints(pathPoints ?? []);
                                            setInlineTestDeathMarker(typeof deathX === 'number' && typeof deathY === 'number'
                                                ? { x: deathX, y: deathY }
                                                : null);
                                            stopInlineTestMode('Editor test play failed. The death marker was dropped where the run ended.');
                                        }, onComplete: ({ pathPoints }) => {
                                            setInlineTestPathPoints(pathPoints ?? []);
                                            setInlineTestDeathMarker(null);
                                            stopInlineTestMode('Editor test play completed.');
                                        }, onExitToMenu: ({ pathPoints }) => {
                                            setInlineTestPathPoints(pathPoints ?? []);
                                            stopInlineTestMode('Returned to the editor from test play.');
                                        }, onStop: ({ pathPoints }) => {
                                            setInlineTestPathPoints(pathPoints ?? []);
                                            setInlineTestDeathMarker(null);
                                            stopInlineTestMode('Editor test play stopped.');
                                        } }, `editor-inline-test-${inlineTestRunSeed}`)] })) : null, isEditorPauseMenuOpen ? (_jsx("div", { className: "editor-stage-pause-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Editor pause menu", children: _jsx("div", { className: "editor-stage-pause-panel", children: _jsxs("div", { className: "editor-stage-pause-actions", children: [_jsx("button", { type: "button", className: "editor-stage-pause-button", onClick: closeEditorPauseMenu, children: "Resume" }), _jsx("button", { type: "button", className: "editor-stage-pause-button", onClick: handlePauseSaveAndPlay, disabled: saveState === 'saving', children: saveState === 'saving' ? 'Saving...' : 'Save and Play' }), _jsx("button", { type: "button", className: "editor-stage-pause-button", onClick: handlePauseSaveAndExit, disabled: saveState === 'saving' || !onClose, children: "Save and Exit" }), _jsx("button", { type: "button", className: "editor-stage-pause-button", onClick: handlePauseSave, disabled: saveState === 'saving', children: saveState === 'saving' ? 'Saving...' : 'Save' }), _jsx("button", { type: "button", className: "editor-stage-pause-button", onClick: handlePauseExit, disabled: !onClose, children: "Exit" })] }) }) })) : null, isMobileLayout ? (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--right", children: _jsxs("div", { className: "editor-canvas-rail editor-canvas-rail--actions", children: [_jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: () => setZoom((current) => Math.min(2.4, current + 0.1)), children: "Zoom In" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: () => setZoom((current) => Math.max(0.45, current - 0.1)), children: "Zoom Out" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: () => {
                                                setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
                                                setZoom(1);
                                            }, children: "Home" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: performUndo, disabled: !canUndo, children: "Undo" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: performRedo, disabled: !canRedo, children: "Redo" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: duplicateSelected, disabled: !selectedObject, children: "Copy" }), _jsx("button", { type: "button", className: cn('editor-canvas-rail-button', isPaintPopupOpen ? 'is-active' : ''), onClick: () => setIsPaintPopupOpen((current) => !current), disabled: !canOpenPaintPopup, children: "Color" }), !hasLayerTwo ? (_jsx("button", { type: "button", className: "editor-canvas-rail-button", onClick: handleAddLayerTwo, title: "Enable a second build layer", children: "Add L2" })) : null, _jsx("button", { type: "button", className: cn('editor-canvas-rail-button', activeEditorLayer === 1 ? 'is-active' : ''), onClick: () => handleEditorLayerSelect(1), title: "Build on layer 1", children: "L1" }), hasLayerTwo ? (_jsx("button", { type: "button", className: cn('editor-canvas-rail-button', activeEditorLayer === 2 ? 'is-active' : ''), onClick: () => handleEditorLayerSelect(2), title: "Build on layer 2", children: "L2" })) : null, _jsx("button", { type: "button", className: cn('editor-canvas-rail-button', placementMode === 'single' ? 'is-active' : ''), onClick: () => setPlacementMode('single'), title: "Place one object per click", children: "Snap" }), _jsx("button", { type: "button", className: cn('editor-canvas-rail-button', placementMode === 'drag' ? 'is-active' : ''), onClick: () => setPlacementMode('drag'), title: dragPlacementAvailable
                                                ? 'Hold and drag through new cells to place continuously'
                                                : 'Drag mode works with blocks, hazards, boosts, and most portals', children: "Swipe" }), _jsx("button", { type: "button", className: "editor-canvas-rail-button editor-canvas-rail-button--danger", onClick: deleteSelected, disabled: !selectedObject, children: "Delete" }), _jsx("button", { type: "button", className: cn('editor-canvas-rail-button', showPreview ? 'is-active' : ''), onClick: toggleGameplayPreview, children: showPreview ? 'Hide Test' : 'Test' })] }) })) : (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--desktop-right", children: _jsxs("div", { className: "editor-stage-action-grid", children: [_jsx("button", { type: "button", className: "editor-stage-action-button", onClick: duplicateSelected, disabled: !selectedObjectIds.length, children: "Copy" }), _jsx("button", { type: "button", className: "editor-stage-action-button", disabled: true, children: "Paste" }), _jsx("button", { type: "button", className: "editor-stage-action-button", onClick: duplicateSelected, disabled: !selectedObjectIds.length, children: "Copy + Paste" }), _jsx("button", { type: "button", className: "editor-stage-action-button", onClick: () => {
                                                setEditorWorkspaceMode('edit');
                                                openSetupPanel();
                                            }, children: "Edit Special" }), _jsx("button", { type: "button", className: cn('editor-stage-action-button', isPaintPopupOpen ? 'is-active' : ''), onClick: () => setIsPaintPopupOpen((current) => !current), disabled: !canOpenPaintPopup, children: "Edit Group" }), _jsx("button", { type: "button", className: cn('editor-stage-action-button', isEditObjectPopupOpen ? 'is-active' : ''), onClick: toggleEditObjectPopup, disabled: !canOpenSelectedObjectPaintPopup && !canOpenTriggerPopup, children: "Edit Object" }), _jsx("button", { type: "button", className: "editor-stage-action-button", disabled: true, children: "Copy Values" }), _jsx("button", { type: "button", className: "editor-stage-action-button", disabled: true, children: "Paste State" }), _jsx("button", { type: "button", className: "editor-stage-action-button", onClick: () => setIsPaintPopupOpen(true), disabled: !canOpenPaintPopup, children: "Paste Color" }), _jsx("button", { type: "button", className: cn('editor-stage-action-button', isPaintPopupOpen ? 'is-active' : ''), onClick: () => setIsPaintPopupOpen((current) => !current), disabled: !canOpenPaintPopup, children: "Color" }), _jsx("button", { type: "button", className: cn('editor-stage-action-button', activeEditorLayer === 2 ? 'is-active' : ''), onClick: () => {
                                                if (!hasLayerTwo) {
                                                    handleAddLayerTwo();
                                                    return;
                                                }
                                                handleEditorLayerSelect(activeEditorLayer === 1 ? 2 : 1);
                                            }, children: "Go To Layer" }), _jsx("button", { type: "button", className: "editor-stage-action-button", onClick: clearSelection, disabled: !selectedObjectIds.length, children: "De-Select" })] }) })), isTriggerPopupOpen && selectedTriggerObject ? (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--paint editor-canvas-overlay--paint-editor", children: _jsx("div", { className: "editor-object-color-dialog editor-trigger-dialog", children: _jsxs("div", { className: "editor-object-color-shell editor-trigger-shell", children: [_jsxs("div", { className: "editor-trigger-header", children: [_jsx("div", { className: "editor-trigger-info-pill", "aria-hidden": "true", children: "i" }), _jsxs("div", { className: "editor-trigger-header-copy", children: [_jsx("h4", { className: "font-display text-[2.2rem] text-[#ffd44a]", children: getTriggerSetupTitle(selectedTriggerObject.type) }), _jsxs("div", { className: "editor-trigger-header-meta", children: [_jsx(Badge, { tone: "accent", children: selectedDefinition?.label ?? selectedTriggerObject.type }), _jsx(Badge, { tone: "default", children: selectedPaintGroupTriggerObject
                                                                            ? `Group ${Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}`
                                                                            : 'Scene FX' })] })] }), _jsx("button", { type: "button", className: "editor-canvas-popup-close editor-object-color-close", onClick: () => setIsTriggerPopupOpen(false), children: "Close" })] }), _jsxs("div", { className: "editor-trigger-grid", children: [selectedPaintGroupTriggerObject ? (_jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Group ID" }), _jsxs("div", { className: "editor-trigger-stepper", children: [_jsx("button", { type: "button", className: "editor-trigger-stepper-button", onClick: () => nudgeSelectedTriggerGroupId(-1), children: '<' }), _jsx("input", { className: "editor-trigger-input editor-trigger-input--stepper", type: "number", min: "1", max: String(PAINT_GROUP_SLOT_COUNT), value: Number(selectedPaintGroupTriggerObject.props.groupId ?? 1), onChange: (event) => updateSelectedTriggerNumericProp('groupId', event.target.value, {
                                                                            min: 1,
                                                                            max: PAINT_GROUP_SLOT_COUNT,
                                                                        }) }), _jsx("button", { type: "button", className: "editor-trigger-stepper-button", onClick: () => nudgeSelectedTriggerGroupId(1), children: '>' })] })] })) : null, selectedTriggerObject.type === 'MOVE_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Move X" }), _jsx("input", { className: "editor-trigger-input", type: "number", step: "0.5", value: Number(selectedTriggerObject.props.moveX ?? 2), onChange: (event) => updateSelectedTriggerNumericProp('moveX', event.target.value) })] }), _jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Move Y" }), _jsx("input", { className: "editor-trigger-input", type: "number", step: "0.5", value: Number(selectedTriggerObject.props.moveY ?? 0), onChange: (event) => updateSelectedTriggerNumericProp('moveY', event.target.value) })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Move Time" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0.01", step: "0.05", value: Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2)), onChange: (event) => updateSelectedTriggerDurationSeconds(event.target.value) })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Easing" }), _jsx("select", { className: "editor-trigger-select", value: String(selectedTriggerObject.props.easing ?? 'none'), onChange: (event) => updateSelectedTriggerStringProp('easing', event.target.value), children: moveTriggerEasingOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] })] })) : null, selectedTriggerObject.type === 'ALPHA_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Fade Time" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0.01", step: "0.05", value: Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2)), onChange: (event) => updateSelectedTriggerDurationSeconds(event.target.value) })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsxs("span", { className: "editor-trigger-field-label", children: ["Opacity: ", Number(selectedTriggerObject.props.alpha ?? 0.35).toFixed(2)] }), _jsx("input", { className: "editor-trigger-range editor-trigger-range--alpha", type: "range", min: "0", max: "1", step: "0.05", value: Number(selectedTriggerObject.props.alpha ?? 0.35), onChange: (event) => updateSelectedTriggerNumericProp('alpha', event.target.value, { min: 0, max: 1 }) })] })] })) : null, selectedTriggerObject.type === 'TOGGLE_TRIGGER' ? (_jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Activate Group" }), _jsxs("div", { className: "editor-trigger-toggle-row", children: [_jsx("button", { type: "button", className: cn('editor-trigger-choice-button', selectedTriggerObject.props.enabled ? 'is-active' : ''), onClick: () => updateSelectedTriggerBooleanProp('enabled', true), children: "On" }), _jsx("button", { type: "button", className: cn('editor-trigger-choice-button', !selectedTriggerObject.props.enabled ? 'is-active' : ''), onClick: () => updateSelectedTriggerBooleanProp('enabled', false), children: "Off" })] })] })) : null, selectedTriggerObject.type === 'PULSE_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Pulse Color" }), _jsxs("div", { className: "editor-trigger-color-row", children: [_jsxs("label", { className: "editor-trigger-color-swatch", children: [_jsx("span", { children: "Fill" }), _jsx("span", { className: "editor-trigger-color-preview", style: {
                                                                                            backgroundColor: typeof selectedTriggerObject.props.fillColor === 'string'
                                                                                                ? selectedTriggerObject.props.fillColor
                                                                                                : '#ffffff',
                                                                                        } }), _jsx("input", { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.fillColor === 'string'
                                                                                            ? selectedTriggerObject.props.fillColor
                                                                                            : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('fillColor', event.target.value) })] }), _jsxs("label", { className: "editor-trigger-color-swatch", children: [_jsx("span", { children: "Stroke" }), _jsx("span", { className: "editor-trigger-color-preview", style: {
                                                                                            backgroundColor: typeof selectedTriggerObject.props.strokeColor === 'string'
                                                                                                ? selectedTriggerObject.props.strokeColor
                                                                                                : '#ffffff',
                                                                                        } }), _jsx("input", { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.strokeColor === 'string'
                                                                                            ? selectedTriggerObject.props.strokeColor
                                                                                            : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('strokeColor', event.target.value) })] })] })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Pulse Time" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0.01", step: "0.05", value: Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2)), onChange: (event) => updateSelectedTriggerDurationSeconds(event.target.value) })] })] })) : null, selectedTriggerObject.type === 'POST_FX_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Effect" }), _jsx("select", { className: "editor-trigger-select", value: String(selectedTriggerObject.props.effectType ?? 'flash'), onChange: (event) => updateSelectedTriggerStringProp('effectType', event.target.value), children: postFxEffectOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Strength" }), _jsx("input", { className: "editor-trigger-input", type: "number", step: "0.05", min: "0", max: "1.5", value: Number(selectedTriggerObject.props.intensity ?? 0.75), onChange: (event) => updateSelectedTriggerNumericProp('intensity', event.target.value, { min: 0, max: 1.5 }) })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Effect Time" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0.01", step: "0.05", value: Number((Number(selectedTriggerObject.props.durationMs ?? getDefaultTriggerDurationMs(selectedTriggerObject.type)) / 1000).toFixed(2)), onChange: (event) => updateSelectedTriggerDurationSeconds(event.target.value) })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Primary Color" }), _jsxs("label", { className: "editor-trigger-color-swatch editor-trigger-color-swatch--wide", children: [_jsx("span", { className: "editor-trigger-color-preview", style: {
                                                                                    backgroundColor: typeof selectedTriggerObject.props.primaryColor === 'string'
                                                                                        ? selectedTriggerObject.props.primaryColor
                                                                                        : '#ffffff',
                                                                                } }), _jsx("input", { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.primaryColor === 'string'
                                                                                    ? selectedTriggerObject.props.primaryColor
                                                                                    : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('primaryColor', event.target.value) })] })] }), _jsxs("div", { className: "editor-trigger-field editor-trigger-field--wide", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Secondary Color" }), _jsxs("label", { className: "editor-trigger-color-swatch editor-trigger-color-swatch--wide", children: [_jsx("span", { className: "editor-trigger-color-preview", style: {
                                                                                    backgroundColor: typeof selectedTriggerObject.props.secondaryColor === 'string'
                                                                                        ? selectedTriggerObject.props.secondaryColor
                                                                                        : '#7c3aed',
                                                                                } }), _jsx("input", { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.secondaryColor === 'string'
                                                                                    ? selectedTriggerObject.props.secondaryColor
                                                                                    : '#7c3aed', '#7c3aed'), onChange: (event) => updateSelectedTriggerStringProp('secondaryColor', event.target.value) })] })] }), selectedTriggerObject.props.effectType === 'blur' ? (_jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Blur Amount" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0", step: "0.5", value: Number(selectedTriggerObject.props.blurAmount ?? 8), onChange: (event) => updateSelectedTriggerNumericProp('blurAmount', event.target.value, { min: 0, max: 24 }) })] })) : null, selectedTriggerObject.props.effectType === 'scanlines' ? (_jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Line Density" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0.1", max: "1", step: "0.05", value: Number(selectedTriggerObject.props.scanlineDensity ?? 0.45), onChange: (event) => updateSelectedTriggerNumericProp('scanlineDensity', event.target.value, {
                                                                            min: 0.1,
                                                                            max: 1,
                                                                        }) })] })) : null, selectedTriggerObject.props.effectType === 'shake' ? (_jsxs("div", { className: "editor-trigger-field", children: [_jsx("span", { className: "editor-trigger-field-label", children: "Shake Power" }), _jsx("input", { className: "editor-trigger-input", type: "number", min: "0", max: "2", step: "0.05", value: Number(selectedTriggerObject.props.shakePower ?? 0.85), onChange: (event) => updateSelectedTriggerNumericProp('shakePower', event.target.value, { min: 0, max: 2 }) })] })) : null] })) : null] }), _jsxs("div", { className: "editor-trigger-footer", children: [_jsx("div", { className: "editor-trigger-check-grid", children: _jsxs("button", { type: "button", className: cn('editor-trigger-check-button', String(selectedTriggerObject.props.activationMode ?? 'zone') === 'touch' ? 'is-active' : ''), onClick: () => updateSelectedTriggerStringProp('activationMode', String(selectedTriggerObject.props.activationMode ?? 'zone') === 'touch' ? 'zone' : 'touch'), children: [_jsx("span", { className: "editor-trigger-check-box" }), _jsx("span", { children: "Touch Trigger" })] }) }), _jsx("div", { className: "editor-object-color-confirm-row editor-trigger-confirm-row", children: _jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--confirm", onClick: () => setIsTriggerPopupOpen(false), children: "OK" }) })] })] }) }) })) : isPaintPopupOpen && paintableSelectedObject ? (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--paint editor-canvas-overlay--paint-editor", children: _jsxs("div", { className: "editor-object-color-dialog", children: [_jsxs("div", { className: "editor-object-color-topbar", children: [_jsx("button", { type: "button", className: "editor-object-color-chip editor-object-color-chip--active", children: "Base" }), _jsx("button", { type: "button", className: "editor-object-color-hsv-trigger", onClick: openSelectedObjectPaintHsv, children: "HSV" }), _jsx("button", { type: "button", className: "editor-canvas-popup-close editor-object-color-close", onClick: () => setIsPaintPopupOpen(false), children: "Close" })] }), _jsxs("div", { className: "editor-object-color-shell", children: [_jsxs("div", { className: "editor-object-color-header", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.18em] text-[#ffe18a]", children: "Edit Object" }), _jsx("h4", { className: "font-display text-[2rem] text-[#ffd44a]", children: "Base Color" })] }), _jsxs("div", { className: "editor-object-color-meta", children: [_jsx(Badge, { tone: "accent", children: selectedDefinition?.label ?? paintableSelectedObject.type }), _jsx(Badge, { tone: "default", children: selectedPaintGroupId ? `Group ${selectedPaintGroupId}` : 'Direct Color' })] })] }), _jsx("div", { className: "editor-object-color-subcopy", children: selectedPaintGroupId
                                                        ? 'Changing OBJ color updates every object that uses this group.'
                                                        : 'Pick a group first if you want multiple objects to share the same color.' }), _jsx("div", { className: "editor-object-color-group-grid", children: Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                                                        const groupId = index + 1;
                                                        const group = getColorGroupById(colorGroups, groupId);
                                                        const isCurrentGroup = selectedPaintGroupId === groupId;
                                                        return (_jsxs("button", { type: "button", className: cn('editor-object-color-group-button', isCurrentGroup ? 'is-active' : ''), onClick: () => assignSelectedObjectToPaintGroup(groupId), children: [_jsx("span", { className: "editor-object-color-group-number", children: groupId }), _jsx("span", { className: "editor-object-color-group-preview", children: _jsx("span", { className: "editor-object-color-group-swatch", style: { backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.14)' } }) })] }, groupId));
                                                    }) }), _jsxs("div", { className: "editor-object-color-footer", children: [_jsxs("div", { className: "editor-object-color-actions", children: [_jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--ghost", onClick: assignSelectedObjectToNextFreePaintGroup, disabled: !nextFreePaintGroupId, children: "Next Free" }), _jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--ghost", onClick: resetSelectedObjectPaintToDefault, children: "Default" }), selectedPaintGroupId ? (_jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--ghost", onClick: detachSelectedObjectFromPaintGroup, children: "Detach" })) : null] }), _jsxs("div", { className: "editor-object-color-confirm-row", children: [_jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--confirm", onClick: () => setIsPaintPopupOpen(false), children: "OK" }), _jsxs("label", { className: "editor-object-color-swatch-control", children: [_jsx("span", { className: "editor-object-color-swatch-label", children: "OBJ" }), _jsx("span", { className: "editor-object-color-swatch-preview", style: { backgroundColor: selectedPaintFillColor } }), _jsx("input", { type: "color", "aria-label": "Selected object color", value: getEditorColorInputValue(selectedPaintFillColor, levelObjectDefinitions[paintableSelectedObject.type].color), onChange: (event) => updateSelectedObjectPaint('fillColor', event.target.value) })] })] })] })] }), isPaintHsvPopupOpen ? (_jsx("div", { className: "editor-object-hsv-overlay", children: _jsxs("div", { className: "editor-object-hsv-dialog", children: [_jsxs("div", { className: "editor-object-hsv-header", children: [_jsx("h5", { className: "font-display text-[2rem] text-[#ffd44a]", children: "Base HSV" }), _jsx("button", { type: "button", className: "editor-object-hsv-trash", onClick: resetSelectedObjectPaintHsv, title: "Reset HSV", children: "Reset" })] }), _jsxs("div", { className: "editor-object-hsv-panel", children: [_jsxs("label", { className: "editor-object-hsv-row", children: [_jsxs("div", { className: "editor-object-hsv-copy", children: [_jsx("span", { children: "Hue" }), _jsx("strong", { children: Math.round(paintHsvState.hue) })] }), _jsx("input", { type: "range", min: "0", max: "360", step: "1", value: paintHsvState.hue, onChange: (event) => handleSelectedObjectPaintHsvChange({ hue: Number(event.target.value) }) })] }), _jsxs("label", { className: "editor-object-hsv-row", children: [_jsxs("div", { className: "editor-object-hsv-copy", children: [_jsx("span", { children: "Saturation" }), _jsx("strong", { children: paintHsvState.saturation.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "2", step: "0.01", value: paintHsvState.saturation, onChange: (event) => handleSelectedObjectPaintHsvChange({ saturation: Number(event.target.value) }) })] }), _jsxs("label", { className: "editor-object-hsv-row", children: [_jsxs("div", { className: "editor-object-hsv-copy", children: [_jsx("span", { children: "Brightness" }), _jsx("strong", { children: paintHsvState.brightness.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "2", step: "0.01", value: paintHsvState.brightness, onChange: (event) => handleSelectedObjectPaintHsvChange({ brightness: Number(event.target.value) }) })] })] }), _jsx("div", { className: "editor-object-hsv-footer", children: _jsx("button", { type: "button", className: "editor-object-color-action editor-object-color-action--confirm", onClick: confirmSelectedObjectPaintHsv, children: "OK" }) })] }) })) : null] }) })) : isPaintPopupOpen ? (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--paint", children: _jsxs("div", { className: "editor-canvas-popup editor-canvas-paint-popup", children: [_jsxs("div", { className: "editor-canvas-popup-header", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.18em] text-[#ffd44a]", children: "Paint & Groups" }), _jsx("h4", { className: "font-display text-xl text-white", children: activePaintTool ? levelObjectDefinitions[activePaintTool].label : 'Placement Paint' })] }), _jsx("button", { type: "button", className: "editor-canvas-popup-close", onClick: () => setIsPaintPopupOpen(false), children: "Close" })] }), _jsx("div", { className: "editor-note-box px-4 py-3 text-sm text-white/72", children: "Choose a saved group for new blocks, spikes, and saws, or select an existing painted object to write its colors into one of the groups below." }), _jsxs("div", { className: "editor-paint-groups", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Color Groups" }), _jsx(Badge, { tone: "accent", children: activePaintGroupId ? `Placing: Group ${activePaintGroupId}` : 'Placing: Direct' })] }), _jsx("div", { className: "editor-paint-group-grid", children: Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                                                        const groupId = index + 1;
                                                        const group = getColorGroupById(colorGroups, groupId);
                                                        return (_jsxs("button", { type: "button", className: cn('editor-paint-group-button', activePaintGroupId === groupId ? 'is-active' : ''), onClick: () => setActivePaintGroupId(groupId), disabled: !group, children: [_jsxs("span", { className: "editor-paint-group-title", children: ["Group ", groupId] }), _jsxs("span", { className: "editor-paint-group-swatches", children: [_jsx("span", { className: "editor-paint-group-swatch", style: { backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.12)' } }), _jsx("span", { className: "editor-paint-group-swatch", style: { backgroundColor: group?.strokeColor ?? 'rgba(255,255,255,0.28)' } })] }), _jsx("span", { className: "editor-paint-group-status", children: group ? 'Saved' : 'Empty' })] }, groupId));
                                                    }) }), _jsx("div", { className: "editor-paint-inline-actions", children: _jsx(Button, { variant: "ghost", onClick: () => setActivePaintGroupId(null), children: "Place Direct" }) })] })] }) })) : null, isMobileLayout ? (_jsx("div", { className: "editor-canvas-overlay editor-canvas-overlay--bottom", children: _jsxs("div", { className: "editor-canvas-toolstrip", children: [_jsxs("div", { className: "editor-canvas-toolstrip-header", children: [_jsxs("div", { className: "editor-canvas-toolstrip-copy", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.18em] text-[#ffd44a]", children: paletteDrawer ? paletteDrawer.title : 'Build Drawer' }), _jsx("p", { className: "text-sm text-white/72", children: paletteDrawer
                                                                ? 'Pick the exact piece you want to place.'
                                                                : 'Choose a lane on the left to open the picker.' })] }), paletteDrawer ? (_jsx("button", { type: "button", className: "editor-canvas-drawer-close", onClick: () => setPaletteDrawerGroup(null), children: "Close" })) : (_jsx(Badge, { tone: "accent", children: activeToolLabel }))] }), _jsxs("div", { className: "editor-inline-actions", children: [!hasLayerTwo ? (_jsx(Button, { variant: "ghost", onClick: handleAddLayerTwo, children: "Add Layer 2" })) : null, _jsx(Button, { variant: activeEditorLayer === 1 ? 'primary' : 'ghost', onClick: () => handleEditorLayerSelect(1), children: "Build Layer 1" }), hasLayerTwo ? (_jsx(Button, { variant: activeEditorLayer === 2 ? 'primary' : 'ghost', onClick: () => handleEditorLayerSelect(2), children: "Build Layer 2" })) : null, _jsx(Button, { variant: placementMode === 'single' ? 'primary' : 'ghost', onClick: () => setPlacementMode('single'), children: "Single Place" }), _jsx(Button, { variant: placementMode === 'drag' ? 'primary' : 'ghost', onClick: () => setPlacementMode('drag'), children: "Drag Place" })] }), paletteDrawer ? (_jsx("div", { className: "editor-canvas-toolstrip-row", children: paletteDrawer.items.map((tool) => (_jsx(ToolButton, { tool: tool, label: tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label, description: toolDescriptions[tool], active: selectedTool === tool, compact: true, onClick: () => handleToolSelect(tool) }, tool))) })) : (_jsxs("div", { className: "editor-canvas-toolstrip-empty", children: [_jsx("span", { className: "font-display text-[10px] tracking-[0.16em] text-[#ffd44a]", children: "Current Tool" }), _jsx("strong", { children: activeToolLabel }), _jsx("span", { children: activeToolDescription })] }))] }) })) : (_jsxs("div", { className: "editor-canvas-overlay editor-canvas-overlay--desktop-bottom", children: [_jsx("div", { className: "editor-stage-category-row", children: desktopPaletteGroups.map((group) => (_jsxs("button", { type: "button", className: cn('editor-stage-category-button', desktopActivePaletteGroupTitle === group.title ? 'is-active' : ''), onClick: () => handleDesktopPaletteGroupSelect(group.title), title: group.title, children: [_jsx(ToolButtonPreview, { tool: getDesktopPalettePreviewTool(group.title), active: desktopActivePaletteGroupTitle === group.title }), _jsx("span", { children: getPaletteGroupButtonLabel(group.title) })] }, group.title))) }), _jsxs("div", { className: "editor-stage-bottom-shell", children: [_jsxs("div", { className: "editor-stage-mode-stack", children: [_jsx("button", { type: "button", className: cn('editor-stage-mode-button', editorWorkspaceMode === 'build' ? 'is-active' : ''), onClick: () => setEditorWorkspaceMode('build'), children: "Build" }), _jsx("button", { type: "button", className: cn('editor-stage-mode-button', editorWorkspaceMode === 'edit' ? 'is-active' : ''), onClick: () => {
                                                            setEditorWorkspaceMode('edit');
                                                            setSelectedTool('select');
                                                        }, children: "Edit" }), _jsx("button", { type: "button", className: "editor-stage-mode-button editor-stage-mode-button--danger", onClick: deleteSelected, disabled: !selectedObjectIds.length, children: "Delete" })] }), _jsx("div", { className: "editor-stage-tray-window", children: editorWorkspaceMode === 'build' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-stage-tray-toolbar", children: [_jsx("button", { type: "button", className: "editor-stage-tray-arrow", onClick: () => cycleDesktopPaletteGroup(-1), "aria-label": "Previous category", title: "Previous category", children: '<' }), _jsxs("div", { className: "editor-stage-tray-copy", children: [_jsx("span", { children: trayPaletteGroup?.title ?? 'Build' }), _jsx("strong", { children: trayPaletteGroup ? desktopPaletteGroupIndex + 1 : 0 })] }), _jsx("button", { type: "button", className: "editor-stage-tray-arrow", onClick: () => cycleDesktopPaletteGroup(1), "aria-label": "Next category", title: "Next category", children: '>' })] }), trayPaletteGroup ? (_jsx("div", { className: "editor-stage-tray-grid", children: trayPaletteGroup.items.map((tool) => (_jsx(ToolButton, { tool: tool, label: tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label, description: toolDescriptions[tool], active: selectedTool === tool, compact: true, hideDescription: true, hideLabel: true, onClick: () => handleToolSelect(tool) }, tool))) })) : (_jsx("div", { className: "editor-stage-quick-edit-empty", children: "Pick a lane above to load build pieces into the tray." }))] })) : (_jsxs("div", { className: "editor-stage-quick-edit", children: [_jsxs("div", { className: "editor-stage-quick-edit-header", children: [_jsxs("div", { children: [_jsx("span", { children: "Edit Tray" }), _jsx("strong", { children: selectedObject ? selectedDefinition?.label ?? selectedObject.type : 'Nothing selected' })] }), _jsx(Badge, { tone: "accent", children: selectionLabel })] }), selectedObject ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "editor-stage-quick-edit-stats", children: [_jsxs("div", { className: "editor-stage-quick-stat", children: [_jsx("span", { children: "Pos" }), _jsxs("strong", { children: [selectedObject.x, ", ", selectedObject.y] })] }), _jsxs("div", { className: "editor-stage-quick-stat", children: [_jsx("span", { children: "Size" }), _jsxs("strong", { children: [selectedObject.w, " x ", selectedObject.h] })] }), _jsxs("div", { className: "editor-stage-quick-stat", children: [_jsx("span", { children: "Layer" }), _jsx("strong", { children: selectedObject.editorLayer })] }), _jsxs("div", { className: "editor-stage-quick-stat", children: [_jsx("span", { children: "Rotate" }), _jsxs("strong", { children: [normalizedSelectedRotation, "deg"] })] })] }), _jsxs("div", { className: "editor-stage-quick-edit-actions", children: [_jsx("button", { type: "button", className: "editor-stage-mode-grid-button", onClick: () => rotateSelectedObject(-1), children: "Rotate L" }), _jsx("button", { type: "button", className: "editor-stage-mode-grid-button", onClick: () => rotateSelectedObject(1), children: "Rotate R" }), _jsx("button", { type: "button", className: "editor-stage-mode-grid-button", onClick: () => setIsPaintPopupOpen(true), disabled: !canOpenPaintPopup, children: "Paint" }), _jsx("button", { type: "button", className: "editor-stage-mode-grid-button", onClick: clearSelection, children: "Clear" })] })] })) : (_jsx("div", { className: "editor-stage-quick-edit-empty", children: "Select an object on the stage, then switch to Edit for quick tweaks." }))] })) }), _jsxs("div", { className: "editor-stage-mode-grid", children: [_jsx("button", { type: "button", className: cn('editor-stage-mode-grid-button', placementMode === 'drag' ? 'is-active' : ''), onClick: () => setPlacementMode('drag'), title: dragPlacementAvailable
                                                            ? 'Hold and drag through new cells to place continuously'
                                                            : 'Drag mode works with blocks, hazards, boosts, and most portals', children: "Swipe" }), _jsx("button", { type: "button", className: "editor-stage-mode-grid-button", onClick: () => rotateSelectedObject(1), disabled: !selectedObject, children: "Rotate" }), _jsx("button", { type: "button", className: cn('editor-stage-mode-grid-button', selectedTool === 'select' ? 'is-active' : ''), onClick: () => handleToolSelect('select'), children: "Free Move" }), _jsx("button", { type: "button", className: cn('editor-stage-mode-grid-button', placementMode === 'single' ? 'is-active' : ''), onClick: () => setPlacementMode('single'), children: "Snap" })] })] })] }))] }), isMobileLayout ? (_jsxs("div", { className: "editor-stage-footer", children: [_jsxs("div", { className: "editor-stage-scrollbar-row", children: [_jsx(Button, { variant: "ghost", onClick: () => setHorizontalScrollPosition(horizontalScrollValue - 8), disabled: horizontalScrollMax <= 0, children: "Left" }), _jsxs("div", { className: "editor-stage-scrollbar-track", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 text-xs text-white/72", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.18em] text-[#ffd44a]", children: "Stage Scroll" }), _jsxs("p", { children: ["X: ", _jsx("span", { className: "text-white", children: Math.round(horizontalScrollValue) }), " /", ' ', _jsx("span", { className: "text-white", children: Math.max(0, Math.round(horizontalScrollMax)) })] })] }), _jsx("input", { type: "range", min: 0, max: Math.max(horizontalScrollMax, 0), step: 1, value: horizontalScrollValue, disabled: horizontalScrollMax <= 0, className: "editor-horizontal-scroll", "aria-label": "Horizontal stage scroll", onChange: (event) => setHorizontalScrollPosition(Number(event.target.value)) })] }), _jsx(Button, { variant: "ghost", onClick: () => setHorizontalScrollPosition(horizontalScrollValue + 8), disabled: horizontalScrollMax <= 0, children: "Right" })] }), _jsxs("div", { className: "editor-stage-meta", children: [_jsxs("p", { children: ["Tool: ", _jsx("span", { className: "text-white", children: activeToolLabel })] }), _jsxs("p", { children: ["Selected: ", _jsx("span", { className: "text-white", children: selectionLabel })] }), _jsxs("p", { children: ["Cursor: ", _jsxs("span", { className: "text-white", children: [cursorWorld.x, ", ", cursorWorld.y] })] }), _jsxs("p", { children: ["Zoom: ", _jsxs("span", { className: "text-white", children: [zoom.toFixed(2), "x"] })] }), _jsxs("p", { children: ["Objects: ", _jsx("span", { className: "text-white", children: levelData.objects.length })] }), _jsxs("p", { children: ["History: ", _jsx("span", { className: "text-white", children: historyPosition })] })] })] })) : null, message ? (_jsx("div", { className: cn('editor-note-box px-4 py-3 text-sm', saveState === 'error' ? 'text-[#ff8aa1]' : 'text-[#82f6ff]'), children: message })) : null] }), showPreview ? (_jsxs("div", { className: "editor-mobile-preview-shell", role: "dialog", "aria-modal": "true", "aria-label": "Editor preview", children: [_jsxs("div", { className: "editor-mobile-preview-actions", "aria-label": "Preview controls", children: [_jsx("button", { type: "button", className: "editor-mobile-preview-action", onClick: () => setPreviewRunSeed((current) => current + 1), "aria-label": "Restart preview", title: "Restart preview", children: _jsx("span", { "aria-hidden": "true", children: "\u21BB" }) }), _jsx("button", { type: "button", className: "editor-mobile-preview-action editor-mobile-preview-action--close", onClick: () => setShowPreview(false), "aria-label": "Close preview", title: "Close preview", children: _jsx("span", { "aria-hidden": "true", children: "\u00D7" }) })] }), _jsx(GameCanvas, { levelData: levelData, runId: `editor-preview-mobile-${previewRunSeed}`, attemptNumber: 1, autoRestartOnFail: true, previewStartPosEnabled: true, showHitboxes: editorShowHitboxes, fullscreen: true, className: "editor-mobile-preview-runtime", onExitToMenu: () => {
                            setShowPreview(false);
                            setMessage('Returned to the editor from preview.');
                        } }, `editor-preview-mobile-${previewRunSeed}`)] })) : null, _jsx("div", { ref: settingsPanelRef, className: cn('editor-level-settings-host', !isMobileLayout ? 'editor-level-settings-host--desktop' : '', showDesktopSetup ? 'is-open' : ''), children: _jsxs(Panel, { className: cn('game-screen space-y-4 bg-transparent editor-level-settings-panel', isMobileLayout && !isMobileSettingsExpanded ? 'editor-level-settings-panel--collapsed' : ''), children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.18em] text-[#ffd44a]", children: "Level Setup" }), _jsx("h3", { className: "font-display text-2xl text-white", children: "Level Settings" })] }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Badge, { tone: "accent", children: themePresets.find((preset) => preset.value === theme)?.label ?? 'Custom' }), isMobileLayout ? (_jsx(Button, { variant: "ghost", onClick: () => setIsMobileSettingsExpanded((current) => !current), children: isMobileSettingsExpanded ? 'Hide Setup' : 'Show Setup' })) : (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: handleSave, disabled: saveState === 'saving', children: saveState === 'saving' ? 'Saving...' : saveLabel }), onSubmit ? (_jsx(Button, { variant: "secondary", onClick: handleSubmit, disabled: hasStartPositions, title: hasStartPositions ? 'Remove all Start Pos markers before publishing' : undefined, children: "Submit" })) : null, _jsx(Button, { variant: "ghost", onClick: () => setShowDesktopSetup(false), children: "Close Setup" })] }))] })] }), isMobileLayout && !isMobileSettingsExpanded ? (_jsxs("div", { className: "editor-mobile-settings-summary", children: [_jsx(HintChip, { label: "Theme", value: themePresets.find((preset) => preset.value === theme)?.label ?? 'Custom' }), _jsx(HintChip, { label: "Mode", value: getPlayerModeLabel(levelData.player.mode) }), _jsx(HintChip, { label: "Objects", value: objectCount }), _jsx(HintChip, { label: "Start Pos", value: hasStartPositions ? String(startPosCount) : 'None' })] })) : null, !isMobileLayout || isMobileSettingsExpanded ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Title" }), _jsx(Input, { value: title, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Description" }), _jsx(Textarea, { rows: 4, value: description, onChange: (event) => setDescription(event.target.value) })] }), _jsxs("div", { className: "editor-inline-card space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Start Pos" }), _jsx("p", { className: "mt-1 text-sm text-white/68", children: "Start Pos markers affect editor preview only. Levels with Start Pos markers cannot be submitted." })] }), _jsx(Badge, { tone: hasStartPositions ? 'danger' : 'default', children: hasStartPositions ? `${startPosCount} active` : 'None' })] }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: "ghost", onClick: deleteAllStartPositions, disabled: !hasStartPositions, children: "Delete All Start Pos" }), _jsx(Badge, { tone: "accent", children: activePreviewStartPos ? `Preview starts at ${activePreviewStartPos.x}, ${activePreviewStartPos.y}` : 'Preview uses main start' })] })] }), _jsxs("div", { className: "editor-inline-card space-y-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Preview Helpers" }), _jsx("p", { className: "mt-1 text-sm text-white/68", children: "Extra debug overlays for editor test play and the mobile preview." })] }), _jsx("div", { className: "toggle-row", children: _jsxs("label", { className: "toggle-box cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: editorShowHitboxes, onChange: (event) => setEditorShowHitboxes(event.target.checked), style: { accentColor: '#9eff3d' } }), _jsxs("div", { children: [_jsx("p", { className: "editor-color-control-label", children: "Show Hitboxes" }), _jsx("p", { className: "text-sm text-white/68", children: "Draw the real player and object collision shapes on top of the preview." })] })] }) })] }), selectedObject ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Selected Object" }), _jsx("p", { className: "mt-1 text-sm text-white/68", children: "Fine-tune transform, layer, and object-specific behavior without leaving the editor." })] }), _jsx(Badge, { tone: "accent", children: selectedDefinition?.label ?? selectedObject.type })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "X" }), _jsx(Input, { type: "number", step: "0.5", value: selectedObject.x, onChange: (event) => updateSelectedObjectNumeric('x', event.target.value, { step: 0.5 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Y" }), _jsx(Input, { type: "number", step: "0.5", value: selectedObject.y, onChange: (event) => updateSelectedObjectNumeric('y', event.target.value, { step: 0.5 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Width" }), _jsx(Input, { type: "number", step: "0.5", min: "0.5", value: selectedObject.w, onChange: (event) => updateSelectedObjectNumeric('w', event.target.value, { min: 0.5, step: 0.5 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Height" }), _jsx(Input, { type: "number", step: "0.5", min: "0.5", value: selectedObject.h, onChange: (event) => updateSelectedObjectNumeric('h', event.target.value, { min: 0.5, step: 0.5 }) })] })] }), _jsxs("div", { className: "grid gap-3 lg:grid-cols-3", children: [_jsxs("div", { className: "editor-inline-card", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Rotation" }), _jsxs(Badge, { tone: "default", children: [normalizedSelectedRotation, "deg"] })] }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: "ghost", onClick: () => rotateSelectedObject(-1), children: "Rotate -90" }), _jsx(Button, { variant: "ghost", onClick: () => rotateSelectedObject(1), children: "Rotate +90" })] })] }), _jsxs("div", { className: "editor-inline-card", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Build Layer" }), _jsxs(Badge, { tone: "accent", children: ["Layer ", selectedObject.editorLayer] })] }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: selectedObject.editorLayer === 1 ? 'primary' : 'ghost', onClick: () => updateSelectedObjectEditorLayer(1), children: "Layer 1" }), _jsx(Button, { variant: selectedObject.editorLayer === 2 ? 'primary' : 'ghost', onClick: () => updateSelectedObjectEditorLayer(2), children: "Layer 2" })] })] }), _jsxs("div", { className: "editor-inline-card", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Runtime Layer" }), _jsx(Badge, { tone: "default", children: selectedObject.layer })] }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: selectedObject.layer === 'gameplay' ? 'primary' : 'ghost', onClick: () => updateSelectedObjectLayer('gameplay'), children: "Gameplay" }), _jsx(Button, { variant: selectedObject.layer === 'decoration' ? 'primary' : 'ghost', onClick: () => updateSelectedObjectLayer('decoration'), children: "Decoration" })] })] })] }), paintableSelectedObjects.length ? (_jsxs("div", { className: "editor-inline-card space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Assign Group" }), _jsx(Badge, { tone: "accent", children: paintableSelectedObjects.length > 1
                                                                ? `${paintableSelectedObjects.length} objects`
                                                                : selectedPaintGroupId
                                                                    ? `Group ${selectedPaintGroupId}`
                                                                    : 'Direct' })] }), _jsx("div", { className: "editor-inline-actions", children: Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                                                        const groupId = index + 1;
                                                        const isActive = selectedPaintGroupId === groupId;
                                                        return (_jsxs(Button, { variant: isActive ? 'primary' : 'ghost', className: "min-w-[4.25rem]", onClick: () => assignSelectedObjectToPaintGroup(groupId), children: ["Group ", groupId] }, groupId));
                                                    }) }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: "ghost", onClick: () => setIsPaintPopupOpen(true), children: "Open Paint" }), _jsx(Button, { variant: "ghost", onClick: detachSelectedObjectFromPaintGroup, children: "Detach Group" })] })] })) : null, selectedObject.type === 'JUMP_PAD' ? (_jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: _jsxs("div", { children: [_jsx(FieldLabel, { children: "Jump Boost" }), _jsx(Input, { type: "number", step: "0.1", min: "1", value: Number(selectedObject.props.boost ?? 16), onChange: (event) => updateSelectedObject((object) => {
                                                            object.props = {
                                                                ...object.props,
                                                                boost: Number(event.target.value),
                                                            };
                                                        }) })] }) })) : null, selectedObject.type === 'GRAVITY_PORTAL' ? (_jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: _jsxs("div", { children: [_jsx(FieldLabel, { children: "Gravity Direction" }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: Number(selectedObject.props.gravity ?? -1) === -1 ? 'primary' : 'ghost', onClick: () => updateSelectedObject((object) => {
                                                                    object.props = { ...object.props, gravity: -1 };
                                                                }), children: "Up" }), _jsx(Button, { variant: Number(selectedObject.props.gravity ?? -1) === 1 ? 'primary' : 'ghost', onClick: () => updateSelectedObject((object) => {
                                                                    object.props = { ...object.props, gravity: 1 };
                                                                }), children: "Down" })] })] }) })) : null, selectedObject.type === 'SPEED_PORTAL' ? (_jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: _jsxs("div", { children: [_jsx(FieldLabel, { children: "Speed Multiplier" }), _jsx(Input, { type: "number", step: "0.1", min: "0.2", value: Number(selectedObject.props.multiplier ?? 1.4), onChange: (event) => updateSelectedObject((object) => {
                                                            object.props = {
                                                                ...object.props,
                                                                multiplier: Number(event.target.value),
                                                            };
                                                        }) })] }) })) : null, isSawObjectType(selectedObject.type) ? (_jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: _jsxs("div", { children: [_jsx(FieldLabel, { children: "Rotation Speed (deg/s)" }), _jsx(Input, { type: "number", step: "10", value: Number(selectedObject.props.rotationSpeed ?? 240), onChange: (event) => updateSelectedObject((object) => {
                                                            object.props = {
                                                                ...object.props,
                                                                rotationSpeed: Number(event.target.value),
                                                            };
                                                        }) })] }) })) : null, selectedTriggerObject ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(FieldLabel, { children: "Trigger Settings" }), _jsx(Badge, { tone: "accent", children: selectedPaintGroupTriggerObject
                                                                ? `Group ${Number(selectedPaintGroupTriggerObject.props.groupId ?? 1)}`
                                                                : 'Post FX' })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Activation" }), _jsx(Select, { value: String(selectedTriggerObject.props.activationMode ?? 'zone'), onChange: (event) => updateSelectedTriggerStringProp('activationMode', event.target.value), children: triggerActivationModeOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), selectedPaintGroupTriggerObject ? (_jsxs("div", { children: [_jsx(FieldLabel, { children: "Target Group" }), _jsx(Input, { type: "number", min: "1", max: String(PAINT_GROUP_SLOT_COUNT), value: Number(selectedPaintGroupTriggerObject.props.groupId ?? 1), onChange: (event) => updateSelectedTriggerNumericProp('groupId', event.target.value, {
                                                                        min: 1,
                                                                        max: PAINT_GROUP_SLOT_COUNT,
                                                                    }) })] })) : null, selectedTriggerObject.type === 'MOVE_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Move X" }), _jsx(Input, { type: "number", step: "0.5", value: Number(selectedTriggerObject.props.moveX ?? 2), onChange: (event) => updateSelectedTriggerNumericProp('moveX', event.target.value) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Move Y" }), _jsx(Input, { type: "number", step: "0.5", value: Number(selectedTriggerObject.props.moveY ?? 0), onChange: (event) => updateSelectedTriggerNumericProp('moveY', event.target.value) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Duration (ms)" }), _jsx(Input, { type: "number", min: "1", value: Number(selectedTriggerObject.props.durationMs ?? 650), onChange: (event) => updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Easing" }), _jsx(Select, { value: String(selectedTriggerObject.props.easing ?? 'none'), onChange: (event) => updateSelectedTriggerStringProp('easing', event.target.value), children: moveTriggerEasingOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] })] })) : null, selectedTriggerObject.type === 'ALPHA_TRIGGER' ? (_jsxs("div", { children: [_jsx(FieldLabel, { children: "Alpha" }), _jsx(Input, { type: "number", step: "0.05", min: "0", max: "1", value: Number(selectedTriggerObject.props.alpha ?? 0.35), onChange: (event) => updateSelectedTriggerNumericProp('alpha', event.target.value, { min: 0, max: 1 }) })] })) : null, selectedTriggerObject.type === 'TOGGLE_TRIGGER' ? (_jsxs("div", { className: "sm:col-span-2", children: [_jsx(FieldLabel, { children: "Toggle Result" }), _jsxs("div", { className: "editor-inline-actions", children: [_jsx(Button, { variant: selectedTriggerObject.props.enabled ? 'primary' : 'ghost', onClick: () => updateSelectedObject((object) => {
                                                                                object.props = { ...object.props, enabled: true };
                                                                            }), children: "Show Group" }), _jsx(Button, { variant: !selectedTriggerObject.props.enabled ? 'primary' : 'ghost', onClick: () => updateSelectedObject((object) => {
                                                                                object.props = { ...object.props, enabled: false };
                                                                            }), children: "Hide Group" })] })] })) : null, selectedTriggerObject.type === 'PULSE_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Duration (ms)" }), _jsx(Input, { type: "number", min: "1", value: Number(selectedTriggerObject.props.durationMs ?? 900), onChange: (event) => updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Pulse Fill" }), _jsx(Input, { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.fillColor === 'string'
                                                                                ? selectedTriggerObject.props.fillColor
                                                                                : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('fillColor', event.target.value) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Pulse Stroke" }), _jsx(Input, { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.strokeColor === 'string'
                                                                                ? selectedTriggerObject.props.strokeColor
                                                                                : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('strokeColor', event.target.value) })] })] })) : null, selectedTriggerObject.type === 'POST_FX_TRIGGER' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Effect" }), _jsx(Select, { value: String(selectedTriggerObject.props.effectType ?? 'flash'), onChange: (event) => updateSelectedTriggerStringProp('effectType', event.target.value), children: postFxEffectOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Duration (ms)" }), _jsx(Input, { type: "number", min: "1", value: Number(selectedTriggerObject.props.durationMs ?? 900), onChange: (event) => updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Strength" }), _jsx(Input, { type: "number", step: "0.05", min: "0", max: "1.5", value: Number(selectedTriggerObject.props.intensity ?? 0.75), onChange: (event) => updateSelectedTriggerNumericProp('intensity', event.target.value, { min: 0, max: 1.5 }) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Primary Color" }), _jsx(Input, { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.primaryColor === 'string'
                                                                                ? selectedTriggerObject.props.primaryColor
                                                                                : '#ffffff', '#ffffff'), onChange: (event) => updateSelectedTriggerStringProp('primaryColor', event.target.value) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Secondary Color" }), _jsx(Input, { type: "color", value: getEditorColorInputValue(typeof selectedTriggerObject.props.secondaryColor === 'string'
                                                                                ? selectedTriggerObject.props.secondaryColor
                                                                                : '#7c3aed', '#7c3aed'), onChange: (event) => updateSelectedTriggerStringProp('secondaryColor', event.target.value) })] }), selectedTriggerObject.props.effectType === 'blur' ? (_jsxs("div", { children: [_jsx(FieldLabel, { children: "Blur Amount (px)" }), _jsx(Input, { type: "number", min: "0", step: "0.5", value: Number(selectedTriggerObject.props.blurAmount ?? 8), onChange: (event) => updateSelectedTriggerNumericProp('blurAmount', event.target.value, { min: 0, max: 24 }) })] })) : null, selectedTriggerObject.props.effectType === 'scanlines' ? (_jsxs("div", { children: [_jsx(FieldLabel, { children: "Line Density" }), _jsx(Input, { type: "number", min: "0.1", max: "1", step: "0.05", value: Number(selectedTriggerObject.props.scanlineDensity ?? 0.45), onChange: (event) => updateSelectedTriggerNumericProp('scanlineDensity', event.target.value, {
                                                                                min: 0.1,
                                                                                max: 1,
                                                                            }) })] })) : null, selectedTriggerObject.props.effectType === 'shake' ? (_jsxs("div", { children: [_jsx(FieldLabel, { children: "Shake Power" }), _jsx(Input, { type: "number", min: "0", max: "2", step: "0.05", value: Number(selectedTriggerObject.props.shakePower ?? 0.85), onChange: (event) => updateSelectedTriggerNumericProp('shakePower', event.target.value, {
                                                                                min: 0,
                                                                                max: 2,
                                                                            }) })] })) : null] })) : null] })] })) : null] })) : null, _jsxs("div", { className: "space-y-3", children: [_jsx(FieldLabel, { children: "Theme Preset" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: themePresets.map((preset) => (_jsxs("button", { type: "button", onClick: () => applyThemePreset(preset.value), className: cn('tool-tile px-3 py-3 text-left transition', theme === preset.value ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110'), children: [_jsx("span", { className: "font-display block text-[10px] tracking-[0.18em] uppercase", children: preset.label }), _jsx("span", { className: cn('mt-1 block text-[10px] normal-case', theme === preset.value ? 'text-[#173300]/80' : 'text-white/60'), children: preset.value })] }, preset.value))) }), _jsx(Input, { value: theme, onChange: (event) => {
                                                applyThemePreset(event.target.value);
                                            } })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(FieldLabel, { children: "Ground Color" }), _jsx(Badge, { tone: levelData.meta.groundColor ? 'accent' : 'default', children: levelData.meta.groundColor ? 'Custom Ground' : 'Theme Ground' })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-[92px,1fr,auto]", children: [_jsx(Input, { type: "color", value: resolvedGroundColor, onChange: (event) => updateLevelData((draft) => {
                                                        draft.meta.groundColor = event.target.value;
                                                    }) }), _jsx(Input, { value: resolvedGroundColor, onChange: (event) => updateLevelData((draft) => {
                                                        draft.meta.groundColor = getEditorColorInputValue(event.target.value, resolvedGroundColor);
                                                    }) }), _jsx(Button, { variant: "ghost", onClick: () => updateLevelData((draft) => {
                                                        delete draft.meta.groundColor;
                                                    }), children: "Use Theme" })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(FieldLabel, { children: "Level Music" }), _jsx(Badge, { tone: resolvedMusic.src ? 'accent' : 'default', children: resolvedMusic.src ? 'Custom Track Ready' : 'No Custom Audio' })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Track Label" }), _jsx(Input, { value: musicLabelInput, placeholder: "My custom song", onChange: (event) => setMusicLabelInput(event.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(FieldLabel, { children: "Music URL" }), _jsxs("div", { className: "editor-music-url-row", children: [_jsx(Input, { value: musicUrlInput, placeholder: "https://example.com/track.mp3", onChange: (event) => setMusicUrlInput(event.target.value) }), _jsx(Button, { variant: "ghost", onClick: applyCustomMusicUrl, children: "Apply URL" })] })] }), _jsxs("div", { className: "editor-music-upload-row", children: [_jsxs("label", { className: "editor-music-upload-button", children: [_jsx("span", { children: "Upload Audio" }), _jsx("input", { type: "file", accept: "audio/*", onChange: handleMusicFilePicked })] }), _jsx(Button, { variant: "ghost", onClick: clearLevelMusic, children: "Clear Music" }), _jsx(Button, { variant: "ghost", onClick: restartPreviewFromMusicOffset, children: "Test Sync" })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Music Offset (ms)" }), _jsx(Input, { type: "number", min: "0", step: "10", value: musicOffsetMsValue, onChange: (event) => updateLevelData((draft) => {
                                                        draft.meta.musicOffsetMs = Math.max(0, Number(event.target.value) || 0);
                                                    }) })] }), _jsx("div", { className: "editor-note-box px-4 py-3 text-sm text-white/72", children: "Add your own track by URL or upload an audio file, then use offset plus sync test to line the song up with your gameplay. Uploaded files are embedded into the level data, so keep them reasonably small." }), resolvedMusic.src ? (_jsxs("div", { className: "editor-music-preview", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "editor-color-control-label", children: "Preview" }), _jsx("span", { className: "text-xs text-white/72", children: resolvedMusic.label })] }), _jsx("audio", { controls: true, preload: "metadata", src: resolvedMusic.src, className: "w-full" })] })) : null] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2 lg:grid-cols-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Player Mode" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: ['cube', 'ball', 'ship', 'arrow'].map((mode) => (_jsxs("button", { type: "button", onClick: () => setPlayerMode(mode), className: cn('tool-tile px-3 py-3 text-left transition', levelData.player.mode === mode ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110'), children: [_jsx("span", { className: "font-display block text-[10px] tracking-[0.18em] uppercase", children: getPlayerModeLabel(mode) }), _jsx("span", { className: cn('mt-1 block text-[10px] normal-case', levelData.player.mode === mode ? 'text-[#173300]/80' : 'text-white/60'), children: mode === 'ship'
                                                                    ? 'Hold to climb, release to descend'
                                                                    : mode === 'ball'
                                                                        ? 'Tap to flip gravity between floor and ceiling'
                                                                        : mode === 'arrow'
                                                                            ? 'Hold to rise, release to dive'
                                                                            : 'Classic jump timing' })] }, mode))) })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Auto Length Units" }), _jsx(Input, { type: "number", value: levelData.meta.lengthUnits, readOnly: true })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Base Speed" }), _jsx(Input, { type: "number", step: "0.1", value: levelData.player.baseSpeed, onChange: (event) => updateLevelData((draft) => {
                                                        draft.player.baseSpeed = Number(event.target.value);
                                                    }) })] })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [_jsx(HintChip, { label: "Objects", value: String(levelData.objects.length) }), _jsx(HintChip, { label: "Length", value: `${levelData.meta.lengthUnits} units` }), _jsx(HintChip, { label: "Base Speed", value: levelData.player.baseSpeed.toFixed(1) }), _jsx(HintChip, { label: "Mode", value: getPlayerModeLabel(levelData.player.mode) }), _jsx(HintChip, { label: "Theme", value: theme })] })] })) : (_jsx("div", { className: "editor-note-box px-4 py-3 text-sm text-white/72", children: "Mobile setup is collapsed so the stage stays front and center. Open it only when you need level tuning, music, or trigger details." }))] }) })] }));
}
function ToolButton({ tool, label, description, active, compact = false, hideDescription = false, hideLabel = false, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, title: label, className: cn('tool-tile text-left transition', compact ? 'px-2.5 py-2' : 'px-3 py-3', active ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110'), children: [_jsx(ToolButtonPreview, { tool: tool, active: active }), !hideLabel ? (_jsx("span", { className: cn('font-display block uppercase', compact ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]'), children: label })) : null, description && !hideDescription ? (_jsx("span", { className: cn('mt-1 block normal-case', compact ? 'text-[9px] leading-4' : 'text-[10px] leading-5', active ? 'text-[#173300]/80' : 'text-white/62'), children: description })) : null] }));
}
function ToolButtonPreview({ tool, active }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const width = 64;
        const height = 40;
        const renderScale = getCanvasRenderScale();
        canvas.width = Math.max(1, Math.floor(width * renderScale));
        canvas.height = Math.max(1, Math.floor(height * renderScale));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        context.imageSmoothingEnabled = true;
        const paintPreview = () => {
            context.clearRect(0, 0, width, height);
            if (tool === 'select' || tool === 'pan') {
                context.fillStyle = active ? 'rgba(23, 51, 0, 0.12)' : 'rgba(255,255,255,0.08)';
                context.fillRect(0, 0, width, height);
                context.strokeStyle = active ? 'rgba(23, 51, 0, 0.48)' : 'rgba(255,255,255,0.18)';
                context.lineWidth = 2;
                context.strokeRect(1, 1, width - 2, height - 2);
                context.fillStyle = active ? '#173300' : 'rgba(255,255,255,0.9)';
                context.font = "900 12px 'Arial Black', 'Trebuchet MS', 'Verdana', sans-serif";
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(tool === 'select' ? 'SEL' : 'PAN', width / 2, height / 2 + 0.5);
                return;
            }
            const definition = levelObjectDefinitions[tool];
            const object = {
                id: `preview-${tool}`,
                type: tool,
                x: 0,
                y: 0,
                w: definition.defaultSize.w,
                h: definition.defaultSize.h,
                rotation: 0,
                layer: tool === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
                editorLayer: 1,
                props: {},
            };
            const padding = 5;
            const scale = Math.min((width - padding * 2) / Math.max(object.w, 0.001), (height - padding * 2) / Math.max(object.h, 0.001));
            const drawWidth = object.w * scale;
            const drawHeight = object.h * scale;
            const drawX = (width - drawWidth) / 2;
            const drawY = (height - drawHeight) / 2;
            drawStageObjectSprite({
                context,
                object,
                x: drawX,
                y: drawY,
                w: drawWidth,
                h: drawHeight,
                fillColor: definition.color,
                strokeColor: definition.strokeColor,
                isActive: active,
                isUsedOrb: false,
            });
        };
        paintPreview();
        if (tool === 'select' || tool === 'pan') {
            return;
        }
        const sprite = getStageObjectPreviewSpriteImage(tool);
        if (!sprite || (sprite.complete && sprite.naturalWidth > 0)) {
            return;
        }
        const handleSpriteReady = () => {
            paintPreview();
        };
        sprite.addEventListener('load', handleSpriteReady);
        sprite.addEventListener('error', handleSpriteReady);
        return () => {
            sprite.removeEventListener('load', handleSpriteReady);
            sprite.removeEventListener('error', handleSpriteReady);
        };
    }, [tool, active]);
    return (_jsx("span", { className: "tool-tile-preview", "aria-hidden": "true", children: _jsx("canvas", { ref: canvasRef, width: 64, height: 40 }) }));
}
function HintChip({ label, value }) {
    return (_jsxs("div", { className: "editor-hint-box", children: [_jsx("p", { className: "font-display text-[9px] tracking-[0.16em] text-[#ffd44a]", children: label }), _jsx("p", { className: "mt-1 text-[11px] leading-5 text-white/78", children: value })] }));
}
function getCanvasScreenPoint(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const styles = window.getComputedStyle(canvas);
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(styles.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;
    const innerWidth = Math.max(1, rect.width - borderLeft - borderRight);
    const innerHeight = Math.max(1, rect.height - borderTop - borderBottom);
    const offsetX = clamp(clientX - rect.left - borderLeft, 0, innerWidth);
    const offsetY = clamp(clientY - rect.top - borderTop, 0, innerHeight);
    const logicalWidth = Number.parseFloat(canvas.dataset.logicalWidth ?? '') || innerWidth;
    const logicalHeight = Number.parseFloat(canvas.dataset.logicalHeight ?? '') || innerHeight;
    return {
        screenX: (offsetX / innerWidth) * logicalWidth,
        screenY: (offsetY / innerHeight) * logicalHeight,
    };
}
function getCanvasRenderScale() {
    if (typeof window === 'undefined') {
        return 1;
    }
    return Math.max(1, Math.min(2, window.devicePixelRatio || 1));
}
function screenToWorld(screenX, screenY, panX, panY, cell) {
    return {
        x: (screenX - panX) / cell,
        y: (screenY - panY) / cell,
    };
}
function worldToScreen(x, y, panX, panY, cell) {
    return {
        x: x * cell + panX,
        y: y * cell + panY,
    };
}
function buildEditorMusicSyncPreview(levelData, bootstrap, elapsedMs) {
    const levelEndX = computeAutoLevelFinishX(levelData);
    const speedPortals = levelData.objects
        .filter((object) => object.type === 'SPEED_PORTAL' && object.x + object.w >= bootstrap.startX)
        .sort((left, right) => left.x - right.x || left.y - right.y);
    let cursorX = bootstrap.startX;
    let currentSpeedMultiplier = Math.max(0.1, Number(bootstrap.speedMultiplier) || levelData.player.baseSpeed || 1);
    let remainingMs = Math.max(0, elapsedMs);
    for (const portal of speedPortals) {
        const portalX = clamp(portal.x, cursorX, levelEndX);
        if (portalX > cursorX) {
            const segmentDurationMs = ((portalX - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;
            if (remainingMs <= segmentDurationMs) {
                cursorX += (remainingMs / 1000) * BASE_HORIZONTAL_SPEED * currentSpeedMultiplier;
                remainingMs = 0;
                break;
            }
            remainingMs -= segmentDurationMs;
            cursorX = portalX;
        }
        const nextMultiplier = Number(portal.props.multiplier ?? currentSpeedMultiplier);
        if (Number.isFinite(nextMultiplier) && nextMultiplier > 0) {
            currentSpeedMultiplier = nextMultiplier;
        }
    }
    if (remainingMs > 0) {
        cursorX = Math.min(levelEndX, cursorX + (remainingMs / 1000) * BASE_HORIZONTAL_SPEED * currentSpeedMultiplier);
    }
    const progressPercent = Math.min(100, Math.max(0, Math.round(((cursorX - bootstrap.startX) / Math.max(1, levelEndX - bootstrap.startX)) * 100)));
    return {
        x: clamp(cursorX, bootstrap.startX, levelEndX),
        y: bootstrap.startY,
        speedMultiplier: currentSpeedMultiplier,
        progressPercent,
    };
}
function drawEditorMusicSyncGuide(context, width, height, panX, panY, cell, preview, elapsedMs) {
    const stripeX = worldToScreen(preview.x, 0, panX, panY, cell).x;
    const marker = worldToScreen(preview.x, preview.y + 0.5, panX, panY, cell);
    const bandWidth = Math.max(4, cell * 0.12);
    const markerSize = Math.max(12, cell * 0.46);
    context.save();
    context.fillStyle = 'rgba(96, 255, 92, 0.12)';
    context.fillRect(stripeX - bandWidth * 1.4, 0, bandWidth * 2.8, height);
    context.strokeStyle = 'rgba(92, 255, 72, 0.92)';
    context.shadowColor = 'rgba(125, 255, 73, 0.55)';
    context.shadowBlur = cell * 0.42;
    context.lineWidth = bandWidth;
    context.beginPath();
    context.moveTo(stripeX, 0);
    context.lineTo(stripeX, height);
    context.stroke();
    context.restore();
    context.save();
    context.fillStyle = '#11192f';
    context.strokeStyle = '#7dff49';
    context.lineWidth = Math.max(2, cell * 0.06);
    context.beginPath();
    context.arc(marker.x, marker.y, markerSize * 0.52, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(marker.x, marker.y, markerSize * 0.15, 0, Math.PI * 2);
    context.fill();
    context.restore();
    const labelText = `SYNC ${(elapsedMs / 1000).toFixed(1)}s  x${preview.speedMultiplier.toFixed(2)}  ${preview.progressPercent}%`;
    const labelWidth = Math.max(118, labelText.length * 7.6);
    const labelX = clamp(stripeX - labelWidth / 2, 12, Math.max(12, width - labelWidth - 12));
    const labelY = 18;
    context.save();
    context.fillStyle = 'rgba(11, 18, 44, 0.88)';
    context.strokeStyle = 'rgba(125, 255, 73, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(labelX, labelY, labelWidth, 26, 10);
    context.fill();
    context.stroke();
    context.fillStyle = '#dfffe0';
    context.font = '700 12px Segoe UI';
    context.textBaseline = 'middle';
    context.fillText(labelText, labelX + 10, labelY + 13);
    context.restore();
}
function drawEditorPermanentStageFloor(context, width, height, topY, cell, panX, groundPalette) {
    const deckHeight = Math.max(cell * 1.06, 18);
    const floorGradient = context.createLinearGradient(0, topY, 0, topY + deckHeight);
    floorGradient.addColorStop(0, groundPalette.top);
    floorGradient.addColorStop(0.18, groundPalette.mid);
    floorGradient.addColorStop(1, groundPalette.bottom);
    context.fillStyle = floorGradient;
    context.fillRect(0, topY, width, deckHeight);
    context.fillStyle = groundPalette.shadow;
    context.fillRect(0, topY + deckHeight, width, Math.max(0, height - topY - deckHeight));
    context.strokeStyle = groundPalette.seam;
    context.lineWidth = 1;
    const seamOffset = ((panX % cell) + cell) % cell;
    for (let x = seamOffset - cell; x < width + cell; x += cell) {
        context.beginPath();
        context.moveTo(x, topY + deckHeight * 0.18);
        context.lineTo(x, topY + deckHeight);
        context.stroke();
    }
    context.strokeStyle = groundPalette.highlight;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, topY);
    context.lineTo(width, topY);
    context.stroke();
}
function drawEditorObjectHitbox(context, object, playerMode, panX, panY, cell, viewportHeight, alpha = 1) {
    if (object.type === 'DASH_BLOCK' || object.type === 'START_MARKER' || object.type === 'START_POS') {
        return;
    }
    if (isTriggerObjectType(object.type)) {
        const activationMode = getEditorTriggerActivationMode(object.props.activationMode);
        const playerHitboxLayout = getPlayerHitboxLayout(playerMode);
        if (activationMode === 'zone') {
            const zoneWidth = Math.max(0.18, object.w * 0.18, playerHitboxLayout.width * 0.22);
            const zoneCenterX = object.x + object.w / 2;
            const zonePosition = worldToScreen(zoneCenterX - zoneWidth / 2, 0, panX, panY, cell);
            drawEditorHitboxRect(context, zonePosition.x, 0, zoneWidth * cell, viewportHeight, 'rgba(153, 255, 104, 0.08)', 'rgba(153, 255, 104, 0.96)', alpha, [8, 6]);
        }
        else {
            const position = worldToScreen(object.x, object.y, panX, panY, cell);
            drawEditorHitboxRect(context, position.x, position.y, object.w * cell, object.h * cell, 'rgba(153, 255, 104, 0.12)', 'rgba(153, 255, 104, 0.96)', alpha, [8, 6]);
        }
        return;
    }
    if (isSpikeObjectType(object.type)) {
        const spikeHitbox = getSpikeHitboxRect(object);
        drawEditorHazardHitboxPolygon(context, [
            worldToScreen(spikeHitbox.x, spikeHitbox.y, panX, panY, cell),
            worldToScreen(spikeHitbox.x + spikeHitbox.w, spikeHitbox.y, panX, panY, cell),
            worldToScreen(spikeHitbox.x + spikeHitbox.w, spikeHitbox.y + spikeHitbox.h, panX, panY, cell),
            worldToScreen(spikeHitbox.x, spikeHitbox.y + spikeHitbox.h, panX, panY, cell),
        ], 'rgba(255, 56, 56, 0.16)', 'rgba(255, 36, 36, 0.98)', alpha);
        return;
    }
    if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
        drawEditorHitboxPolygon(context, getEditorArrowRampTriangle(object).map((point) => {
            const screenPoint = worldToScreen(point.x, point.y, panX, panY, cell);
            return { x: screenPoint.x, y: screenPoint.y };
        }), 'rgba(102, 211, 255, 0.14)', 'rgba(116, 226, 255, 0.96)', alpha);
        return;
    }
    if (isSawObjectType(object.type)) {
        const center = worldToScreen(object.x + object.w / 2, object.y + object.h / 2, panX, panY, cell);
        const radius = Math.max(0.18, Math.min(object.w, object.h) * getEditorSawHitRadiusFactor(object.type)) * cell;
        drawEditorHitboxCircle(context, center.x, center.y, radius, 'rgba(255, 83, 109, 0.16)', 'rgba(255, 95, 124, 0.98)', alpha);
        return;
    }
    if (editorOrbHitboxTypes.has(object.type)) {
        const center = worldToScreen(object.x + object.w / 2, object.y + object.h / 2, panX, panY, cell);
        const radius = Math.max(0.18, Math.min(object.w, object.h) * 0.39 + 0.02) * cell;
        drawEditorHitboxCircle(context, center.x, center.y, radius, 'rgba(255, 217, 94, 0.16)', 'rgba(255, 228, 126, 0.98)', alpha);
        return;
    }
    const position = worldToScreen(object.x, object.y, panX, panY, cell);
    const fillColor = editorSolidHitboxTypes.has(object.type)
        ? 'rgba(102, 211, 255, 0.14)'
        : editorPortalHitboxTypes.has(object.type)
            ? 'rgba(191, 129, 255, 0.14)'
            : object.type === 'JUMP_PAD'
                ? 'rgba(255, 217, 94, 0.16)'
                : 'rgba(255, 255, 255, 0.1)';
    const strokeColor = editorSolidHitboxTypes.has(object.type)
        ? 'rgba(116, 226, 255, 0.96)'
        : editorPortalHitboxTypes.has(object.type)
            ? 'rgba(210, 158, 255, 0.96)'
            : object.type === 'JUMP_PAD'
                ? 'rgba(255, 228, 126, 0.98)'
                : 'rgba(255, 255, 255, 0.92)';
    drawEditorHitboxRect(context, position.x, position.y, object.w * cell, object.h * cell, fillColor, strokeColor, alpha);
}
function drawEditorPlayerHitbox(context, mode, playerX, playerY, panX, panY, cell) {
    const layout = getPlayerHitboxLayout(mode);
    const position = worldToScreen(playerX + layout.offsetX, playerY + layout.offsetY, panX, panY, cell);
    drawEditorHitboxRect(context, position.x, position.y, layout.width * cell, layout.height * cell, 'rgba(38, 255, 225, 0.16)', 'rgba(96, 255, 235, 0.98)', 1);
}
function drawEditorHitboxRect(context, x, y, w, h, fillColor, strokeColor, alpha = 1, lineDash) {
    context.save();
    context.globalAlpha *= alpha;
    if (lineDash?.length) {
        context.setLineDash(lineDash);
    }
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.5;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
    context.restore();
}
function drawEditorHitboxCircle(context, x, y, radius, fillColor, strokeColor, alpha = 1) {
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
}
function drawEditorHitboxPolygon(context, points, fillColor, strokeColor, alpha = 1) {
    if (!points.length) {
        return;
    }
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
}
function drawEditorHazardHitboxPolygon(context, points, fillColor, strokeColor, alpha = 1) {
    if (!points.length) {
        return;
    }
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.lineWidth = 3;
    context.shadowColor = strokeColor;
    context.shadowBlur = 6;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
}
function getEditorTriggerActivationMode(value) {
    return value === 'touch' ? 'touch' : 'zone';
}
function getEditorArrowRampTriangle(object) {
    const centerX = object.x + object.w / 2;
    const centerY = object.y + object.h / 2;
    const normalizedRotation = normalizeQuarterRotation(object.rotation ?? 0);
    const baseVertices = object.type === 'ARROW_RAMP_ASC'
        ? [
            { x: object.x, y: object.y + object.h },
            { x: object.x + object.w, y: object.y + object.h },
            { x: object.x + object.w, y: object.y },
        ]
        : [
            { x: object.x, y: object.y },
            { x: object.x, y: object.y + object.h },
            { x: object.x + object.w, y: object.y + object.h },
        ];
    if (normalizedRotation === 0) {
        return baseVertices;
    }
    const angle = (normalizedRotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return baseVertices.map((point) => {
        const offsetX = point.x - centerX;
        const offsetY = point.y - centerY;
        return {
            x: centerX + offsetX * cos - offsetY * sin,
            y: centerY + offsetX * sin + offsetY * cos,
        };
    });
}
function getEditorSawHitRadiusFactor(type) {
    if (type === 'SAW_STAR' || type === 'SAW_STAR_MEDIUM' || type === 'SAW_STAR_LARGE') {
        return 0.38;
    }
    if (type === 'SAW_GEAR' || type === 'SAW_GEAR_MEDIUM' || type === 'SAW_GEAR_LARGE') {
        return 0.4;
    }
    if (type === 'SAW_GLOW' || type === 'SAW_GLOW_MEDIUM' || type === 'SAW_GLOW_LARGE') {
        return 0.36;
    }
    return 0.42;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function roundToStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
        return value;
    }
    return Math.round(value / step) * step;
}
function normalizeQuarterRotation(value) {
    const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
    return normalized === 360 ? 0 : normalized;
}
function dragPreviewStatesEqual(left, right) {
    if (left === right) {
        return true;
    }
    if (!left || !right) {
        return false;
    }
    const leftIds = Object.keys(left.positions);
    const rightIds = Object.keys(right.positions);
    if (leftIds.length !== rightIds.length) {
        return false;
    }
    return leftIds.every((id) => {
        const leftPosition = left.positions[id];
        const rightPosition = right.positions[id];
        return !!leftPosition && !!rightPosition && leftPosition.x === rightPosition.x && leftPosition.y === rightPosition.y;
    });
}
function getObjectSelectionBounds(objects) {
    return objects.reduce((bounds, object) => ({
        left: Math.min(bounds.left, object.x),
        top: Math.min(bounds.top, object.y),
        right: Math.max(bounds.right, object.x + object.w),
        bottom: Math.max(bounds.bottom, object.y + object.h),
    }), {
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
    });
}
function rotateObjectCenterAroundPivot(centerX, centerY, pivotX, pivotY, direction) {
    const deltaX = centerX - pivotX;
    const deltaY = centerY - pivotY;
    return direction === 1
        ? {
            x: pivotX - deltaY,
            y: pivotY + deltaX,
        }
        : {
            x: pivotX + deltaY,
            y: pivotY - deltaX,
        };
}
function normalizeSelectionBox(selectionBox) {
    return {
        left: Math.min(selectionBox.startScreenX, selectionBox.endScreenX),
        top: Math.min(selectionBox.startScreenY, selectionBox.endScreenY),
        right: Math.max(selectionBox.startScreenX, selectionBox.endScreenX),
        bottom: Math.max(selectionBox.startScreenY, selectionBox.endScreenY),
    };
}
function rectanglesIntersect(left, right) {
    return left.left <= right.right && left.right >= right.left && left.top <= right.bottom && left.bottom >= right.top;
}
function getPointerDistance(firstPoint, secondPoint) {
    return Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y);
}
function pointInsideObject(x, y, object) {
    return x >= object.x && x <= object.x + object.w && y >= object.y && y <= object.y + object.h;
}
function isTextInputLike(target) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
