import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Level, LevelData, LevelObject, LevelObjectType } from '../../types/models';
import { Badge, Button, FieldLabel, Input, Panel, Textarea } from '../../components/ui';
import { GameCanvas } from '../game/game-canvas';
import {
  PAINT_GROUP_SLOT_COUNT,
  createEmptyLevelData,
  getColorGroupById,
  getObjectFillColor,
  getObjectPaintGroupId,
  getObjectStrokeColor,
  isPaintableObjectType,
  isTriggerObjectType,
  levelObjectDefinitions,
} from '../game/object-definitions';
import { resolveLevelMusic } from '../game/level-music';
import { drawStageObjectSprite } from '../game/object-renderer';
import { SHIP_FLIGHT_CEILING_Y, SHIP_FLIGHT_FLOOR_Y, getPlayerModeLabel } from '../game/player-mode-config';
import { getStageThemePalette } from '../game/stage-theme-palette';
import { readLocalEditorDraft, writeLocalEditorDraft } from './local-draft-storage';
import { cn } from '../../utils/cn';

type EditorTool = 'select' | 'pan' | LevelObjectType;

type LevelEditorProps = {
  initialLevel?: Level | null;
  draftStorageKey: string;
  saveLabel?: string;
  onClose?: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    theme: string;
    dataJson: LevelData;
  }) => Promise<void>;
  onSubmit?: () => Promise<void>;
};

type DragState =
  | {
      mode: 'pan';
      originX: number;
      originY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      mode: 'move';
      objectId: string;
      offsetX: number;
      offsetY: number;
      originX: number;
      originY: number;
    }
  | {
      mode: 'box-select';
      startScreenX: number;
      startScreenY: number;
    }
  | null;

type SelectionBox = {
  startScreenX: number;
  startScreenY: number;
  endScreenX: number;
  endScreenY: number;
};

type TouchGestureState = {
  startDistance: number;
  startZoom: number;
  startPanX: number;
  startPanY: number;
  startCenterX: number;
  startCenterY: number;
};

const themePresets = [
  { value: 'neon-grid', label: 'Neon Grid' },
  { value: 'cyber-night', label: 'Cyber Night' },
  { value: 'sunset-burn', label: 'Sunset Burn' },
  { value: 'acid-void', label: 'Acid Void' },
  { value: 'deep-space', label: 'Deep Space' },
] as const;

const paletteGroups: Array<{ title: string; items: EditorTool[] }> = [
  { title: 'Controls', items: ['select', 'pan'] },
  { title: 'Blocks', items: ['GROUND_BLOCK', 'HALF_GROUND_BLOCK', 'PLATFORM_BLOCK', 'HALF_PLATFORM_BLOCK', 'DECORATION_BLOCK'] },
  { title: 'Obstacles', items: ['SPIKE', 'SAW_BLADE'] },
  { title: 'Boosts', items: ['JUMP_PAD', 'JUMP_ORB'] },
  { title: 'Portals', items: ['GRAVITY_PORTAL', 'SPEED_PORTAL', 'SHIP_PORTAL', 'CUBE_PORTAL', 'FINISH_PORTAL'] },
  { title: 'Triggers', items: ['MOVE_TRIGGER', 'ALPHA_TRIGGER', 'TOGGLE_TRIGGER', 'PULSE_TRIGGER'] },
  { title: 'Run Points', items: ['START_MARKER', 'START_POS'] },
];

