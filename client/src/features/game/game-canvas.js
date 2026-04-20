import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { FIXED_LEVEL_START_X, FIXED_LEVEL_START_Y, computeAutoLevelFinishX, getBlockCollisionMask, getObjectFillColor, getObjectPaintGroupId, getSpikeHitboxRect, getObjectStrokeColor, hasBlockSupport, isCollidableBlockType, isGroundFamilyBlockType, isLegacyRunAnchorObjectType, isPassThroughBlockType, isSawObjectType, isSpikeObjectType, isTriggerObjectType, stripLegacyRunAnchorObjects, } from './object-definitions';
import { SHIP_FALL_ACCELERATION, SHIP_FLIGHT_CEILING_Y, SHIP_FLIGHT_FLOOR_Y, SHIP_MAX_VERTICAL_SPEED, SHIP_THRUST_ACCELERATION, SHIP_VISUAL_BOUND_PADDING, getPlayerModeDescription, getPlayerModeLabel, } from './player-mode-config';
import { AIR_ROTATION_SPEED, ARROW_VERTICAL_SPEED_FACTOR, BASE_GRAVITY_ACCELERATION, BASE_HORIZONTAL_SPEED, DEFAULT_JUMP_VELOCITY, DEFAULT_JUMP_ORB_VELOCITY, PLAYER_HITBOX_SIZE, PERMANENT_STAGE_FLOOR_Y, getPlayerHitboxLayout, normalizeAngle, snapCubeRotation, } from './player-physics';
import { readStoredMusicVolume, resolveLevelMusic } from './level-music';
import { drawStageObjectSprite } from './object-renderer';
import { drawPlayerModelSprite, usePlayerSkinsQuery } from './player-skins';
import { getStageGroundPalette, getStageThemePalette } from './stage-theme-palette';
import { Panel } from '../../components/ui';
import { cn } from '../../utils/cn';
export { BASE_HORIZONTAL_SPEED } from './player-physics';
const orbTypes = new Set(['JUMP_ORB', 'BLUE_ORB', 'GRAVITY_ORB']);
const portalTypes = new Set([
    'GRAVITY_FLIP_PORTAL',
    'GRAVITY_RETURN_PORTAL',
    'GRAVITY_PORTAL',
    'SPEED_PORTAL',
    'SHIP_PORTAL',
    'BALL_PORTAL',
    'CUBE_PORTAL',
    'ARROW_PORTAL',
    'FINISH_PORTAL',
]);
const JUMP_BUFFER_MS = 130;
const ORB_PRESS_BUFFER_MS = 130;
const COYOTE_TIME_MS = 110;
const AUTO_RESTART_DELAY_MS = 850;
const GREEN_ORB_LAUNCH_VELOCITY = DEFAULT_JUMP_VELOCITY * 0.76;
const GREEN_ORB_MIN_VELOCITY = DEFAULT_JUMP_VELOCITY * 0.48;
const GREEN_ORB_INERTIA_BLEND = 0.72;
const BALL_RAMP_EXIT_CARRY_FACTOR = 0.96;
const BALL_RAMP_EXIT_CARRY_MAX = DEFAULT_JUMP_VELOCITY * 0.58;
const BALL_RAMP_EXIT_CARRY_MIN = DEFAULT_JUMP_VELOCITY * 0.34;
const BALL_RAMP_EDGE_TOLERANCE = 0.14;
const BALL_INSTANT_FLIP_TOUCH_TOLERANCE = 0.12;
const BLOCK_SUPPORT_BAND_THICKNESS_UNITS = 0.12;
const GRAVITY_PORTAL_SURFACE_RELEASE_UNITS = 0.08;
const GRAVITY_PORTAL_MIN_EXIT_SPEED = 1.2;
const BALL_GRAVITY_PORTAL_FLIP_LOCKOUT_MS = 120;
const RUNTIME_BUCKET_WIDTH_UNITS = 8;
const DESKTOP_MAX_PATH_POINTS = 6000;
const LOW_POWER_MAX_PATH_POINTS = 2400;
const MOBILE_PREVIEW_MAX_PATH_POINTS = 900;
const FINISH_SEQUENCE_DURATION_MS = 620;
const FINISH_SEQUENCE_MAX_DURATION_MS = 1500;
const FINISH_SEQUENCE_DISTANCE_DURATION_FACTOR_MS = 78;
const AUTO_FINISH_INVERTED_AIRBORNE_DELAY_MS = 500;
const EARLY_FINISH_PULL_DISTANCE_UNITS = 15;
const FINISH_GATEWAY_OFFSET_UNITS = 0.96;
const FINISH_GATEWAY_HALF_WIDTH_UNITS = 0.42;
const FINISH_GATEWAY_SCREEN_ANCHOR_RATIO = 0.78;
const GAMEPLAY_INPUT_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);
const postFxEffectTypes = new Set(['flash', 'grayscale', 'invert', 'scanlines', 'blur', 'shake', 'tint']);
const moveTriggerEasingModes = new Set(['none', 'easeIn', 'easeOut', 'easeInOut']);
export function GameCanvas({ levelData, attemptNumber = 1, runId = 0, autoRestartOnFail = false, fullscreen = false, previewStartPosEnabled = false, previewStartPosInheritPortalState = true, showTriggersInPlayMode = false, showHitboxes = false, suppressCompletionOverlay = false, stopSignal = 0, showRunPath = false, className, playerSkinOverrides, onFail, onComplete, onExitToMenu, onStop, }) {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const postFxOverlayRef = useRef(null);
    const audioRef = useRef(null);
    const onFailRef = useRef(onFail);
    const onCompleteRef = useRef(onComplete);
    const onStopRef = useRef(onStop);
    const inputHeldRef = useRef(false);
    const keyboardInputHeldRef = useRef(false);
    const activePointerIdsRef = useRef(new Set());
    const pauseMenuOpenRef = useRef(false);
    const pauseSettingsOpenRef = useRef(false);
    const pauseStartedAtRef = useRef(null);
    const pausedDurationMsRef = useRef(0);
    const screenShakeEnabledRef = useRef(true);
    const showTriggersInPlayModeRef = useRef(showTriggersInPlayMode);
    const showHitboxesRef = useRef(showHitboxes);
    const handledStopSignalRef = useRef(stopSignal);
    const currentPathRef = useRef([]);
    const [hud, setHud] = useState({
        progressPercent: 0,
        status: 'running',
        elapsedMs: 0,
    });
    const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
    const [isPauseSettingsOpen, setIsPauseSettingsOpen] = useState(false);
    const [isHudVisible, setIsHudVisible] = useState(true);
    const [isScreenShakeEnabled, setIsScreenShakeEnabled] = useState(true);
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    const [musicLoadProgress, setMusicLoadProgress] = useState(null);
    const playerSkinsQuery = usePlayerSkinsQuery();
    const playerSkinMap = playerSkinsQuery.data?.skins ?? null;
    const playerModeLabel = getPlayerModeLabel(levelData.player.mode);
    const resolvedMusic = useMemo(() => resolveLevelMusic(levelData.meta), [levelData.meta]);
    const musicOffsetMs = Math.max(0, Number(levelData.meta.musicOffsetMs ?? 0) || 0);
    const sanitizedLevelObjects = useMemo(() => stripLegacyRunAnchorObjects(levelData.objects), [levelData.objects]);
    const autoFinishX = useMemo(() => computeAutoLevelFinishX({ objects: levelData.objects }), [levelData.objects]);
    const finishGatewayX = autoFinishX + FINISH_GATEWAY_OFFSET_UNITS;
    const previewStartPos = useMemo(() => {
        if (!previewStartPosEnabled) {
            return null;
        }
        for (let index = sanitizedLevelObjects.length - 1; index >= 0; index -= 1) {
            const object = sanitizedLevelObjects[index];
            if (object.type === 'START_POS') {
                return {
                    x: object.x,
                    y: object.y,
                };
            }
        }
        return null;
    }, [previewStartPosEnabled, sanitizedLevelObjects]);
    const previewBootstrap = useMemo(() => buildPreviewBootstrap(levelData, previewStartPos, {
        inheritPortalState: previewStartPosInheritPortalState,
    }), [levelData, previewStartPos, previewStartPosInheritPortalState]);
    const runtimeMusicOffsetMs = musicOffsetMs + previewBootstrap.elapsedMs;
    const statusLabel = hud.status === 'completed' ? 'Stage Clear' : hud.status === 'failed' ? 'Attempt Lost' : 'In Run';
    const musicLoadingValueLabel = musicLoadProgress === null ? 'Buffering...' : `${Math.round(musicLoadProgress)}%`;
    const closePauseMenu = () => {
        if (!pauseMenuOpenRef.current) {
            return;
        }
        if (pauseStartedAtRef.current !== null) {
            pausedDurationMsRef.current += performance.now() - pauseStartedAtRef.current;
            pauseStartedAtRef.current = null;
        }
        pauseMenuOpenRef.current = false;
        pauseSettingsOpenRef.current = false;
        setIsPauseMenuOpen(false);
        setIsPauseSettingsOpen(false);
        if (audioRef.current) {
            audioRef.current.volume = readStoredMusicVolume();
            void audioRef.current.play().catch(() => { });
        }
    };
    const togglePauseSettings = () => {
        const nextOpen = !pauseSettingsOpenRef.current;
        pauseSettingsOpenRef.current = nextOpen;
        setIsPauseSettingsOpen(nextOpen);
    };
    const handleExitToMenu = () => {
        closePauseMenu();
        onExitToMenu?.({
            progressPercent: hud.progressPercent,
            pathPoints: currentPathRef.current.map((point) => ({ ...point })),
        });
    };
    const levelBounds = useMemo(() => {
        const maxY = Math.max(...sanitizedLevelObjects.map((object) => object.y + object.h), FIXED_LEVEL_START_Y + 4);
        const maxX = Math.max(...sanitizedLevelObjects.map((object) => object.x + object.w), autoFinishX);
        return { maxX, maxY };
    }, [autoFinishX, sanitizedLevelObjects]);
    useEffect(() => {
        onFailRef.current = onFail;
        onCompleteRef.current = onComplete;
        onStopRef.current = onStop;
    }, [onComplete, onFail, onStop]);
    useEffect(() => {
        if (stopSignal === handledStopSignalRef.current) {
            return;
        }
        handledStopSignalRef.current = stopSignal;
        closePauseMenu();
        onStopRef.current?.({
            progressPercent: hud.progressPercent,
            pathPoints: currentPathRef.current.map((point) => ({ ...point })),
        });
    }, [hud.progressPercent, stopSignal]);
    useEffect(() => {
        screenShakeEnabledRef.current = isScreenShakeEnabled;
    }, [isScreenShakeEnabled]);
    useEffect(() => {
        showTriggersInPlayModeRef.current = showTriggersInPlayMode;
    }, [showTriggersInPlayMode]);
    useEffect(() => {
        showHitboxesRef.current = showHitboxes;
    }, [showHitboxes]);
    useEffect(() => {
        pauseMenuOpenRef.current = false;
        pauseSettingsOpenRef.current = false;
        pauseStartedAtRef.current = null;
        pausedDurationMsRef.current = 0;
        setIsPauseMenuOpen(false);
        setIsPauseSettingsOpen(false);
    }, [levelData, runId]);
    useEffect(() => {
        const currentAudio = audioRef.current;
        const offsetSeconds = runtimeMusicOffsetMs / 1000;
        let disposed = false;
        const updateMusicLoading = (loading, progress = null) => {
            if (disposed) {
                return;
            }
            setIsMusicLoading(loading);
            setMusicLoadProgress(progress);
        };
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            audioRef.current = null;
        }
        if (!resolvedMusic.src) {
            updateMusicLoading(false, null);
            return;
        }
        updateMusicLoading(true, 4);
        const nextAudio = new Audio(resolvedMusic.src);
        nextAudio.loop = true;
        nextAudio.preload = 'auto';
        nextAudio.volume = readStoredMusicVolume();
        audioRef.current = nextAudio;
        const syncMusicProgress = () => {
            if (disposed) {
                return;
            }
            try {
                if (!Number.isFinite(nextAudio.duration) || nextAudio.duration <= 0 || nextAudio.buffered.length === 0) {
                    updateMusicLoading(true, null);
                    return;
                }
                const bufferedEnd = nextAudio.buffered.end(nextAudio.buffered.length - 1);
                const progressPercent = clamp((bufferedEnd / nextAudio.duration) * 100, 0, 100);
                updateMusicLoading(progressPercent < 99.5, progressPercent);
            }
            catch {
                updateMusicLoading(true, null);
            }
        };
        const markMusicReady = () => {
            syncMusicProgress();
            updateMusicLoading(false, 100);
        };
        const markMusicLoadFailed = () => {
            updateMusicLoading(false, null);
        };
        const applyMusicOffset = () => {
            if (!audioRef.current || audioRef.current !== nextAudio) {
                return;
            }
            if (!Number.isFinite(offsetSeconds) || offsetSeconds <= 0) {
                nextAudio.currentTime = 0;
                return;
            }
            const duration = Number.isFinite(nextAudio.duration) && nextAudio.duration > 0 ? nextAudio.duration : null;
            const safeOffset = duration ? Math.min(offsetSeconds, Math.max(0, duration - 0.05)) : offsetSeconds;
            nextAudio.currentTime = safeOffset;
        };
        nextAudio.addEventListener('loadedmetadata', applyMusicOffset);
        nextAudio.addEventListener('loadedmetadata', syncMusicProgress);
        nextAudio.addEventListener('progress', syncMusicProgress);
        nextAudio.addEventListener('canplay', markMusicReady);
        nextAudio.addEventListener('canplaythrough', markMusicReady);
        nextAudio.addEventListener('error', markMusicLoadFailed);
        if (nextAudio.readyState >= 1) {
            applyMusicOffset();
            syncMusicProgress();
        }
        if (nextAudio.readyState >= 3) {
            markMusicReady();
        }
        void nextAudio.play().catch(() => { });
        return () => {
            disposed = true;
            nextAudio.removeEventListener('loadedmetadata', applyMusicOffset);
            nextAudio.removeEventListener('loadedmetadata', syncMusicProgress);
            nextAudio.removeEventListener('progress', syncMusicProgress);
            nextAudio.removeEventListener('canplay', markMusicReady);
            nextAudio.removeEventListener('canplaythrough', markMusicReady);
            nextAudio.removeEventListener('error', markMusicLoadFailed);
            nextAudio.pause();
            nextAudio.src = '';
            if (audioRef.current === nextAudio) {
                audioRef.current = null;
            }
        };
    }, [resolvedMusic.src, runId, runtimeMusicOffsetMs]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const isExternallyManagedRun = Boolean(onFail || onComplete);
        const isLowPowerDevice = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820);
        const isMobilePreviewPerformanceMode = fullscreen && autoRestartOnFail && previewStartPosEnabled && isLowPowerDevice;
        const defaultWidth = 960;
        let width = defaultWidth;
        let height = Math.round((defaultWidth * 9) / 16);
        let cell = (36 * width) / 960;
        let verticalOffset = Math.max(40, height - levelBounds.maxY * cell - 50);
        const syncCanvasResolution = () => {
            const stageElement = canvas.parentElement;
            const stageRect = stageElement?.getBoundingClientRect();
            const measuredWidth = Math.round(stageRect?.width ?? 0);
            width = Math.max(1, measuredWidth || defaultWidth);
            height = Math.max(1, Math.round((width * 9) / 16));
            cell = (36 * width) / 960;
            verticalOffset = Math.max(40, height - levelBounds.maxY * cell - 50);
            const renderScale = isMobilePreviewPerformanceMode ? 1 : getCanvasRenderScale();
            const physicalWidth = Math.max(1, Math.floor(width * renderScale));
            const physicalHeight = Math.max(1, Math.floor(height * renderScale));
            if (canvas.width !== physicalWidth) {
                canvas.width = physicalWidth;
            }
            if (canvas.height !== physicalHeight) {
                canvas.height = physicalHeight;
            }
            canvas.dataset.logicalWidth = String(width);
            canvas.dataset.logicalHeight = String(height);
            context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
        };
        syncCanvasResolution();
        const stageElement = canvas.parentElement;
        let resizeObserver = null;
        const handleRuntimeResize = () => {
            syncCanvasResolution();
        };
        if (typeof ResizeObserver !== 'undefined' && stageElement) {
            resizeObserver = new ResizeObserver(() => {
                syncCanvasResolution();
            });
            resizeObserver.observe(stageElement);
        }
        else if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleRuntimeResize);
        }
        const player = {
            x: previewBootstrap.startX,
            y: previewBootstrap.startY,
            w: PLAYER_HITBOX_SIZE,
            h: PLAYER_HITBOX_SIZE,
            vy: 0,
            rotation: 0,
            grounded: false,
            gravity: previewBootstrap.gravity,
            speedMultiplier: previewBootstrap.speedMultiplier,
            mode: previewBootstrap.mode,
        };
        const activeTriggers = new Set();
        const usedOrbs = new Set();
        const activePostFxEffects = [];
        const pathLine = currentPathRef.current;
        const sourceObjects = sanitizedLevelObjects.map((object) => structuredClone(object));
        let runtimeObjects = sourceObjects.map((object) => structuredClone(object));
        let runtimeObjectBuckets = buildRuntimeObjectBuckets(runtimeObjects);
        let runtimeObjectMap = new Map(runtimeObjects.map((object) => [object.id, object]));
        let runtimePaintGroups = buildRuntimePaintGroupMap(runtimeObjects);
        const alphaOverrides = new Map();
        const disabledObjectIds = new Set();
        const pulseOverrides = new Map();
        const moveAnimations = new Map();
        let animationFrame = 0;
        let lastTimestamp = 0;
        let startTime = performance.now() - previewBootstrap.elapsedMs;
        let currentElapsedMs = previewBootstrap.elapsedMs;
        let jumpBufferedUntil = 0;
        let orbBufferedUntil = 0;
        let lastGroundedAt = 0;
        let airborneStartedAtMs = null;
        let invertedGravityFlippedAtMs = null;
        let currentStatus = 'running';
        let finishSequence = null;
        let playerConsumedByFinishGateway = false;
        let lastHudCommit = 0;
        let cameraX = 0;
        let shakeTime = 0;
        let shakePower = 0;
        let restartTimeout = 0;
        let jumpCount = 0;
        let ballFlipQueuedUntilRelease = false;
        let ballGravityPortalFlipLockedUntil = 0;
        const syncInputHeldState = () => {
            inputHeldRef.current = keyboardInputHeldRef.current || activePointerIdsRef.current.size > 0;
            if (!inputHeldRef.current) {
                ballFlipQueuedUntilRelease = false;
            }
        };
        const releaseAllHeldInput = () => {
            keyboardInputHeldRef.current = false;
            activePointerIdsRef.current.clear();
            syncInputHeldState();
        };
        const rebuildRuntimeObjectBuckets = () => {
            runtimeObjectBuckets = buildRuntimeObjectBuckets(runtimeObjects);
        };
        const rebuildRuntimeObjectMaps = () => {
            runtimeObjectMap = new Map(runtimeObjects.map((object) => [object.id, object]));
            runtimePaintGroups = buildRuntimePaintGroupMap(runtimeObjects);
            rebuildRuntimeObjectBuckets();
        };
        const getRuntimeObjectsInRange = (minX, maxX) => {
            if (!runtimeObjects.length) {
                return [];
            }
            const startBucket = Math.floor(minX / RUNTIME_BUCKET_WIDTH_UNITS);
            const endBucket = Math.floor(maxX / RUNTIME_BUCKET_WIDTH_UNITS);
            const seen = new Set();
            const indices = [];
            for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
                const bucketEntries = runtimeObjectBuckets.get(bucket);
                if (!bucketEntries) {
                    continue;
                }
                for (const index of bucketEntries) {
                    if (seen.has(index)) {
                        continue;
                    }
                    seen.add(index);
                    const object = runtimeObjects[index];
                    if (!objectIntersectsHorizontalRange(object, minX, maxX)) {
                        continue;
                    }
                    indices.push(index);
                }
            }
            indices.sort((left, right) => left - right);
            return indices.map((index) => runtimeObjects[index]);
        };
        const getRuntimeObjectsInViewport = (minX, maxX, minY, maxY) => getRuntimeObjectsInRange(minX, maxX).filter((object) => objectIntersectsVerticalRange(object, minY, maxY));
        const getRuntimeInteractionObjects = (minX, maxX, minY, maxY) => getRuntimeObjectsInRange(minX, maxX).filter((object) => {
            if (objectIntersectsVerticalRange(object, minY, maxY)) {
                return true;
            }
            return isTriggerObjectType(object.type) && getTriggerActivationMode(object.props.activationMode) === 'zone';
        });
        const resetRuntimeObjects = () => {
            runtimeObjects = sourceObjects.map((object) => structuredClone(object));
            rebuildRuntimeObjectMaps();
            alphaOverrides.clear();
            disabledObjectIds.clear();
            pulseOverrides.clear();
            moveAnimations.clear();
            activePostFxEffects.length = 0;
            clearRuntimePostFx(stageElement, canvas, postFxOverlayRef.current);
        };
        const restartMusicFromOffset = () => {
            if (!audioRef.current) {
                return;
            }
            const nextTime = runtimeMusicOffsetMs / 1000;
            audioRef.current.currentTime = Number.isFinite(nextTime) && nextTime > 0 ? nextTime : 0;
            audioRef.current.volume = readStoredMusicVolume();
            void audioRef.current.play().catch(() => { });
        };
        const getRuntimeObject = (objectId) => runtimeObjectMap.get(objectId) ?? null;
        const getObjectsInPaintGroup = (groupId) => runtimePaintGroups.get(groupId) ?? [];
        const isRuntimeObjectDisabled = (object) => disabledObjectIds.has(object.id);
        const getRuntimeAlpha = (object) => clamp(alphaOverrides.get(object.id) ?? 1, 0, 1);
        const getRuntimeVisuals = (object) => {
            const pulse = pulseOverrides.get(object.id);
            return {
                fillColor: pulse?.fillColor ?? getObjectFillColor(object, levelData.meta.colorGroups),
                strokeColor: pulse?.strokeColor ?? getObjectStrokeColor(object, levelData.meta.colorGroups),
                alpha: getRuntimeAlpha(object),
            };
        };
        const isArrowProtectedByDashBlock = (solidObject, minX, maxX) => getRuntimeObjectsInRange(minX, maxX).some((object) => {
            if (object.type !== 'DASH_BLOCK' || isRuntimeObjectDisabled(object)) {
                return false;
            }
            const playerContactRect = getPlayerCollisionRect(player, 'contact');
            return (aabbIntersects(playerContactRect.x, playerContactRect.y, playerContactRect.w, playerContactRect.h, object.x, object.y, object.w, object.h) &&
                aabbIntersects(object.x, object.y, object.w, object.h, solidObject.x, solidObject.y, solidObject.w, solidObject.h));
        });
        const resetRun = (timestamp = performance.now()) => {
            if (restartTimeout) {
                window.clearTimeout(restartTimeout);
            }
            startTime = timestamp - previewBootstrap.elapsedMs;
            lastTimestamp = timestamp;
            currentElapsedMs = previewBootstrap.elapsedMs;
            jumpBufferedUntil = 0;
            orbBufferedUntil = 0;
            lastGroundedAt = 0;
            airborneStartedAtMs = null;
            invertedGravityFlippedAtMs = null;
            ballGravityPortalFlipLockedUntil = 0;
            player.x = previewBootstrap.startX;
            player.y = previewBootstrap.startY;
            player.vy = 0;
            player.rotation = 0;
            player.gravity = previewBootstrap.gravity;
            player.speedMultiplier = previewBootstrap.speedMultiplier;
            player.mode = previewBootstrap.mode;
            player.grounded = false;
            jumpCount = 0;
            releaseAllHeldInput();
            restartMusicFromOffset();
            currentStatus = 'running';
            playerConsumedByFinishGateway = false;
            resetRuntimeObjects();
            activeTriggers.clear();
            usedOrbs.clear();
            pathLine.length = 0;
            pathLine.push({
                x: player.x + player.w / 2,
                y: player.y + player.h / 2,
            });
            pauseMenuOpenRef.current = false;
            pauseSettingsOpenRef.current = false;
            pauseStartedAtRef.current = null;
            pausedDurationMsRef.current = 0;
            setIsPauseMenuOpen(false);
            setIsPauseSettingsOpen(false);
            setHud({
                progressPercent: clampProgress((player.x / levelBounds.maxX) * 100),
                status: 'running',
                elapsedMs: previewBootstrap.elapsedMs,
            });
        };
        const bumpCamera = (power = 8, duration = 0.18) => {
            if (!screenShakeEnabledRef.current) {
                return;
            }
            shakePower = Math.max(shakePower, power);
            shakeTime = Math.max(shakeTime, duration);
        };
        const registerJump = () => {
            jumpCount += 1;
        };
        const trackAutoFinishGravityFlip = (previousGravity, nextGravity) => {
            const previousDirection = Math.sign(previousGravity || 1) || 1;
            const nextDirection = Math.sign(nextGravity || 1) || 1;
            if (previousDirection === nextDirection) {
                return;
            }
            invertedGravityFlippedAtMs = nextDirection < 0 ? currentElapsedMs : null;
        };
        const launchPlayer = (velocity) => {
            player.vy = velocity;
            player.grounded = false;
            lastGroundedAt = -Infinity;
        };
        const applyBlueOrbGravityFlip = () => {
            const previousGravity = player.gravity === 0 ? 1 : player.gravity;
            const nextGravity = -previousGravity;
            trackAutoFinishGravityFlip(previousGravity, nextGravity);
            player.gravity = nextGravity;
            player.grounded = false;
            lastGroundedAt = -Infinity;
        };
        const applyGreenOrbLaunch = () => {
            const previousGravity = player.gravity === 0 ? 1 : player.gravity;
            const nextGravity = -previousGravity;
            const desiredVelocity = GREEN_ORB_LAUNCH_VELOCITY * Math.sign(nextGravity || 1);
            const blendedVelocity = player.vy + (desiredVelocity - player.vy) * GREEN_ORB_INERTIA_BLEND;
            const launchDirection = Math.sign(desiredVelocity || 1);
            const finalVelocity = Math.sign(blendedVelocity || launchDirection) !== launchDirection ||
                Math.abs(blendedVelocity) < GREEN_ORB_MIN_VELOCITY
                ? GREEN_ORB_MIN_VELOCITY * launchDirection
                : blendedVelocity;
            trackAutoFinishGravityFlip(previousGravity, nextGravity);
            player.gravity = nextGravity;
            launchPlayer(finalVelocity);
        };
        const releasePlayerFromGravityPortalSurface = (nextGravity) => {
            const direction = Math.sign(nextGravity || 1) || 1;
            player.y += GRAVITY_PORTAL_SURFACE_RELEASE_UNITS * direction;
            player.grounded = false;
            lastGroundedAt = -Infinity;
            if (Math.sign(player.vy || direction) !== direction ||
                Math.abs(player.vy) < GRAVITY_PORTAL_MIN_EXIT_SPEED) {
                player.vy = GRAVITY_PORTAL_MIN_EXIT_SPEED * direction;
            }
        };
        const tryImmediateCubeJump = (timestamp = performance.now()) => {
            if (currentStatus !== 'running' || player.mode !== 'cube') {
                return false;
            }
            const jumpVelocity = -DEFAULT_JUMP_VELOCITY * Math.sign(player.gravity || 1);
            const canGroundJump = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS;
            if (!canGroundJump) {
                return false;
            }
            registerJump();
            launchPlayer(jumpVelocity);
            jumpBufferedUntil = 0;
            return true;
        };
        const isBallTouchingSurfaceNow = () => {
            if (player.mode !== 'ball') {
                return false;
            }
            const playerCollisionRect = getPlayerCollisionRect(player);
            const gravityDirection = Math.sign(player.gravity || 1) || 1;
            const playerLeft = playerCollisionRect.x + 0.02;
            const playerRight = playerCollisionRect.x + playerCollisionRect.w - 0.02;
            const playerTop = playerCollisionRect.y;
            const playerBottom = playerCollisionRect.y + playerCollisionRect.h;
            if (gravityDirection > 0 &&
                Math.abs(playerBottom - PERMANENT_STAGE_FLOOR_Y) <= BALL_INSTANT_FLIP_TOUCH_TOLERANCE) {
                return true;
            }
            const nearbyObjects = getRuntimeObjectsInRange(playerCollisionRect.x - 0.6, playerCollisionRect.x + playerCollisionRect.w + 0.6);
            for (const object of nearbyObjects) {
                if (isRuntimeObjectDisabled(object)) {
                    continue;
                }
                if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
                    const surface = getArrowRampSurface(object);
                    if (!surface) {
                        continue;
                    }
                    const supportX = getRampSupportX(player, surface);
                    const surfaceY = getRampSurfaceYAtX(surface, supportX);
                    if (gravityDirection > 0 && surface.solidBelow && Math.abs(playerBottom - surfaceY) <= BALL_INSTANT_FLIP_TOUCH_TOLERANCE) {
                        return true;
                    }
                    if (gravityDirection < 0 && !surface.solidBelow && Math.abs(playerTop - surfaceY) <= BALL_INSTANT_FLIP_TOUCH_TOLERANCE) {
                        return true;
                    }
                    continue;
                }
                const collisionMask = getBlockCollisionMask(object.type);
                if (!collisionMask || !hasBlockSupport(collisionMask) || playerLeft >= object.x + object.w || playerRight <= object.x) {
                    continue;
                }
                if (gravityDirection > 0 && collisionMask.top && Math.abs(playerBottom - object.y) <= BALL_INSTANT_FLIP_TOUCH_TOLERANCE) {
                    return true;
                }
                if (gravityDirection < 0 &&
                    collisionMask.bottom &&
                    Math.abs(playerTop - (object.y + object.h)) <= BALL_INSTANT_FLIP_TOUCH_TOLERANCE) {
                    return true;
                }
            }
            return false;
        };
        const tryImmediateBallFlip = (timestamp = performance.now()) => {
            if (currentStatus !== 'running' || player.mode !== 'ball') {
                return false;
            }
            if (timestamp < ballGravityPortalFlipLockedUntil) {
                return false;
            }
            const canSurfaceFlip = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS || isBallTouchingSurfaceNow();
            if (!canSurfaceFlip) {
                return false;
            }
            const nextGravity = player.gravity === 0 ? -1 : -player.gravity;
            trackAutoFinishGravityFlip(player.gravity, nextGravity);
            player.gravity = nextGravity;
            player.vy = 0;
            player.grounded = false;
            lastGroundedAt = -Infinity;
            return true;
        };
        const ensureAudioPlayback = () => {
            const audio = audioRef.current;
            if (!audio) {
                return;
            }
            audio.volume = readStoredMusicVolume();
            if (audio.paused) {
                if (audio.currentTime < runtimeMusicOffsetMs / 1000) {
                    audio.currentTime = runtimeMusicOffsetMs / 1000;
                }
                void audio.play().catch(() => { });
            }
        };
        const queueJump = (timestamp = performance.now()) => {
            if (currentStatus !== 'running') {
                return;
            }
            if (tryImmediateCubeJump(timestamp)) {
                return;
            }
            jumpBufferedUntil = timestamp + JUMP_BUFFER_MS;
        };
        const triggerPrimaryAction = (timestamp = performance.now()) => {
            orbBufferedUntil = timestamp + ORB_PRESS_BUFFER_MS;
            if (player.mode === 'cube') {
                queueJump(timestamp);
                return;
            }
            if (player.mode === 'ball') {
                ballFlipQueuedUntilRelease = true;
                if (tryImmediateBallFlip(timestamp)) {
                    ballFlipQueuedUntilRelease = false;
                }
            }
        };
        const keyListener = (event) => {
            if (event.code === 'Escape' && fullscreen && currentStatus === 'running') {
                event.preventDefault();
                if (pauseMenuOpenRef.current) {
                    if (pauseStartedAtRef.current !== null) {
                        pausedDurationMsRef.current += performance.now() - pauseStartedAtRef.current;
                        pauseStartedAtRef.current = null;
                    }
                    pauseMenuOpenRef.current = false;
                    pauseSettingsOpenRef.current = false;
                    setIsPauseMenuOpen(false);
                    setIsPauseSettingsOpen(false);
                    return;
                }
                pauseMenuOpenRef.current = true;
                pauseStartedAtRef.current = performance.now();
                audioRef.current?.pause();
                setIsPauseMenuOpen(true);
                return;
            }
            if (pauseMenuOpenRef.current) {
                event.preventDefault();
                return;
            }
            if (GAMEPLAY_INPUT_CODES.has(event.code)) {
                event.preventDefault();
                keyboardInputHeldRef.current = true;
                syncInputHeldState();
                ensureAudioPlayback();
                if (!event.repeat) {
                    triggerPrimaryAction();
                }
            }
            if (event.code === 'KeyR' && !isExternallyManagedRun) {
                event.preventDefault();
                resetRun();
            }
            if ((event.code === 'Enter' || event.code === 'NumpadEnter') &&
                currentStatus !== 'running' &&
                !isExternallyManagedRun) {
                event.preventDefault();
                resetRun();
            }
        };
        const keyUpListener = (event) => {
            if (GAMEPLAY_INPUT_CODES.has(event.code)) {
                keyboardInputHeldRef.current = false;
                syncInputHeldState();
            }
        };
        const pointerDownListener = (event) => {
            if (pauseMenuOpenRef.current) {
                return;
            }
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }
            activePointerIdsRef.current.add(event.pointerId);
            syncInputHeldState();
            ensureAudioPlayback();
            if (currentStatus === 'running') {
                if (activePointerIdsRef.current.size === 1) {
                    triggerPrimaryAction();
                }
                return;
            }
            if (!isExternallyManagedRun) {
                resetRun();
            }
        };
        const releaseHeldInput = (event) => {
            if (event && activePointerIdsRef.current.has(event.pointerId)) {
                activePointerIdsRef.current.delete(event.pointerId);
            }
            else if (!event) {
                activePointerIdsRef.current.clear();
            }
            syncInputHeldState();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                releaseAllHeldInput();
            }
        };
        const handleTouchRelease = () => {
            activePointerIdsRef.current.clear();
            syncInputHeldState();
        };
        const handleWindowBlur = () => {
            releaseAllHeldInput();
        };
        window.addEventListener('keydown', keyListener);
        window.addEventListener('keyup', keyUpListener);
        window.addEventListener('pointerup', releaseHeldInput);
        window.addEventListener('pointercancel', releaseHeldInput);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('pagehide', releaseAllHeldInput);
        window.addEventListener('touchend', handleTouchRelease, { passive: true });
        window.addEventListener('touchcancel', handleTouchRelease, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        canvas.addEventListener('pointerdown', pointerDownListener);
        const markFailed = (elapsedMs) => {
            if (currentStatus !== 'running') {
                return;
            }
            currentStatus = 'failed';
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = runtimeMusicOffsetMs / 1000;
            }
            bumpCamera(12, 0.24);
            const progressPercent = clampProgress((player.x / levelBounds.maxX) * 100);
            setHud({
                progressPercent,
                status: 'failed',
                elapsedMs,
            });
            onFailRef.current?.({
                progressPercent,
                completionTimeMs: elapsedMs,
                deathX: player.x + player.w / 2,
                deathY: player.y + player.h / 2,
                jumpCount,
                pathPoints: pathLine.map((point) => ({ ...point })),
            });
            if (autoRestartOnFail) {
                restartTimeout = window.setTimeout(() => {
                    resetRun();
                }, AUTO_RESTART_DELAY_MS);
            }
        };
        const markCompleted = (elapsedMs) => {
            if (currentStatus !== 'running') {
                return;
            }
            currentStatus = 'completed';
            bumpCamera(6, 0.18);
            setHud({
                progressPercent: 100,
                status: 'completed',
                elapsedMs,
            });
            onCompleteRef.current?.({
                progressPercent: 100,
                completionTimeMs: elapsedMs,
                jumpCount,
                pathPoints: pathLine.map((point) => ({ ...point })),
            });
        };
        const beginFinishSequence = (elapsedMs, sourceCenterY) => {
            if (currentStatus !== 'running' || finishSequence) {
                return;
            }
            const playerCenterX = player.x + player.w / 2;
            const playerCenterY = player.y + player.h / 2;
            const distanceToGateway = Math.max(0, finishGatewayX - playerCenterX);
            const portalCenterY = clamp(sourceCenterY ?? playerCenterY, player.h * 0.6, PERMANENT_STAGE_FLOOR_Y - player.h * 0.5);
            const sequenceDurationMs = clamp(distanceToGateway * FINISH_SEQUENCE_DISTANCE_DURATION_FACTOR_MS, FINISH_SEQUENCE_DURATION_MS, FINISH_SEQUENCE_MAX_DURATION_MS);
            const arcHeight = clamp(0.2 + distanceToGateway * 0.02, 0.2, 0.58);
            const desiredPortalScreenX = width * FINISH_GATEWAY_SCREEN_ANCHOR_RATIO;
            const cameraAnchorX = Math.max(0, finishGatewayX * cell - desiredPortalScreenX);
            finishSequence = {
                startedAt: elapsedMs,
                durationMs: sequenceDurationMs,
                cameraAnchorX,
                startCenterX: playerCenterX,
                startCenterY: playerCenterY,
                targetCenterX: finishGatewayX,
                targetCenterY: portalCenterY,
                startRotation: player.rotation,
                targetRotation: player.rotation + Math.PI * 1.2 * Math.sign(player.gravity || 1),
                arcHeight,
            };
            player.vy = 0;
            player.grounded = false;
            releaseAllHeldInput();
            bumpCamera(8, 0.16);
        };
        const loop = (timestamp) => {
            if (!lastTimestamp) {
                lastTimestamp = timestamp;
            }
            const deltaSeconds = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
            lastTimestamp = timestamp;
            const pausedElapsedMs = pausedDurationMsRef.current +
                (pauseMenuOpenRef.current && pauseStartedAtRef.current !== null ? timestamp - pauseStartedAtRef.current : 0);
            const elapsedMs = Math.max(1, Math.floor(timestamp - startTime - pausedElapsedMs));
            currentElapsedMs = elapsedMs;
            const isPaused = pauseMenuOpenRef.current && currentStatus === 'running';
            if (currentStatus === 'running' && !isPaused && !finishSequence) {
                if (player.mode === 'cube' && inputHeldRef.current) {
                    jumpBufferedUntil = Math.max(jumpBufferedUntil, timestamp + JUMP_BUFFER_MS);
                }
                let movedRuntimeObjects = false;
                for (const [objectId, animation] of moveAnimations) {
                    const runtimeObject = getRuntimeObject(objectId);
                    if (!runtimeObject) {
                        moveAnimations.delete(objectId);
                        continue;
                    }
                    const durationMs = Math.max(1, animation.durationMs);
                    const progress = clamp((elapsedMs - animation.startedAt) / durationMs, 0, 1);
                    const easedProgress = applyMoveTriggerEasing(progress, animation.easing);
                    runtimeObject.x = animation.startX + (animation.targetX - animation.startX) * easedProgress;
                    runtimeObject.y = animation.startY + (animation.targetY - animation.startY) * easedProgress;
                    movedRuntimeObjects = true;
                    if (progress >= 1) {
                        moveAnimations.delete(objectId);
                    }
                }
                if (movedRuntimeObjects) {
                    rebuildRuntimeObjectBuckets();
                }
                for (const [objectId, pulse] of pulseOverrides) {
                    if (elapsedMs >= pulse.until) {
                        pulseOverrides.delete(objectId);
                    }
                }
                for (let index = activePostFxEffects.length - 1; index >= 0; index -= 1) {
                    const effect = activePostFxEffects[index];
                    if (elapsedMs >= effect.startedAt + effect.durationMs) {
                        activePostFxEffects.splice(index, 1);
                    }
                }
                const horizontalSpeed = BASE_HORIZONTAL_SPEED * player.speedMultiplier;
                const previousX = player.x;
                const previousY = player.y;
                const gravityDirection = Math.sign(player.gravity || 1);
                const previousCollisionRect = getPlayerCollisionRect(player, 'contact', { x: previousX, y: previousY });
                const previousSolidCollisionRect = getPlayerCollisionRect(player, 'solid', { x: previousX, y: previousY });
                player.x += horizontalSpeed * deltaSeconds;
                if (player.mode === 'ship') {
                    const shipAcceleration = inputHeldRef.current ? -SHIP_THRUST_ACCELERATION : SHIP_FALL_ACCELERATION;
                    player.vy += shipAcceleration * gravityDirection * deltaSeconds;
                    player.vy = clamp(player.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
                }
                else if (player.mode === 'arrow') {
                    player.vy =
                        horizontalSpeed * ARROW_VERTICAL_SPEED_FACTOR * (inputHeldRef.current ? -1 : 1) * gravityDirection;
                }
                else {
                    player.vy += BASE_GRAVITY_ACCELERATION * player.gravity * deltaSeconds;
                }
                player.y += player.vy * deltaSeconds;
                player.grounded = false;
                let currentCollisionRect = getPlayerCollisionRect(player, 'contact');
                let currentSolidCollisionRect = getPlayerCollisionRect(player, 'solid');
                const syncCurrentCollisionRects = () => {
                    currentCollisionRect = getPlayerCollisionRect(player, 'contact');
                    currentSolidCollisionRect = getPlayerCollisionRect(player, 'solid');
                };
                if (player.mode === 'ship' || player.mode === 'arrow') {
                    const flightMinY = SHIP_FLIGHT_CEILING_Y + SHIP_VISUAL_BOUND_PADDING;
                    const flightMaxY = SHIP_FLIGHT_FLOOR_Y - currentCollisionRect.h - SHIP_VISUAL_BOUND_PADDING;
                    if (currentCollisionRect.y < flightMinY) {
                        setPlayerCollisionTop(player, flightMinY);
                        player.vy = Math.max(0, player.vy);
                        syncCurrentCollisionRects();
                    }
                    if (currentCollisionRect.y > flightMaxY) {
                        setPlayerCollisionTop(player, flightMaxY);
                        player.vy = Math.min(0, player.vy);
                        syncCurrentCollisionRects();
                    }
                }
                const collisionRangeMinX = Math.min(previousCollisionRect.x, currentCollisionRect.x) - 3;
                const collisionRangeMaxX = Math.max(previousCollisionRect.x + previousCollisionRect.w, currentCollisionRect.x + currentCollisionRect.w) + (isLowPowerDevice ? 6 : 8);
                const interactionRangeMinX = Math.min(previousCollisionRect.x, currentCollisionRect.x) - 2;
                const interactionRangeMaxX = Math.max(previousCollisionRect.x + previousCollisionRect.w, currentCollisionRect.x + currentCollisionRect.w) + (isLowPowerDevice ? 8 : 10);
                const collisionRangeMinY = Math.min(previousCollisionRect.y, currentCollisionRect.y) - 2.5;
                const collisionRangeMaxY = Math.max(previousCollisionRect.y + previousCollisionRect.h, currentCollisionRect.y + currentCollisionRect.h) + 2.5;
                const interactionRangeMinY = collisionRangeMinY - 0.75;
                const interactionRangeMaxY = collisionRangeMaxY + 0.75;
                if (currentStatus === 'running' && player.mode !== 'ship') {
                    const previousBottom = previousCollisionRect.y + previousCollisionRect.h;
                    const nextBottom = currentCollisionRect.y + currentCollisionRect.h;
                    if (previousBottom <= PERMANENT_STAGE_FLOOR_Y && nextBottom >= PERMANENT_STAGE_FLOOR_Y) {
                        if (player.gravity > 0 && player.vy >= 0) {
                            setPlayerCollisionBottom(player, PERMANENT_STAGE_FLOOR_Y);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            if (player.mode !== 'arrow') {
                                player.grounded = true;
                                lastGroundedAt = timestamp;
                            }
                        }
                        else {
                            markFailed(elapsedMs);
                        }
                    }
                }
                const collisionObjects = currentStatus === 'running'
                    ? getRuntimeObjectsInViewport(collisionRangeMinX, collisionRangeMaxX, collisionRangeMinY, collisionRangeMaxY)
                    : [];
                const collisionRamps = collisionObjects.filter((object) => object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC');
                const interactionObjects = currentStatus === 'running'
                    ? getRuntimeInteractionObjects(interactionRangeMinX, interactionRangeMaxX, interactionRangeMinY, interactionRangeMaxY)
                    : [];
                for (const object of collisionObjects) {
                    if (isRuntimeObjectDisabled(object)) {
                        continue;
                    }
                    if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
                        if (!aabbIntersects(currentCollisionRect.x, currentCollisionRect.y, currentCollisionRect.w, currentCollisionRect.h, object.x, object.y, object.w, object.h)) {
                            continue;
                        }
                        if (player.mode === 'arrow') {
                            if (arrowRampIntersects(player, object)) {
                                markFailed(elapsedMs);
                                break;
                            }
                            continue;
                        }
                        if (resolveRampCollision(player, object, previousX, previousY, deltaSeconds, player.mode !== 'ship', collisionRamps, horizontalSpeed) ||
                            snapToRampSurface(player, object, player.mode !== 'ship', collisionRamps, horizontalSpeed)) {
                            if (player.grounded) {
                                lastGroundedAt = timestamp;
                            }
                            continue;
                        }
                        continue;
                    }
                    const blockCollisionMask = getBlockCollisionMask(object.type);
                    if (!hasBlockSupport(blockCollisionMask) ||
                        !aabbIntersects(currentCollisionRect.x, currentCollisionRect.y, currentCollisionRect.w, currentCollisionRect.h, object.x, object.y, object.w, object.h)) {
                        continue;
                    }
                    const blockCrossings = getBlockDirectionalCrossings(previousCollisionRect, currentCollisionRect, previousSolidCollisionRect, currentSolidCollisionRect, object);
                    let resolvedSafely = false;
                    if (player.mode === 'arrow') {
                        const isDashProtected = isArrowProtectedByDashBlock(object, collisionRangeMinX, collisionRangeMaxX);
                        const isGroundSafeObject = isGroundFamilyBlockType(object.type);
                        if (isGroundSafeObject && player.gravity > 0 && blockCrossings.top) {
                            setPlayerCollisionBottom(player, object.y);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                        if (isGroundSafeObject && !resolvedSafely && player.gravity < 0 && blockCrossings.bottom) {
                            setPlayerCollisionTop(player, object.y + object.h);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                        if (isDashProtected && !resolvedSafely && blockCrossings.top) {
                            setPlayerCollisionBottom(player, object.y);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                        if (isDashProtected && !resolvedSafely && blockCrossings.bottom) {
                            setPlayerCollisionTop(player, object.y + object.h);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                        if (resolvedSafely) {
                            continue;
                        }
                        if (blockCrossings.top || blockCrossings.bottom || blockCrossings.left || blockCrossings.right) {
                            markFailed(elapsedMs);
                            break;
                        }
                        continue;
                    }
                    if (player.mode === 'ship') {
                        if (blockCrossings.top) {
                            setPlayerCollisionBottom(player, object.y);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                        if (!resolvedSafely && blockCrossings.bottom) {
                            setPlayerCollisionTop(player, object.y + object.h);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            resolvedSafely = true;
                        }
                    }
                    if (!resolvedSafely && player.gravity > 0) {
                        if (blockCrossings.top) {
                            setPlayerCollisionBottom(player, object.y);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            player.grounded = true;
                            lastGroundedAt = timestamp;
                            resolvedSafely = true;
                        }
                    }
                    else if (!resolvedSafely) {
                        if (blockCrossings.bottom) {
                            setPlayerCollisionTop(player, object.y + object.h);
                            player.vy = 0;
                            syncCurrentCollisionRects();
                            player.grounded = true;
                            lastGroundedAt = timestamp;
                            resolvedSafely = true;
                        }
                    }
                    if (!resolvedSafely && (blockCrossings.top || blockCrossings.bottom || blockCrossings.left || blockCrossings.right)) {
                        markFailed(elapsedMs);
                        break;
                    }
                }
                if (player.mode === 'cube' && currentStatus === 'running' && jumpBufferedUntil >= timestamp) {
                    const jumpVelocity = -DEFAULT_JUMP_VELOCITY * Math.sign(player.gravity || 1);
                    const canGroundJump = player.grounded || timestamp - lastGroundedAt <= COYOTE_TIME_MS;
                    if (canGroundJump) {
                        launchPlayer(jumpVelocity);
                        registerJump();
                        jumpBufferedUntil = 0;
                    }
                    else if (orbBufferedUntil < timestamp) {
                        jumpBufferedUntil = 0;
                    }
                }
                if (player.mode === 'ball' && currentStatus === 'running' && ballFlipQueuedUntilRelease && inputHeldRef.current) {
                    if (tryImmediateBallFlip(timestamp)) {
                        ballFlipQueuedUntilRelease = false;
                    }
                }
                if ((player.mode === 'cube' || player.mode === 'ball') && currentStatus === 'running' && orbBufferedUntil >= timestamp) {
                    let orb = null;
                    for (const object of interactionObjects) {
                        const canUseOrb = player.mode === 'ball'
                            ? object.type === 'BLUE_ORB' || object.type === 'GRAVITY_ORB'
                            : object.type === 'JUMP_ORB' || object.type === 'BLUE_ORB' || object.type === 'GRAVITY_ORB';
                        if (!canUseOrb || isRuntimeObjectDisabled(object) || usedOrbs.has(object.id)) {
                            continue;
                        }
                        if (jumpOrbIntersectsPlayer(player, object)) {
                            orb = object;
                            break;
                        }
                    }
                    if (orb) {
                        usedOrbs.add(orb.id);
                        registerJump();
                        if (orb.type === 'BLUE_ORB') {
                            applyBlueOrbGravityFlip();
                        }
                        else if (orb.type === 'GRAVITY_ORB') {
                            applyGreenOrbLaunch();
                        }
                        else {
                            launchPlayer(-DEFAULT_JUMP_ORB_VELOCITY * Math.sign(player.gravity || 1));
                        }
                        jumpBufferedUntil = 0;
                        orbBufferedUntil = 0;
                    }
                }
                for (const object of interactionObjects) {
                    if (currentStatus !== 'running') {
                        break;
                    }
                    if (isRuntimeObjectDisabled(object)) {
                        continue;
                    }
                    if (object.type === 'DASH_BLOCK') {
                        continue;
                    }
                    if ((isSpikeObjectType(object.type) || isSawObjectType(object.type)) && hazardIntersects(player, object)) {
                        markFailed(elapsedMs);
                        break;
                    }
                    const triggerTouched = isTriggerObjectType(object.type)
                        ? triggerIntersectsPlayer(player, object, levelBounds.maxY)
                        : aabbIntersects(currentCollisionRect.x, currentCollisionRect.y, currentCollisionRect.w, currentCollisionRect.h, object.x, object.y, object.w, object.h);
                    if (!activeTriggers.has(object.id) && triggerTouched) {
                        activeTriggers.add(object.id);
                        if (object.type === 'JUMP_PAD' && (player.mode === 'cube' || player.mode === 'ball')) {
                            const boost = Number(object.props.boost ?? 24);
                            registerJump();
                            launchPlayer(-boost * Math.sign(player.gravity || 1));
                            bumpCamera(5, 0.14);
                        }
                        if (object.type === 'GRAVITY_FLIP_PORTAL' ||
                            object.type === 'GRAVITY_RETURN_PORTAL' ||
                            object.type === 'GRAVITY_PORTAL') {
                            const previousGravity = player.gravity === 0 ? 1 : player.gravity;
                            const nextGravity = object.type === 'GRAVITY_FLIP_PORTAL'
                                ? -player.gravity
                                : object.type === 'GRAVITY_RETURN_PORTAL'
                                    ? 1
                                    : Number(object.props.gravity ?? -player.gravity) || -player.gravity;
                            trackAutoFinishGravityFlip(previousGravity, nextGravity);
                            player.gravity = nextGravity;
                            player.grounded = false;
                            if (player.mode === 'cube' || player.mode === 'ball') {
                                releasePlayerFromGravityPortalSurface(nextGravity);
                                syncCurrentCollisionRects();
                            }
                            if (player.mode === 'ball') {
                                ballGravityPortalFlipLockedUntil = timestamp + BALL_GRAVITY_PORTAL_FLIP_LOCKOUT_MS;
                                ballFlipQueuedUntilRelease = false;
                            }
                        }
                        if (object.type === 'SPEED_PORTAL') {
                            player.speedMultiplier = Number(object.props.multiplier ?? 1.4);
                        }
                        if (object.type === 'SHIP_PORTAL') {
                            player.mode = 'ship';
                            player.grounded = false;
                            const shipLayout = getPlayerHitboxLayout('ship');
                            player.y = clamp(player.y, SHIP_FLIGHT_CEILING_Y + SHIP_VISUAL_BOUND_PADDING - shipLayout.offsetY, SHIP_FLIGHT_FLOOR_Y - shipLayout.height - SHIP_VISUAL_BOUND_PADDING - shipLayout.offsetY);
                            player.vy = clamp(player.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
                            syncCurrentCollisionRects();
                        }
                        if (object.type === 'BALL_PORTAL') {
                            player.mode = 'ball';
                            player.grounded = false;
                            syncCurrentCollisionRects();
                        }
                        if (object.type === 'CUBE_PORTAL') {
                            player.mode = 'cube';
                            player.grounded = false;
                            player.rotation = snapCubeRotation(player.rotation);
                            syncCurrentCollisionRects();
                        }
                        if (object.type === 'ARROW_PORTAL') {
                            player.mode = 'arrow';
                            player.grounded = false;
                            player.vy =
                                horizontalSpeed * ARROW_VERTICAL_SPEED_FACTOR * (inputHeldRef.current ? -1 : 1) * gravityDirection;
                            player.rotation = Math.atan2(player.vy, horizontalSpeed);
                            syncCurrentCollisionRects();
                        }
                        if (object.type === 'FINISH_PORTAL') {
                            beginFinishSequence(elapsedMs, object.y + object.h / 2);
                        }
                        if (object.type === 'MOVE_TRIGGER' ||
                            object.type === 'ALPHA_TRIGGER' ||
                            object.type === 'TOGGLE_TRIGGER' ||
                            object.type === 'PULSE_TRIGGER') {
                            const targetGroupId = Number(object.props.groupId ?? object.props.paintGroupId ?? 0);
                            if (targetGroupId > 0) {
                                const targetObjects = getObjectsInPaintGroup(targetGroupId).filter((entry) => entry.id !== object.id);
                                if (object.type === 'MOVE_TRIGGER') {
                                    const moveX = Number(object.props.moveX ?? 2);
                                    const moveY = Number(object.props.moveY ?? 0);
                                    const durationMs = Math.max(1, Number(object.props.durationMs ?? 650));
                                    const easing = getMoveTriggerEasing(object.props.easing);
                                    for (const target of targetObjects) {
                                        moveAnimations.set(target.id, {
                                            startX: target.x,
                                            startY: target.y,
                                            targetX: target.x + moveX,
                                            targetY: target.y - moveY,
                                            startedAt: elapsedMs,
                                            durationMs,
                                            easing,
                                        });
                                    }
                                }
                                if (object.type === 'ALPHA_TRIGGER') {
                                    const alpha = clamp(Number(object.props.alpha ?? 0.35), 0, 1);
                                    for (const target of targetObjects) {
                                        alphaOverrides.set(target.id, alpha);
                                    }
                                }
                                if (object.type === 'TOGGLE_TRIGGER') {
                                    const enabled = Boolean(object.props.enabled ?? false);
                                    for (const target of targetObjects) {
                                        if (enabled) {
                                            disabledObjectIds.delete(target.id);
                                        }
                                        else {
                                            disabledObjectIds.add(target.id);
                                        }
                                    }
                                }
                                if (object.type === 'PULSE_TRIGGER') {
                                    const durationMs = Math.max(1, Number(object.props.durationMs ?? 900));
                                    const fillColor = typeof object.props.fillColor === 'string' && object.props.fillColor.trim().length > 0
                                        ? object.props.fillColor
                                        : undefined;
                                    const strokeColor = typeof object.props.strokeColor === 'string' && object.props.strokeColor.trim().length > 0
                                        ? object.props.strokeColor
                                        : undefined;
                                    for (const target of targetObjects) {
                                        pulseOverrides.set(target.id, {
                                            fillColor,
                                            strokeColor,
                                            until: elapsedMs + durationMs,
                                        });
                                    }
                                }
                            }
                        }
                        if (object.type === 'POST_FX_TRIGGER') {
                            activePostFxEffects.push({
                                id: object.id,
                                effectType: getPostFxEffectType(object.props.effectType),
                                activationMode: getTriggerActivationMode(object.props.activationMode),
                                startedAt: elapsedMs,
                                durationMs: Math.max(1, Number(object.props.durationMs ?? 900)),
                                intensity: clamp(Number(object.props.intensity ?? 0.75), 0, 1.5),
                                primaryColor: getRuntimeFxColor(object.props.primaryColor, '#ffffff'),
                                secondaryColor: getRuntimeFxColor(object.props.secondaryColor, '#7c3aed'),
                                blurAmount: clamp(Number(object.props.blurAmount ?? 8), 0, 24),
                                scanlineDensity: clamp(Number(object.props.scanlineDensity ?? 0.45), 0.1, 1),
                                shakePower: clamp(Number(object.props.shakePower ?? 0.85), 0, 2),
                            });
                        }
                    }
                }
                if (player.grounded) {
                    airborneStartedAtMs = null;
                }
                else if (airborneStartedAtMs === null) {
                    airborneStartedAtMs = elapsedMs;
                }
                const invertedAirborneDurationMs = airborneStartedAtMs !== null && invertedGravityFlippedAtMs !== null
                    ? elapsedMs - Math.max(airborneStartedAtMs, invertedGravityFlippedAtMs)
                    : 0;
                const canAutoFinishFromInvertedFlight = player.mode !== 'ship' &&
                    player.gravity < 0 &&
                    airborneStartedAtMs !== null &&
                    invertedGravityFlippedAtMs !== null &&
                    invertedAirborneDurationMs >= AUTO_FINISH_INVERTED_AIRBORNE_DELAY_MS;
                const remainingToAutoFinish = autoFinishX - (currentCollisionRect.x + currentCollisionRect.w);
                if (currentStatus === 'running' &&
                    canAutoFinishFromInvertedFlight &&
                    remainingToAutoFinish <= EARLY_FINISH_PULL_DISTANCE_UNITS) {
                    beginFinishSequence(elapsedMs);
                }
                if (currentStatus === 'running' && currentCollisionRect.x + currentCollisionRect.w >= autoFinishX) {
                    beginFinishSequence(elapsedMs);
                }
                if (currentStatus === 'running') {
                    if (player.mode === 'ship') {
                        if (currentCollisionRect.x > levelBounds.maxX + 8) {
                            markFailed(elapsedMs);
                        }
                    }
                    else if (player.y > levelBounds.maxY + 3 || player.y < -3 || player.x > levelBounds.maxX + 8) {
                        markFailed(elapsedMs);
                    }
                }
                if (player.mode === 'ship') {
                    const targetRotation = clamp(player.vy * 0.07, -0.58, 0.58);
                    player.rotation += (targetRotation - player.rotation) * Math.min(1, deltaSeconds * 10);
                }
                else if (player.mode === 'arrow') {
                    player.rotation = Math.atan2(player.vy, horizontalSpeed);
                }
                else if (player.mode === 'ball') {
                    const radius = Math.max(0.001, player.w / 2);
                    player.rotation = normalizeAngle(player.rotation + (horizontalSpeed / radius) * deltaSeconds * Math.sign(player.gravity || 1));
                }
                else if (player.grounded) {
                    player.rotation = snapCubeRotation(player.rotation);
                }
                else {
                    player.rotation = normalizeAngle(player.rotation + AIR_ROTATION_SPEED * deltaSeconds * Math.sign(player.gravity || 1));
                }
                const playerCenterX = player.x + player.w / 2;
                const playerCenterY = player.y + player.h / 2;
                if (showRunPath) {
                    const maxPathPoints = isMobilePreviewPerformanceMode
                        ? MOBILE_PREVIEW_MAX_PATH_POINTS
                        : isLowPowerDevice
                            ? LOW_POWER_MAX_PATH_POINTS
                            : DESKTOP_MAX_PATH_POINTS;
                    const lastPathPoint = pathLine[pathLine.length - 1];
                    if (!lastPathPoint) {
                        pathLine.push({
                            x: playerCenterX,
                            y: playerCenterY,
                        });
                    }
                    else {
                        const deltaX = playerCenterX - lastPathPoint.x;
                        const deltaY = playerCenterY - lastPathPoint.y;
                        const minSegmentDistance = player.mode === 'arrow' ? 0.01 : 0.008;
                        const rewoundToEarlierPosition = !Number.isFinite(lastPathPoint.x) || deltaX < -Math.max(0.6, player.w * 1.35);
                        if (rewoundToEarlierPosition) {
                            pathLine.push({
                                x: Number.NaN,
                                y: Number.NaN,
                            });
                            pathLine.push({
                                x: playerCenterX,
                                y: playerCenterY,
                            });
                        }
                        else if (deltaX * deltaX + deltaY * deltaY >= minSegmentDistance * minSegmentDistance) {
                            pathLine.push({
                                x: playerCenterX,
                                y: playerCenterY,
                            });
                        }
                    }
                    if (pathLine.length > maxPathPoints) {
                        pathLine.splice(0, pathLine.length - maxPathPoints);
                    }
                }
                const previousRight = previousCollisionRect.x + previousCollisionRect.w;
                const nextRight = currentCollisionRect.x + currentCollisionRect.w;
                if (previousRight <= levelBounds.maxX && nextRight > levelBounds.maxX + 4) {
                    markFailed(elapsedMs);
                }
            }
            else if (currentStatus === 'running' && finishSequence && !isPaused) {
                const finishElapsedMs = Math.max(0, elapsedMs - finishSequence.startedAt);
                const finishProgress = clamp(finishElapsedMs / finishSequence.durationMs, 0, 1);
                const pullProgress = -(Math.cos(Math.PI * finishProgress) - 1) / 2;
                const arcLift = Math.sin(finishProgress * Math.PI) * finishSequence.arcHeight;
                const centerX = finishSequence.startCenterX +
                    (finishSequence.targetCenterX - finishSequence.startCenterX) * pullProgress;
                const centerY = finishSequence.startCenterY +
                    (finishSequence.targetCenterY - finishSequence.startCenterY) * pullProgress -
                    arcLift;
                player.x = centerX - player.w / 2;
                player.y = centerY - player.h / 2;
                player.vy = 0;
                player.grounded = false;
                player.rotation =
                    finishSequence.startRotation +
                        (finishSequence.targetRotation - finishSequence.startRotation) * pullProgress +
                        finishProgress * Math.PI * 0.28;
                if (showRunPath) {
                    const lastPathPoint = pathLine[pathLine.length - 1];
                    if (!lastPathPoint || !Number.isFinite(lastPathPoint.x)) {
                        pathLine.push({ x: centerX, y: centerY });
                    }
                    else {
                        const deltaX = centerX - lastPathPoint.x;
                        const deltaY = centerY - lastPathPoint.y;
                        if (deltaX * deltaX + deltaY * deltaY >= 0.008 * 0.008) {
                            pathLine.push({ x: centerX, y: centerY });
                        }
                    }
                }
                if (finishProgress >= 1) {
                    playerConsumedByFinishGateway = true;
                    finishSequence = null;
                    markCompleted(elapsedMs);
                }
            }
            if (finishSequence) {
                cameraX = finishSequence.cameraAnchorX;
            }
            else {
                const targetCameraX = Math.max(0, player.x * cell - width * 0.28);
                cameraX += (targetCameraX - cameraX) * Math.min(1, deltaSeconds * 8);
            }
            shakeTime = Math.max(0, shakeTime - deltaSeconds);
            const runtimePostFxState = getRuntimePostFxState(activePostFxEffects, elapsedMs);
            const combinedShakePower = shakeTime > 0 || runtimePostFxState.shakePower > 0 ? shakePower + runtimePostFxState.shakePower : 0;
            const shakeOffsetX = combinedShakePower > 0 ? (Math.random() - 0.5) * combinedShakePower : 0;
            const shakeOffsetY = combinedShakePower > 0 ? (Math.random() - 0.5) * combinedShakePower * 0.7 : 0;
            const progressPercent = clampProgress((player.x / levelBounds.maxX) * 100);
            const finishGatewayProgress = finishSequence
                ? clamp((elapsedMs - finishSequence.startedAt) / finishSequence.durationMs, 0, 1)
                : currentStatus === 'completed'
                    ? 1
                    : 0;
            const hudCommitIntervalMs = isLowPowerDevice ? 120 : 80;
            if (timestamp - lastHudCommit > hudCommitIntervalMs) {
                setHud({
                    progressPercent,
                    status: currentStatus,
                    elapsedMs,
                });
                lastHudCommit = timestamp;
            }
            context.clearRect(0, 0, width, height);
            drawBackdrop(context, width, height, elapsedMs, levelData.meta.theme, isLowPowerDevice, isMobilePreviewPerformanceMode);
            applyRuntimePostFx(stageElement, canvas, postFxOverlayRef.current, runtimePostFxState);
            context.save();
            context.translate(-(cameraX + shakeOffsetX), shakeOffsetY);
            drawGrid(context, cameraX + shakeOffsetX, verticalOffset, width, height, cell);
            if (player.mode === 'ship') {
                drawShipBounds(context, cameraX + shakeOffsetX, verticalOffset, width, cell);
            }
            drawPermanentStageFloor(context, cameraX + shakeOffsetX, verticalOffset, width, height, cell, getStageGroundPalette(levelData.meta.theme, levelData.meta.groundColor));
            drawFinishGateway(context, finishGatewayX, verticalOffset, height, cell, elapsedMs, finishGatewayProgress);
            const drawRangeMinX = (cameraX + shakeOffsetX) / cell - 3;
            const drawRangeMaxX = drawRangeMinX + width / cell + 6;
            const drawRangeMinY = -verticalOffset / cell - 2;
            const drawRangeMaxY = (height - verticalOffset) / cell + 2;
            const drawObjectsInRange = getRuntimeObjectsInViewport(drawRangeMinX, drawRangeMaxX, drawRangeMinY, drawRangeMaxY).sort(compareRuntimeRenderOrder);
            const hitboxObjects = showHitboxesRef.current
                ? drawObjectsInRange.filter((object) => !isRuntimeObjectDisabled(object) && objectIntersectsHorizontalRange(object, drawRangeMinX, drawRangeMaxX))
                : null;
            for (const object of drawObjectsInRange) {
                if (isRuntimeObjectDisabled(object) || !objectIntersectsHorizontalRange(object, drawRangeMinX, drawRangeMaxX)) {
                    continue;
                }
                const runtimeVisuals = getRuntimeVisuals(object);
                if (runtimeVisuals.alpha <= 0.02) {
                    continue;
                }
                const animatedObject = isSawObjectType(object.type)
                    ? {
                        ...object,
                        rotation: (object.rotation ?? 0) + (Number(object.props.rotationSpeed ?? 240) * elapsedMs) / 1000,
                    }
                    : object;
                drawObject(context, animatedObject, drawObjectsInRange, cell, verticalOffset, elapsedMs, levelData.meta.colorGroups, activeTriggers.has(object.id), usedOrbs.has(object.id), runtimeVisuals, {
                    showTriggersInPlayMode: showTriggersInPlayModeRef.current,
                    triggerGuideTop: -shakeOffsetY,
                    triggerGuideBottom: height - shakeOffsetY,
                });
            }
            drawPlayer(context, player, cell, verticalOffset, {
                alpha: playerConsumedByFinishGateway ? 0 : finishSequence ? 1 - finishGatewayProgress * 0.82 : 1,
                scale: playerConsumedByFinishGateway ? 0.66 : finishSequence ? 1 - finishGatewayProgress * 0.34 : 1,
            }, playerSkinOverrides?.[player.mode] ?? playerSkinMap?.[player.mode] ?? null);
            if (hitboxObjects) {
                drawRuntimeHitboxes(context, hitboxObjects, player, cell, verticalOffset, levelBounds.maxY);
            }
            context.restore();
            const shouldDrawStatusOverlay = currentStatus === 'failed' || (currentStatus === 'completed' && !suppressCompletionOverlay);
            if (shouldDrawStatusOverlay) {
                context.fillStyle = 'rgba(3, 8, 20, 0.68)';
                context.fillRect(0, 0, width, height);
                context.fillStyle = '#ffffff';
                context.textAlign = 'center';
                context.font = '700 38px Segoe UI';
                context.fillText(currentStatus === 'completed' ? 'Level Complete' : 'Attempt Lost', width / 2, height / 2 - 10);
                context.font = '600 16px Segoe UI';
                context.fillStyle = 'rgba(255,255,255,0.82)';
                if (!isExternallyManagedRun) {
                    context.fillText('Click or press R to restart', width / 2, height / 2 + 28);
                }
            }
            animationFrame = window.requestAnimationFrame(loop);
        };
        animationFrame = window.requestAnimationFrame(loop);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', handleRuntimeResize);
            clearRuntimePostFx(stageElement, canvas, postFxOverlayRef.current);
            if (restartTimeout) {
                window.clearTimeout(restartTimeout);
            }
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener('keydown', keyListener);
            window.removeEventListener('keyup', keyUpListener);
            window.removeEventListener('pointerup', releaseHeldInput);
            window.removeEventListener('pointercancel', releaseHeldInput);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('pagehide', releaseAllHeldInput);
            window.removeEventListener('touchend', handleTouchRelease);
            window.removeEventListener('touchcancel', handleTouchRelease);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            canvas.removeEventListener('pointerdown', pointerDownListener);
        };
    }, [autoFinishX, autoRestartOnFail, fullscreen, levelBounds.maxX, levelBounds.maxY, levelData, playerSkinMap, playerSkinOverrides, previewBootstrap, previewStartPosEnabled, runId, runtimeMusicOffsetMs, sanitizedLevelObjects, showRunPath, suppressCompletionOverlay]); // eslint-disable-line react-hooks/exhaustive-deps -- onFail/onComplete are mirrored into refs above so the runtime loop does not rebuild on parent re-renders
    if (fullscreen) {
        return (_jsx("div", { className: cn('arcade-runtime-fullscreen', className), children: _jsxs("div", { ref: stageRef, className: "arcade-runtime-fullscreen-stage", children: [_jsx("canvas", { ref: canvasRef, className: "arcade-runtime-canvas arcade-runtime-canvas--fullscreen" }), _jsx("div", { ref: postFxOverlayRef, className: "arcade-runtime-postfx-overlay", "aria-hidden": "true" }), isMusicLoading ? (_jsx("div", { className: "arcade-runtime-loading-overlay", children: _jsxs("div", { className: "arcade-runtime-loading-panel", children: [_jsx("p", { className: "arcade-runtime-loading-kicker", children: "Soundtrack" }), _jsx("p", { className: "arcade-runtime-loading-title", children: "Loading Music..." }), _jsx("div", { className: "loading-bar", children: _jsx("div", { className: cn('loading-bar-fill', musicLoadProgress === null ? 'loading-bar-fill--indeterminate' : ''), style: musicLoadProgress !== null ? { width: `${musicLoadProgress}%` } : undefined }) }), _jsxs("div", { className: "loading-bar-meta", "aria-live": "polite", children: [_jsx("span", { className: "loading-bar-label", children: "Audio Buffer" }), _jsx("strong", { className: "loading-bar-value", children: musicLoadingValueLabel })] })] }) })) : null, isHudVisible ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "arcade-runtime-hud arcade-runtime-hud--top-left", children: _jsx("span", { className: cn('arcade-runtime-hud-badge', hud.status === 'completed'
                                        ? 'arcade-runtime-hud-badge--complete'
                                        : hud.status === 'failed'
                                            ? 'arcade-runtime-hud-badge--failed'
                                            : 'arcade-runtime-hud-badge--running'), children: statusLabel }) }), _jsxs("div", { className: "arcade-runtime-hud arcade-runtime-hud--top-right", children: [_jsx(HudStat, { label: "Attempt", value: attemptNumber, compact: true }), _jsx(HudStat, { label: "Progress", value: `${hud.progressPercent}%`, compact: true }), _jsx(HudStat, { label: "Time", value: `${(hud.elapsedMs / 1000).toFixed(1)}s`, compact: true })] })] })) : null, isPauseMenuOpen ? (_jsx("div", { className: "arcade-runtime-pause-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Paused game menu", children: _jsxs("div", { className: "arcade-runtime-pause-panel", children: [_jsx("p", { className: "arcade-runtime-pause-kicker", children: "Paused" }), _jsxs("div", { className: "arcade-runtime-pause-actions", children: [_jsx("button", { type: "button", className: "arcade-runtime-pause-action arcade-runtime-pause-action--continue", onClick: closePauseMenu, children: "Continue" }), _jsx("button", { type: "button", className: cn('arcade-runtime-pause-action arcade-runtime-pause-action--settings', isPauseSettingsOpen ? 'is-active' : ''), onClick: togglePauseSettings, "aria-pressed": isPauseSettingsOpen, children: "Settings" }), _jsx("button", { type: "button", className: "arcade-runtime-pause-action arcade-runtime-pause-action--exit", onClick: handleExitToMenu, children: "Exit Menu" })] }), isPauseSettingsOpen ? (_jsxs("div", { className: "arcade-runtime-pause-settings", children: [_jsxs("button", { type: "button", className: "arcade-runtime-pause-toggle", onClick: () => setIsHudVisible((current) => !current), "aria-pressed": isHudVisible, children: [_jsx("span", { children: "HUD" }), _jsx("strong", { children: isHudVisible ? 'On' : 'Off' })] }), _jsxs("button", { type: "button", className: "arcade-runtime-pause-toggle", onClick: () => setIsScreenShakeEnabled((current) => !current), "aria-pressed": isScreenShakeEnabled, children: [_jsx("span", { children: "Shake" }), _jsx("strong", { children: isScreenShakeEnabled ? 'On' : 'Off' })] })] })) : null, _jsx("p", { className: "arcade-runtime-pause-hint", children: "Press Esc to resume instantly." })] }) })) : null] }) }));
    }
    return (_jsxs(Panel, { className: cn('arcade-runtime-frame game-screen space-y-4 bg-transparent', className), children: [_jsxs("div", { className: "arcade-runtime-bar flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.24em] text-[#ffd44a]", children: "Runtime" }), _jsx("span", { className: cn('arcade-button inline-flex items-center px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', hud.status === 'completed'
                                            ? 'bg-[linear-gradient(180deg,#caff52,#69d70d)] text-[#173300]'
                                            : hud.status === 'failed'
                                                ? 'bg-[linear-gradient(180deg,#ff7c8f,#eb375a)] text-white'
                                                : 'bg-[linear-gradient(180deg,#7e2ae6,#5910be)] text-white'), children: statusLabel })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-display text-2xl text-[#caff45]", children: levelData.meta.theme }), _jsxs("p", { className: "text-sm text-white/72", children: [playerModeLabel, " mode / ", getPlayerModeDescription(levelData.player.mode)] })] })] }), _jsxs("div", { className: "flex gap-3 text-sm", children: [_jsx(HudStat, { label: "Attempt", value: attemptNumber }), _jsx(HudStat, { label: "Progress", value: `${hud.progressPercent}%` }), _jsx(HudStat, { label: "Time", value: `${(hud.elapsedMs / 1000).toFixed(1)}s` })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "progress-lane", children: _jsx("div", { className: "progress-lane-fill transition-[width] duration-150", style: { width: `${hud.progressPercent}%` } }) }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-white/70", children: [_jsx("span", { children: "Readable hitboxes" }), _jsx("span", { children: "Jump buffer + coyote time" }), _jsx("span", { children: fullscreen ? 'Esc = pause' : 'R = restart' })] })] }), _jsxs("div", { ref: stageRef, className: "arcade-runtime-stage", children: [_jsx("canvas", { ref: canvasRef, className: "arcade-runtime-canvas" }), _jsx("div", { ref: postFxOverlayRef, className: "arcade-runtime-postfx-overlay", "aria-hidden": "true" }), isMusicLoading ? (_jsx("div", { className: "arcade-runtime-loading-overlay", children: _jsxs("div", { className: "arcade-runtime-loading-panel", children: [_jsx("p", { className: "arcade-runtime-loading-kicker", children: "Soundtrack" }), _jsx("p", { className: "arcade-runtime-loading-title", children: "Loading Music..." }), _jsx("div", { className: "loading-bar", children: _jsx("div", { className: cn('loading-bar-fill', musicLoadProgress === null ? 'loading-bar-fill--indeterminate' : ''), style: musicLoadProgress !== null ? { width: `${musicLoadProgress}%` } : undefined }) }), _jsxs("div", { className: "loading-bar-meta", "aria-live": "polite", children: [_jsx("span", { className: "loading-bar-label", children: "Audio Buffer" }), _jsx("strong", { className: "loading-bar-value", children: musicLoadingValueLabel })] })] }) })) : null] }), _jsxs("p", { className: "arcade-runtime-footer text-xs leading-6 text-white/72", children: ["Controls: ", _jsx("span", { className: "text-white", children: "Space" }), ", click, or tap to", ' ', levelData.player.mode === 'ship'
                        ? 'thrust upward'
                        : levelData.player.mode === 'ball'
                            ? 'flip gravity'
                            : levelData.player.mode === 'arrow'
                                ? 'rise diagonally'
                                : 'jump', ".", !onFail && !onComplete ? (_jsxs(_Fragment, { children: [' ', _jsx("span", { className: "text-white", children: "R" }), " restarts instantly."] })) : null, ' ', levelData.player.mode === 'ship'
                        ? 'Ship runs stay between the top and bottom flight bounds, and any wall contact still punishes sloppy routing.'
                        : levelData.player.mode === 'ball'
                            ? 'Ball runs flip gravity on each press, keep the same punishing side collisions, and reward clean timing between floor and ceiling.'
                            : levelData.player.mode === 'arrow'
                                ? 'Arrow runs trace diagonal lines, and any wall or ramp contact immediately breaks the run.'
                                : 'Jump inputs are buffered briefly, spikes use a fairer hitbox, and side collisions still punish sloppy routing.'] })] }));
}
function HudStat({ label, value, compact = false, }) {
    return (_jsxs("div", { className: cn('hud-pill px-4 py-2', compact ? 'arcade-runtime-hud-pill' : ''), children: [_jsx("p", { className: "font-display text-[10px] uppercase tracking-[0.2em] text-[#ffd44a]", children: label }), _jsx("p", { className: cn('font-display text-white', compact ? 'text-xs' : 'text-sm'), children: value })] }));
}
function getPlayerCollisionRect(player, kind = 'contact', overrides) {
    const nextMode = overrides?.mode ?? player.mode;
    const layout = getPlayerHitboxLayout(nextMode, kind);
    const x = overrides?.x ?? player.x;
    const y = overrides?.y ?? player.y;
    return {
        x: x + layout.offsetX,
        y: y + layout.offsetY,
        w: layout.width,
        h: layout.height,
        offsetX: layout.offsetX,
        offsetY: layout.offsetY,
    };
}
function setPlayerCollisionTop(player, top, kind = 'contact') {
    const layout = getPlayerHitboxLayout(player.mode, kind);
    player.y = top - layout.offsetY;
}
function setPlayerCollisionBottom(player, bottom, kind = 'contact') {
    const layout = getPlayerHitboxLayout(player.mode, kind);
    player.y = bottom - layout.offsetY - layout.height;
}
function drawObject(context, object, neighborObjects, cell, verticalOffset, elapsedMs, colorGroups, isActive, isUsedOrb, visualOverride, options) {
    if (object.type === 'DASH_BLOCK' || object.type === 'START_MARKER' || object.type === 'START_POS') {
        return;
    }
    if (isTriggerObjectType(object.type) && !options?.showTriggersInPlayMode) {
        return;
    }
    const x = object.x * cell;
    const y = verticalOffset + object.y * cell;
    const w = object.w * cell;
    const h = object.h * cell;
    const fillColor = visualOverride?.fillColor ?? getObjectFillColor(object, colorGroups);
    const strokeColor = visualOverride?.strokeColor ?? getObjectStrokeColor(object, colorGroups);
    drawStageObjectSprite({
        context,
        object,
        neighborObjects,
        x,
        y,
        w,
        h,
        fillColor,
        strokeColor,
        isActive,
        isUsedOrb,
        alpha: visualOverride?.alpha ?? 1,
        animationTimeMs: elapsedMs,
        editorGuideTop: isTriggerObjectType(object.type) ? options?.triggerGuideTop : undefined,
        editorGuideBottom: isTriggerObjectType(object.type) ? options?.triggerGuideBottom : undefined,
    });
}
function drawPlayer(context, player, cell, verticalOffset, visual = {}, skinData = null) {
    const playerX = player.x * cell;
    const playerY = verticalOffset + player.y * cell;
    const sizeW = player.w * cell;
    const sizeH = player.h * cell;
    const alpha = visual.alpha ?? 1;
    const scale = visual.scale ?? 1;
    context.save();
    context.globalAlpha *= alpha;
    context.translate(playerX + sizeW / 2, playerY + sizeH / 2);
    context.rotate(player.rotation);
    context.scale(scale, scale);
    drawPlayerModelSprite(context, player.mode, sizeW, sizeH, { skinData });
    context.restore();
}
function drawRuntimeHitboxes(context, objects, player, cell, verticalOffset, levelMaxY) {
    context.save();
    context.lineWidth = 2.5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    const playerContactRect = getPlayerCollisionRect(player, 'contact');
    const playerSolidRect = getPlayerCollisionRect(player, 'solid');
    drawHitboxRect(context, playerContactRect.x * cell, verticalOffset + playerContactRect.y * cell, playerContactRect.w * cell, playerContactRect.h * cell, 'rgba(255, 78, 78, 0.12)', 'rgba(255, 78, 78, 0.98)');
    drawHitboxRect(context, playerSolidRect.x * cell, verticalOffset + playerSolidRect.y * cell, playerSolidRect.w * cell, playerSolidRect.h * cell, 'rgba(92, 176, 255, 0.1)', 'rgba(92, 176, 255, 0.98)');
    for (const object of objects) {
        if (object.type === 'DASH_BLOCK' || object.type === 'START_MARKER' || object.type === 'START_POS') {
            continue;
        }
        if (isTriggerObjectType(object.type)) {
            const activationMode = getTriggerActivationMode(object.props.activationMode);
            if (activationMode === 'zone') {
                const zoneWidth = Math.max(0.18, object.w * 0.18, playerContactRect.w * 0.22);
                const zoneCenterX = object.x + object.w / 2;
                const zoneTop = Math.min(-6, SHIP_FLIGHT_CEILING_Y - 2, object.y - 32);
                const zoneBottom = Math.max(levelMaxY + 6, SHIP_FLIGHT_FLOOR_Y + 2, object.y + object.h + 32);
                drawHitboxRect(context, (zoneCenterX - zoneWidth / 2) * cell, verticalOffset + zoneTop * cell, zoneWidth * cell, Math.max(1, zoneBottom - zoneTop) * cell, 'rgba(84, 255, 122, 0.08)', 'rgba(84, 255, 122, 0.96)', [8, 6]);
            }
            else {
                drawHitboxRect(context, object.x * cell, verticalOffset + object.y * cell, object.w * cell, object.h * cell, 'rgba(84, 255, 122, 0.12)', 'rgba(84, 255, 122, 0.96)', [8, 6]);
            }
            continue;
        }
        if (isSpikeObjectType(object.type)) {
            const spikeHitbox = getSpikeHitboxRect(object);
            drawHazardHitboxPolygon(context, [
                { x: spikeHitbox.x * cell, y: verticalOffset + spikeHitbox.y * cell },
                { x: (spikeHitbox.x + spikeHitbox.w) * cell, y: verticalOffset + spikeHitbox.y * cell },
                { x: (spikeHitbox.x + spikeHitbox.w) * cell, y: verticalOffset + (spikeHitbox.y + spikeHitbox.h) * cell },
                { x: spikeHitbox.x * cell, y: verticalOffset + (spikeHitbox.y + spikeHitbox.h) * cell },
            ], 'rgba(255, 56, 56, 0.16)', 'rgba(255, 36, 36, 0.98)');
            continue;
        }
        if (object.type === 'ARROW_RAMP_ASC' || object.type === 'ARROW_RAMP_DESC') {
            drawHitboxPolygon(context, getArrowRampTriangle(object).map((point) => ({
                x: point.x * cell,
                y: verticalOffset + point.y * cell,
            })), 'rgba(92, 176, 255, 0.14)', 'rgba(92, 176, 255, 0.96)');
            continue;
        }
        if (isSawObjectType(object.type)) {
            const centerX = (object.x + object.w / 2) * cell;
            const centerY = verticalOffset + (object.y + object.h / 2) * cell;
            const radius = Math.max(0.18, Math.min(object.w, object.h) * getSawHitRadiusFactor(object.type)) * cell;
            drawHitboxCircle(context, centerX, centerY, radius, 'rgba(255, 78, 78, 0.16)', 'rgba(255, 78, 78, 0.98)');
            continue;
        }
        if (orbTypes.has(object.type)) {
            const centerX = (object.x + object.w / 2) * cell;
            const centerY = verticalOffset + (object.y + object.h / 2) * cell;
            const radius = Math.max(0.18, Math.min(object.w, object.h) * 0.39 + 0.02) * cell;
            drawHitboxCircle(context, centerX, centerY, radius, 'rgba(84, 255, 122, 0.16)', 'rgba(84, 255, 122, 0.98)');
            continue;
        }
        const isPortal = portalTypes.has(object.type);
        const isPad = object.type === 'JUMP_PAD';
        const isCollidableBlock = isCollidableBlockType(object.type);
        const isPassBlock = isPassThroughBlockType(object.type);
        if (isCollidableBlock) {
            for (const band of getBlockSupportBandRects(object)) {
                drawHitboxRect(context, band.x * cell, verticalOffset + band.y * cell, band.w * cell, band.h * cell, 'rgba(92, 176, 255, 0.14)', 'rgba(92, 176, 255, 0.96)');
            }
            continue;
        }
        const fillColor = isPassBlock
            ? 'rgba(255, 255, 255, 0.05)'
            : isPortal || isPad
                ? 'rgba(84, 255, 122, 0.14)'
                : 'rgba(255, 255, 255, 0.1)';
        const strokeColor = isPassBlock
            ? 'rgba(255, 255, 255, 0.5)'
            : isPortal || isPad
                ? 'rgba(84, 255, 122, 0.96)'
                : 'rgba(255, 255, 255, 0.92)';
        const strokeDash = isPassBlock ? [6, 5] : undefined;
        drawHitboxRect(context, object.x * cell, verticalOffset + object.y * cell, object.w * cell, object.h * cell, fillColor, strokeColor, strokeDash);
    }
    context.restore();
}
function drawHitboxRect(context, x, y, w, h, fillColor, strokeColor, lineDash) {
    context.save();
    if (lineDash?.length) {
        context.setLineDash(lineDash);
    }
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
    context.restore();
}
function drawHitboxCircle(context, x, y, radius, fillColor, strokeColor) {
    context.save();
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
}
function drawHitboxPolygon(context, points, fillColor, strokeColor) {
    if (!points.length) {
        return;
    }
    context.save();
    context.fillStyle = fillColor;
    context.strokeStyle = strokeColor;
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
function drawHazardHitboxPolygon(context, points, fillColor, strokeColor) {
    if (!points.length) {
        return;
    }
    context.save();
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
function drawShipBounds(context, cameraX, verticalOffset, width, cell) {
    const ceilingY = verticalOffset + SHIP_FLIGHT_CEILING_Y * cell;
    const floorY = verticalOffset + SHIP_FLIGHT_FLOOR_Y * cell;
    const startX = cameraX - cell * 2;
    const endX = cameraX + width + cell * 5;
    context.fillStyle = 'rgba(3, 7, 22, 0.22)';
    context.fillRect(startX, verticalOffset - cell * 12, endX - startX, ceilingY - (verticalOffset - cell * 12));
    context.fillRect(startX, floorY, endX - startX, cell * 12);
    context.strokeStyle = 'rgba(202,255,69,0.78)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(startX, ceilingY);
    context.lineTo(endX, ceilingY);
    context.moveTo(startX, floorY);
    context.lineTo(endX, floorY);
    context.stroke();
}
function drawPermanentStageFloor(context, cameraX, verticalOffset, width, height, cell, groundPalette) {
    const topY = verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell;
    const deckHeight = Math.max(cell * 1.06, 18);
    const startX = Math.floor((cameraX - cell * 2) / cell) * cell;
    const endX = Math.ceil((cameraX + width + cell * 5) / cell) * cell;
    const floorGradient = context.createLinearGradient(0, topY, 0, topY + deckHeight);
    floorGradient.addColorStop(0, groundPalette.top);
    floorGradient.addColorStop(0.18, groundPalette.mid);
    floorGradient.addColorStop(1, groundPalette.bottom);
    context.fillStyle = floorGradient;
    context.fillRect(startX, topY, endX - startX, deckHeight);
    context.fillStyle = groundPalette.shadow;
    context.fillRect(startX, topY + deckHeight, endX - startX, Math.max(0, height - topY - deckHeight + cell * 6));
    context.strokeStyle = groundPalette.seam;
    context.lineWidth = 1;
    for (let x = startX; x < endX; x += cell) {
        context.beginPath();
        context.moveTo(x, topY + deckHeight * 0.18);
        context.lineTo(x, topY + deckHeight);
        context.stroke();
    }
    context.strokeStyle = groundPalette.highlight;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(startX, topY);
    context.lineTo(endX, topY);
    context.stroke();
}
function drawFinishGateway(context, gatewayX, verticalOffset, height, cell, elapsedMs, activationProgress = 0) {
    const worldX = gatewayX * cell;
    const topY = verticalOffset - cell * 9;
    const bottomY = height + cell * 2;
    const beamHalfWidth = Math.max(12, cell * FINISH_GATEWAY_HALF_WIDTH_UNITS);
    const pulse = 0.62 + 0.38 * Math.sin(elapsedMs / 130);
    const glowAlpha = 0.2 + activationProgress * 0.42;
    const glowGradient = context.createLinearGradient(worldX - beamHalfWidth * 4, 0, worldX + beamHalfWidth * 4, 0);
    glowGradient.addColorStop(0, 'rgba(83,255,211,0)');
    glowGradient.addColorStop(0.18, `rgba(83,255,211,${0.12 + glowAlpha * 0.34})`);
    glowGradient.addColorStop(0.5, `rgba(208,255,226,${0.18 + glowAlpha * 0.46})`);
    glowGradient.addColorStop(0.82, `rgba(83,255,211,${0.12 + glowAlpha * 0.34})`);
    glowGradient.addColorStop(1, 'rgba(83,255,211,0)');
    context.fillStyle = glowGradient;
    context.fillRect(worldX - beamHalfWidth * 4, topY, beamHalfWidth * 8, bottomY - topY);
    context.fillStyle = `rgba(123,255,187,${0.22 + pulse * 0.16})`;
    context.fillRect(worldX - beamHalfWidth * 2.2, topY, beamHalfWidth * 2.6, bottomY - topY);
    context.fillStyle = `rgba(255,255,255,${0.82 + activationProgress * 0.18})`;
    context.fillRect(worldX - beamHalfWidth * 0.16, topY, beamHalfWidth * 0.32, bottomY - topY);
    context.fillStyle = 'rgba(8,20,48,0.82)';
    context.fillRect(worldX + beamHalfWidth * 0.5, topY, beamHalfWidth * 2.4, bottomY - topY);
    context.strokeStyle = 'rgba(151,255,221,0.7)';
    context.lineWidth = 1.4;
    const gridStep = Math.max(12, cell * 0.56);
    for (let x = worldX + beamHalfWidth * 0.5; x <= worldX + beamHalfWidth * 2.9; x += gridStep) {
        context.beginPath();
        context.moveTo(x, topY);
        context.lineTo(x, bottomY);
        context.stroke();
    }
    for (let y = topY; y <= bottomY; y += gridStep) {
        context.beginPath();
        context.moveTo(worldX + beamHalfWidth * 0.5, y);
        context.lineTo(worldX + beamHalfWidth * 2.9, y);
        context.stroke();
    }
    context.fillStyle = `rgba(165,255,147,${0.58 + activationProgress * 0.22})`;
    for (let index = 0; index < 24; index += 1) {
        const seed = index * 47.13;
        const drift = ((elapsedMs / 1000) * (28 + (index % 5) * 8) + seed) % (bottomY - topY + cell * 4);
        const px = worldX - beamHalfWidth * (1.2 + ((index * 13.7) % 7) * 0.34);
        const py = topY + drift - cell * 2;
        const size = index % 3 === 0 ? 8 : 5;
        context.fillRect(px, py, size, size);
    }
    if (activationProgress <= 0) {
        return;
    }
    context.save();
    context.globalAlpha *= activationProgress;
    const burstRadius = cell * (2.4 + activationProgress * 3.2);
    const burstGradient = context.createRadialGradient(worldX, verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell - cell * 0.2, 0, worldX, verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell - cell * 0.2, burstRadius);
    burstGradient.addColorStop(0, 'rgba(166,255,223,0.72)');
    burstGradient.addColorStop(0.48, 'rgba(120,255,201,0.28)');
    burstGradient.addColorStop(1, 'rgba(120,255,201,0)');
    context.fillStyle = burstGradient;
    context.beginPath();
    context.arc(worldX, verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell - cell * 0.2, burstRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(171,255,218,0.72)';
    context.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
        const sweep = (index + 1) / 5;
        const startX = worldX - cell * (4.5 + index * 0.9);
        const startY = verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell - cell * (0.4 + index * 0.28);
        const endY = verticalOffset + PERMANENT_STAGE_FLOOR_Y * cell - cell * (1.2 - sweep * 0.9);
        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(worldX - cell * (1.4 + index * 0.16), startY + cell * (0.42 + sweep), worldX, endY);
        context.stroke();
    }
    context.restore();
}
function clearRuntimePostFx(stageElement, canvas, overlay) {
    if (stageElement) {
        stageElement.style.boxShadow = '';
    }
    if (canvas) {
        canvas.style.filter = 'none';
    }
    if (overlay) {
        overlay.style.background = 'none';
        overlay.style.opacity = '0';
    }
}
function applyRuntimePostFx(stageElement, canvas, overlay, state) {
    canvas.style.filter = state.canvasFilter || 'none';
    if (stageElement) {
        stageElement.style.boxShadow = state.shakePower > 0 ? '0 0 36px rgba(255,255,255,0.08)' : '';
    }
    if (!overlay) {
        return;
    }
    overlay.style.background = state.overlayBackground || 'none';
    overlay.style.opacity = state.overlayBackground ? '1' : '0';
}
function getPostFxEffectType(value) {
    return typeof value === 'string' && postFxEffectTypes.has(value)
        ? value
        : 'flash';
}
function getTriggerActivationMode(value) {
    return value === 'touch' ? 'touch' : 'zone';
}
function getMoveTriggerEasing(value) {
    return typeof value === 'string' && moveTriggerEasingModes.has(value)
        ? value
        : 'none';
}
function applyMoveTriggerEasing(progress, easing) {
    const clampedProgress = clamp(progress, 0, 1);
    switch (easing) {
        case 'easeIn':
            return clampedProgress * clampedProgress;
        case 'easeOut':
            return 1 - (1 - clampedProgress) * (1 - clampedProgress);
        case 'easeInOut':
            return clampedProgress < 0.5
                ? 2 * clampedProgress * clampedProgress
                : 1 - Math.pow(-2 * clampedProgress + 2, 2) / 2;
        case 'none':
        default:
            return clampedProgress;
    }
}
function getRuntimeFxColor(value, fallback) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}
function triggerIntersectsPlayer(player, object, levelMaxY) {
    const activationMode = getTriggerActivationMode(object.props.activationMode);
    const playerCollisionRect = getPlayerCollisionRect(player);
    if (activationMode === 'zone') {
        const zoneWidth = Math.max(0.18, object.w * 0.18, playerCollisionRect.w * 0.22);
        const zoneCenterX = object.x + object.w / 2;
        const zoneTop = Math.min(-6, SHIP_FLIGHT_CEILING_Y - 2, object.y - 32);
        const zoneBottom = Math.max(levelMaxY + 6, SHIP_FLIGHT_FLOOR_Y + 2, object.y + object.h + 32);
        return aabbIntersects(playerCollisionRect.x, playerCollisionRect.y, playerCollisionRect.w, playerCollisionRect.h, zoneCenterX - zoneWidth / 2, zoneTop, zoneWidth, Math.max(1, zoneBottom - zoneTop));
    }
    return aabbIntersects(playerCollisionRect.x, playerCollisionRect.y, playerCollisionRect.w, playerCollisionRect.h, object.x, object.y, object.w, object.h);
}
function getRuntimePostFxState(effects, elapsedMs) {
    const filterParts = [];
    const overlayLayers = [];
    let shakePower = 0;
    for (const effect of effects) {
        const progress = clamp((elapsedMs - effect.startedAt) / effect.durationMs, 0, 1);
        const fadeOut = 1 - progress;
        const intensity = effect.intensity * fadeOut;
        if (intensity <= 0.001) {
            continue;
        }
        if (effect.effectType === 'grayscale') {
            filterParts.push(`grayscale(${clamp(intensity, 0, 1)})`);
        }
        if (effect.effectType === 'invert') {
            filterParts.push(`invert(${clamp(intensity, 0, 1)})`);
        }
        if (effect.effectType === 'blur') {
            filterParts.push(`blur(${(effect.blurAmount * intensity).toFixed(2)}px)`);
        }
        if (effect.effectType === 'flash') {
            overlayLayers.push(`radial-gradient(circle at 50% 50%, ${hexToRgba(effect.primaryColor, 0.42 * intensity)} 0%, ${hexToRgba(effect.secondaryColor, 0.24 * intensity)} 38%, rgba(255,255,255,0) 72%)`);
        }
        if (effect.effectType === 'tint') {
            overlayLayers.push(`linear-gradient(135deg, ${hexToRgba(effect.primaryColor, 0.34 * intensity)} 0%, ${hexToRgba(effect.secondaryColor, 0.22 * intensity)} 100%)`);
        }
        if (effect.effectType === 'scanlines') {
            const lineAlpha = clamp(0.1 + effect.scanlineDensity * 0.28, 0.08, 0.42) * intensity;
            overlayLayers.push(`repeating-linear-gradient(180deg, ${hexToRgba(effect.primaryColor, lineAlpha)} 0 2px, rgba(0,0,0,0) 2px ${6 + effect.scanlineDensity * 10}px)`);
            overlayLayers.push(`linear-gradient(180deg, ${hexToRgba(effect.secondaryColor, 0.14 * intensity)} 0%, rgba(0,0,0,0) 100%)`);
        }
        if (effect.effectType === 'shake') {
            shakePower = Math.max(shakePower, effect.shakePower * (0.6 + intensity * 8));
        }
    }
    return {
        canvasFilter: filterParts.join(' '),
        overlayBackground: overlayLayers.join(', '),
        shakePower,
    };
}
function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        return `rgba(255,255,255,${clamp(alpha, 0, 1)})`;
    }
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}
function aabbIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
function compareRuntimeRenderOrder(left, right) {
    return right.editorLayer - left.editorLayer;
}
function rectsOverlapHorizontally(leftA, widthA, leftB, widthB) {
    return leftA < leftB + widthB && leftA + widthA > leftB;
}
function rectsOverlapVertically(topA, heightA, topB, heightB) {
    return topA < topB + heightB && topA + heightA > topB;
}
function getBlockDirectionalCrossings(previousContactRect, currentContactRect, previousSolidRect, currentSolidRect, object) {
    const collisionMask = getBlockCollisionMask(object.type);
    if (!collisionMask || !hasBlockSupport(collisionMask)) {
        return {
            top: false,
            bottom: false,
            left: false,
            right: false,
        };
    }
    const objectRight = object.x + object.w;
    const objectBottom = object.y + object.h;
    const previousContactBottom = previousContactRect.y + previousContactRect.h;
    const currentContactBottom = currentContactRect.y + currentContactRect.h;
    const previousSolidRight = previousSolidRect.x + previousSolidRect.w;
    const currentSolidRight = currentSolidRect.x + currentSolidRect.w;
    return {
        top: collisionMask.top &&
            rectsOverlapHorizontally(currentContactRect.x, currentContactRect.w, object.x, object.w) &&
            previousContactBottom <= object.y &&
            currentContactBottom >= object.y,
        bottom: collisionMask.bottom &&
            rectsOverlapHorizontally(currentContactRect.x, currentContactRect.w, object.x, object.w) &&
            previousContactRect.y >= objectBottom &&
            currentContactRect.y <= objectBottom,
        left: collisionMask.left &&
            rectsOverlapVertically(currentSolidRect.y, currentSolidRect.h, object.y, object.h) &&
            previousSolidRight <= object.x &&
            currentSolidRight >= object.x,
        right: collisionMask.right &&
            rectsOverlapVertically(currentSolidRect.y, currentSolidRect.h, object.y, object.h) &&
            previousSolidRect.x >= objectRight &&
            currentSolidRect.x <= objectRight,
    };
}
function getBlockSupportBandRects(object) {
    const collisionMask = getBlockCollisionMask(object.type);
    if (!collisionMask || !hasBlockSupport(collisionMask)) {
        return [];
    }
    const thickness = Math.min(Math.max(BLOCK_SUPPORT_BAND_THICKNESS_UNITS, Math.min(object.w, object.h) * 0.18), Math.min(object.w, object.h));
    const bands = [];
    if (collisionMask.top) {
        bands.push({
            x: object.x,
            y: object.y,
            w: object.w,
            h: thickness,
        });
    }
    if (collisionMask.bottom) {
        bands.push({
            x: object.x,
            y: object.y + object.h - thickness,
            w: object.w,
            h: thickness,
        });
    }
    if (collisionMask.left) {
        bands.push({
            x: object.x,
            y: object.y,
            w: thickness,
            h: object.h,
        });
    }
    if (collisionMask.right) {
        bands.push({
            x: object.x + object.w - thickness,
            y: object.y,
            w: thickness,
            h: object.h,
        });
    }
    return bands;
}
function jumpOrbIntersectsPlayer(player, object) {
    const playerCollisionRect = getPlayerCollisionRect(player);
    const orbCenterX = object.x + object.w / 2;
    const orbCenterY = object.y + object.h / 2;
    const orbRadius = Math.max(0.18, Math.min(object.w, object.h) * 0.39 + 0.02);
    const playerInset = Math.min(playerCollisionRect.w, playerCollisionRect.h) * 0.08;
    const nearestX = clamp(orbCenterX, playerCollisionRect.x + playerInset, playerCollisionRect.x + playerCollisionRect.w - playerInset);
    const nearestY = clamp(orbCenterY, playerCollisionRect.y + playerInset, playerCollisionRect.y + playerCollisionRect.h - playerInset);
    const deltaX = orbCenterX - nearestX;
    const deltaY = orbCenterY - nearestY;
    return deltaX * deltaX + deltaY * deltaY <= orbRadius * orbRadius;
}
function spikeIntersects(player, object) {
    const playerCollisionRect = getPlayerCollisionRect(player);
    const spikeHitbox = getSpikeHitboxRect(object);
    return aabbIntersects(playerCollisionRect.x, playerCollisionRect.y, playerCollisionRect.w, playerCollisionRect.h, spikeHitbox.x, spikeHitbox.y, spikeHitbox.w, spikeHitbox.h);
}
function sawIntersects(player, object) {
    const playerCollisionRect = getPlayerCollisionRect(player);
    const centerX = object.x + object.w / 2;
    const centerY = object.y + object.h / 2;
    const radius = Math.max(0.18, Math.min(object.w, object.h) * getSawHitRadiusFactor(object.type));
    const nearestX = clamp(centerX, playerCollisionRect.x, playerCollisionRect.x + playerCollisionRect.w);
    const nearestY = clamp(centerY, playerCollisionRect.y, playerCollisionRect.y + playerCollisionRect.h);
    const deltaX = centerX - nearestX;
    const deltaY = centerY - nearestY;
    return deltaX * deltaX + deltaY * deltaY <= radius * radius;
}
function getSawHitRadiusFactor(type) {
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
function getArrowRampTriangle(object) {
    const centerX = object.x + object.w / 2;
    const centerY = object.y + object.h / 2;
    const normalizedRotation = normalizeQuarterRotationDegrees(object.rotation ?? 0);
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
function getArrowRampSurface(object) {
    const triangle = getArrowRampTriangle(object);
    const edges = [
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
    ];
    let hypotenuse = edges[0];
    let thirdVertex = triangle[2];
    let maxLength = -1;
    edges.forEach((edge, index) => {
        const [start, end] = edge;
        const length = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
        if (length > maxLength) {
            maxLength = length;
            hypotenuse = edge;
            thirdVertex = triangle[(index + 2) % 3];
        }
    });
    const [start, end] = hypotenuse;
    if (Math.abs(end.x - start.x) < 1e-6) {
        return null;
    }
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const surfaceYAtThirdX = start.y + ((end.y - start.y) * (thirdVertex.x - start.x)) / (end.x - start.x);
    return {
        start,
        end,
        minX,
        maxX,
        solidBelow: thirdVertex.y > surfaceYAtThirdX,
    };
}
function getRampSurfaceYAtX(surface, x) {
    return surface.start.y + ((surface.end.y - surface.start.y) * (x - surface.start.x)) / (surface.end.x - surface.start.x);
}
function getRampSupportX(player, surface) {
    const leftX = clamp(player.x, surface.minX, surface.maxX);
    const rightX = clamp(player.x + player.w, surface.minX, surface.maxX);
    const leftSurfaceY = getRampSurfaceYAtX(surface, leftX);
    const rightSurfaceY = getRampSurfaceYAtX(surface, rightX);
    const risesTowardRight = rightSurfaceY < leftSurfaceY;
    if (surface.solidBelow) {
        return risesTowardRight ? rightX : leftX;
    }
    return risesTowardRight ? leftX : rightX;
}
function getRampForwardEdge(surface) {
    return surface.start.x >= surface.end.x ? surface.start : surface.end;
}
function getRampSlope(surface) {
    return (surface.end.y - surface.start.y) / Math.max(0.0001, surface.end.x - surface.start.x);
}
function hasRampContinuationAhead(currentObject, surface, ramps) {
    const forwardEdge = getRampForwardEdge(surface);
    const seamTolerance = 0.08;
    const currentSlope = getRampSlope(surface);
    return ramps.some((otherRamp) => {
        if (otherRamp.id === currentObject.id) {
            return false;
        }
        const otherSurface = getArrowRampSurface(otherRamp);
        if (!otherSurface) {
            return false;
        }
        if (forwardEdge.x < otherSurface.minX - seamTolerance || forwardEdge.x > otherSurface.maxX + seamTolerance) {
            return false;
        }
        const otherSurfaceY = getRampSurfaceYAtX(otherSurface, clamp(forwardEdge.x, otherSurface.minX, otherSurface.maxX));
        const otherSlope = getRampSlope(otherSurface);
        const sameSlopeDirection = Math.sign(otherSlope || 0) === Math.sign(currentSlope || 0);
        return Math.abs(otherSurfaceY - forwardEdge.y) <= seamTolerance && sameSlopeDirection;
    });
}
function getBallRampExitCarryVelocity(player, surface, currentObject, ramps, horizontalSpeed) {
    if (player.mode !== 'ball') {
        return null;
    }
    const forwardEdge = getRampForwardEdge(surface);
    const supportX = getRampSupportX(player, surface);
    const nearForwardEdge = Math.abs(supportX - forwardEdge.x) <= BALL_RAMP_EDGE_TOLERANCE;
    if (!nearForwardEdge || hasRampContinuationAhead(currentObject, surface, ramps)) {
        return null;
    }
    const rampSlope = getRampSlope(surface);
    const desiredVelocity = clamp(rampSlope * horizontalSpeed * BALL_RAMP_EXIT_CARRY_FACTOR, -BALL_RAMP_EXIT_CARRY_MAX, BALL_RAMP_EXIT_CARRY_MAX);
    const launchDirection = Math.sign(desiredVelocity || 0);
    if (!launchDirection) {
        return null;
    }
    const boostedVelocity = Math.abs(desiredVelocity) < BALL_RAMP_EXIT_CARRY_MIN
        ? BALL_RAMP_EXIT_CARRY_MIN * launchDirection
        : desiredVelocity;
    if (Math.abs(boostedVelocity) <= 0.01) {
        return null;
    }
    return Math.sign(boostedVelocity) !== Math.sign(player.gravity || 1) ? boostedVelocity : null;
}
function triangleIntersectsAabb(ax, ay, aw, ah, triangle) {
    const rectCorners = [
        { x: ax, y: ay },
        { x: ax + aw, y: ay },
        { x: ax + aw, y: ay + ah },
        { x: ax, y: ay + ah },
    ];
    if (rectCorners.some((corner) => pointInTriangle(corner, triangle[0], triangle[1], triangle[2]))) {
        return true;
    }
    if (triangle.some((point) => point.x >= ax && point.x <= ax + aw && point.y >= ay && point.y <= ay + ah)) {
        return true;
    }
    const rectEdges = [
        [rectCorners[0], rectCorners[1]],
        [rectCorners[1], rectCorners[2]],
        [rectCorners[2], rectCorners[3]],
        [rectCorners[3], rectCorners[0]],
    ];
    const triangleEdges = [
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
    ];
    return triangleEdges.some(([startA, endA]) => rectEdges.some(([startB, endB]) => segmentsIntersect(startA, endA, startB, endB)));
}
function pointInTriangle(point, a, b, c) {
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < 1e-6) {
        return false;
    }
    const alpha = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
    const beta = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
    const gamma = 1 - alpha - beta;
    return alpha >= 0 && beta >= 0 && gamma >= 0;
}
function segmentsIntersect(aStart, aEnd, bStart, bEnd) {
    const aDx = aEnd.x - aStart.x;
    const aDy = aEnd.y - aStart.y;
    const bDx = bEnd.x - bStart.x;
    const bDy = bEnd.y - bStart.y;
    const denominator = aDx * bDy - aDy * bDx;
    if (Math.abs(denominator) < 1e-6) {
        return false;
    }
    const startDx = bStart.x - aStart.x;
    const startDy = bStart.y - aStart.y;
    const ua = (startDx * bDy - startDy * bDx) / denominator;
    const ub = (startDx * aDy - startDy * aDx) / denominator;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
function arrowRampIntersects(player, object) {
    const triangle = getArrowRampTriangle(object);
    return triangleIntersectsAabb(player.x, player.y, player.w, player.h, triangle);
}
function resolveRampCollision(player, object, previousX, previousY, deltaSeconds, allowGrounding, nearbyRamps, horizontalSpeed) {
    const surface = getArrowRampSurface(object);
    if (!surface) {
        return false;
    }
    const previousPlayer = {
        ...player,
        x: previousX,
        y: previousY,
    };
    const previousSupportX = getRampSupportX(previousPlayer, surface);
    const nextSupportX = getRampSupportX(player, surface);
    const previousSurfaceY = getRampSurfaceYAtX(surface, previousSupportX);
    const nextSurfaceY = getRampSurfaceYAtX(surface, nextSupportX);
    const tolerance = 0.08;
    const ballRampCarryVelocity = getBallRampExitCarryVelocity(player, surface, object, nearbyRamps, horizontalSpeed);
    if (surface.solidBelow) {
        const previousBottom = previousY + player.h;
        const nextBottom = player.y + player.h;
        if (previousBottom <= previousSurfaceY + tolerance && nextBottom >= nextSurfaceY - tolerance && player.vy >= 0) {
            const carryApplied = ballRampCarryVelocity !== null;
            player.y = nextSurfaceY - player.h - 0.001;
            player.vy = carryApplied ? ballRampCarryVelocity : 0;
            player.grounded = false;
            if (allowGrounding && !carryApplied) {
                player.grounded = true;
            }
            return true;
        }
        return false;
    }
    const previousTop = previousY;
    const nextTop = player.y;
    if (previousTop >= previousSurfaceY - tolerance && nextTop <= nextSurfaceY + tolerance && player.vy <= 0) {
        const carryApplied = ballRampCarryVelocity !== null;
        player.y = nextSurfaceY + 0.001;
        player.vy = carryApplied ? ballRampCarryVelocity : 0;
        player.grounded = false;
        if (allowGrounding && !carryApplied) {
            player.grounded = true;
        }
        return true;
    }
    return false;
}
function snapToRampSurface(player, object, allowGrounding, nearbyRamps, horizontalSpeed) {
    const surface = getArrowRampSurface(object);
    const triangle = getArrowRampTriangle(object);
    if (!surface || !triangleIntersectsAabb(player.x, player.y, player.w, player.h, triangle)) {
        return false;
    }
    const supportX = getRampSupportX(player, surface);
    const surfaceY = getRampSurfaceYAtX(surface, supportX);
    const snapMargin = Math.max(0.24, player.h * 0.55);
    const penetrationLimit = Math.max(object.h + 0.18, player.h * 1.15);
    if (surface.solidBelow) {
        const bottom = player.y + player.h;
        const penetration = bottom - surfaceY;
        if (player.vy < -0.2 || penetration < -snapMargin || penetration > penetrationLimit) {
            return false;
        }
        player.y = surfaceY - player.h - 0.001;
        const ballRampCarryVelocity = getBallRampExitCarryVelocity(player, surface, object, nearbyRamps, horizontalSpeed);
        const carryApplied = ballRampCarryVelocity !== null;
        player.vy = carryApplied ? ballRampCarryVelocity : Math.min(player.vy, 0);
        player.grounded = false;
        if (allowGrounding && !carryApplied) {
            player.grounded = true;
        }
        return true;
    }
    const top = player.y;
    const penetration = surfaceY - top;
    if (player.vy > 0.2 || penetration < -snapMargin || penetration > penetrationLimit) {
        return false;
    }
    player.y = surfaceY + 0.001;
    const ballRampCarryVelocity = getBallRampExitCarryVelocity(player, surface, object, nearbyRamps, horizontalSpeed);
    const carryApplied = ballRampCarryVelocity !== null;
    player.vy = carryApplied ? ballRampCarryVelocity : Math.max(player.vy, 0);
    player.grounded = false;
    if (allowGrounding && !carryApplied) {
        player.grounded = true;
    }
    return true;
}
function hazardIntersects(player, object) {
    if (isSpikeObjectType(object.type)) {
        return spikeIntersects(player, object);
    }
    if (isSawObjectType(object.type)) {
        return sawIntersects(player, object);
    }
    return false;
}
function clampProgress(value) {
    return Math.min(100, Math.max(0, Math.round(value)));
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function buildRuntimeObjectBuckets(objects) {
    const buckets = new Map();
    for (let index = 0; index < objects.length; index += 1) {
        const object = objects[index];
        const startBucket = Math.floor(object.x / RUNTIME_BUCKET_WIDTH_UNITS);
        const endBucket = Math.floor((object.x + object.w) / RUNTIME_BUCKET_WIDTH_UNITS);
        for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
            const bucketEntries = buckets.get(bucket);
            if (bucketEntries) {
                bucketEntries.push(index);
            }
            else {
                buckets.set(bucket, [index]);
            }
        }
    }
    return buckets;
}
function buildRuntimePaintGroupMap(objects) {
    const paintGroups = new Map();
    for (const object of objects) {
        const groupId = getObjectPaintGroupId(object);
        if (!groupId) {
            continue;
        }
        const entries = paintGroups.get(groupId);
        if (entries) {
            entries.push(object);
        }
        else {
            paintGroups.set(groupId, [object]);
        }
    }
    return paintGroups;
}
function objectIntersectsHorizontalRange(object, minX, maxX) {
    return object.x <= maxX && object.x + object.w >= minX;
}
function objectIntersectsVerticalRange(object, minY, maxY) {
    return object.y <= maxY && object.y + object.h >= minY;
}
export function buildPreviewBootstrap(levelData, previewStartPos, options) {
    const bootstrap = {
        startX: previewStartPos?.x ?? FIXED_LEVEL_START_X,
        startY: previewStartPos?.y ?? FIXED_LEVEL_START_Y,
        speedMultiplier: levelData.player.baseSpeed,
        gravity: levelData.player.gravity,
        mode: levelData.player.mode,
        elapsedMs: 0,
    };
    if (!previewStartPos || previewStartPos.x <= FIXED_LEVEL_START_X) {
        return bootstrap;
    }
    if (options?.inheritPortalState === false) {
        return bootstrap;
    }
    const relevantPortals = levelData.objects
        .filter((object) => {
        if (object.x > previewStartPos.x) {
            return false;
        }
        if (isLegacyRunAnchorObjectType(object.type)) {
            return false;
        }
        return (object.type === 'SPEED_PORTAL' ||
            object.type === 'GRAVITY_FLIP_PORTAL' ||
            object.type === 'GRAVITY_RETURN_PORTAL' ||
            object.type === 'GRAVITY_PORTAL' ||
            object.type === 'SHIP_PORTAL' ||
            object.type === 'BALL_PORTAL' ||
            object.type === 'CUBE_PORTAL' ||
            object.type === 'ARROW_PORTAL');
    })
        .sort((left, right) => left.x - right.x || left.y - right.y);
    let cursorX = FIXED_LEVEL_START_X;
    let elapsedMs = 0;
    let currentSpeedMultiplier = Math.max(0.1, levelData.player.baseSpeed);
    for (const portal of relevantPortals) {
        const portalX = clamp(portal.x, cursorX, previewStartPos.x);
        if (portalX > cursorX) {
            elapsedMs += ((portalX - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;
            cursorX = portalX;
        }
        if (portal.type === 'SPEED_PORTAL') {
            const nextMultiplier = Number(portal.props.multiplier ?? currentSpeedMultiplier);
            if (Number.isFinite(nextMultiplier) && nextMultiplier > 0) {
                currentSpeedMultiplier = nextMultiplier;
                bootstrap.speedMultiplier = nextMultiplier;
            }
        }
        if (portal.type === 'GRAVITY_FLIP_PORTAL') {
            bootstrap.gravity = -(bootstrap.gravity === 0 ? 1 : bootstrap.gravity);
        }
        if (portal.type === 'GRAVITY_RETURN_PORTAL') {
            bootstrap.gravity = 1;
        }
        if (portal.type === 'GRAVITY_PORTAL') {
            const nextGravity = Number(portal.props.gravity ?? bootstrap.gravity);
            if (Number.isFinite(nextGravity) && nextGravity !== 0) {
                bootstrap.gravity = nextGravity;
            }
        }
        if (portal.type === 'SHIP_PORTAL') {
            bootstrap.mode = 'ship';
        }
        if (portal.type === 'BALL_PORTAL') {
            bootstrap.mode = 'ball';
        }
        if (portal.type === 'CUBE_PORTAL') {
            bootstrap.mode = 'cube';
        }
        if (portal.type === 'ARROW_PORTAL') {
            bootstrap.mode = 'arrow';
        }
    }
    if (previewStartPos.x > cursorX) {
        elapsedMs += ((previewStartPos.x - cursorX) / (BASE_HORIZONTAL_SPEED * currentSpeedMultiplier)) * 1000;
    }
    bootstrap.elapsedMs = Math.max(0, Math.round(elapsedMs));
    return bootstrap;
}
function normalizeQuarterRotationDegrees(value) {
    const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
    return normalized === 360 ? 0 : normalized;
}
function drawBackdrop(context, width, height, elapsedMs, theme, lowPower = false, ultraLowPower = false) {
    const stageTheme = getStageThemePalette(theme);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, stageTheme.runtimeGradientTop);
    gradient.addColorStop(0.45, stageTheme.runtimeGradientMid);
    gradient.addColorStop(1, stageTheme.runtimeGradientBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * 0.74, height * 0.18, 0, width * 0.74, height * 0.18, width * 0.42);
    glow.addColorStop(0, stageTheme.runtimeGlowColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    const drift = (elapsedMs / 1000) * (ultraLowPower ? 10 : 16);
    const starCount = ultraLowPower ? 12 : lowPower ? 24 : 56;
    context.fillStyle = stageTheme.runtimeStarColor;
    for (let index = 0; index < starCount; index += 1) {
        const starX = (((index * 97.37) % (width + 240)) - 120 + drift * (0.18 + (index % 5) * 0.03) + width) % width;
        const starY = ((index * 63.17) % (height * 0.8)) + 10;
        const size = index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.5 : 1;
        context.fillRect(starX, starY, size, size);
    }
    context.fillStyle = stageTheme.runtimeAccentPrimary;
    context.fillRect(0, height * 0.72, width, 3);
    context.fillStyle = stageTheme.runtimeAccentSecondary;
    context.fillRect(0, height * 0.28, width, 2);
}
function drawGrid(context, cameraX, verticalOffset, width, height, cell) {
    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 1;
    const startX = -((cameraX % cell) + cell);
    for (let x = startX; x < width + cell; x += cell) {
        context.beginPath();
        context.moveTo(x + cameraX, 0);
        context.lineTo(x + cameraX, height);
        context.stroke();
    }
    for (let y = verticalOffset - cell; y < height + cell; y += cell) {
        context.beginPath();
        context.moveTo(cameraX, y);
        context.lineTo(cameraX + width + cell * 3, y);
        context.stroke();
    }
}
function getCanvasRenderScale() {
    if (typeof window === 'undefined') {
        return 1;
    }
    return Math.max(1, Math.min(2, window.devicePixelRatio || 1));
}
