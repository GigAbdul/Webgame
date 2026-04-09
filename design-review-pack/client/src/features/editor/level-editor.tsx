import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Level, LevelData, LevelObject, LevelObjectType } from '../../types/models';
import { Badge, Button, FieldLabel, Input, Panel, Textarea } from '../../components/ui';
import { GameCanvas } from '../game/game-canvas';
import { createEmptyLevelData, levelObjectDefinitions } from '../game/object-definitions';
import { cn } from '../../utils/cn';

type EditorTool = 'select' | 'pan' | LevelObjectType;

type LevelEditorProps = {
  initialLevel?: Level | null;
  saveLabel?: string;
  onSave: (payload: {
    title: string;
    description: string;
    theme: string;
    dataJson: LevelData;
  }) => Promise<void>;
  onSubmit?: () => Promise<void>;
  sidebarSlot?: ReactNode;
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
    }
  | null;

const themePresets = [
  { value: 'neon-grid', label: 'Neon Grid' },
  { value: 'cyber-night', label: 'Cyber Night' },
  { value: 'sunset-burn', label: 'Sunset Burn' },
  { value: 'acid-void', label: 'Acid Void' },
] as const;

const quickStartSteps = [
  'Pick a tool from the palette on the left.',
  'Click the stage to place blocks, hazards, or triggers.',
  'Switch to Select to move objects and edit their properties.',
  'Open Test Play to verify timing before saving.',
];

const paletteGroups: Array<{ title: string; items: EditorTool[] }> = [
  { title: 'Editor', items: ['select', 'pan'] },
  { title: 'Blocks', items: ['GROUND_BLOCK', 'PLATFORM_BLOCK', 'DECORATION_BLOCK'] },
  { title: 'Hazards', items: ['SPIKE'] },
  {
    title: 'Triggers',
    items: ['JUMP_PAD', 'JUMP_ORB', 'GRAVITY_PORTAL', 'SPEED_PORTAL', 'START_MARKER', 'FINISH_PORTAL'],
  },
];

const toolDescriptions: Record<EditorTool, string> = {
  select: 'Pick, move and inspect objects',
  pan: 'Hold Space or drag to move around',
  GROUND_BLOCK: 'Safe floor for the run',
  PLATFORM_BLOCK: 'Extra landable block',
  SPIKE: 'Primary hazard',
  JUMP_PAD: 'Forces an upward bounce',
  JUMP_ORB: 'Mid-air extra jump',
  GRAVITY_PORTAL: 'Flips gravity',
  SPEED_PORTAL: 'Changes run speed',
  FINISH_PORTAL: 'Level completion',
  DECORATION_BLOCK: 'Visual block only',
  START_MARKER: 'Player spawn point',
};

function syncDerivedLevelData(next: LevelData) {
  const maxX = Math.max(next.finish.x + 16, ...next.objects.map((object) => object.x + object.w + 12));
  next.meta.lengthUnits = Math.max(60, Math.ceil(maxX));
  return next;
}