const toolDescriptions: Record<EditorTool, string> = {
  select: 'Pick, move and inspect objects',
  pan: 'Hold Space or drag to move around',
  GROUND_BLOCK: 'Safe floor for the run',
  HALF_GROUND_BLOCK: 'Half-height floor piece',
  PLATFORM_BLOCK: 'Extra landable block',
  HALF_PLATFORM_BLOCK: 'Half-height platform piece',
  SPIKE: 'Primary hazard',
  SAW_BLADE: 'Rotating circular hazard',
  JUMP_PAD: 'Forces an upward bounce',
  JUMP_ORB: 'Mid-air extra jump',
  GRAVITY_PORTAL: 'Flips gravity',
  SPEED_PORTAL: 'Changes run speed',
  SHIP_PORTAL: 'Switches into ship mode',
  CUBE_PORTAL: 'Returns to cube mode',
  FINISH_PORTAL: 'Level completion',
  MOVE_TRIGGER: 'Moves a paint group during the run',
  ALPHA_TRIGGER: 'Changes group opacity',
  TOGGLE_TRIGGER: 'Shows or hides a group',
  PULSE_TRIGGER: 'Pulses a group color for a short burst',
  DECORATION_BLOCK: 'Visual block only',
  START_MARKER: 'Player spawn point',
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

type EditorInitialState = {
  title: string;
  description: string;
  theme: string;
  levelData: LevelData;
  restoredFromLocal: boolean;
};

function syncDerivedLevelData(next: LevelData) {
  const maxX = Math.max(next.finish.x + 16, ...next.objects.map((object) => object.x + object.w + 12));
  next.meta.lengthUnits = Math.max(60, Math.ceil(maxX));
  return next;
}

function getPaletteGroupTitle(tool: EditorTool) {
  return paletteGroups.find((group) => group.items.includes(tool))?.title ?? 'Blocks';
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function getEditorColorInputValue(value: string, fallback: string) {
  return isHexColor(value) ? value : fallback;
}

function isDirectMusicSource(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('blob:') ||
    value.startsWith('data:audio/')
  );
}

function getInitialMusicUrlInput(music: string) {
  return isDirectMusicSource(music) && !music.startsWith('data:audio/') ? music : '';
}

function inferMusicLabel(source: string) {
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

function createInitialEditorState(initialLevel: Level | null | undefined, draftStorageKey: string): EditorInitialState {
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

export function LevelEditor({
  initialLevel,
  draftStorageKey,
  saveLabel = 'Save Draft',
  onClose,
  onSave,
  onSubmit,
}: LevelEditorProps) {
  const initialEditorState = useMemo(
    () => createInitialEditorState(initialLevel, draftStorageKey),
    [initialLevel, draftStorageKey],
  );
  const [title, setTitle] = useState(initialEditorState.title);
  const [description, setDescription] = useState(initialEditorState.description);
  const [theme, setTheme] = useState(initialEditorState.theme);
  const [levelData, setLevelData] = useState<LevelData>(initialEditorState.levelData);
  const [history, setHistory] = useState<LevelData[]>([initialEditorState.levelData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ objectId: string; x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [activePaletteGroup, setActivePaletteGroup] = useState<string>('Blocks');
  const [paletteDrawerGroup, setPaletteDrawerGroup] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
  const [canvasViewport, setCanvasViewport] = useState({ width: EDITOR_CANVAS_WIDTH, height: EDITOR_CANVAS_HEIGHT });
  const [showPreview, setShowPreview] = useState(false);
  const [previewRunSeed, setPreviewRunSeed] = useState(0);
  const [isPaintPopupOpen, setIsPaintPopupOpen] = useState(false);
  const [activePaintGroupId, setActivePaintGroupId] = useState<number | null>(null);
  const [musicUrlInput, setMusicUrlInput] = useState(() => getInitialMusicUrlInput(initialEditorState.levelData.meta.music));
  const [musicLabelInput, setMusicLabelInput] = useState(initialEditorState.levelData.meta.musicLabel ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string>(initialEditorState.restoredFromLocal ? 'Local draft restored.' : '');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const isSpacePressedRef = useRef(false);
  const liveLevelDataRef = useRef(levelData);
  const dragPreviewPositionRef = useRef<{ objectId: string; x: number; y: number } | null>(null);
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const touchGestureRef = useRef<TouchGestureState | null>(null);

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
    dragPreviewPositionRef.current = null;
    setDragPreviewPosition(null);
    setSelectionBox(null);
    setActivePaletteGroup('Blocks');
    setPaletteDrawerGroup(null);
    setZoom(1);
    setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
    setCursorWorld({ x: 0, y: 0 });
    setShowPreview(false);
    setPreviewRunSeed(0);
    setIsPaintPopupOpen(false);
    setActivePaintGroupId(null);
    setMusicUrlInput(getInitialMusicUrlInput(nextEditorState.levelData.meta.music));
    setMusicLabelInput(nextEditorState.levelData.meta.musicLabel ?? '');
    setSaveState('idle');
    setMessage(nextEditorState.restoredFromLocal ? 'Local draft restored.' : '');
  }, [draftStorageKey, initialLevel]);

  useEffect(() => {
    liveLevelDataRef.current = levelData;
  }, [levelData]);

  const applySelection = useCallback((nextIds: string[], nextPrimaryId?: string | null) => {
    const uniqueIds = [...new Set(nextIds)];
    const primaryId =
      nextPrimaryId && uniqueIds.includes(nextPrimaryId)
        ? nextPrimaryId
        : uniqueIds[0] ?? null;

    setSelectedObjectIds(uniqueIds);
    setSelectedObjectId(primaryId);
  }, []);

  const clearSelection = useCallback(() => {
    applySelection([], null);
    dragPreviewPositionRef.current = null;
    setDragPreviewPosition(null);
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

    if (dragPreviewPosition?.objectId === baseObject.id) {
      return {
        ...baseObject,
        x: dragPreviewPosition.x,
        y: dragPreviewPosition.y,
      };
    }

    return baseObject;
  }, [dragPreviewPosition, levelData.objects, selectedObjectId]);
  const selectedObjectIdSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const selectedObjects = useMemo(
    () =>
      levelData.objects.filter((object) => selectedObjectIdSet.has(object.id)).map((object) => {
        if (dragPreviewPosition?.objectId === object.id) {
          return {
            ...object,
            x: dragPreviewPosition.x,
            y: dragPreviewPosition.y,
          };
        }

        return object;
      }),
    [dragPreviewPosition, levelData.objects, selectedObjectIdSet],
  );
  const selectedDefinition = useMemo(
    () => (selectedObject ? levelObjectDefinitions[selectedObject.type] : null),
    [selectedObject],
  );
  const activeToolDescription = toolDescriptions[selectedTool];
  const activeToolLabel =
    selectedTool === 'select' ? 'Select' : selectedTool === 'pan' ? 'Pan' : levelObjectDefinitions[selectedTool].label;
  const paletteDrawer = useMemo(
    () => paletteGroups.find((group) => group.title === paletteDrawerGroup) ?? null,
    [paletteDrawerGroup],
  );
  const stageThemePalette = useMemo(() => getStageThemePalette(theme), [theme]);
  const colorGroups = useMemo(() => levelData.meta.colorGroups ?? [], [levelData.meta.colorGroups]);
  const resolvedMusic = useMemo(() => resolveLevelMusic(levelData.meta), [levelData.meta]);
  const selectionLabel =
    selectedObjects.length > 1
      ? `${selectedObjects.length} objects`
      : selectedObject
        ? selectedDefinition?.label ?? selectedObject.type
        : 'Nothing selected';
  const paintableSelectedObject = selectedObject && isPaintableObjectType(selectedObject.type) ? selectedObject : null;
  const paintableSelectedObjects = useMemo(
    () => selectedObjects.filter((object) => isPaintableObjectType(object.type)),
    [selectedObjects],
  );
  const selectedTriggerObject =
    selectedObjects.length === 1 && selectedObject && isTriggerObjectType(selectedObject.type) ? selectedObject : null;
  const selectedPaintGroupId = getObjectPaintGroupId(paintableSelectedObject);
  const normalizedSelectedRotation = normalizeQuarterRotation(selectedObject?.rotation ?? 0);
  const activePaintTool =
    selectedTool !== 'select' && selectedTool !== 'pan' && isPaintableObjectType(selectedTool) ? selectedTool : null;
  const canOpenPaintPopup = Boolean(paintableSelectedObjects.length > 0 || activePaintTool || colorGroups.length > 0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const historyPosition = `${historyIndex + 1}/${history.length}`;
  const selectionSummary =
    selectedObjects.length > 1
      ? `${selectedObjects.length} objects selected`
      : selectedObject
        ? `${selectedDefinition?.label ?? selectedObject.type} at ${selectedObject.x}, ${selectedObject.y}`
        : 'No object selected';
  const objectCount = String(levelData.objects.length);
  const musicOffsetMsValue = Math.max(0, Number(levelData.meta.musicOffsetMs ?? 0) || 0);
  const startPosObjects = useMemo(
    () => levelData.objects.filter((object) => object.type === 'START_POS'),
    [levelData.objects],
  );
  const startPosCount = startPosObjects.length;
  const hasStartPositions = startPosCount > 0;
  const activePreviewStartPos = hasStartPositions ? startPosObjects[startPosObjects.length - 1] : null;
  const stageCell = levelData.meta.gridSize * zoom;
  const visibleStageUnits = canvasViewport.width / stageCell;
  const horizontalScrollMax = Math.max(0, levelData.meta.lengthUnits + EDITOR_SCROLL_PADDING_UNITS - visibleStageUnits);
  const horizontalScrollValue = clamp((EDITOR_DEFAULT_PAN_X - pan.x) / stageCell, 0, horizontalScrollMax);

  const commitLevelData = useCallback(
    (next: LevelData, options?: { pushHistory?: boolean }) => {
      const normalized = syncDerivedLevelData(next);
      const shouldPushHistory = options?.pushHistory ?? true;

      if (shouldPushHistory) {
        const trimmedHistory = history.slice(0, historyIndex + 1);
        const nextHistory = [...trimmedHistory, normalized];
        const cappedHistory =
          nextHistory.length > MAX_EDITOR_HISTORY_STEPS
            ? nextHistory.slice(nextHistory.length - MAX_EDITOR_HISTORY_STEPS)
            : nextHistory;

        setHistory(cappedHistory);
        setHistoryIndex(cappedHistory.length - 1);
      }

      liveLevelDataRef.current = normalized;
      setLevelData(normalized);
    },
    [history, historyIndex],
  );

  useEffect(() => {
    setActivePaletteGroup(getPaletteGroupTitle(selectedTool));
  }, [selectedTool]);

  useEffect(() => {
    if (!paintableSelectedObjects.length && !activePaintTool && colorGroups.length === 0) {
      setIsPaintPopupOpen(false);
    }
  }, [activePaintTool, colorGroups.length, paintableSelectedObjects.length]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditableTarget = isTextInputLike(event.target);
      const isPreviewGameplayKey = showPreview && ['Space', 'ArrowUp', 'KeyW'].includes(event.code);

      if (event.code === 'Space' && !isEditableTarget) {
        isSpacePressedRef.current = true;
      }

      if (isEditableTarget) {
        return;
      }

      if (isPreviewGameplayKey) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        if (historyIndex > 0) {
          const nextIndex = historyIndex - 1;
          setSelectionBox(null);
          dragPreviewPositionRef.current = null;
          setDragPreviewPosition(null);
          setHistoryIndex(nextIndex);
          liveLevelDataRef.current = history[nextIndex];
          setLevelData(history[nextIndex]);
        }
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.code === 'KeyY' || (event.shiftKey && event.code === 'KeyZ'))
      ) {
        event.preventDefault();
        if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          setSelectionBox(null);
          dragPreviewPositionRef.current = null;
          setDragPreviewPosition(null);
          setHistoryIndex(nextIndex);
          liveLevelDataRef.current = history[nextIndex];
          setLevelData(history[nextIndex]);
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD' && selectedObject) {
        event.preventDefault();
        const next = structuredClone(liveLevelDataRef.current);
        const selectedIdsSet = new Set(selectedObjectIds);
        const cloneIds: string[] = [];

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

      if (event.key === 'Escape') {
        clearSelection();
      }

      if (!showPreview && selectedObjectIds.length && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const delta = {
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
        }[event.key]!;

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

    const handleKeyUp = (event: KeyboardEvent) => {
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
  }, [applySelection, clearSelection, commitLevelData, history, historyIndex, selectedObject, selectedObjectIds, showPreview]);

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
    canvas.width = width;
    canvas.height = height;

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

    context.fillStyle = stageTheme.editorPanelTint;
    for (let x = -80; x < width + 120; x += 160) {
      for (let y = 24; y < height; y += 140) {
        context.fillRect(x + ((x / 2 + y) % 36), y, 118, 82);
      }
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

    for (const object of levelData.objects) {
      const drawableObject =
        dragPreviewPosition?.objectId === object.id
          ? {
              ...object,
              x: dragPreviewPosition.x,
              y: dragPreviewPosition.y,
            }
          : object;
      const { x, y } = worldToScreen(drawableObject.x, drawableObject.y, pan.x, pan.y, cell);
      const w = drawableObject.w * cell;
      const h = drawableObject.h * cell;
      const fillColor = getObjectFillColor(drawableObject, colorGroups);
      const strokeColor = getObjectStrokeColor(drawableObject, colorGroups);

      drawStageObjectSprite({
        context,
        object: drawableObject,
        x,
        y,
        w,
        h,
        fillColor,
        strokeColor,
      });

      if (selectedObjectIdSet.has(drawableObject.id)) {
        context.strokeStyle = drawableObject.id === selectedObjectId ? '#ffffff' : 'rgba(130, 246, 255, 0.86)';
        context.lineWidth = drawableObject.id === selectedObjectId ? 2 : 1.5;
        context.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }
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
  }, [canvasViewport.height, canvasViewport.width, colorGroups, dragPreviewPosition, levelData, pan, selectedObjectId, selectedObjectIdSet, selectionBox, zoom]);

  const updateLevelData = useCallback(
    (mutator: (draft: LevelData) => void, options?: { pushHistory?: boolean }) => {
      const next = structuredClone(liveLevelDataRef.current);
      mutator(next);
      commitLevelData(next, options);
    },
    [commitLevelData],
  );

  const performUndo = () => {
    if (historyIndex === 0) {
      return;
    }

    const nextIndex = historyIndex - 1;
    dragPreviewPositionRef.current = null;
    setDragPreviewPosition(null);
    setHistoryIndex(nextIndex);
    liveLevelDataRef.current = history[nextIndex];
    setLevelData(history[nextIndex]);
  };

  const performRedo = () => {
    if (historyIndex >= history.length - 1) {
      return;
    }

    const nextIndex = historyIndex + 1;
    dragPreviewPositionRef.current = null;
    setDragPreviewPosition(null);
    setHistoryIndex(nextIndex);
    liveLevelDataRef.current = history[nextIndex];
    setLevelData(history[nextIndex]);
  };

  const placeObject = (type: LevelObjectType, x: number, y: number) => {
    updateLevelData((draft) => {
      if (type === 'START_MARKER') {
        draft.player.startX = x;
        draft.player.startY = y;
        draft.objects = draft.objects.filter((object) => object.type !== 'START_MARKER');
      }

      if (type === 'FINISH_PORTAL') {
        draft.finish = { x, y };
        draft.objects = draft.objects.filter((object) => object.type !== 'FINISH_PORTAL');
      }

      const definition = levelObjectDefinitions[type];
      const triggerDefaults: Record<string, unknown> =
        type === 'MOVE_TRIGGER'
          ? { groupId: 1, moveX: 2, moveY: 0, durationMs: 650 }
          : type === 'ALPHA_TRIGGER'
            ? { groupId: 1, alpha: 0.35 }
            : type === 'TOGGLE_TRIGGER'
              ? { groupId: 1, enabled: false }
              : type === 'PULSE_TRIGGER'
                ? { groupId: 1, fillColor: '#ffffff', strokeColor: '#ffffff', durationMs: 900 }
                : type === 'SAW_BLADE'
                  ? { rotationSpeed: 240 }
                : {};
      const object: LevelObject = {
        id: `${type.toLowerCase()}-${Date.now()}`,
        type,
        x,
        y,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        rotation: 0,
        layer: type === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
        props: {
          ...triggerDefaults,
          ...(isPaintableObjectType(type) && activePaintGroupId
            ? {
                paintGroupId: activePaintGroupId,
              }
            : {}),
        },
      };

      draft.objects.push(object);
      applySelection([object.id], object.id);
    });
  };

  const duplicateSelected = () => {
    if (!selectedObjectIds.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(selectedObjectIds);
      const cloneIds: string[] = [];

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

  const applyThemePreset = (nextTheme: string) => {
    setTheme(nextTheme);
    updateLevelData((draft) => {
      draft.meta = {
        ...draft.meta,
        theme: nextTheme,
        background: nextTheme,
      };
    });
  };

  const setPlayerMode = (nextMode: LevelData['player']['mode']) => {
    updateLevelData((draft) => {
      draft.player.mode = nextMode;
    });
  };

  const updateSelectedObject = (mutator: (object: LevelObject, draft: LevelData) => void) => {
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

  const updateSelectedObjectNumeric = (
    field: 'x' | 'y' | 'w' | 'h',
    rawValue: string,
    options?: { min?: number; max?: number; step?: number },
  ) => {
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

  const rotateSelectedObject = (direction: -1 | 1) => {
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

  const updateSelectedObjectLayer = (nextLayer: LevelObject['layer']) => {
    updateSelectedObject((object) => {
      object.layer = nextLayer;
    });
  };

  const updateSelectedTriggerNumericProp = (key: string, rawValue: string, options?: { min?: number; max?: number }) => {
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

  const updateSelectedTriggerStringProp = (key: string, value: string) => {
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

  const restartPreviewFromMusicOffset = () => {
    setShowPreview(true);
    setPreviewRunSeed((current) => current + 1);
    setMessage('Preview restarted from the configured music offset.');
  };

  const applyCustomMusicUrl = () => {
    const trimmedUrl = musicUrlInput.trim();
    const nextLabel = musicLabelInput.trim() || (trimmedUrl ? inferMusicLabel(trimmedUrl) : undefined);

    updateLevelData((draft) => {
      draft.meta.music = trimmedUrl || 'none';

      if (nextLabel) {
        draft.meta.musicLabel = nextLabel;
      } else {
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

  const handleMusicFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
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
        draft.meta.music = reader.result as string;
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

  const updateSelectedObjectPaint = (field: 'fillColor' | 'strokeColor', value: string) => {
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
          fillColor: field === 'fillColor' ? value : existingGroup?.fillColor ?? fallbackFillColor,
          strokeColor: field === 'strokeColor' ? value : existingGroup?.strokeColor ?? fallbackStrokeColor,
        });
        nextGroups.sort((left, right) => left.id - right.id);
        draft.meta.colorGroups = nextGroups;
        return;
      }

      object.props = {
        ...object.props,
        [field]: value,
      };
    });
  };

  const resetSelectedObjectPaint = () => {
    if (!paintableSelectedObjects.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));

      for (const object of draft.objects) {
        if (!selectedIdsSet.has(object.id) || !isPaintableObjectType(object.type)) {
          continue;
        }

        const nextProps = { ...object.props };
        delete nextProps.paintGroupId;
        delete nextProps.fillColor;
        delete nextProps.strokeColor;
        object.props = nextProps;
      }
    });
  };

  const assignSelectedObjectToPaintGroup = (groupId: number) => {
    if (!paintableSelectedObjects.length) {
      return;
    }

    updateLevelData((draft) => {
      const selectedIdsSet = new Set(paintableSelectedObjects.map((object) => object.id));
      const currentGroups = draft.meta.colorGroups ?? [];
      const anchorObject = paintableSelectedObjects[0];
      const fillColor = getObjectFillColor(anchorObject, currentGroups);
      const strokeColor = getObjectStrokeColor(anchorObject, currentGroups);
      const nextGroups = currentGroups.filter((group) => group.id !== groupId);
      nextGroups.push({
        id: groupId,
        fillColor,
        strokeColor,
      });
      nextGroups.sort((left, right) => left.id - right.id);
      draft.meta.colorGroups = nextGroups;

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

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
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

    if (event.button === 2) {
      if (selectedTool === 'select') {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragPreviewPositionRef.current = null;
        setDragPreviewPosition(null);
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
        .reverse()
        .find((object) => pointInsideObject(world.x, world.y, object));

      if (hitObject) {
        applySelection([hitObject.id], hitObject.id);
        setSelectionBox(null);
        const previewPosition = {
          objectId: hitObject.id,
          x: hitObject.x,
          y: hitObject.y,
        };
        dragPreviewPositionRef.current = previewPosition;
        setDragPreviewPosition(previewPosition);
        dragRef.current = {
          mode: 'move',
          objectId: hitObject.id,
          offsetX: world.x - hitObject.x,
          offsetY: world.y - hitObject.y,
          originX: hitObject.x,
          originY: hitObject.y,
        };
      } else {
        clearSelection();
      }

      return;
    }

    placeObject(selectedTool, Math.floor(world.x), Math.floor(world.y));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
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

    if (dragState.mode === 'move') {
      const nextX = Math.floor(world.x - dragState.offsetX);
      const nextY = Math.floor(world.y - dragState.offsetY);
      const currentPreview = dragPreviewPositionRef.current;

      if (
        currentPreview?.objectId === dragState.objectId &&
        currentPreview.x === nextX &&
        currentPreview.y === nextY
      ) {
        return;
      }

      const nextPreviewPosition = {
        objectId: dragState.objectId,
        x: nextX,
        y: nextY,
      };

      dragPreviewPositionRef.current = nextPreviewPosition;
      setDragPreviewPosition(nextPreviewPosition);
    }
  };

  const handlePointerUp = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.delete(event.pointerId);

      if (touchPointsRef.current.size < 2) {
        touchGestureRef.current = null;
      }
    }

    const dragState = dragRef.current;

    if (dragState?.mode === 'box-select') {
      const nextSelectionBox =
        selectionBox ??
        ({
          startScreenX: dragState.startScreenX,
          startScreenY: dragState.startScreenY,
          endScreenX: dragState.startScreenX,
          endScreenY: dragState.startScreenY,
        } satisfies SelectionBox);
      const normalizedBox = normalizeSelectionBox(nextSelectionBox);
      const cell = levelData.meta.gridSize * zoom;
      const matchedIds = [...levelData.objects]
        .filter((object) => {
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
      const previewPosition = dragPreviewPositionRef.current;

      if (
        previewPosition &&
        previewPosition.objectId === dragState.objectId &&
        (previewPosition.x !== dragState.originX || previewPosition.y !== dragState.originY)
      ) {
        const next = structuredClone(liveLevelDataRef.current);
        const object = next.objects.find((entry) => entry.id === dragState.objectId);

        if (object) {
          object.x = previewPosition.x;
          object.y = previewPosition.y;

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

    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragPreviewPositionRef.current = null;
    setDragPreviewPosition(null);
    setSelectionBox(null);
    dragRef.current = null;
  };

  const applyWheelZoom = (deltaY: number) => {
    setZoom((current) => Math.min(2.4, Math.max(0.45, current + (deltaY < 0 ? 0.1 : -0.1))));
  };

  const setHorizontalScrollPosition = useCallback((nextScroll: number) => {
    const clampedScroll = clamp(nextScroll, 0, horizontalScrollMax);
    setPan((current) => ({
      ...current,
      x: EDITOR_DEFAULT_PAN_X - clampedScroll * stageCell,
    }));
  }, [horizontalScrollMax, stageCell]);

  const handleToolSelect = (tool: EditorTool) => {
    setSelectedTool(tool);
    setActivePaletteGroup(getPaletteGroupTitle(tool));
    setPaletteDrawerGroup(null);
  };

  const handlePaletteGroupClick = (groupTitle: string) => {
    setActivePaletteGroup(groupTitle);
    setPaletteDrawerGroup((current) => (current === groupTitle ? null : groupTitle));
  };

  useEffect(() => {
    const stageFrame = stageFrameRef.current;

    if (!stageFrame) {
      return;
    }

    const handleStageWheel = (event: WheelEvent) => {
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
  }, [horizontalScrollValue, setHorizontalScrollPosition, stageCell]);

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
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save level');
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit level');
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

  return (
    <div className="arcade-editor-workstation editor-workbench flex flex-col space-y-5">
      <Panel className="arcade-editor-topbar editor-workbench-toolbar game-screen bg-transparent">
        <div className="editor-workbench-toolbar-main">
          <div>
            <p className="font-display text-[11px] tracking-[0.26em] text-[#ffd44a]">Forge Workstation</p>
            <h3 className="mt-2 font-display text-3xl text-white">{title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
              Build straight on the stage, keep the palette inside the editor surface, and scroll down only when you want
              inspector details or level tuning.
            </p>
          </div>

          <div className="editor-primary-actions">
            {onClose ? (
              <button
                type="button"
                className="editor-close-button"
                onClick={onClose}
                aria-label="Close editor"
                title="Close editor"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <Button onClick={handleSave} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving...' : saveLabel}
            </Button>
            {onSubmit ? (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={hasStartPositions}
                title={hasStartPositions ? 'Remove all Start Pos markers before publishing' : undefined}
              >
                Submit for Review
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setShowPreview((current) => !current)}>
              {showPreview ? 'Hide Preview' : 'Open Preview'}
            </Button>
          </div>
        </div>

        <div className="editor-workbench-toolbar-meta">
          <HintChip label="Tool" value={activeToolLabel} />
          <HintChip label="Selected" value={selectionLabel} />
          <HintChip label="History" value={historyPosition} />
          <HintChip label="Theme" value={theme} />
          <HintChip label="Objects" value={objectCount} />
        </div>
      </Panel>

      <Panel className="arcade-editor-stage-panel editor-stage-shell game-screen bg-transparent">
        <div
          ref={stageFrameRef}
          className="editor-canvas-frame"
          style={
            {
              '--editor-stage-top': stageThemePalette.editorGradientTop,
              '--editor-stage-mid': stageThemePalette.editorGradientMid,
              '--editor-stage-bottom': stageThemePalette.editorGradientBottom,
            } as CSSProperties
          }
        >
          <div className="editor-canvas-overlay editor-canvas-overlay--hud">
            <div className="editor-canvas-hud-bar">
              <HintChip label="Tool" value={activeToolLabel} />
              <HintChip label="Selected" value={selectionSummary} />
              <HintChip label="Zoom" value={`${zoom.toFixed(2)}x`} />
              <HintChip label="Cursor" value={`${cursorWorld.x}, ${cursorWorld.y}`} />
            </div>
          </div>

          <div className="editor-canvas-overlay editor-canvas-overlay--left">
            <div className="editor-canvas-rail editor-canvas-rail--categories">
              {paletteGroups.map((group) => (
                <button
                  key={group.title}
                  type="button"
                  className={cn('editor-canvas-rail-button', activePaletteGroup === group.title ? 'is-active' : '')}
                  onClick={() => handlePaletteGroupClick(group.title)}
                >
                  {group.title}
                </button>
              ))}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            className="editor-stage-canvas cursor-crosshair border-[4px] border-[#39105f] bg-[#130326]"
            aria-label="Level editor stage"
            style={{
              width: `${canvasViewport.width}px`,
              height: `${canvasViewport.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(event) => event.preventDefault()}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
              }
            }}
          />

          <div className="editor-canvas-overlay editor-canvas-overlay--right">
            <div className="editor-canvas-rail editor-canvas-rail--actions">
              <button type="button" className="editor-canvas-rail-button" onClick={() => setZoom((current) => Math.min(2.4, current + 0.1))}>
                Zoom+
              </button>
              <button type="button" className="editor-canvas-rail-button" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}>
                Zoom-
              </button>
              <button
                type="button"
                className="editor-canvas-rail-button"
                onClick={() => {
                  setPan({ x: EDITOR_DEFAULT_PAN_X, y: EDITOR_DEFAULT_PAN_Y });
                  setZoom(1);
                }}
              >
                Reset
              </button>
              <button type="button" className="editor-canvas-rail-button" onClick={performUndo} disabled={!canUndo}>
                Undo
              </button>
              <button type="button" className="editor-canvas-rail-button" onClick={performRedo} disabled={!canRedo}>
                Redo
              </button>
              <button type="button" className="editor-canvas-rail-button" onClick={duplicateSelected} disabled={!selectedObject}>
                Clone
              </button>
              <button
                type="button"
                className={cn('editor-canvas-rail-button', isPaintPopupOpen ? 'is-active' : '')}
                onClick={() => setIsPaintPopupOpen((current) => !current)}
                disabled={!canOpenPaintPopup}
              >
                Paint
              </button>
              <button
                type="button"
                className="editor-canvas-rail-button editor-canvas-rail-button--danger"
                onClick={deleteSelected}
                disabled={!selectedObject}
              >
                Delete
              </button>
              <button
                type="button"
                className={cn('editor-canvas-rail-button', showPreview ? 'is-active' : '')}
                onClick={() => setShowPreview((current) => !current)}
              >
                {showPreview ? 'Hide Test' : 'Test'}
              </button>
            </div>
          </div>

          {isPaintPopupOpen && paintableSelectedObject ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--paint">
              <div className="editor-canvas-popup editor-canvas-paint-popup">
                <div className="editor-canvas-popup-header">
                  <div>
                    <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Paint & Groups</p>
                    <h4 className="font-display text-xl text-white">
                      {paintableSelectedObject
                        ? selectedDefinition?.label ?? paintableSelectedObject.type
                        : activePaintTool
                          ? levelObjectDefinitions[activePaintTool].label
                          : 'Placement Paint'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="editor-canvas-popup-close"
                    onClick={() => setIsPaintPopupOpen(false)}
                  >
                    Close
                  </button>
                </div>

                {paintableSelectedObject ? (
                  <div className="editor-color-controls">
                    <div className="editor-color-control">
                      <span className="editor-color-control-label">Fill</span>
                      <div className="editor-color-control-body">
                        <input
                          type="color"
                          aria-label="Selected object fill color"
                          className="editor-color-picker"
                          value={getEditorColorInputValue(
                            getObjectFillColor(paintableSelectedObject, colorGroups),
                            levelObjectDefinitions[paintableSelectedObject.type].color,
                          )}
                          onChange={(event) => updateSelectedObjectPaint('fillColor', event.target.value)}
                        />
                        <span className="editor-color-value">
                          {getObjectFillColor(paintableSelectedObject, colorGroups)}
                        </span>
                      </div>
                    </div>

                    <div className="editor-color-control">
                      <span className="editor-color-control-label">Stroke</span>
                      <div className="editor-color-control-body">
                        <input
                          type="color"
                          aria-label="Selected object stroke color"
                          className="editor-color-picker"
                          value={getEditorColorInputValue(
                            getObjectStrokeColor(paintableSelectedObject, colorGroups),
                            levelObjectDefinitions[paintableSelectedObject.type].strokeColor,
                          )}
                          onChange={(event) => updateSelectedObjectPaint('strokeColor', event.target.value)}
                        />
                        <span className="editor-color-value">
                          {getObjectStrokeColor(paintableSelectedObject, colorGroups)}
                        </span>
                      </div>
                    </div>

                    <div className="editor-paint-inline-actions">
                      <Button variant="ghost" onClick={resetSelectedObjectPaint}>
                        Reset Colors
                      </Button>
                      {selectedPaintGroupId ? (
                        <Button variant="ghost" onClick={detachSelectedObjectFromPaintGroup}>
                          Detach Group
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="editor-note-box px-4 py-3 text-sm text-white/72">
                    Select a block, spike, or saw if you want to save its colors into a group.
                  </div>
                )}

                <div className="editor-paint-groups">
                  <div className="flex items-center justify-between gap-3">
                    <span className="editor-color-control-label">Color Groups</span>
                    <Badge tone="accent">
                      {activePaintGroupId ? `Placing: Group ${activePaintGroupId}` : 'Placing: Direct'}
                    </Badge>
                  </div>

                  <div className="editor-paint-group-grid">
                    {Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                      const groupId = index + 1;
                      const group = getColorGroupById(colorGroups, groupId);
                      const isActiveGroup = activePaintGroupId === groupId;
                      const isLinkedGroup = selectedPaintGroupId === groupId;

                      return (
                        <button
                          key={groupId}
                          type="button"
                          className={cn(
                            'editor-paint-group-button',
                            isActiveGroup ? 'is-active' : '',
                            isLinkedGroup ? 'is-linked' : '',
                          )}
                          onClick={() => {
                            if (paintableSelectedObject) {
                              assignSelectedObjectToPaintGroup(groupId);
                              return;
                            }

                            if (group) {
                              setActivePaintGroupId(groupId);
                            }
                          }}
                          disabled={!paintableSelectedObject && !group}
                        >
                          <span className="editor-paint-group-title">Group {groupId}</span>
                          <span className="editor-paint-group-swatches">
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.12)' }}
                            />
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.strokeColor ?? 'rgba(255,255,255,0.28)' }}
                            />
                          </span>
                          <span className="editor-paint-group-status">
                            {isLinkedGroup ? 'Linked' : isActiveGroup ? 'Active' : group ? 'Saved' : 'Empty'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="editor-paint-inline-actions">
                    <Button variant="ghost" onClick={() => setActivePaintGroupId(null)}>
                      Place Direct
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : isPaintPopupOpen ? (
            <div className="editor-canvas-overlay editor-canvas-overlay--paint">
              <div className="editor-canvas-popup editor-canvas-paint-popup">
                <div className="editor-canvas-popup-header">
                  <div>
                    <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Paint & Groups</p>
                    <h4 className="font-display text-xl text-white">
                      {activePaintTool ? levelObjectDefinitions[activePaintTool].label : 'Placement Paint'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="editor-canvas-popup-close"
                    onClick={() => setIsPaintPopupOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="editor-note-box px-4 py-3 text-sm text-white/72">
                  Choose a saved group for new blocks, spikes, and saws, or select an existing painted object to write its
                  colors into one of the groups below.
                </div>

                <div className="editor-paint-groups">
                  <div className="flex items-center justify-between gap-3">
                    <span className="editor-color-control-label">Color Groups</span>
                    <Badge tone="accent">
                      {activePaintGroupId ? `Placing: Group ${activePaintGroupId}` : 'Placing: Direct'}
                    </Badge>
                  </div>

                  <div className="editor-paint-group-grid">
                    {Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                      const groupId = index + 1;
                      const group = getColorGroupById(colorGroups, groupId);

                      return (
                        <button
                          key={groupId}
                          type="button"
                          className={cn('editor-paint-group-button', activePaintGroupId === groupId ? 'is-active' : '')}
                          onClick={() => setActivePaintGroupId(groupId)}
                          disabled={!group}
                        >
                          <span className="editor-paint-group-title">Group {groupId}</span>
                          <span className="editor-paint-group-swatches">
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.fillColor ?? 'rgba(255,255,255,0.12)' }}
                            />
                            <span
                              className="editor-paint-group-swatch"
                              style={{ backgroundColor: group?.strokeColor ?? 'rgba(255,255,255,0.28)' }}
                            />
                          </span>
                          <span className="editor-paint-group-status">{group ? 'Saved' : 'Empty'}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="editor-paint-inline-actions">
                    <Button variant="ghost" onClick={() => setActivePaintGroupId(null)}>
                      Place Direct
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="editor-canvas-overlay editor-canvas-overlay--bottom">
            <div className="editor-canvas-toolstrip">
              <div className="editor-canvas-toolstrip-header">
                <div>
                  <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">
                    {paletteDrawer ? `${paletteDrawer.title} Drawer` : 'Object Drawer'}
                  </p>
                  <p className="text-sm text-white/72">
                    {paletteDrawer
                      ? 'Choose the exact piece you want to place on the stage.'
                      : 'Click Blocks, Obstacles, Portals or another category on the left to open the picker.'}
                  </p>
                </div>
                {paletteDrawer ? (
                  <button
                    type="button"
                    className="editor-canvas-drawer-close"
                    onClick={() => setPaletteDrawerGroup(null)}
                  >
                    Close
                  </button>
                ) : (
                  <Badge tone="accent">{activeToolLabel}</Badge>
                )}
              </div>

              {paletteDrawer ? (
                <div className="editor-canvas-toolstrip-row">
                  {paletteDrawer.items.map((tool) => (
                    <ToolButton
                      key={tool}
                      tool={tool}
                      label={tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label}
                      description={toolDescriptions[tool]}
                      active={selectedTool === tool}
                      compact
                      onClick={() => handleToolSelect(tool)}
                    />
                  ))}
                </div>
              ) : (
                <div className="editor-canvas-toolstrip-empty">
                  <span className="font-display text-[10px] tracking-[0.16em] text-[#ffd44a]">Current Tool</span>
                  <strong>{activeToolLabel}</strong>
                  <span>{activeToolDescription}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-stage-footer">
          <div className="editor-stage-scrollbar-row">
            <Button
              variant="ghost"
              onClick={() => setHorizontalScrollPosition(horizontalScrollValue - 8)}
              disabled={horizontalScrollMax <= 0}
            >
              Left
            </Button>

            <div className="editor-stage-scrollbar-track">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/72">
                <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Stage Scroll</p>
                <p>
                  X: <span className="text-white">{Math.round(horizontalScrollValue)}</span> /{' '}
                  <span className="text-white">{Math.max(0, Math.round(horizontalScrollMax))}</span>
                </p>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(horizontalScrollMax, 0)}
                step={1}
                value={horizontalScrollValue}
                disabled={horizontalScrollMax <= 0}
                className="editor-horizontal-scroll"
                aria-label="Horizontal stage scroll"
                onChange={(event) => setHorizontalScrollPosition(Number(event.target.value))}
              />
            </div>

            <Button
              variant="ghost"
              onClick={() => setHorizontalScrollPosition(horizontalScrollValue + 8)}
              disabled={horizontalScrollMax <= 0}
            >
              Right
            </Button>
          </div>

          <div className="editor-stage-meta">
            <p>
              Tool: <span className="text-white">{activeToolLabel}</span>
            </p>
            <p>
              Selected: <span className="text-white">{selectionLabel}</span>
            </p>
            <p>
              Cursor: <span className="text-white">{cursorWorld.x}, {cursorWorld.y}</span>
            </p>
            <p>
              Zoom: <span className="text-white">{zoom.toFixed(2)}x</span>
            </p>
            <p>
              Objects: <span className="text-white">{levelData.objects.length}</span>
            </p>
            <p>
              History: <span className="text-white">{historyPosition}</span>
            </p>
          </div>
        </div>

        {message ? (
          <div
            className={cn(
              'editor-note-box px-4 py-3 text-sm',
              saveState === 'error' ? 'text-[#ff8aa1]' : 'text-[#82f6ff]',
            )}
          >
            {message}
          </div>
        ) : null}
      </Panel>

      {showPreview ? (
        <Panel className="arcade-preview-dock game-screen space-y-4 bg-transparent">
          <div className="editor-workbench-section-head">
            <div>
              <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Live Test</p>
              <h3 className="font-display text-2xl text-white">Test Lane</h3>
            </div>
            <div className="editor-stage-actions">
              <Button variant="ghost" onClick={() => setShowPreview(false)}>
                Hide Preview
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <HintChip label="Attempt" value="Runtime test" />
              <HintChip label="Restart" value="Auto after fail" />
              <HintChip label="Goal" value="Check timing and flow" />
            </div>
            <GameCanvas
              key={`editor-preview-${previewRunSeed}`}
              levelData={levelData}
              runId={`editor-preview-${previewRunSeed}`}
              attemptNumber={1}
              autoRestartOnFail
              previewStartPosEnabled
            />
          </div>
        </Panel>
      ) : null}

      <Panel className="game-screen space-y-4 bg-transparent">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Level Setup</p>
            <h3 className="font-display text-2xl text-white">Level Settings</h3>
          </div>
          <Badge tone="accent">{themePresets.find((preset) => preset.value === theme)?.label ?? 'Custom'}</Badge>
        </div>

        <div>
          <FieldLabel>Title</FieldLabel>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <div className="editor-inline-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <FieldLabel>Start Pos</FieldLabel>
              <p className="mt-1 text-sm text-white/68">
                Start Pos markers affect editor preview only. Levels with Start Pos markers cannot be submitted.
              </p>
            </div>
            <Badge tone={hasStartPositions ? 'danger' : 'default'}>
              {hasStartPositions ? `${startPosCount} active` : 'None'}
            </Badge>
          </div>
          <div className="editor-inline-actions">
            <Button variant="ghost" onClick={deleteAllStartPositions} disabled={!hasStartPositions}>
              Delete All Start Pos
            </Button>
            <Badge tone="accent">
              {activePreviewStartPos ? `Preview starts at ${activePreviewStartPos.x}, ${activePreviewStartPos.y}` : 'Preview uses main start'}
            </Badge>
          </div>
        </div>

        {selectedObject ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <FieldLabel>Selected Object</FieldLabel>
                <p className="mt-1 text-sm text-white/68">
                  Fine-tune transform, layer, and object-specific behavior without leaving the editor.
                </p>
              </div>
              <Badge tone="accent">{selectedDefinition?.label ?? selectedObject.type}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel>X</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  value={selectedObject.x}
                  onChange={(event) => updateSelectedObjectNumeric('x', event.target.value, { step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Y</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  value={selectedObject.y}
                  onChange={(event) => updateSelectedObjectNumeric('y', event.target.value, { step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Width</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedObject.w}
                  onChange={(event) => updateSelectedObjectNumeric('w', event.target.value, { min: 0.5, step: 0.5 })}
                />
              </div>
              <div>
                <FieldLabel>Height</FieldLabel>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={selectedObject.h}
                  onChange={(event) => updateSelectedObjectNumeric('h', event.target.value, { min: 0.5, step: 0.5 })}
                />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="editor-inline-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Rotation</span>
                  <Badge tone="default">{normalizedSelectedRotation}deg</Badge>
                </div>
                <div className="editor-inline-actions">
                  <Button variant="ghost" onClick={() => rotateSelectedObject(-1)}>
                    Rotate -90
                  </Button>
                  <Button variant="ghost" onClick={() => rotateSelectedObject(1)}>
                    Rotate +90
                  </Button>
                </div>
              </div>

              <div className="editor-inline-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Layer</span>
                  <Badge tone="default">{selectedObject.layer}</Badge>
                </div>
                <div className="editor-inline-actions">
                  <Button
                    variant={selectedObject.layer === 'gameplay' ? 'primary' : 'ghost'}
                    onClick={() => updateSelectedObjectLayer('gameplay')}
                  >
                    Gameplay
                  </Button>
                  <Button
                    variant={selectedObject.layer === 'decoration' ? 'primary' : 'ghost'}
                    onClick={() => updateSelectedObjectLayer('decoration')}
                  >
                    Decoration
                  </Button>
                </div>
              </div>
            </div>

            {paintableSelectedObjects.length ? (
              <div className="editor-inline-card space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="editor-color-control-label">Assign Group</span>
                  <Badge tone="accent">
                    {paintableSelectedObjects.length > 1
                      ? `${paintableSelectedObjects.length} objects`
                      : selectedPaintGroupId
                        ? `Group ${selectedPaintGroupId}`
                        : 'Direct'}
                  </Badge>
                </div>
                <div className="editor-inline-actions">
                  {Array.from({ length: PAINT_GROUP_SLOT_COUNT }, (_, index) => {
                    const groupId = index + 1;
                    const isActive = selectedPaintGroupId === groupId;

                    return (
                      <Button
                        key={groupId}
                        variant={isActive ? 'primary' : 'ghost'}
                        className="min-w-[4.25rem]"
                        onClick={() => assignSelectedObjectToPaintGroup(groupId)}
                      >
                        Group {groupId}
                      </Button>
                    );
                  })}
                </div>
                <div className="editor-inline-actions">
                  <Button variant="ghost" onClick={() => setIsPaintPopupOpen(true)}>
                    Open Paint
                  </Button>
                  <Button variant="ghost" onClick={detachSelectedObjectFromPaintGroup}>
                    Detach Group
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'JUMP_PAD' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Jump Boost</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={Number(selectedObject.props.boost ?? 16)}
                    onChange={(event) => updateSelectedObject((object) => {
                      object.props = {
                        ...object.props,
                        boost: Number(event.target.value),
                      };
                    })}
                  />
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'GRAVITY_PORTAL' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Gravity Direction</FieldLabel>
                  <div className="editor-inline-actions">
                    <Button
                      variant={Number(selectedObject.props.gravity ?? -1) === -1 ? 'primary' : 'ghost'}
                      onClick={() =>
                        updateSelectedObject((object) => {
                          object.props = { ...object.props, gravity: -1 };
                        })
                      }
                    >
                      Up
                    </Button>
                    <Button
                      variant={Number(selectedObject.props.gravity ?? -1) === 1 ? 'primary' : 'ghost'}
                      onClick={() =>
                        updateSelectedObject((object) => {
                          object.props = { ...object.props, gravity: 1 };
                        })
                      }
                    >
                      Down
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'SPEED_PORTAL' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Speed Multiplier</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.2"
                    value={Number(selectedObject.props.multiplier ?? 1.4)}
                    onChange={(event) =>
                      updateSelectedObject((object) => {
                        object.props = {
                          ...object.props,
                          multiplier: Number(event.target.value),
                        };
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedObject.type === 'SAW_BLADE' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Rotation Speed (deg/s)</FieldLabel>
                  <Input
                    type="number"
                    step="10"
                    value={Number(selectedObject.props.rotationSpeed ?? 240)}
                    onChange={(event) =>
                      updateSelectedObject((object) => {
                        object.props = {
                          ...object.props,
                          rotationSpeed: Number(event.target.value),
                        };
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {selectedTriggerObject ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Trigger Settings</FieldLabel>
                  <Badge tone="accent">Group {Number(selectedTriggerObject.props.groupId ?? 1)}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <FieldLabel>Target Group</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      max={String(PAINT_GROUP_SLOT_COUNT)}
                      value={Number(selectedTriggerObject.props.groupId ?? 1)}
                      onChange={(event) =>
                        updateSelectedTriggerNumericProp('groupId', event.target.value, {
                          min: 1,
                          max: PAINT_GROUP_SLOT_COUNT,
                        })
                      }
                    />
                  </div>

                  {selectedTriggerObject.type === 'MOVE_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Move X</FieldLabel>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number(selectedTriggerObject.props.moveX ?? 2)}
                          onChange={(event) => updateSelectedTriggerNumericProp('moveX', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Move Y</FieldLabel>
                        <Input
                          type="number"
                          step="0.5"
                          value={Number(selectedTriggerObject.props.moveY ?? 0)}
                          onChange={(event) => updateSelectedTriggerNumericProp('moveY', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 650)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  {selectedTriggerObject.type === 'ALPHA_TRIGGER' ? (
                    <div>
                      <FieldLabel>Alpha</FieldLabel>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={Number(selectedTriggerObject.props.alpha ?? 0.35)}
                        onChange={(event) =>
                          updateSelectedTriggerNumericProp('alpha', event.target.value, { min: 0, max: 1 })
                        }
                      />
                    </div>
                  ) : null}

                  {selectedTriggerObject.type === 'TOGGLE_TRIGGER' ? (
                    <div className="sm:col-span-2">
                      <FieldLabel>Toggle Result</FieldLabel>
                      <div className="editor-inline-actions">
                        <Button
                          variant={selectedTriggerObject.props.enabled ? 'primary' : 'ghost'}
                          onClick={() => updateSelectedObject((object) => {
                            object.props = { ...object.props, enabled: true };
                          })}
                        >
                          Show Group
                        </Button>
                        <Button
                          variant={!selectedTriggerObject.props.enabled ? 'primary' : 'ghost'}
                          onClick={() => updateSelectedObject((object) => {
                            object.props = { ...object.props, enabled: false };
                          })}
                        >
                          Hide Group
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {selectedTriggerObject.type === 'PULSE_TRIGGER' ? (
                    <>
                      <div>
                        <FieldLabel>Duration (ms)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          value={Number(selectedTriggerObject.props.durationMs ?? 900)}
                          onChange={(event) =>
                            updateSelectedTriggerNumericProp('durationMs', event.target.value, { min: 1 })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Pulse Fill</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.fillColor === 'string'
                              ? selectedTriggerObject.props.fillColor
                              : '#ffffff',
                            '#ffffff',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('fillColor', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Pulse Stroke</FieldLabel>
                        <Input
                          type="color"
                          value={getEditorColorInputValue(
                            typeof selectedTriggerObject.props.strokeColor === 'string'
                              ? selectedTriggerObject.props.strokeColor
                              : '#ffffff',
                            '#ffffff',
                          )}
                          onChange={(event) => updateSelectedTriggerStringProp('strokeColor', event.target.value)}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <FieldLabel>Theme Preset</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {themePresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyThemePreset(preset.value)}
                className={cn(
                  'tool-tile px-3 py-3 text-left transition',
                  theme === preset.value ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
                )}
              >
                <span className="font-display block text-[10px] tracking-[0.18em] uppercase">{preset.label}</span>
                <span
                  className={cn(
                    'mt-1 block text-[10px] normal-case',
                    theme === preset.value ? 'text-[#173300]/80' : 'text-white/60',
                  )}
                >
                  {preset.value}
                </span>
              </button>
            ))}
          </div>
          <Input
            value={theme}
            onChange={(event) => {
              applyThemePreset(event.target.value);
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Level Music</FieldLabel>
            <Badge tone={resolvedMusic.src ? 'accent' : 'default'}>
              {resolvedMusic.src ? 'Custom Track Ready' : 'No Custom Audio'}
            </Badge>
          </div>

          <div>
            <FieldLabel>Track Label</FieldLabel>
            <Input
              value={musicLabelInput}
              placeholder="My custom song"
              onChange={(event) => setMusicLabelInput(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Music URL</FieldLabel>
            <div className="editor-music-url-row">
              <Input
                value={musicUrlInput}
                placeholder="https://example.com/track.mp3"
                onChange={(event) => setMusicUrlInput(event.target.value)}
              />
              <Button variant="ghost" onClick={applyCustomMusicUrl}>
                Apply URL
              </Button>
            </div>
          </div>

          <div className="editor-music-upload-row">
            <label className="editor-music-upload-button">
              <span>Upload Audio</span>
              <input type="file" accept="audio/*" onChange={handleMusicFilePicked} />
            </label>

            <Button variant="ghost" onClick={clearLevelMusic}>
              Clear Music
            </Button>

            <Button variant="ghost" onClick={restartPreviewFromMusicOffset}>
              Test Sync
            </Button>
          </div>

          <div>
            <FieldLabel>Music Offset (ms)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="10"
              value={musicOffsetMsValue}
              onChange={(event) =>
                updateLevelData((draft) => {
                  draft.meta.musicOffsetMs = Math.max(0, Number(event.target.value) || 0);
                })
              }
            />
          </div>

          <div className="editor-note-box px-4 py-3 text-sm text-white/72">
            Add your own track by URL or upload an audio file, then use offset plus sync test to line the song up with
            your gameplay. Uploaded files are embedded into the level data, so keep them reasonably small.
          </div>

          {resolvedMusic.src ? (
            <div className="editor-music-preview">
              <div className="flex items-center justify-between gap-3">
                <span className="editor-color-control-label">Preview</span>
                <span className="text-xs text-white/72">{resolvedMusic.label}</span>
              </div>
              <audio controls preload="metadata" src={resolvedMusic.src} className="w-full" />
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel>Player Mode</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['cube', 'ship'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPlayerMode(mode)}
                  className={cn(
                    'tool-tile px-3 py-3 text-left transition',
                    levelData.player.mode === mode ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
                  )}
                >
                  <span className="font-display block text-[10px] tracking-[0.18em] uppercase">
                    {getPlayerModeLabel(mode)}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-[10px] normal-case',
                      levelData.player.mode === mode ? 'text-[#173300]/80' : 'text-white/60',
                    )}
                  >
                    {mode === 'ship' ? 'Hold to climb, release to descend' : 'Classic jump timing'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Length Units</FieldLabel>
            <Input
              type="number"
              value={levelData.meta.lengthUnits}
              onChange={(event) =>
                updateLevelData((draft) => {
                  draft.meta.lengthUnits = Number(event.target.value);
                })
              }
            />
          </div>
          <div>
            <FieldLabel>Base Speed</FieldLabel>
            <Input
              type="number"
              step="0.1"
              value={levelData.player.baseSpeed}
              onChange={(event) =>
                updateLevelData((draft) => {
                  draft.player.baseSpeed = Number(event.target.value);
                })
              }
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <HintChip label="Objects" value={String(levelData.objects.length)} />
          <HintChip label="Length" value={`${levelData.meta.lengthUnits} units`} />
          <HintChip label="Base Speed" value={levelData.player.baseSpeed.toFixed(1)} />
          <HintChip label="Mode" value={getPlayerModeLabel(levelData.player.mode)} />
          <HintChip label="Theme" value={theme} />
        </div>
      </Panel>
    </div>
  );
}

function ToolButton({
  tool,
  label,
  description,
  active,
  compact = false,
  onClick,
}: {
  tool: EditorTool;
  label: string;
  description?: string;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tool-tile text-left transition',
        compact ? 'px-2.5 py-2' : 'px-3 py-3',
        active ? 'tool-tile-active text-[#173300]' : 'text-white hover:brightness-110',
      )}
    >
      <ToolButtonPreview tool={tool} active={active} />
      <span className={cn('font-display block uppercase', compact ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]')}>
        {label}
      </span>
      {description ? (
        <span
          className={cn(
            'mt-1 block normal-case',
            compact ? 'text-[9px] leading-4' : 'text-[10px] leading-5',
            active ? 'text-[#173300]/80' : 'text-white/62',
          )}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}

function ToolButtonPreview({ tool, active }: { tool: EditorTool; active: boolean }) {
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

    const width = canvas.width;
    const height = canvas.height;
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
    const object: LevelObject = {
      id: `preview-${tool}`,
      type: tool,
      x: 0,
      y: 0,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
      rotation: 0,
      layer: tool === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
      props: {},
    };

    const padding = 5;
    const scale = Math.min(
      (width - padding * 2) / Math.max(object.w, 0.001),
      (height - padding * 2) / Math.max(object.h, 0.001),
    );
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
  }, [tool, active]);

  return (
    <span className="tool-tile-preview" aria-hidden="true">
      <canvas ref={canvasRef} width={64} height={40} />
    </span>
  );
}

function HintChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="editor-hint-box">
      <p className="font-display text-[9px] tracking-[0.16em] text-[#ffd44a]">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-white/78">{value}</p>
    </div>
  );
}

function getCanvasScreenPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
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

  return {
    screenX: (offsetX / innerWidth) * canvas.width,
    screenY: (offsetY / innerHeight) * canvas.height,
  };
}

function screenToWorld(screenX: number, screenY: number, panX: number, panY: number, cell: number) {
  return {
    x: (screenX - panX) / cell,
    y: (screenY - panY) / cell,
  };
}

function worldToScreen(x: number, y: number, panX: number, panY: number, cell: number) {
  return {
    x: x * cell + panX,
    y: y * cell + panY,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value;
  }

  return Math.round(value / step) * step;
}

function normalizeQuarterRotation(value: number) {
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
  return normalized === 360 ? 0 : normalized;
}

function normalizeSelectionBox(selectionBox: SelectionBox) {
  return {
    left: Math.min(selectionBox.startScreenX, selectionBox.endScreenX),
    top: Math.min(selectionBox.startScreenY, selectionBox.endScreenY),
    right: Math.max(selectionBox.startScreenX, selectionBox.endScreenX),
    bottom: Math.max(selectionBox.startScreenY, selectionBox.endScreenY),
  };
}

function rectanglesIntersect(
  left: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  },
  right: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  },
) {
  return left.left <= right.right && left.right >= right.left && left.top <= right.bottom && left.bottom >= right.top;
}

function getPointerDistance(
  firstPoint: {
    x: number;
    y: number;
  },
  secondPoint: {
    x: number;
    y: number;
  },
) {
  return Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y);
}

function pointInsideObject(x: number, y: number, object: LevelObject) {
  return x >= object.x && x <= object.x + object.w && y >= object.y && y <= object.y + object.h;
}

function isTextInputLike(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
