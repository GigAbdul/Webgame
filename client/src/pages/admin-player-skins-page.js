import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, FieldLabel, Input, Panel } from '../components/ui';
import { GameCanvas } from '../features/game/game-canvas';
import { FIXED_LEVEL_START_X, FIXED_LEVEL_START_Y, createEmptyLevelData, levelObjectDefinitions, } from '../features/game/object-definitions';
import { PLAYER_HITBOX_SIZE, getPlayerHitboxLayout } from '../features/game/player-physics';
import { PlayerModelCanvas } from '../features/game/player-model-canvas';
import { getPlayerModeLabel } from '../features/game/player-mode-config';
import { createDefaultPlayerSkinName, createEmptyPlayerSkinData, createEmptyPlayerSkinRecord, createPlayerSkinLayer, normalizePlayerSkinData, playerSkinEditorConfigs, usePlayerSkinsQuery, } from '../features/game/player-skins';
import { apiRequest } from '../services/api';
import { cn } from '../utils/cn';
const playerModes = ['cube', 'ball', 'ship', 'arrow'];
const MAX_SKIN_LAYERS = 32;
const MAX_HISTORY_STEPS = 120;
const SKIN_CANVAS_CELL_SIZE = 24;
const MIN_SKIN_CANVAS_ZOOM = 0.75;
const MAX_SKIN_CANVAS_ZOOM = 4;
const DEFAULT_SKIN_CANVAS_ZOOM = 1.6;
const DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM = 2.25;
const PLAYER_SKIN_DRAFTS_STORAGE_KEY = 'dashforge-player-skin-studio-drafts-v1';
const SKIN_CANVAS_BASE_COLOR = '#10192f';
const SKIN_CANVAS_CHECKER_COLOR = 'rgba(255,255,255,0.05)';
const SKIN_CANVAS_CONTRAST_STROKE = 'rgba(244,247,255,0.34)';
const skinToolOptions = [
    {
        tool: 'paint',
        label: 'Brush',
        hotkey: 'B',
        description: 'Draw one cell at a time on the active layer.',
        activeVariant: 'primary',
    },
    {
        tool: 'erase',
        label: 'Eraser',
        hotkey: 'E',
        description: 'Remove pixels only from the active layer.',
        activeVariant: 'danger',
    },
    {
        tool: 'fill',
        label: 'Fill',
        hotkey: 'F',
        description: 'Flood-fill the current layer without touching the rest.',
        activeVariant: 'secondary',
    },
    {
        tool: 'circle',
        label: 'Circle',
        hotkey: 'C',
        description: 'Drag out a filled circle or ellipse on the active layer.',
        activeVariant: 'secondary',
    },
    {
        tool: 'select',
        label: 'Select',
        hotkey: 'V',
        description: 'Drag a box selection with the main mouse button or touch.',
        activeVariant: 'secondary',
    },
    {
        tool: 'pick',
        label: 'Picker',
        hotkey: 'I',
        description: 'Sample a color from the sprite and jump back to Brush.',
        activeVariant: 'secondary',
    },
];
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function hslToHex(hue, saturation, lightness) {
    const normalizedHue = ((hue % 360) + 360) % 360;
    const normalizedSaturation = clamp(saturation, 0, 100) / 100;
    const normalizedLightness = clamp(lightness, 0, 100) / 100;
    const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
    const hueSection = normalizedHue / 60;
    const match = normalizedLightness - chroma / 2;
    const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
    let red = 0;
    let green = 0;
    let blue = 0;
    if (hueSection >= 0 && hueSection < 1) {
        red = chroma;
        green = secondary;
    }
    else if (hueSection < 2) {
        red = secondary;
        green = chroma;
    }
    else if (hueSection < 3) {
        green = chroma;
        blue = secondary;
    }
    else if (hueSection < 4) {
        green = secondary;
        blue = chroma;
    }
    else if (hueSection < 5) {
        red = secondary;
        blue = chroma;
    }
    else {
        red = chroma;
        blue = secondary;
    }
    const toHex = (channel) => Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
function buildSkinColorPalette() {
    const grayscale = ['#FFFFFF', '#EFF3FA', '#D2DBEA', '#AAB7D0', '#76839F', '#4A5670', '#2A344D', '#182133', '#090D16'];
    const paletteRows = [
        { saturation: 92, lightness: 72 },
        { saturation: 90, lightness: 58 },
        { saturation: 84, lightness: 46 },
        { saturation: 78, lightness: 34 },
    ];
    const hues = [0, 16, 28, 42, 56, 78, 110, 146, 176, 204, 228, 254, 282, 316];
    return Array.from(new Set([
        ...grayscale,
        ...paletteRows.flatMap((row) => hues.map((hue) => hslToHex(hue, row.saturation, row.lightness))),
    ]));
}
const colorPresets = buildSkinColorPalette();
function isHexColor(value) {
    return /^#[0-9A-F]{6}$/.test(value.trim().toUpperCase());
}
function getHexColorLuminance(value) {
    const normalized = value.trim().toUpperCase();
    if (!isHexColor(normalized)) {
        return null;
    }
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}
function shouldUseContrastStroke(color) {
    const luminance = getHexColorLuminance(color);
    if (luminance === null) {
        return false;
    }
    return luminance <= 0.18;
}
function getSkinToolLabel(tool) {
    return skinToolOptions.find((entry) => entry.tool === tool)?.label ?? 'Brush';
}
function createDraftRecord(source) {
    return {
        cube: normalizePlayerSkinData(source?.cube ?? createEmptyPlayerSkinData('cube'), 'cube'),
        ball: normalizePlayerSkinData(source?.ball ?? createEmptyPlayerSkinData('ball'), 'ball'),
        ship: normalizePlayerSkinData(source?.ship ?? createEmptyPlayerSkinData('ship'), 'ship'),
        arrow: normalizePlayerSkinData(source?.arrow ?? createEmptyPlayerSkinData('arrow'), 'arrow'),
    };
}
function createHistoryState(skinData) {
    return {
        past: [],
        present: normalizePlayerSkinData(skinData),
        future: [],
    };
}
function createHistoryRecord(source) {
    const drafts = createDraftRecord(source);
    return {
        cube: createHistoryState(drafts.cube),
        ball: createHistoryState(drafts.ball),
        ship: createHistoryState(drafts.ship),
        arrow: createHistoryState(drafts.arrow),
    };
}
function readStoredPlayerSkinDrafts() {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(PLAYER_SKIN_DRAFTS_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return createDraftRecord(JSON.parse(raw));
    }
    catch {
        return null;
    }
}
function writeStoredPlayerSkinDrafts(source) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(PLAYER_SKIN_DRAFTS_STORAGE_KEY, JSON.stringify(source));
    }
    catch {
        // Ignore storage write failures so the editor keeps working normally.
    }
}
function normalizeSkinSelection(selection) {
    return {
        left: Math.min(selection.startX, selection.endX),
        top: Math.min(selection.startY, selection.endY),
        right: Math.max(selection.startX, selection.endX),
        bottom: Math.max(selection.startY, selection.endY),
    };
}
function isCellInsideSelection(x, y, selection) {
    return x >= selection.left && x <= selection.right && y >= selection.top && y <= selection.bottom;
}
function getSelectionCellCount(selection) {
    if (!selection) {
        return 0;
    }
    return (selection.right - selection.left + 1) * (selection.bottom - selection.top + 1);
}
function getSkinLayers(skinData) {
    return skinData.layers?.length ? skinData.layers : [createPlayerSkinLayer()];
}
function getLayerPixelColor(layer, x, y) {
    const match = layer.pixels.find((pixel) => pixel.x === x && pixel.y === y);
    return match?.color ?? null;
}
function getCompositePixelColor(skinData, x, y) {
    const layers = getSkinLayers(skinData);
    for (let index = layers.length - 1; index >= 0; index -= 1) {
        const layer = layers[index];
        if (!layer.visible) {
            continue;
        }
        const color = getLayerPixelColor(layer, x, y);
        if (color) {
            return color;
        }
    }
    return null;
}
function getResolvedLayerSelection(skinData, preferredLayerId) {
    const layers = getSkinLayers(skinData);
    const preferredIndex = preferredLayerId ? layers.findIndex((layer) => layer.id === preferredLayerId) : -1;
    const index = preferredIndex >= 0 ? preferredIndex : 0;
    return {
        index,
        layer: layers[index],
    };
}
function createActiveLayerRecord(source) {
    return {
        cube: getSkinLayers(source.cube)[0].id,
        ball: getSkinLayers(source.ball)[0].id,
        ship: getSkinLayers(source.ship)[0].id,
        arrow: getSkinLayers(source.arrow)[0].id,
    };
}
function serializeSkinData(skinData, mode) {
    return JSON.stringify(normalizePlayerSkinData(skinData, mode));
}
function updateLayerPixels(skinData, layerId, updater) {
    const layers = getSkinLayers(skinData);
    const layerIndex = layers.findIndex((layer) => layer.id === layerId);
    if (layerIndex < 0) {
        return skinData;
    }
    const layer = layers[layerIndex];
    const pixelMap = new Map(layer.pixels.map((pixel) => [`${pixel.x}:${pixel.y}`, pixel]));
    const nextLayer = updater(layer, pixelMap);
    if (!nextLayer) {
        return skinData;
    }
    const nextLayers = layers.map((entry, index) => (index === layerIndex ? nextLayer : entry));
    return normalizePlayerSkinData({
        ...skinData,
        layers: nextLayers,
    });
}
function applyPixelToLayer(skinData, layerId, x, y, color) {
    const nextColor = color?.toUpperCase() ?? null;
    return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
        const key = `${x}:${y}`;
        const currentColor = pixelMap.get(key)?.color ?? null;
        if (currentColor === nextColor) {
            return null;
        }
        if (nextColor) {
            pixelMap.set(key, { x, y, color: nextColor });
        }
        else {
            pixelMap.delete(key);
        }
        return {
            ...layer,
            pixels: Array.from(pixelMap.values()),
        };
    });
}
function fillLayer(skinData, layerId, startX, startY, color) {
    const replacementColor = color?.toUpperCase() ?? null;
    return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
        const startKey = `${startX}:${startY}`;
        const targetColor = pixelMap.get(startKey)?.color ?? null;
        if (targetColor === replacementColor) {
            return null;
        }
        const visited = new Set();
        const queue = [{ x: startX, y: startY }];
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                continue;
            }
            if (current.x < 0 ||
                current.y < 0 ||
                current.x >= skinData.gridCols ||
                current.y >= skinData.gridRows) {
                continue;
            }
            const key = `${current.x}:${current.y}`;
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);
            const currentColor = pixelMap.get(key)?.color ?? null;
            if (currentColor !== targetColor) {
                continue;
            }
            if (replacementColor) {
                pixelMap.set(key, {
                    x: current.x,
                    y: current.y,
                    color: replacementColor,
                });
            }
            else {
                pixelMap.delete(key);
            }
            queue.push({ x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y }, { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 });
        }
        return {
            ...layer,
            pixels: Array.from(pixelMap.values()),
        };
    });
}
function applyToolToSelection(skinData, layerId, selection, tool, color) {
    const nextColor = tool === 'erase' ? null : color.toUpperCase();
    return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
        let changed = false;
        for (let y = selection.top; y <= selection.bottom; y += 1) {
            for (let x = selection.left; x <= selection.right; x += 1) {
                const key = `${x}:${y}`;
                const currentColor = pixelMap.get(key)?.color ?? null;
                if (currentColor === nextColor) {
                    continue;
                }
                changed = true;
                if (nextColor) {
                    pixelMap.set(key, {
                        x,
                        y,
                        color: nextColor,
                    });
                }
                else {
                    pixelMap.delete(key);
                }
            }
        }
        if (!changed) {
            return null;
        }
        return {
            ...layer,
            pixels: Array.from(pixelMap.values()),
        };
    });
}
function getEllipseCells(selection) {
    const width = selection.right - selection.left + 1;
    const height = selection.bottom - selection.top + 1;
    const radiusX = width / 2;
    const radiusY = height / 2;
    const centerX = selection.left + radiusX - 0.5;
    const centerY = selection.top + radiusY - 0.5;
    const cells = [];
    for (let y = selection.top; y <= selection.bottom; y += 1) {
        for (let x = selection.left; x <= selection.right; x += 1) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            if (dx * dx + dy * dy <= 1) {
                cells.push({ x, y });
            }
        }
    }
    return cells;
}
function applyEllipseToLayer(skinData, layerId, selection, color) {
    const nextColor = color?.toUpperCase() ?? null;
    const ellipseCells = getEllipseCells(selection);
    return updateLayerPixels(skinData, layerId, (layer, pixelMap) => {
        let changed = false;
        for (const cell of ellipseCells) {
            const key = `${cell.x}:${cell.y}`;
            const currentColor = pixelMap.get(key)?.color ?? null;
            if (currentColor === nextColor) {
                continue;
            }
            changed = true;
            if (nextColor) {
                pixelMap.set(key, {
                    x: cell.x,
                    y: cell.y,
                    color: nextColor,
                });
            }
            else {
                pixelMap.delete(key);
            }
        }
        if (!changed) {
            return null;
        }
        return {
            ...layer,
            pixels: Array.from(pixelMap.values()),
        };
    });
}
function createLayerDraft(existingLayers) {
    let nextIndex = existingLayers.length + 1;
    while (existingLayers.some((layer) => layer.id === `layer-${nextIndex}`)) {
        nextIndex += 1;
    }
    return createPlayerSkinLayer(`layer-${nextIndex}`, `Layer ${nextIndex}`);
}
function buildSkinPreviewLevel(mode) {
    const level = createEmptyLevelData('neon-grid');
    level.meta.lengthUnits = 42;
    level.player.mode = mode;
    level.player.startX = FIXED_LEVEL_START_X;
    level.player.startY = FIXED_LEVEL_START_Y;
    level.finish.x = FIXED_LEVEL_START_X + 34;
    level.finish.y = FIXED_LEVEL_START_Y;
    level.objects = [
        createPreviewObject('preview-planet', 'DECOR_PLANET', 11, 2),
        createPreviewObject('preview-stars', 'DECOR_STAR_CLUSTER', 17, 4),
        createPreviewObject('preview-comet', 'DECOR_COMET', 24, 3),
        createPreviewObject('preview-ring', 'DECOR_RING_PLANET', 31, 2),
    ];
    return level;
}
function createPreviewObject(id, type, x, y) {
    const definition = levelObjectDefinitions[type];
    return {
        id,
        type,
        x,
        y,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        rotation: 0,
        layer: type.startsWith('DECOR') ? 'decoration' : 'gameplay',
        editorLayer: 1,
        props: {},
    };
}
function drawSelectionOverlay(context, selection, cellSize, options) {
    const x = selection.left * cellSize;
    const y = selection.top * cellSize;
    const width = (selection.right - selection.left + 1) * cellSize;
    const height = (selection.bottom - selection.top + 1) * cellSize;
    context.save();
    context.fillStyle = options.fill;
    context.fillRect(x, y, width, height);
    context.strokeStyle = options.stroke;
    context.lineWidth = options.lineWidth ?? 3;
    context.setLineDash(options.lineDash ?? [12, 8]);
    context.strokeRect(x + 1.5, y + 1.5, Math.max(0, width - 3), Math.max(0, height - 3));
    context.restore();
}
function drawEllipseOverlay(context, selection, cellSize, options) {
    const x = selection.left * cellSize;
    const y = selection.top * cellSize;
    const width = (selection.right - selection.left + 1) * cellSize;
    const height = (selection.bottom - selection.top + 1) * cellSize;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = Math.max(cellSize / 2, width / 2 - 1.5);
    const radiusY = Math.max(cellSize / 2, height / 2 - 1.5);
    context.save();
    context.fillStyle = options.fill;
    for (const cell of getEllipseCells(selection)) {
        context.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
    }
    context.strokeStyle = options.stroke;
    context.lineWidth = options.lineWidth ?? 3;
    context.setLineDash(options.lineDash ?? [12, 8]);
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
}
function PlayerSkinPaintCanvas({ mode, skinData, activeLayerId, tool, selection, cellSize = SKIN_CANVAS_CELL_SIZE, containerClassName, canvasClassName, onCanvasWheel, onUseTool, onApplyCircle, onPickColor, onSelectionChange, onHoverCellChange, onGestureStart, onGestureEnd, }) {
    const canvasRef = useRef(null);
    const [selectionDraft, setSelectionDraft] = useState(null);
    const [circleDraft, setCircleDraft] = useState(null);
    const pointerStateRef = useRef({
        mode: null,
        lastCellKey: null,
        selectionStart: null,
    });
    const activeLayer = getResolvedLayerSelection(skinData, activeLayerId).layer;
    const buildHoverCell = (x, y) => ({
        x,
        y,
        compositeColor: getCompositePixelColor(skinData, x, y),
        activeLayerColor: getLayerPixelColor(activeLayer, x, y),
        selected: selection ? isCellInsideSelection(x, y, selection) : false,
    });
    const emitHoverCell = (position) => {
        onHoverCellChange?.(position ? buildHoverCell(position.x, position.y) : null);
    };
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const width = skinData.gridCols * cellSize;
        const height = skinData.gridRows * cellSize;
        const normalizedSelectionDraft = selectionDraft ? normalizeSkinSelection(selectionDraft) : null;
        const normalizedCircleDraft = circleDraft ? normalizeSkinSelection(circleDraft) : null;
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = SKIN_CANVAS_BASE_COLOR;
        context.fillRect(0, 0, width, height);
        context.fillStyle = SKIN_CANVAS_CHECKER_COLOR;
        for (let row = 0; row < skinData.gridRows; row += 1) {
            for (let column = 0; column < skinData.gridCols; column += 1) {
                if ((row + column) % 2 === 0) {
                    context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }
        for (const layer of getSkinLayers(skinData)) {
            const shouldGhostHiddenLayer = !layer.visible && layer.id === activeLayer.id;
            if (!layer.visible && !shouldGhostHiddenLayer) {
                continue;
            }
            context.globalAlpha = shouldGhostHiddenLayer ? 0.32 : 1;
            const contrastPixels = [];
            for (const pixel of layer.pixels) {
                context.fillStyle = pixel.color;
                context.fillRect(pixel.x * cellSize, pixel.y * cellSize, cellSize, cellSize);
                if (shouldUseContrastStroke(pixel.color)) {
                    contrastPixels.push(pixel);
                }
            }
            if (contrastPixels.length > 0) {
                context.strokeStyle = SKIN_CANVAS_CONTRAST_STROKE;
                context.lineWidth = Math.max(1, Math.min(2, cellSize * 0.08));
                for (const pixel of contrastPixels) {
                    context.strokeRect(pixel.x * cellSize + 1.25, pixel.y * cellSize + 1.25, cellSize - 2.5, cellSize - 2.5);
                }
            }
        }
        context.globalAlpha = 1;
        if (!activeLayer.visible && activeLayer.pixels.length > 0) {
            context.strokeStyle = 'rgba(122, 247, 255, 0.55)';
            context.lineWidth = 1.6;
            for (const pixel of activeLayer.pixels) {
                context.strokeRect(pixel.x * cellSize + 1.5, pixel.y * cellSize + 1.5, cellSize - 3, cellSize - 3);
            }
        }
        context.strokeStyle = 'rgba(255,255,255,0.09)';
        context.lineWidth = 1;
        for (let column = 0; column <= skinData.gridCols; column += 1) {
            const x = column * cellSize + 0.5;
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }
        for (let row = 0; row <= skinData.gridRows; row += 1) {
            const y = row * cellSize + 0.5;
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        if (selection) {
            drawSelectionOverlay(context, selection, cellSize, {
                fill: 'rgba(121, 247, 255, 0.12)',
                stroke: 'rgba(121, 247, 255, 0.96)',
            });
        }
        if (normalizedSelectionDraft) {
            drawSelectionOverlay(context, normalizedSelectionDraft, cellSize, {
                fill: 'rgba(202, 255, 69, 0.16)',
                stroke: 'rgba(202, 255, 69, 0.98)',
                lineDash: [10, 6],
                lineWidth: 3.5,
            });
        }
        if (normalizedCircleDraft) {
            drawEllipseOverlay(context, normalizedCircleDraft, cellSize, {
                fill: 'rgba(255, 212, 74, 0.18)',
                stroke: 'rgba(255, 212, 74, 0.96)',
                lineDash: [10, 6],
                lineWidth: 3.5,
            });
        }
        const contactLayout = getPlayerHitboxLayout(mode, 'contact');
        const solidLayout = getPlayerHitboxLayout(mode, 'solid');
        const scaleX = width / PLAYER_HITBOX_SIZE;
        const scaleY = height / PLAYER_HITBOX_SIZE;
        context.strokeStyle = 'rgba(255, 212, 74, 0.95)';
        context.lineWidth = 3;
        context.strokeRect(contactLayout.offsetX * scaleX, contactLayout.offsetY * scaleY, contactLayout.width * scaleX, contactLayout.height * scaleY);
        context.strokeStyle = 'rgba(71, 232, 255, 0.92)';
        context.lineWidth = 2;
        context.setLineDash([8, 6]);
        context.strokeRect(solidLayout.offsetX * scaleX, solidLayout.offsetY * scaleY, solidLayout.width * scaleX, solidLayout.height * scaleY);
        context.setLineDash([]);
        context.strokeStyle = 'rgba(255,255,255,0.2)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, width - 2, height - 2);
    }, [activeLayer, cellSize, circleDraft, mode, selection, selectionDraft, skinData]);
    const getGridPosition = (event, clampToBounds = false) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return null;
        }
        const rect = canvas.getBoundingClientRect();
        const normalizedX = ((event.clientX - rect.left) / rect.width) * skinData.gridCols;
        const normalizedY = ((event.clientY - rect.top) / rect.height) * skinData.gridRows;
        const x = clampToBounds
            ? Math.min(skinData.gridCols - 1, Math.max(0, Math.floor(normalizedX)))
            : Math.floor(normalizedX);
        const y = clampToBounds
            ? Math.min(skinData.gridRows - 1, Math.max(0, Math.floor(normalizedY)))
            : Math.floor(normalizedY);
        if (x < 0 || y < 0 || x >= skinData.gridCols || y >= skinData.gridRows) {
            return null;
        }
        return { x, y };
    };
    const applyPointerTool = (event) => {
        const position = getGridPosition(event);
        if (!position) {
            return;
        }
        const cellKey = `${position.x}:${position.y}`;
        if (pointerStateRef.current.lastCellKey === cellKey) {
            return;
        }
        pointerStateRef.current.lastCellKey = cellKey;
        onUseTool(position.x, position.y, { applySelection: false });
    };
    const startSelectionGesture = (event, position) => {
        pointerStateRef.current.mode = 'select';
        pointerStateRef.current.lastCellKey = null;
        pointerStateRef.current.selectionStart = position;
        setSelectionDraft({
            startX: position.x,
            startY: position.y,
            endX: position.x,
            endY: position.y,
        });
        emitHoverCell(position);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const startCircleGesture = (event, position) => {
        pointerStateRef.current.mode = 'circle';
        pointerStateRef.current.lastCellKey = null;
        pointerStateRef.current.selectionStart = position;
        setCircleDraft({
            startX: position.x,
            startY: position.y,
            endX: position.x,
            endY: position.y,
        });
        emitHoverCell(position);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    return (_jsx("div", { className: cn('overflow-auto rounded-[28px] border-[4px] border-[#0f1b31] bg-[#09101e] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]', containerClassName), onWheel: onCanvasWheel, children: _jsx("canvas", { ref: canvasRef, className: cn('mx-auto block max-w-none touch-none rounded-[18px]', canvasClassName), style: { imageRendering: 'pixelated' }, onContextMenu: (event) => event.preventDefault(), onPointerDown: (event) => {
                const position = getGridPosition(event, event.button === 2);
                if (!position) {
                    emitHoverCell(null);
                    return;
                }
                emitHoverCell(position);
                const isInsideSelection = Boolean(selection && isCellInsideSelection(position.x, position.y, selection));
                const shouldStartSelection = event.button === 2 || (event.button === 0 && (tool === 'select' || event.shiftKey));
                if (shouldStartSelection) {
                    startSelectionGesture(event, position);
                    return;
                }
                if (event.button !== 0) {
                    return;
                }
                if (tool === 'pick' || event.altKey) {
                    onPickColor(position.x, position.y);
                    return;
                }
                if (selection && !isInsideSelection) {
                    onSelectionChange(null);
                }
                if (tool === 'circle') {
                    startCircleGesture(event, position);
                    return;
                }
                const applySelection = Boolean((tool === 'paint' || tool === 'erase') && isInsideSelection);
                if (tool === 'fill' || applySelection) {
                    onUseTool(position.x, position.y, { applySelection });
                    return;
                }
                pointerStateRef.current.mode = 'paint';
                pointerStateRef.current.lastCellKey = null;
                pointerStateRef.current.selectionStart = null;
                onGestureStart();
                event.currentTarget.setPointerCapture(event.pointerId);
                applyPointerTool(event);
            }, onPointerMove: (event) => {
                emitHoverCell(getGridPosition(event, true));
                if (pointerStateRef.current.mode === 'select') {
                    const position = getGridPosition(event, true);
                    if (!position || !pointerStateRef.current.selectionStart) {
                        return;
                    }
                    setSelectionDraft({
                        startX: pointerStateRef.current.selectionStart.x,
                        startY: pointerStateRef.current.selectionStart.y,
                        endX: position.x,
                        endY: position.y,
                    });
                    return;
                }
                if (pointerStateRef.current.mode === 'circle') {
                    const position = getGridPosition(event, true);
                    if (!position || !pointerStateRef.current.selectionStart) {
                        return;
                    }
                    setCircleDraft({
                        startX: pointerStateRef.current.selectionStart.x,
                        startY: pointerStateRef.current.selectionStart.y,
                        endX: position.x,
                        endY: position.y,
                    });
                    return;
                }
                if (pointerStateRef.current.mode !== 'paint' || tool === 'fill') {
                    return;
                }
                applyPointerTool(event);
            }, onPointerUp: (event) => {
                const finalPosition = getGridPosition(event, true);
                if (pointerStateRef.current.mode === 'select') {
                    const finalDraft = (pointerStateRef.current.selectionStart && finalPosition
                        ? {
                            startX: pointerStateRef.current.selectionStart.x,
                            startY: pointerStateRef.current.selectionStart.y,
                            endX: finalPosition.x,
                            endY: finalPosition.y,
                        }
                        : null) ??
                        selectionDraft ??
                        (pointerStateRef.current.selectionStart
                            ? {
                                startX: pointerStateRef.current.selectionStart.x,
                                startY: pointerStateRef.current.selectionStart.y,
                                endX: pointerStateRef.current.selectionStart.x,
                                endY: pointerStateRef.current.selectionStart.y,
                            }
                            : null);
                    if (finalDraft) {
                        onSelectionChange(normalizeSkinSelection(finalDraft));
                    }
                    setSelectionDraft(null);
                }
                if (pointerStateRef.current.mode === 'circle') {
                    const finalDraft = (pointerStateRef.current.selectionStart && finalPosition
                        ? {
                            startX: pointerStateRef.current.selectionStart.x,
                            startY: pointerStateRef.current.selectionStart.y,
                            endX: finalPosition.x,
                            endY: finalPosition.y,
                        }
                        : null) ??
                        circleDraft ??
                        (pointerStateRef.current.selectionStart
                            ? {
                                startX: pointerStateRef.current.selectionStart.x,
                                startY: pointerStateRef.current.selectionStart.y,
                                endX: pointerStateRef.current.selectionStart.x,
                                endY: pointerStateRef.current.selectionStart.y,
                            }
                            : null);
                    if (finalDraft) {
                        onApplyCircle(normalizeSkinSelection(finalDraft));
                    }
                    setCircleDraft(null);
                }
                if (pointerStateRef.current.mode === 'paint') {
                    onGestureEnd();
                }
                pointerStateRef.current.mode = null;
                pointerStateRef.current.lastCellKey = null;
                pointerStateRef.current.selectionStart = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }
                emitHoverCell(finalPosition);
            }, onPointerLeave: () => {
                pointerStateRef.current.lastCellKey = null;
                emitHoverCell(null);
            }, onPointerCancel: (event) => {
                if (pointerStateRef.current.mode === 'paint') {
                    onGestureEnd();
                }
                pointerStateRef.current.mode = null;
                pointerStateRef.current.lastCellKey = null;
                pointerStateRef.current.selectionStart = null;
                setSelectionDraft(null);
                setCircleDraft(null);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }
                emitHoverCell(null);
            } }) }));
}
export function AdminPlayerSkinsPage() {
    const queryClient = useQueryClient();
    const playerSkinsQuery = usePlayerSkinsQuery();
    const persistedDraftsRef = useRef(readStoredPlayerSkinDrafts());
    const serverDrafts = useMemo(() => createDraftRecord(playerSkinsQuery.data?.skins ?? null), [playerSkinsQuery.data?.skins]);
    const initializedRef = useRef(Boolean(persistedDraftsRef.current));
    const gestureBaseRef = useRef(createEmptyPlayerSkinRecord(null));
    const [activeMode, setActiveMode] = useState('cube');
    const [tool, setTool] = useState('paint');
    const [activeColor, setActiveColor] = useState('#F4F7FF');
    const [colorDraft, setColorDraft] = useState('#F4F7FF');
    const [message, setMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isCanvasFullscreenOpen, setIsCanvasFullscreenOpen] = useState(false);
    const [canvasZoom, setCanvasZoom] = useState(DEFAULT_SKIN_CANVAS_ZOOM);
    const [fullscreenCanvasZoom, setFullscreenCanvasZoom] = useState(DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM);
    const [previewRunSeed, setPreviewRunSeed] = useState(0);
    const [histories, setHistories] = useState(() => createHistoryRecord(persistedDraftsRef.current ?? createEmptyPlayerSkinRecord(null)));
    const [activeLayerIds, setActiveLayerIds] = useState(() => createActiveLayerRecord(createDraftRecord(persistedDraftsRef.current ?? createEmptyPlayerSkinRecord(null))));
    const [selections, setSelections] = useState(() => createEmptyPlayerSkinRecord(null));
    const [hoverCells, setHoverCells] = useState(() => createEmptyPlayerSkinRecord(null));
    useEffect(() => {
        if (!playerSkinsQuery.data?.skins || initializedRef.current) {
            return;
        }
        const nextDrafts = createDraftRecord(persistedDraftsRef.current ?? playerSkinsQuery.data.skins);
        initializedRef.current = true;
        setHistories(createHistoryRecord(nextDrafts));
        setActiveLayerIds(createActiveLayerRecord(nextDrafts));
        setSelections(createEmptyPlayerSkinRecord(null));
        setHoverCells(createEmptyPlayerSkinRecord(null));
    }, [playerSkinsQuery.data?.skins]);
    useEffect(() => {
        if (!initializedRef.current) {
            return;
        }
        writeStoredPlayerSkinDrafts({
            cube: histories.cube.present,
            ball: histories.ball.present,
            ship: histories.ship.present,
            arrow: histories.arrow.present,
        });
    }, [histories]);
    useEffect(() => {
        setActiveLayerIds((current) => {
            let changed = false;
            const nextState = { ...current };
            for (const mode of playerModes) {
                const resolvedLayerId = getResolvedLayerSelection(histories[mode].present, current[mode]).layer.id;
                if (resolvedLayerId !== current[mode]) {
                    nextState[mode] = resolvedLayerId;
                    changed = true;
                }
            }
            return changed ? nextState : current;
        });
    }, [histories]);
    useEffect(() => {
        setColorDraft(activeColor);
    }, [activeColor]);
    const currentHistory = histories[activeMode];
    const currentDraft = currentHistory.present;
    const currentSelection = selections[activeMode];
    const currentHoverCell = hoverCells[activeMode];
    const currentLayers = getSkinLayers(currentDraft);
    const currentLayerSelection = getResolvedLayerSelection(currentDraft, activeLayerIds[activeMode]);
    const currentLayer = currentLayerSelection.layer;
    const currentConfig = playerSkinEditorConfigs[activeMode];
    const canvasCellSize = Math.round(SKIN_CANVAS_CELL_SIZE * canvasZoom);
    const fullscreenCanvasCellSize = Math.round(SKIN_CANVAS_CELL_SIZE * fullscreenCanvasZoom);
    const previewLevelData = useMemo(() => buildSkinPreviewLevel(activeMode), [activeMode]);
    const previewSkinOverrides = useMemo(() => ({
        cube: histories.cube.present,
        ball: histories.ball.present,
        ship: histories.ship.present,
        arrow: histories.arrow.present,
    }), [histories]);
    const dirtyModes = useMemo(() => playerModes.filter((mode) => serializeSkinData(histories[mode].present, mode) !== serializeSkinData(serverDrafts[mode], mode)), [histories, serverDrafts]);
    const isCurrentModeDirty = dirtyModes.includes(activeMode);
    const canUndo = currentHistory.past.length > 0;
    const canRedo = currentHistory.future.length > 0;
    const canAddLayer = currentLayers.length < MAX_SKIN_LAYERS;
    const activeLayerIsTop = currentLayerSelection.index === currentLayers.length - 1;
    const activeLayerIsBottom = currentLayerSelection.index === 0;
    const selectedCellCount = getSelectionCellCount(currentSelection);
    const hasSelection = selectedCellCount > 0;
    const orderedLayers = [...currentLayers].reverse();
    const pushHistoryState = (mode, previousPresent) => {
        setHistories((current) => {
            const history = current[mode];
            if (serializeSkinData(previousPresent, mode) === serializeSkinData(history.present, mode)) {
                return current;
            }
            return {
                ...current,
                [mode]: {
                    past: [...history.past, previousPresent].slice(-MAX_HISTORY_STEPS),
                    present: history.present,
                    future: [],
                },
            };
        });
    };
    const replaceModePresent = (mode, updater) => {
        setHistories((current) => {
            const history = current[mode];
            const nextPresent = normalizePlayerSkinData(updater(history.present));
            if (serializeSkinData(nextPresent, mode) === serializeSkinData(history.present, mode)) {
                return current;
            }
            return {
                ...current,
                [mode]: {
                    ...history,
                    present: nextPresent,
                },
            };
        });
    };
    const commitModeChange = (mode, updater) => {
        setHistories((current) => {
            const history = current[mode];
            const nextPresent = normalizePlayerSkinData(updater(history.present));
            if (serializeSkinData(nextPresent, mode) === serializeSkinData(history.present, mode)) {
                return current;
            }
            return {
                ...current,
                [mode]: {
                    past: [...history.past, history.present].slice(-MAX_HISTORY_STEPS),
                    present: nextPresent,
                    future: [],
                },
            };
        });
    };
    const undoMode = (mode) => {
        gestureBaseRef.current[mode] = null;
        setHistories((current) => {
            const history = current[mode];
            if (!history.past.length) {
                return current;
            }
            const previousPresent = history.past[history.past.length - 1];
            return {
                ...current,
                [mode]: {
                    past: history.past.slice(0, -1),
                    present: previousPresent,
                    future: [history.present, ...history.future],
                },
            };
        });
    };
    const redoMode = (mode) => {
        gestureBaseRef.current[mode] = null;
        setHistories((current) => {
            const history = current[mode];
            if (!history.future.length) {
                return current;
            }
            const [nextPresent, ...remainingFuture] = history.future;
            return {
                ...current,
                [mode]: {
                    past: [...history.past, history.present].slice(-MAX_HISTORY_STEPS),
                    present: nextPresent,
                    future: remainingFuture,
                },
            };
        });
    };
    const saveMutation = useMutation({
        mutationFn: (payload) => apiRequest(`/api/player-skins/${payload.mode}`, {
            method: 'PUT',
            body: JSON.stringify({
                data: payload.data,
            }),
        }),
        onSuccess: (payload) => {
            queryClient.setQueryData(['player-skins'], (current) => ({
                skins: {
                    ...(current?.skins ?? createEmptyPlayerSkinRecord(null)),
                    [payload.skin.mode]: payload.skin.data,
                },
            }));
            setHistories((current) => ({
                ...current,
                [payload.skin.mode]: {
                    ...current[payload.skin.mode],
                    present: normalizePlayerSkinData(payload.skin.data, payload.skin.mode),
                },
            }));
            setMessage(`Saved "${payload.skin.data.name}" for ${getPlayerModeLabel(payload.skin.mode)} mode.`);
            initializedRef.current = true;
        },
    });
    const applyActiveColor = (nextColor, nextTool = 'paint') => {
        const normalizedColor = nextColor.toUpperCase();
        if (!isHexColor(normalizedColor)) {
            return;
        }
        setActiveColor(normalizedColor);
        setColorDraft(normalizedColor);
        setTool(nextTool);
    };
    const handleCanvasGestureStart = () => {
        if (tool === 'fill' || tool === 'pick' || tool === 'select' || tool === 'circle' || gestureBaseRef.current[activeMode]) {
            return;
        }
        gestureBaseRef.current[activeMode] = currentHistory.present;
    };
    const handleCanvasGestureEnd = () => {
        const gestureBase = gestureBaseRef.current[activeMode];
        if (!gestureBase) {
            return;
        }
        gestureBaseRef.current[activeMode] = null;
        pushHistoryState(activeMode, gestureBase);
    };
    const handleSelectionChange = (selection) => {
        setSelections((current) => ({
            ...current,
            [activeMode]: selection,
        }));
    };
    const handleApplySelectionTool = (selectionTool) => {
        if (!currentSelection) {
            return;
        }
        commitModeChange(activeMode, (current) => applyToolToSelection(current, currentLayer.id, currentSelection, selectionTool, activeColor));
    };
    const handleOpenPreview = () => {
        setPreviewRunSeed((current) => current + 1);
        setIsPreviewOpen(true);
    };
    const handleOpenCanvasFullscreen = () => {
        setFullscreenCanvasZoom((current) => current >= MIN_SKIN_CANVAS_ZOOM && current <= MAX_SKIN_CANVAS_ZOOM ? current : DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM);
        setIsCanvasFullscreenOpen(true);
    };
    const handleAdjustWorkspaceZoom = (delta) => {
        setCanvasZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
    };
    const handleWorkspaceZoomChange = (value) => {
        setCanvasZoom(clamp(Number(value.toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
    };
    const handleAdjustFullscreenCanvasZoom = (delta) => {
        setFullscreenCanvasZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
    };
    const handleFullscreenCanvasZoomChange = (value) => {
        setFullscreenCanvasZoom(clamp(Number(value.toFixed(2)), MIN_SKIN_CANVAS_ZOOM, MAX_SKIN_CANVAS_ZOOM));
    };
    const handleWorkspaceCanvasWheel = (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        event.preventDefault();
        handleAdjustWorkspaceZoom(event.deltaY < 0 ? 0.12 : -0.12);
    };
    const handleFullscreenCanvasWheel = (event) => {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        event.preventDefault();
        handleAdjustFullscreenCanvasZoom(event.deltaY < 0 ? 0.12 : -0.12);
    };
    const handleUseTool = (x, y, options) => {
        if (tool === 'select' || tool === 'pick' || tool === 'circle') {
            return;
        }
        const activeLayerId = currentLayer.id;
        const shouldApplySelection = Boolean(options?.applySelection && currentSelection);
        if (shouldApplySelection && currentSelection) {
            commitModeChange(activeMode, (current) => applyToolToSelection(current, activeLayerId, currentSelection, tool, activeColor));
            return;
        }
        if (tool === 'fill') {
            commitModeChange(activeMode, (current) => fillLayer(current, activeLayerId, x, y, activeColor));
            return;
        }
        replaceModePresent(activeMode, (current) => applyPixelToLayer(current, activeLayerId, x, y, tool === 'paint' ? activeColor : null));
    };
    const handlePickColor = (x, y) => {
        const nextColor = getLayerPixelColor(currentLayer, x, y) ?? getCompositePixelColor(currentDraft, x, y);
        if (!nextColor) {
            return;
        }
        applyActiveColor(nextColor);
    };
    const handleApplyCircle = (selection) => {
        commitModeChange(activeMode, (current) => applyEllipseToLayer(current, currentLayer.id, selection, activeColor));
    };
    const handleHoverCellChange = (cell) => {
        setHoverCells((current) => ({
            ...current,
            [activeMode]: cell,
        }));
    };
    const handleResetMode = () => {
        gestureBaseRef.current[activeMode] = null;
        setHistories((current) => ({
            ...current,
            [activeMode]: createHistoryState(serverDrafts[activeMode]),
        }));
        setActiveLayerIds((current) => ({
            ...current,
            [activeMode]: getSkinLayers(serverDrafts[activeMode])[0].id,
        }));
        setSelections((current) => ({
            ...current,
            [activeMode]: null,
        }));
        setHoverCells((current) => ({
            ...current,
            [activeMode]: null,
        }));
        setMessage(`${getPlayerModeLabel(activeMode)} skin reset to the last saved version.`);
    };
    const handleClearMode = () => {
        const nextDraft = createEmptyPlayerSkinData(activeMode);
        gestureBaseRef.current[activeMode] = null;
        setHistories((current) => ({
            ...current,
            [activeMode]: {
                past: [...current[activeMode].past, current[activeMode].present].slice(-MAX_HISTORY_STEPS),
                present: nextDraft,
                future: [],
            },
        }));
        setActiveLayerIds((current) => ({
            ...current,
            [activeMode]: getSkinLayers(nextDraft)[0].id,
        }));
        setSelections((current) => ({
            ...current,
            [activeMode]: null,
        }));
        setHoverCells((current) => ({
            ...current,
            [activeMode]: null,
        }));
        setMessage(`${getPlayerModeLabel(activeMode)} will fall back to the built-in look after save.`);
    };
    const handleSaveMode = async () => {
        setMessage('');
        try {
            await saveMutation.mutateAsync({
                mode: activeMode,
                data: currentDraft,
            });
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not save the skin.');
        }
    };
    const handleColorDraftChange = (value) => {
        const normalizedValue = value.toUpperCase();
        setTool('paint');
        setColorDraft(normalizedValue);
        if (isHexColor(normalizedValue)) {
            setActiveColor(normalizedValue);
        }
    };
    const handleColorDraftBlur = () => {
        setColorDraft(activeColor);
    };
    const handleAddLayer = () => {
        if (!canAddLayer) {
            return;
        }
        const nextLayer = createLayerDraft(currentLayers);
        commitModeChange(activeMode, (current) => ({
            ...current,
            layers: [...getSkinLayers(current), nextLayer],
        }));
        setActiveLayerIds((current) => ({
            ...current,
            [activeMode]: nextLayer.id,
        }));
    };
    const handleDeleteLayer = () => {
        if (currentLayers.length <= 1) {
            return;
        }
        const remainingLayers = currentLayers.filter((layer) => layer.id !== currentLayer.id);
        const nextLayerIndex = Math.max(0, Math.min(currentLayerSelection.index, remainingLayers.length - 1));
        commitModeChange(activeMode, (current) => ({
            ...current,
            layers: getSkinLayers(current).filter((layer) => layer.id !== currentLayer.id),
        }));
        setActiveLayerIds((current) => ({
            ...current,
            [activeMode]: remainingLayers[nextLayerIndex].id,
        }));
    };
    const handleMoveLayer = (direction) => {
        commitModeChange(activeMode, (current) => {
            const layers = getSkinLayers(current);
            const layerIndex = layers.findIndex((layer) => layer.id === currentLayer.id);
            const nextIndex = layerIndex + direction;
            if (layerIndex < 0 || nextIndex < 0 || nextIndex >= layers.length) {
                return current;
            }
            const nextLayers = [...layers];
            [nextLayers[layerIndex], nextLayers[nextIndex]] = [nextLayers[nextIndex], nextLayers[layerIndex]];
            return {
                ...current,
                layers: nextLayers,
            };
        });
    };
    const handleRenameLayer = (name) => {
        replaceModePresent(activeMode, (current) => ({
            ...current,
            layers: getSkinLayers(current).map((layer) => layer.id === currentLayer.id
                ? {
                    ...layer,
                    name,
                }
                : layer),
        }));
    };
    const handleRenameSkin = (name) => {
        replaceModePresent(activeMode, (current) => ({
            ...current,
            name,
        }));
    };
    const handleToggleActiveLayerVisibility = () => {
        commitModeChange(activeMode, (current) => ({
            ...current,
            layers: getSkinLayers(current).map((layer) => layer.id === currentLayer.id
                ? {
                    ...layer,
                    visible: !layer.visible,
                }
                : layer),
        }));
    };
    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const tagName = target?.tagName?.toLowerCase();
            if (target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                return;
            }
            const key = event.key.toLowerCase();
            const code = event.code;
            if (key === 'escape') {
                if (isCanvasFullscreenOpen) {
                    setIsCanvasFullscreenOpen(false);
                    return;
                }
                if (currentSelection) {
                    event.preventDefault();
                    setSelections((current) => ({
                        ...current,
                        [activeMode]: null,
                    }));
                    return;
                }
                if (tool === 'select') {
                    setTool('paint');
                }
                return;
            }
            if (currentSelection && (key === 'delete' || key === 'backspace')) {
                event.preventDefault();
                commitModeChange(activeMode, (current) => applyToolToSelection(current, currentLayer.id, currentSelection, 'erase', activeColor));
                return;
            }
            if (event.ctrlKey || event.metaKey) {
                if (code === 'KeyS') {
                    event.preventDefault();
                    setMessage('');
                    void saveMutation
                        .mutateAsync({
                        mode: activeMode,
                        data: currentDraft,
                    })
                        .catch((error) => {
                        setMessage(error instanceof Error ? error.message : 'Could not save the skin.');
                    });
                    return;
                }
                if (code === 'KeyZ' && event.shiftKey) {
                    event.preventDefault();
                    redoMode(activeMode);
                    return;
                }
                if (code === 'KeyZ') {
                    event.preventDefault();
                    undoMode(activeMode);
                    return;
                }
                if (code === 'KeyY') {
                    event.preventDefault();
                    redoMode(activeMode);
                }
                return;
            }
            if (event.altKey) {
                return;
            }
            if (code === 'KeyB') {
                setTool('paint');
                return;
            }
            if (code === 'KeyE') {
                setTool('erase');
                return;
            }
            if (code === 'KeyF') {
                setTool('fill');
                return;
            }
            if (code === 'KeyC') {
                setTool('circle');
                return;
            }
            if (code === 'KeyV') {
                setTool('select');
                return;
            }
            if (code === 'KeyI') {
                setTool('pick');
                return;
            }
            if (code === 'Equal' || key === '+' || key === '=') {
                event.preventDefault();
                handleAdjustWorkspaceZoom(0.12);
                return;
            }
            if (code === 'Minus' || key === '-' || key === '_') {
                event.preventDefault();
                handleAdjustWorkspaceZoom(-0.12);
                return;
            }
            if (code === 'Digit0' || key === '0') {
                event.preventDefault();
                handleWorkspaceZoomChange(DEFAULT_SKIN_CANVAS_ZOOM);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeColor, activeMode, currentDraft, currentLayer.id, currentSelection, isCanvasFullscreenOpen, saveMutation, tool]);
    if (playerSkinsQuery.isLoading && !initializedRef.current) {
        return _jsx("p", { className: "text-white/70", children: "Loading skin studio..." });
    }
    return (_jsxs("div", { className: "w-full min-w-0 space-y-4 p-4 lg:p-5", children: [_jsx(Panel, { className: "game-screen shrink-0 bg-transparent p-0", children: _jsxs("div", { className: "space-y-6 px-6 py-6 lg:px-8 lg:py-7", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { className: "max-w-3xl space-y-3", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Admin Garage" }), _jsx("h2", { className: "font-display text-4xl leading-[0.95] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] md:text-5xl", children: "Skin Studio" }), _jsx("p", { className: "max-w-2xl text-sm leading-7 text-white/78 md:text-base", children: "Rebuilt around the actual edit loop: pick a form, keep the canvas large, switch tools from one column, sample colors from the sprite, and batch-paint selections without hunting across the page." })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: "/admin", children: _jsx(Button, { variant: "ghost", children: "Back To Admin" }) }), _jsx(Button, { variant: "secondary", onClick: handleOpenPreview, children: "Run Preview" }), _jsx(Button, { onClick: handleSaveMode, disabled: saveMutation.isPending, children: saveMutation.isPending ? 'Saving...' : `Save ${getPlayerModeLabel(activeMode)}` })] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Current Mode" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: getPlayerModeLabel(activeMode) })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Skin Name" }), _jsx("p", { className: "mt-2 truncate font-display text-2xl text-white", children: currentDraft.name })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Dirty Modes" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: dirtyModes.length })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Active Layer" }), _jsx("p", { className: "mt-2 truncate font-display text-2xl text-white", children: currentLayer.name })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Selected Cells" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: selectedCellCount })] })] })] }) }), _jsxs("div", { className: "grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_320px]", children: [_jsx(Panel, { className: "game-screen min-h-0 bg-transparent", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Mode Rack" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Forms" })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-1", children: playerModes.map((mode) => {
                                        const isDirty = dirtyModes.includes(mode);
                                        return (_jsxs("button", { type: "button", onClick: () => setActiveMode(mode), className: cn('rounded-[24px] border-[4px] px-4 py-4 text-left transition', activeMode === mode
                                                ? 'border-[#caff45] bg-[#1a3410] text-[#efffd7]'
                                                : 'border-[#0f1b31] bg-[#12203c] text-white hover:border-[#335d95] hover:brightness-110'), children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("strong", { className: "font-display text-lg", children: getPlayerModeLabel(mode) }), isDirty ? _jsx(Badge, { tone: "accent", children: "Unsaved" }) : _jsx(Badge, { tone: "success", children: "Saved" })] }), _jsxs("p", { className: "mt-2 text-xs uppercase tracking-[0.18em] text-white/62", children: [playerSkinEditorConfigs[mode].gridCols, " x ", playerSkinEditorConfigs[mode].gridRows] })] }, mode));
                                    }) }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Tools" }), _jsx("h4", { className: "font-display text-2xl text-white", children: getSkinToolLabel(tool) })] }), _jsx(Badge, { tone: "accent", children: skinToolOptions.length })] }), _jsx("div", { className: "mt-4 grid gap-2", children: skinToolOptions.map((option) => (_jsxs("button", { type: "button", onClick: () => setTool(option.tool), className: cn('rounded-[18px] border-[3px] px-4 py-3 text-left transition', tool === option.tool
                                                    ? option.activeVariant === 'danger'
                                                        ? 'border-[#ff6b9e] bg-[#361421] text-white'
                                                        : option.activeVariant === 'primary'
                                                            ? 'border-[#caff45] bg-[#1a3410] text-white'
                                                            : 'border-[#79f7ff] bg-[#14253d] text-white'
                                                    : 'border-[#152545] bg-[#0c1630] text-white/84 hover:border-[#335d95]'), children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "font-display text-xl", children: option.label }), _jsx("span", { className: "rounded-[12px] border-[2px] border-white/12 px-2 py-1 text-xs uppercase tracking-[0.18em] text-white/64", children: option.hotkey })] }), _jsx("p", { className: "mt-2 text-sm leading-6 text-white/68", children: option.description })] }, option.tool))) })] }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Brush Color" }), _jsx("h4", { className: "font-display text-2xl text-white", children: activeColor })] }), _jsx("span", { className: "h-12 w-12 rounded-[16px] border-[3px] border-white/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]", style: { backgroundColor: activeColor }, "aria-hidden": "true" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3", children: [_jsx(Input, { type: "color", value: activeColor, onChange: (event) => applyActiveColor(event.target.value), className: "h-14 w-24 cursor-pointer p-1" }), _jsx(Input, { value: colorDraft, onChange: (event) => handleColorDraftChange(event.target.value), onBlur: handleColorDraftBlur, className: "h-14 min-w-[148px] flex-1 text-base" })] }), _jsx("div", { className: "mt-4 grid grid-cols-6 gap-2", children: colorPresets.map((color) => (_jsx("button", { type: "button", className: cn('h-10 rounded-[12px] border-[3px] transition', activeColor === color
                                                    ? 'border-white scale-[1.04] shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                                                    : shouldUseContrastStroke(color)
                                                        ? 'border-white/20 hover:border-white/42'
                                                        : 'border-[#0f1b31] hover:border-white/18'), style: { backgroundColor: color }, onClick: () => applyActiveColor(color), "aria-label": `Use ${color}`, title: color }, color))) }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/68", children: "`Alt + click` or the Picker tool samples a visible pixel and jumps straight back to Brush. The swatch rack now exposes the full editor palette, and the browser picker / hex field still allow any custom color." })] }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Selection" }), _jsx("h4", { className: "font-display text-2xl text-white", children: hasSelection ? `${selectedCellCount} Cells` : 'No Box Yet' })] }), _jsx(Badge, { tone: hasSelection ? 'accent' : 'default', children: hasSelection ? 'Ready' : 'Idle' })] }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/72", children: "Use Select, hold `Shift` while dragging, or right-drag if you prefer the old flow. Clicking inside an existing selection applies Brush or Eraser to the whole box." }), _jsxs("div", { className: "mt-4 grid gap-2", children: [_jsx(Button, { variant: "primary", onClick: () => handleApplySelectionTool('paint'), disabled: !hasSelection, children: "Paint Selection" }), _jsx(Button, { variant: "danger", onClick: () => handleApplySelectionTool('erase'), disabled: !hasSelection, children: "Erase Selection" }), _jsx(Button, { variant: "ghost", onClick: () => handleSelectionChange(null), disabled: !hasSelection, children: "Clear Selection" })] })] }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-5 py-5", children: [_jsx("p", { className: "arcade-eyebrow", children: "Quick Keys" }), _jsxs("div", { className: "mt-3 space-y-2 text-sm leading-7 text-white/76", children: [_jsx("p", { children: "`B / E / F / C / V / I` switches Brush, Eraser, Fill, Circle, Select, and Picker." }), _jsx("p", { children: "`Ctrl/Cmd + Z`, `Ctrl/Cmd + Y`, and `Ctrl/Cmd + Shift + Z` handle undo and redo." }), _jsx("p", { children: "`Ctrl/Cmd + wheel`, `+`, `-`, and `0` zoom the workbench canvas without opening fullscreen." }), _jsx("p", { children: "`Delete` clears the active selection, and `Esc` clears the box or exits Select/Circle." })] })] })] }) }), _jsx(Panel, { className: "game-screen min-h-0 bg-transparent", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Workbench" }), _jsxs("h3", { className: "font-display text-4xl text-white", children: [getPlayerModeLabel(activeMode), " Canvas"] }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-7 text-white/72", children: "Keep the layer stack on the right, zoom directly in the main workspace, and use the hover readout to see exactly which cell and color you are over before painting or dragging out circles." })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { tone: isCurrentModeDirty ? 'accent' : 'success', children: isCurrentModeDirty ? 'Unsaved Changes' : 'Saved' }), _jsx(Badge, { tone: currentLayer.visible ? 'success' : 'danger', children: currentLayer.visible ? 'Layer Visible' : 'Layer Hidden' }), _jsxs(Badge, { tone: "default", children: [currentConfig.gridCols, " x ", currentConfig.gridRows] })] })] }), _jsxs("div", { className: "grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Tool" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: getSkinToolLabel(tool) })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Pixels" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: currentDraft.pixels.length })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Hover Cell" }), _jsx("p", { className: "mt-2 font-display text-2xl text-white", children: currentHoverCell ? `${currentHoverCell.x + 1}, ${currentHoverCell.y + 1}` : 'Off Canvas' }), _jsx("p", { className: "mt-2 text-xs uppercase tracking-[0.16em] text-white/56", children: currentHoverCell?.selected ? 'Inside Selection' : 'Free Cell' })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Hover Color" }), _jsxs("div", { className: "mt-2 flex items-center gap-3", children: [_jsx("span", { className: cn('h-10 w-10 rounded-[14px] border-[3px] border-white/14', currentHoverCell?.compositeColor ? '' : 'bg-[linear-gradient(135deg,#0d1324,#1b2440)]'), style: currentHoverCell?.compositeColor ? { backgroundColor: currentHoverCell.compositeColor } : undefined, "aria-hidden": "true" }), _jsxs("div", { children: [_jsx("p", { className: "font-display text-lg text-white", children: currentHoverCell?.compositeColor ?? 'Empty' }), _jsx("p", { className: "text-xs uppercase tracking-[0.16em] text-white/56", children: currentHoverCell?.activeLayerColor ? 'Active Layer Hit' : 'Visible Stack' })] })] })] })] }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#163057] bg-[#0f1b31] px-4 py-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Zoom" }), _jsxs("p", { className: "font-display text-3xl text-white", children: [canvasZoom.toFixed(2), "x"] })] }), _jsx(Button, { variant: "secondary", onClick: handleOpenCanvasFullscreen, children: "Fullscreen" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => handleAdjustWorkspaceZoom(-0.2), children: "-" }), _jsx("input", { type: "range", min: MIN_SKIN_CANVAS_ZOOM, max: MAX_SKIN_CANVAS_ZOOM, step: "0.05", value: canvasZoom, onChange: (event) => handleWorkspaceZoomChange(Number(event.target.value)), className: "h-4 min-w-[180px] flex-1 accent-[#caff45]" }), _jsx(Button, { variant: "primary", onClick: () => handleAdjustWorkspaceZoom(0.2), children: "+" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => handleWorkspaceZoomChange(DEFAULT_SKIN_CANVAS_ZOOM), children: "Reset Zoom" }), _jsx(Button, { variant: "ghost", onClick: handleOpenPreview, children: "Test Level" })] }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/68", children: "`Ctrl/Cmd + wheel` zooms here too, so fullscreen is optional instead of required." })] })] }), _jsx(PlayerSkinPaintCanvas, { mode: activeMode, skinData: currentDraft, activeLayerId: currentLayer.id, tool: tool, selection: currentSelection, cellSize: canvasCellSize, containerClassName: "min-h-[56vh]", onCanvasWheel: handleWorkspaceCanvasWheel, onUseTool: handleUseTool, onApplyCircle: handleApplyCircle, onPickColor: handlePickColor, onSelectionChange: handleSelectionChange, onHoverCellChange: handleHoverCellChange, onGestureStart: handleCanvasGestureStart, onGestureEnd: handleCanvasGestureEnd }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Button, { variant: "secondary", onClick: () => undoMode(activeMode), disabled: !canUndo, children: "Undo" }), _jsx(Button, { variant: "secondary", onClick: () => redoMode(activeMode), disabled: !canRedo, children: "Redo" }), _jsx(Button, { onClick: handleSaveMode, disabled: saveMutation.isPending, children: saveMutation.isPending ? 'Saving...' : 'Save Mode' }), _jsx(Button, { variant: "secondary", onClick: handleResetMode, disabled: !isCurrentModeDirty, children: "Reset Mode" }), _jsx(Button, { variant: "ghost", onClick: handleClearMode, children: "Use Built-In" })] }), message ? (_jsx("div", { className: "rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4 text-sm leading-7 text-white/82", children: message })) : null] }) }), _jsxs("div", { className: "space-y-4", children: [_jsx(Panel, { className: "game-screen min-h-0 bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Layers" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Stack" })] }), _jsxs(Badge, { tone: "accent", children: [currentLayers.length, " / ", MAX_SKIN_LAYERS] })] }), _jsxs("div", { className: "rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-white/56", children: "Active Layer" }), _jsxs("div", { className: "mt-2 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display text-2xl text-white", children: currentLayer.name }), _jsxs("p", { className: "mt-1 text-sm leading-7 text-white/68", children: [currentLayer.pixels.length, " px | ", currentLayer.visible ? 'Visible in stack' : 'Hidden but still editable'] })] }), _jsx(Badge, { tone: currentLayer.visible ? 'success' : 'danger', children: currentLayer.visible ? 'Visible' : 'Hidden' })] })] }), _jsx("div", { className: "space-y-2 pr-1", children: orderedLayers.map((layer, index) => {
                                                const isActive = layer.id === currentLayer.id;
                                                const stackPosition = currentLayers.length - index;
                                                return (_jsxs("div", { className: cn('flex items-center gap-2 rounded-[18px] border-[3px] px-3 py-3', isActive
                                                        ? 'border-[#caff45] bg-[#192f12]'
                                                        : 'border-[#152545] bg-[#0c1630] text-white/84'), children: [_jsxs("button", { type: "button", className: "flex min-w-0 flex-1 items-center justify-between gap-3 text-left", onClick: () => setActiveLayerIds((current) => ({
                                                                ...current,
                                                                [activeMode]: layer.id,
                                                            })), children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-display text-xl text-white", children: layer.name }), _jsxs("p", { className: "mt-1 text-xs uppercase tracking-[0.16em] text-white/56", children: ["Layer ", stackPosition, " | ", layer.pixels.length, " px"] })] }), _jsx("span", { className: "rounded-[12px] border-[2px] border-white/10 px-2 py-1 text-xs uppercase tracking-[0.16em] text-white/62", children: isActive ? 'Editing' : 'Select' })] }), _jsx("button", { type: "button", className: cn('rounded-[12px] border-[2px] px-3 py-2 text-sm uppercase tracking-[0.16em]', layer.visible ? 'border-[#63ffbd] text-[#63ffbd]' : 'border-white/18 text-white/45'), onClick: () => {
                                                                commitModeChange(activeMode, (current) => ({
                                                                    ...current,
                                                                    layers: getSkinLayers(current).map((entry) => entry.id === layer.id
                                                                        ? {
                                                                            ...entry,
                                                                            visible: !entry.visible,
                                                                        }
                                                                        : entry),
                                                                }));
                                                            }, children: layer.visible ? 'Hide' : 'Show' })] }, layer.id));
                                            }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Skin Name" }), _jsx(Input, { className: "h-14 text-base", value: currentDraft.name, maxLength: 64, placeholder: createDefaultPlayerSkinName(activeMode), onChange: (event) => handleRenameSkin(event.target.value) }), _jsx("p", { className: "mt-2 text-sm leading-7 text-white/66", children: "This is the published name shown when the player equips the skin in Character Select." })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Selected Layer Name" }), _jsx(Input, { className: "h-14 text-base", value: currentLayer.name, onChange: (event) => handleRenameLayer(event.target.value) })] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [_jsx(Button, { variant: "primary", onClick: handleAddLayer, disabled: !canAddLayer, children: "Add Layer" }), _jsx(Button, { variant: "secondary", onClick: () => handleMoveLayer(1), disabled: activeLayerIsTop, children: "Move Up" }), _jsx(Button, { variant: "secondary", onClick: () => handleMoveLayer(-1), disabled: activeLayerIsBottom, children: "Move Down" }), _jsx(Button, { variant: "ghost", onClick: handleToggleActiveLayerVisibility, children: currentLayer.visible ? 'Hide Layer' : 'Show Layer' }), _jsx(Button, { variant: "danger", onClick: handleDeleteLayer, disabled: currentLayers.length <= 1, className: "sm:col-span-2", children: "Delete Layer" })] })] })] }) }), _jsx(Panel, { className: "game-screen bg-transparent", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Preview Lab" }), _jsx("h3", { className: "font-display text-3xl text-white", children: "Live Checks" })] }), _jsxs(Badge, { tone: "accent", children: [currentDraft.pixels.length, " px"] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-1", children: [_jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-4 py-4 text-center", children: [_jsx("p", { className: "text-sm uppercase tracking-[0.18em] text-white/56", children: "Sprite" }), _jsx("div", { className: "mt-4 flex justify-center", children: _jsx(PlayerModelCanvas, { mode: activeMode, width: 220, height: 220, skinOverride: currentDraft, className: "rounded-[20px] bg-[#09101e]" }) }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/68", children: "Unsaved edits render here immediately." })] }), _jsxs("div", { className: "rounded-[26px] border-[4px] border-[#0f1b31] bg-[#101a30] px-4 py-4 text-center", children: [_jsx("p", { className: "text-sm uppercase tracking-[0.18em] text-white/56", children: "Hitbox" }), _jsx("div", { className: "mt-4 flex justify-center", children: _jsx(PlayerModelCanvas, { mode: activeMode, width: 220, height: 220, skinOverride: currentDraft, showHitboxOverlay: true, className: "rounded-[20px] bg-[#09101e]" }) }), _jsx("p", { className: "mt-3 text-sm leading-7 text-white/68", children: "Yellow is contact. Cyan dashed is the solid core." })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Button, { onClick: handleOpenPreview, children: "Run Test Level" }), _jsx(Button, { variant: "secondary", onClick: handleOpenCanvasFullscreen, children: "Fullscreen Canvas" })] }), _jsxs("div", { className: "rounded-[22px] border-[3px] border-[#163057] bg-[#0f1b31] px-4 py-4", children: [_jsx("p", { className: "arcade-eyebrow", children: "Notes" }), _jsxs("div", { className: "mt-3 space-y-2 text-sm leading-7 text-white/76", children: [_jsx("p", { children: "Fill and erase operate on the active layer only, so the stack stays predictable." }), _jsx("p", { children: "Hidden active layers stay ghosted in the editor, which makes alignment easier while still showing intent." }), _jsx("p", { children: "The runtime preview always uses the current draft, so you can test before pressing Save." })] })] })] }) })] })] }), isCanvasFullscreenOpen ? (_jsx("div", { className: "fixed inset-0 z-[75] bg-[rgba(4,8,20,0.88)] p-4 backdrop-blur-[8px] md:p-6", role: "dialog", "aria-modal": "true", "aria-label": "Fullscreen skin canvas", onClick: () => setIsCanvasFullscreenOpen(false), children: _jsxs("div", { className: "mx-auto flex h-full w-full max-w-[1800px] flex-col rounded-[32px] border-[4px] border-[#163057] bg-[linear-gradient(180deg,rgba(43,20,80,0.98),rgba(10,17,34,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.45)]", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-white/10 px-5 py-4 md:px-7 md:py-5", children: [_jsxs("div", { children: [_jsx("p", { className: "arcade-eyebrow", children: "Canvas Focus" }), _jsxs("h3", { className: "font-display text-3xl text-white md:text-4xl", children: [getPlayerModeLabel(activeMode), " Fullscreen Canvas"] }), _jsx("p", { className: "mt-2 text-sm leading-7 text-white/72 md:text-base", children: "Draw on the full workspace, drag Circle for rounded silhouettes, use Select or `Shift + drag` to box-select, `Alt + click` to sample colors, and `Ctrl/Cmd + wheel` to zoom." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "rounded-[20px] border-[3px] border-[#163057] bg-[#0e1d36] px-4 py-3 text-sm uppercase tracking-[0.16em] text-white/86", children: ["Zoom ", fullscreenCanvasZoom.toFixed(2), "x"] }), _jsx(Button, { className: "min-h-[50px] px-5 text-sm", variant: "ghost", onClick: () => handleAdjustFullscreenCanvasZoom(-0.2), children: "-" }), _jsx("input", { type: "range", min: MIN_SKIN_CANVAS_ZOOM, max: MAX_SKIN_CANVAS_ZOOM, step: "0.05", value: fullscreenCanvasZoom, onChange: (event) => handleFullscreenCanvasZoomChange(Number(event.target.value)), className: "h-4 w-[220px] accent-[#caff45]" }), _jsx(Button, { className: "min-h-[50px] px-5 text-sm", variant: "secondary", onClick: () => handleFullscreenCanvasZoomChange(DEFAULT_FULLSCREEN_SKIN_CANVAS_ZOOM), children: "Reset Zoom" }), _jsx(Button, { className: "min-h-[50px] px-5 text-sm", variant: "primary", onClick: () => handleAdjustFullscreenCanvasZoom(0.2), children: "+" }), _jsx(Button, { className: "min-h-[50px] px-5 text-sm", variant: "danger", onClick: () => setIsCanvasFullscreenOpen(false), children: "Close" })] })] }), _jsx("div", { className: "min-h-0 flex-1 px-4 pb-4 pt-4 md:px-6 md:pb-6", children: _jsx(PlayerSkinPaintCanvas, { mode: activeMode, skinData: currentDraft, activeLayerId: currentLayer.id, tool: tool, selection: currentSelection, cellSize: fullscreenCanvasCellSize, containerClassName: "h-full min-h-0 p-4 md:p-5", canvasClassName: "rounded-[22px]", onCanvasWheel: handleFullscreenCanvasWheel, onUseTool: handleUseTool, onApplyCircle: handleApplyCircle, onPickColor: handlePickColor, onSelectionChange: handleSelectionChange, onHoverCellChange: handleHoverCellChange, onGestureStart: handleCanvasGestureStart, onGestureEnd: handleCanvasGestureEnd }) })] }) })) : null, isPreviewOpen ? (_jsxs("div", { className: "gd-draft-view-preview-shell", role: "dialog", "aria-modal": "true", "aria-label": "Skin preview run", children: [_jsxs("div", { className: "gd-draft-view-preview-actions", "aria-label": "Preview controls", children: [_jsx("button", { type: "button", className: "gd-draft-view-preview-action", onClick: handleOpenPreview, "aria-label": "Restart preview", title: "Restart preview", children: "Restart" }), _jsx("button", { type: "button", className: "gd-draft-view-preview-action gd-draft-view-preview-action--close", onClick: () => setIsPreviewOpen(false), "aria-label": "Close preview", title: "Close preview", children: "Close" })] }), _jsx(GameCanvas, { levelData: previewLevelData, attemptNumber: 1, runId: `skin-preview-${activeMode}-${previewRunSeed}`, autoRestartOnFail: true, fullscreen: true, className: "gd-draft-view-preview-fullscreen", playerSkinOverrides: previewSkinOverrides, onExitToMenu: () => setIsPreviewOpen(false) }, `skin-preview-${activeMode}-${previewRunSeed}`)] })) : null] }));
}