export function LevelEditor({
  initialLevel,
  saveLabel = 'Save Draft',
  onSave,
  onSubmit,
  sidebarSlot,
}: LevelEditorProps) {
  const initialData = initialLevel?.dataJson
    ? syncDerivedLevelData(structuredClone(initialLevel.dataJson))
    : createEmptyLevelData(initialLevel?.theme ?? 'neon-grid');
  const [title, setTitle] = useState(initialLevel?.title ?? 'Untitled Level');
  const [description, setDescription] = useState(initialLevel?.description ?? '');
  const [theme, setTheme] = useState(initialLevel?.theme ?? 'neon-grid');
  const [levelData, setLevelData] = useState<LevelData>(initialData);
  const [history, setHistory] = useState<LevelData[]>([initialData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('select');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 80 });
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const isSpacePressedRef = useRef(false);
  const liveLevelDataRef = useRef(levelData);

  useEffect(() => {
    if (!initialLevel) {
      return;
    }

    const nextLevelData = syncDerivedLevelData(structuredClone(initialLevel.dataJson));
    setTitle(initialLevel.title);
    setDescription(initialLevel.description);
    setTheme(initialLevel.theme);
    setLevelData(nextLevelData);
    setHistory([nextLevelData]);
    setHistoryIndex(0);
  }, [initialLevel]);

  useEffect(() => {
    liveLevelDataRef.current = levelData;
  }, [levelData]);

  const selectedObject = useMemo(
    () => levelData.objects.find((object) => object.id === selectedObjectId) ?? null,
    [levelData.objects, selectedObjectId],
  );
  const selectedDefinition = useMemo(
    () => (selectedObject ? levelObjectDefinitions[selectedObject.type] : null),
    [selectedObject],
  );
  const activeToolDescription = toolDescriptions[selectedTool];
  const activeToolLabel =
    selectedTool === 'select' ? 'Select' : selectedTool === 'pan' ? 'Pan' : levelObjectDefinitions[selectedTool].label;
  const selectionLabel = selectedObject ? selectedDefinition?.label ?? selectedObject.type : 'Nothing selected';
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const historyPosition = `${historyIndex + 1}/${history.length}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditableTarget = isTextInputLike(event.target);

      if (event.code === 'Space' && !isEditableTarget) {
        isSpacePressedRef.current = true;
      }

      if (isEditableTarget) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        if (historyIndex > 0) {
          const nextIndex = historyIndex - 1;
          setHistoryIndex(nextIndex);
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
          setHistoryIndex(nextIndex);
          setLevelData(history[nextIndex]);
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD' && selectedObject) {
        event.preventDefault();
        if (selectedObject.type === 'START_MARKER' || selectedObject.type === 'FINISH_PORTAL') {
          return;
        }

        const next = structuredClone(levelData);
        const clone = structuredClone(selectedObject);
        clone.id = `${clone.id}-copy-${Date.now()}`;
        clone.x += 1;
        next.objects.push(clone);
        syncDerivedLevelData(next);

        const trimmedHistory = history.slice(0, historyIndex + 1);
        const nextHistory = [...trimmedHistory, next];
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setLevelData(next);
        setSelectedObjectId(clone.id);
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjectId) {
        event.preventDefault();
        if (selectedObject?.type === 'START_MARKER' || selectedObject?.type === 'FINISH_PORTAL') {
          return;
        }

        const next = structuredClone(levelData);
        next.objects = next.objects.filter((object) => object.id !== selectedObjectId);
        syncDerivedLevelData(next);

        const trimmedHistory = history.slice(0, historyIndex + 1);
        const nextHistory = [...trimmedHistory, next];
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setLevelData(next);
        setSelectedObjectId(null);
      }

      if (event.key === 'Escape') {
        setSelectedObjectId(null);
      }

      if (selectedObjectId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const delta = {
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
        }[event.key]!;

        const next = structuredClone(levelData);
        const object = next.objects.find((entry) => entry.id === selectedObjectId);

        if (object) {
          object.x += delta.x;
          object.y += delta.y;

          if (object.type === 'START_MARKER') {
            next.player.startX = object.x;
            next.player.startY = object.y;
          }

          if (object.type === 'FINISH_PORTAL') {
            next.finish.x = object.x;
            next.finish.y = object.y;
          }

          syncDerivedLevelData(next);

          const trimmedHistory = history.slice(0, historyIndex + 1);
          const nextHistory = [...trimmedHistory, next];
          setHistory(nextHistory);
          setHistoryIndex(nextHistory.length - 1);
          setLevelData(next);
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
  }, [history, historyIndex, levelData, selectedObject, selectedObjectId]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const width = 1180;
    const height = 560;
    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#050d19';
    context.fillRect(0, 0, width, height);

    const cell = levelData.meta.gridSize * zoom;

    context.strokeStyle = 'rgba(255,255,255,0.05)';
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

    for (const object of levelData.objects) {
      const definition = levelObjectDefinitions[object.type];
      const { x, y } = worldToScreen(object.x, object.y, pan.x, pan.y, cell);
      const w = object.w * cell;
      const h = object.h * cell;

      if (object.type === 'SPIKE') {
        context.fillStyle = definition.color;
        context.beginPath();
        context.moveTo(x, y + h);
        context.lineTo(x + w / 2, y);
        context.lineTo(x + w, y + h);
        context.closePath();
        context.fill();
      } else if (object.type === 'JUMP_ORB') {
        context.fillStyle = definition.color;
        context.beginPath();
        context.arc(x + w / 2, y + h / 2, Math.max(10, w / 2.4), 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = definition.color;
        context.fillRect(x, y, w, h);
      }

      if (object.id === selectedObjectId) {
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }
    }
  }, [levelData, pan, selectedObjectId, zoom]);

  const updateLevelData = (mutator: (draft: LevelData) => void) => {
    const next = structuredClone(levelData);
    mutator(next);
    syncDerivedLevelData(next);

    const trimmedHistory = history.slice(0, historyIndex + 1);
    const nextHistory = [...trimmedHistory, next];

    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setLevelData(next);
  };

  const performUndo = () => {
    if (historyIndex === 0) {
      return;
    }

    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setLevelData(history[nextIndex]);
  };

  const performRedo = () => {
    if (historyIndex >= history.length - 1) {
      return;
    }

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
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
      const object: LevelObject = {
        id: `${type.toLowerCase()}-${Date.now()}`,
        type,
        x,
        y,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        rotation: 0,
        layer: type === 'DECORATION_BLOCK' ? 'decoration' : 'gameplay',
        props: {},
      };

      draft.objects.push(object);
      setSelectedObjectId(object.id);
    });
  };

  const duplicateSelected = () => {
    if (!selectedObject) {
      return;
    }

    if (selectedObject.type === 'START_MARKER' || selectedObject.type === 'FINISH_PORTAL') {
      return;
    }

    updateLevelData((draft) => {
      const clone = structuredClone(selectedObject);
      clone.id = `${clone.id}-copy-${Date.now()}`;
      clone.x += 1;
      draft.objects.push(clone);
      setSelectedObjectId(clone.id);
    });
  };

  const deleteSelected = () => {
    if (!selectedObjectId) {
      return;
    }

    if (selectedObject?.type === 'START_MARKER' || selectedObject?.type === 'FINISH_PORTAL') {
      return;
    }

    updateLevelData((draft) => {
      draft.objects = draft.objects.filter((object) => object.id !== selectedObjectId);
    });
    setSelectedObjectId(null);
  };

  const applyThemePreset = (nextTheme: string) => {
    setTheme(nextTheme);
    setLevelData((current) => ({
      ...current,
      meta: {
        ...current.meta,
        theme: nextTheme,
      },
    }));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const screenX = (event.clientX - rect.left) * scaleX;
    const screenY = (event.clientY - rect.top) * scaleY;
    const cell = levelData.meta.gridSize * zoom;
    const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);

    setCursorWorld(world);

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

      setSelectedObjectId(hitObject?.id ?? null);

      if (hitObject) {
        dragRef.current = {
          mode: 'move',
          objectId: hitObject.id,
          offsetX: world.x - hitObject.x,
          offsetY: world.y - hitObject.y,
        };
      }

      return;
    }

    placeObject(selectedTool, Math.round(world.x), Math.round(world.y));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const screenX = (event.clientX - rect.left) * scaleX;
    const screenY = (event.clientY - rect.top) * scaleY;
    const cell = levelData.meta.gridSize * zoom;
    const world = screenToWorld(screenX, screenY, pan.x, pan.y, cell);

    setCursorWorld(world);

    const dragState = dragRef.current;

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

    if (dragState.mode === 'move') {
      const nextX = Math.round(world.x - dragState.offsetX);
      const nextY = Math.round(world.y - dragState.offsetY);
      setLevelData((current) => {
        const next = structuredClone(current);
        const object = next.objects.find((entry) => entry.id === dragState.objectId);

        if (object) {
          object.x = nextX;
          object.y = nextY;

          if (object.type === 'START_MARKER') {
            next.player.startX = object.x;
            next.player.startY = object.y;
          }

          if (object.type === 'FINISH_PORTAL') {
            next.finish.x = object.x;
            next.finish.y = object.y;
          }
        }

        return syncDerivedLevelData(next);
      });
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current?.mode === 'move') {
      const next = syncDerivedLevelData(structuredClone(liveLevelDataRef.current));
      const trimmedHistory = history.slice(0, historyIndex + 1);
      const nextHistory = [...trimmedHistory, next];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }

    dragRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setZoom((current) => Math.min(2.4, Math.max(0.45, current + (event.deltaY < 0 ? 0.1 : -0.1))));
  };

  const handleObjectField = (field: keyof LevelObject, value: string | number) => {
    if (!selectedObjectId) {
      return;
    }

    updateLevelData((draft) => {
      const object = draft.objects.find((entry) => entry.id === selectedObjectId);

      if (!object) {
        return;
      }

      // The inspector edits only numeric runtime geometry fields here.
      (object[field] as string | number) = value;

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

  const handleObjectPropField = (key: string, value: string | number) => {
    if (!selectedObjectId) {
      return;
    }

    updateLevelData((draft) => {
      const object = draft.objects.find((entry) => entry.id === selectedObjectId);

      if (!object) {
        return;
      }

      object.props = {
        ...object.props,
        [key]: value,
      };
    });
  };

  const handleSave = async () => {
    setSaveState('saving');
    setMessage('');

    try {
      const dataToSave = structuredClone(levelData);
      dataToSave.meta.theme = theme;

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

    try {
      await onSubmit();
      setMessage('Level submitted for admin review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit level');
    }
  };

  return (
    <div className="arcade-editor-workstation space-y-6">
      <Panel className="arcade-editor-topbar game-screen bg-transparent">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-[11px] tracking-[0.26em] text-[#ffd44a]">Forge Workstation</p>
            <h3 className="mt-2 font-display text-3xl text-white">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
              Build the route on the center stage, use the left rail to swap tools, and use the right drawer for
              metadata plus detailed object tuning.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <HintChip label="Tool" value={activeToolLabel} />
            <HintChip label="Selected" value={selectionLabel} />
            <HintChip label="History" value={historyPosition} />
            <HintChip label="Theme" value={theme} />
            <HintChip label="Preview" value={showPreview ? 'Dock Open' : 'Dock Closed'} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <div className="arcade-tool-rail space-y-4">
          <Panel className="game-screen space-y-4 bg-transparent">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">Quick Start</h3>
              <Badge tone="success">4 Steps</Badge>
            </div>
            <div className="space-y-3">
              {quickStartSteps.map((step, index) => (
                <GuideStep key={step} index={index + 1} text={step} />
              ))}
            </div>
          </Panel>

          <Panel className="game-screen space-y-4 bg-transparent">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">Palette</h3>
              <Badge tone="accent">Grid Snapping</Badge>
            </div>

            <div className="space-y-4">
              {paletteGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="font-display text-[10px] tracking-[0.22em] text-white/48">{group.title}</p>
                  <div className="grid gap-2">
                    {group.items.map((tool) => (
                      <ToolButton
                        key={tool}
                        label={tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : levelObjectDefinitions[tool].label}
                        description={toolDescriptions[tool]}
                        active={selectedTool === tool}
                        onClick={() => setSelectedTool(tool)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/72">
              <p className="font-display mb-1 text-[10px] tracking-[0.18em] text-[#ffd44a]">Active Tool</p>
              <p className="text-white">{activeToolLabel}</p>
              <p>{activeToolDescription}</p>
            </div>
          </Panel>

          <Panel className="game-screen space-y-3 bg-transparent">
            <h3 className="font-display text-2xl text-white">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={performUndo} disabled={!canUndo}>
                Undo Edit
              </Button>
              <Button variant="ghost" onClick={performRedo} disabled={!canRedo}>
                Redo Edit
              </Button>
              <Button variant="ghost" onClick={duplicateSelected} disabled={!selectedObject}>
                Clone
              </Button>
              <Button variant="danger" onClick={deleteSelected} disabled={!selectedObject}>
                Delete Object
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <HintChip label="Pan" value="Space + drag" />
              <HintChip label="Move" value="Arrow keys" />
              <HintChip label="Undo" value="Ctrl/Cmd + Z" />
              <HintChip label="Redo" value="Ctrl/Cmd + Shift + Z" />
              <HintChip label="Duplicate" value="Ctrl/Cmd + D" />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="arcade-editor-stage-panel game-screen space-y-4 bg-transparent">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving...' : saveLabel}
                </Button>
                {onSubmit ? (
                  <Button variant="secondary" onClick={handleSubmit}>
                    Submit for Review
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => setShowPreview((current) => !current)}>
                  {showPreview ? 'Hide Test Play' : 'Test Play'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}>
                  Zoom -
                </Button>
                <Button variant="ghost" onClick={() => setZoom((current) => Math.min(2.4, current + 0.1))}>
                  Zoom +
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <HintChip label="Stage Mode" value={activeToolLabel} />
              <HintChip label="Selection" value={selectionLabel} />
              <HintChip label="Left Click" value="Place or select" />
              <HintChip label="Camera" value="Wheel to zoom" />
            </div>

            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair border-[4px] border-[#39105f] bg-[#130326]"
              aria-label="Level editor stage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/72">
              <p>
                Tool: <span className="text-white">{selectedTool}</span>
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
                History: <span className="text-white">{historyPosition}</span>
              </p>
            </div>

            {message ? (
              <div
                className={cn(
                  'arcade-button px-4 py-3 text-sm',
                  saveState === 'error' ? 'bg-magmarose/15 text-magmarose' : 'bg-cyanpulse/10 text-cyanpulse',
                )}
              >
                {message}
              </div>
            ) : null}
          </Panel>

          <Panel className="arcade-preview-dock game-screen bg-transparent">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Preview Dock</p>
                <p className="text-sm text-white/78">
                  {showPreview ? 'Runtime preview is active below.' : 'Open Test Play to dock a live runtime preview here.'}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setShowPreview((current) => !current)}>
                {showPreview ? 'Hide Dock' : 'Open Dock'}
              </Button>
            </div>

            {showPreview ? (
              <div className="mt-4">
                <GameCanvas levelData={levelData} attemptNumber={1} autoRestartOnFail />
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-6 text-sm leading-7 text-white/68">
                Build a route, hit save, and open the preview dock when you want to test timing and readability without leaving
                the workstation.
              </div>
            )}
          </Panel>
        </div>

        <div className="arcade-editor-drawer space-y-4">
          <Panel className="game-screen space-y-4 bg-transparent">
            <h3 className="font-display text-2xl text-white">Level Metadata</h3>
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Theme</FieldLabel>
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
                className="mt-3"
                value={theme}
                onChange={(event) => {
                  applyThemePreset(event.target.value);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <HintChip label="Base Speed" value={levelData.player.baseSpeed.toFixed(1)} />
            </div>
          </Panel>

          <Panel className="game-screen space-y-4 bg-transparent">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">Editor Guide</h3>
              <Badge tone="accent">Live</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <HintChip label="Place" value="Choose tool, then click stage" />
              <HintChip label="Inspect" value="Select object to edit size and props" />
              <HintChip label="Preview" value="Use Test Play before saving" />
              <HintChip label="Submit" value="Only when route feels clean" />
            </div>
          </Panel>

          <Panel className="game-screen space-y-4 bg-transparent">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">Inspector</h3>
              {selectedObject ? <Badge tone="accent">{selectedObject.type}</Badge> : null}
            </div>

            {selectedObject ? (
              <>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/72">
                  <p className="font-display mb-1 text-[10px] tracking-[0.18em] text-[#ffd44a]">Selected</p>
                  <p className="text-white">{selectedDefinition?.label}</p>
                  <p>{toolDescriptions[selectedObject.type]}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="X" value={selectedObject.x} onChange={(value) => handleObjectField('x', value)} />
                  <NumberField label="Y" value={selectedObject.y} onChange={(value) => handleObjectField('y', value)} />
                  <NumberField label="W" value={selectedObject.w} onChange={(value) => handleObjectField('w', value)} />
                  <NumberField label="H" value={selectedObject.h} onChange={(value) => handleObjectField('h', value)} />
                  <NumberField
                    label="Rotation"
                    value={selectedObject.rotation}
                    onChange={(value) => handleObjectField('rotation', value)}
                  />
                </div>

                {selectedObject.type === 'JUMP_PAD' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Boost"
                      value={Number(selectedObject.props.boost ?? 16)}
                      step={0.5}
                      onChange={(value) => handleObjectPropField('boost', value)}
                    />
                  </div>
                ) : null}

                {selectedObject.type === 'SPEED_PORTAL' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Multiplier"
                      value={Number(selectedObject.props.multiplier ?? 1.4)}
                      step={0.1}
                      min={0.4}
                      onChange={(value) => handleObjectPropField('multiplier', value)}
                    />
                  </div>
                ) : null}

                {selectedObject.type === 'GRAVITY_PORTAL' ? (
                  <div>
                    <FieldLabel>Gravity Direction</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={Number(selectedObject.props.gravity ?? -1) > 0 ? 'secondary' : 'ghost'}
                        onClick={() => handleObjectPropField('gravity', 1)}
                      >
                        Normal
                      </Button>
                      <Button
                        variant={Number(selectedObject.props.gravity ?? -1) < 0 ? 'secondary' : 'ghost'}
                        onClick={() => handleObjectPropField('gravity', -1)}
                      >
                        Inverted
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <FieldLabel>Advanced Props (JSON)</FieldLabel>
                  <Textarea
                    className="font-mono text-xs"
                    rows={6}
                    value={JSON.stringify(selectedObject.props, null, 2)}
                    onChange={(event) => {
                      try {
                        const parsed = JSON.parse(event.target.value);
                        updateLevelData((draft) => {
                          const object = draft.objects.find((entry) => entry.id === selectedObject.id);
                          if (object) {
                            object.props = parsed;
                          }
                        });
                      } catch {
                        // Keep editor forgiving; invalid JSON is simply ignored until corrected.
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-white/60">
                Pick an object on the canvas to edit its geometry and effect props.
              </p>
            )}
          </Panel>

          {sidebarSlot}
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tool-tile px-3 py-3 text-left transition',
        active
          ? 'tool-tile-active text-[#173300]'
          : 'text-white hover:brightness-110',
      )}
    >
      <span className="font-display block text-[10px] tracking-[0.18em] uppercase">{label}</span>
      {description ? (
        <span className={cn('mt-1 block text-[10px] normal-case leading-5', active ? 'text-[#173300]/80' : 'text-white/62')}>
          {description}
        </span>
      ) : null}
    </button>
  );
}

function GuideStep({ index, text }: { index: number; text: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
      <p className="font-display text-[10px] tracking-[0.18em] text-[#ffd44a]">Step {index}</p>
      <p className="mt-1 text-sm leading-6 text-white/78">{text}</p>
    </div>
  );
}

function HintChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2">
      <p className="font-display text-[9px] tracking-[0.16em] text-[#ffd44a]">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-white/78">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function screenToWorld(screenX: number, screenY: number, panX: number, panY: number, cell: number) {
  return {
    x: Math.round((screenX - panX) / cell),
    y: Math.round((screenY - panY) / cell),
  };
}

function worldToScreen(x: number, y: number, panX: number, panY: number, cell: number) {
  return {
    x: x * cell + panX,
    y: y * cell + panY,
  };
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
