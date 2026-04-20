import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { PlayerModelCanvas } from '../features/game/player-model-canvas';
import { AIR_ROTATION_SPEED, ARROW_VERTICAL_SPEED_FACTOR, BASE_GRAVITY_ACCELERATION, BASE_HORIZONTAL_SPEED, DEFAULT_JUMP_VELOCITY, PERMANENT_STAGE_FLOOR_Y, PLAYER_HITBOX_SIZE, clamp, normalizeAngle, snapCubeRotation, } from '../features/game/player-physics';
import { SHIP_FALL_ACCELERATION, SHIP_FLIGHT_CEILING_Y, SHIP_FLIGHT_FLOOR_Y, SHIP_MAX_VERTICAL_SPEED, SHIP_THRUST_ACCELERATION, SHIP_VISUAL_BOUND_PADDING, } from '../features/game/player-mode-config';
const homeTrafficSpawnIntervalMs = 980;
const homeTrafficExplosionLifetimeMs = 560;
const homeTrafficMaxActors = 6;
const homeTrafficShardAngles = [0, 60, 120, 180, 240, 300];
export function HomeMenuTraffic({ screenRef, showHitFlash, playerSkinOverrides }) {
    const actorIdRef = useRef(0);
    const explosionIdRef = useRef(0);
    const actorStateRef = useRef([]);
    const explosionTimeoutIdsRef = useRef([]);
    const animationFrameRef = useRef(null);
    const reducedMotionRef = useRef(false);
    const [actors, setActors] = useState([]);
    const [explosions, setExplosions] = useState([]);
    useEffect(() => {
        actorStateRef.current = actors;
    }, [actors]);
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncReducedMotion = () => {
            reducedMotionRef.current = mediaQuery.matches;
            if (mediaQuery.matches) {
                actorStateRef.current = [];
                setActors([]);
            }
        };
        syncReducedMotion();
        if ('addEventListener' in mediaQuery) {
            mediaQuery.addEventListener('change', syncReducedMotion);
        }
        const spawnIntervalId = window.setInterval(() => {
            if (reducedMotionRef.current || actorStateRef.current.length >= homeTrafficMaxActors || Math.random() < 0.24) {
                return;
            }
            const viewport = getHomeTrafficViewport(screenRef.current);
            if (!viewport) {
                return;
            }
            const nextActors = [...actorStateRef.current, createHomeTrafficActor(actorIdRef.current++, performance.now(), viewport)];
            actorStateRef.current = nextActors;
            setActors(nextActors);
        }, homeTrafficSpawnIntervalMs);
        let lastFrameMs = performance.now();
        const tick = (nowMs) => {
            const viewport = getHomeTrafficViewport(screenRef.current);
            const deltaSeconds = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
            lastFrameMs = nowMs;
            if (!reducedMotionRef.current && viewport && actorStateRef.current.length > 0) {
                const nextActors = actorStateRef.current
                    .map((actor) => stepHomeTrafficActor(actor, deltaSeconds, nowMs, viewport))
                    .filter((actor) => actor !== null);
                actorStateRef.current = nextActors;
                setActors(nextActors);
            }
            animationFrameRef.current = window.requestAnimationFrame(tick);
        };
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return () => {
            window.clearInterval(spawnIntervalId);
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
            explosionTimeoutIdsRef.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            explosionTimeoutIdsRef.current = [];
            if ('removeEventListener' in mediaQuery) {
                mediaQuery.removeEventListener('change', syncReducedMotion);
            }
        };
    }, [screenRef]);
    function registerExplosionTimeout(callback, delayMs) {
        const timeoutId = window.setTimeout(() => {
            explosionTimeoutIdsRef.current = explosionTimeoutIdsRef.current.filter((id) => id !== timeoutId);
            callback();
        }, delayMs);
        explosionTimeoutIdsRef.current.push(timeoutId);
    }
    function handleActorClick(actor, event) {
        const screenBounds = screenRef.current?.getBoundingClientRect();
        const actorBounds = event.currentTarget.getBoundingClientRect();
        const remainingActors = actorStateRef.current.filter((entry) => entry.id !== actor.id);
        actorStateRef.current = remainingActors;
        setActors(remainingActors);
        if (!screenBounds) {
            return;
        }
        const explosionId = explosionIdRef.current++;
        const nextExplosion = {
            id: explosionId,
            x: actorBounds.left - screenBounds.left + actorBounds.width / 2,
            y: actorBounds.top - screenBounds.top + actorBounds.height / 2,
            kind: actor.mode,
            sizePx: Math.round(actor.renderSizePx * 1.8),
        };
        setExplosions((current) => [...current, nextExplosion]);
        registerExplosionTimeout(() => {
            setExplosions((current) => current.filter((explosion) => explosion.id !== explosionId));
        }, homeTrafficExplosionLifetimeMs);
    }
    return (_jsxs("div", { className: "game-home-traffic", "aria-hidden": "true", children: [actors.map((actor) => {
                const actorStyle = {
                    width: `${actor.renderSizePx}px`,
                    height: `${actor.renderSizePx}px`,
                    transform: `translate3d(${actor.renderX}px, ${actor.renderY}px, 0)`,
                };
                const bodyStyle = {
                    transform: `rotate(${actor.rotation}rad)`,
                };
                const shadowStyle = {
                    transform: `translateX(-50%) scaleX(${actor.shadowScale})`,
                    opacity: actor.shadowOpacity,
                };
                return (_jsxs("button", { type: "button", tabIndex: -1, className: "game-home-traffic-node", style: actorStyle, "aria-label": `Break ${actor.mode}`, onClick: (event) => handleActorClick(actor, event), children: [_jsx("span", { className: "game-home-traffic-node-shadow", style: shadowStyle }), _jsx("span", { className: "game-home-traffic-node-body", style: bodyStyle, children: _jsx("span", { className: "game-home-traffic-node-canvas-shell", children: _jsx(PlayerModelCanvas, { mode: actor.mode, width: actor.renderSizePx, height: actor.renderSizePx, className: "game-home-traffic-node-canvas", skinOverride: playerSkinOverrides?.[actor.mode] ?? null }) }) })] }, actor.id));
            }), explosions.map((explosion) => {
                const explosionStyle = {
                    left: `${explosion.x}px`,
                    top: `${explosion.y}px`,
                    '--home-traffic-explosion-size': `${explosion.sizePx}px`,
                    '--home-traffic-burst-distance': `${Math.round(explosion.sizePx * 0.42)}px`,
                };
                return (_jsxs("span", { className: `game-home-traffic-explosion game-home-traffic-explosion--${explosion.kind}${showHitFlash ? ' has-hit-flash' : ''}`, style: explosionStyle, children: [_jsx("span", { className: "game-home-traffic-explosion-core" }), _jsx("span", { className: "game-home-traffic-explosion-ring" }), homeTrafficShardAngles.map((angle) => (_jsx("span", { className: "game-home-traffic-explosion-shard", style: { '--home-traffic-shard-angle': `${angle}deg` } }, `${explosion.id}-${angle}`)))] }, explosion.id));
            })] }));
}
function getHomeTrafficViewport(screenElement) {
    const bounds = screenElement?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return null;
    }
    const cellPx = clamp(bounds.height * 0.038, 32, 44);
    const floorLinePx = bounds.height * 0.71;
    const verticalOffsetPx = floorLinePx - PERMANENT_STAGE_FLOOR_Y * cellPx;
    const worldWidthUnits = bounds.width / cellPx;
    const flightMinY = SHIP_FLIGHT_CEILING_Y + SHIP_VISUAL_BOUND_PADDING;
    const flightMaxY = SHIP_FLIGHT_FLOOR_Y - PLAYER_HITBOX_SIZE - SHIP_VISUAL_BOUND_PADDING;
    return {
        bounds,
        cellPx,
        floorLinePx,
        verticalOffsetPx,
        worldWidthUnits,
        flightMinY,
        flightMaxY,
    };
}
function createHomeTrafficActor(id, nowMs, viewport) {
    const variant = Math.random();
    const baseActor = {
        id,
        x: -PLAYER_HITBOX_SIZE - randomBetween(0.6, 3.2),
        y: PERMANENT_STAGE_FLOOR_Y - PLAYER_HITBOX_SIZE,
        w: PLAYER_HITBOX_SIZE,
        h: PLAYER_HITBOX_SIZE,
        vy: 0,
        rotation: 0,
        grounded: true,
        gravity: 1,
        speedMultiplier: 1,
        inputHeld: false,
        nextControlAtMs: nowMs + randomBetween(260, 620),
        nextJumpAtMs: Number.POSITIVE_INFINITY,
        renderX: 0,
        renderY: 0,
        renderSizePx: PLAYER_HITBOX_SIZE * viewport.cellPx,
        shadowScale: 1,
        shadowOpacity: 0.42,
    };
    if (variant < 0.32) {
        return hydrateHomeTrafficActorLayout({
            ...baseActor,
            mode: 'cube',
            behavior: 'cube_run',
        }, viewport);
    }
    if (variant < 0.62) {
        return hydrateHomeTrafficActorLayout({
            ...baseActor,
            mode: 'cube',
            behavior: 'cube_hop',
            nextJumpAtMs: nowMs + randomBetween(260, 1500),
        }, viewport);
    }
    if (variant < 0.82) {
        return hydrateHomeTrafficActorLayout({
            ...baseActor,
            mode: 'ball',
            behavior: 'ball_roll',
        }, viewport);
    }
    if (variant < 0.91) {
        return hydrateHomeTrafficActorLayout({
            ...baseActor,
            mode: 'ship',
            behavior: 'ship_fly',
            y: randomBetweenFloat(viewport.flightMinY + 0.36, viewport.flightMaxY - 0.36),
            grounded: false,
            inputHeld: Math.random() > 0.5,
        }, viewport);
    }
    return hydrateHomeTrafficActorLayout({
        ...baseActor,
        mode: 'arrow',
        behavior: 'arrow_fly',
        y: randomBetweenFloat(viewport.flightMinY + 0.36, viewport.flightMaxY - 0.36),
        grounded: false,
        inputHeld: Math.random() > 0.5,
    }, viewport);
}
function stepHomeTrafficActor(actor, deltaSeconds, nowMs, viewport) {
    const nextActor = { ...actor };
    const horizontalSpeed = BASE_HORIZONTAL_SPEED * nextActor.speedMultiplier;
    const gravityDirection = Math.sign(nextActor.gravity || 1);
    const previousBottom = nextActor.y + nextActor.h;
    if (nextActor.behavior === 'cube_hop' && nextActor.grounded && nowMs >= nextActor.nextJumpAtMs) {
        nextActor.vy = -DEFAULT_JUMP_VELOCITY * gravityDirection;
        nextActor.grounded = false;
        nextActor.nextJumpAtMs = nowMs + randomBetween(980, 1680);
    }
    if (nextActor.behavior === 'ship_fly' || nextActor.behavior === 'arrow_fly') {
        if (nextActor.y <= viewport.flightMinY + 0.22) {
            nextActor.inputHeld = false;
            nextActor.nextControlAtMs = nowMs + randomBetween(180, 420);
        }
        else if (nextActor.y >= viewport.flightMaxY - 0.22) {
            nextActor.inputHeld = true;
            nextActor.nextControlAtMs = nowMs + randomBetween(180, 420);
        }
        else if (nowMs >= nextActor.nextControlAtMs) {
            nextActor.inputHeld = !nextActor.inputHeld;
            nextActor.nextControlAtMs =
                nowMs + randomBetween(nextActor.mode === 'ship' ? 240 : 160, nextActor.mode === 'ship' ? 620 : 420);
        }
    }
    nextActor.x += horizontalSpeed * deltaSeconds;
    if (nextActor.mode === 'ship') {
        const shipAcceleration = nextActor.inputHeld ? -SHIP_THRUST_ACCELERATION : SHIP_FALL_ACCELERATION;
        nextActor.vy += shipAcceleration * gravityDirection * deltaSeconds;
        nextActor.vy = clamp(nextActor.vy, -SHIP_MAX_VERTICAL_SPEED, SHIP_MAX_VERTICAL_SPEED);
    }
    else if (nextActor.mode === 'arrow') {
        nextActor.vy = horizontalSpeed * ARROW_VERTICAL_SPEED_FACTOR * (nextActor.inputHeld ? -1 : 1) * gravityDirection;
    }
    else {
        nextActor.vy += BASE_GRAVITY_ACCELERATION * nextActor.gravity * deltaSeconds;
    }
    nextActor.y += nextActor.vy * deltaSeconds;
    nextActor.grounded = false;
    if (nextActor.mode === 'ship' || nextActor.mode === 'arrow') {
        if (nextActor.y < viewport.flightMinY) {
            nextActor.y = viewport.flightMinY;
            nextActor.vy = Math.max(0, nextActor.vy);
        }
        if (nextActor.y > viewport.flightMaxY) {
            nextActor.y = viewport.flightMaxY;
            nextActor.vy = Math.min(0, nextActor.vy);
        }
    }
    if (nextActor.mode !== 'ship') {
        const nextBottom = nextActor.y + nextActor.h;
        if (previousBottom <= PERMANENT_STAGE_FLOOR_Y && nextBottom >= PERMANENT_STAGE_FLOOR_Y) {
            if (nextActor.gravity > 0 && nextActor.vy >= 0) {
                nextActor.y = PERMANENT_STAGE_FLOOR_Y - nextActor.h;
                nextActor.vy = 0;
                if (nextActor.mode !== 'arrow') {
                    nextActor.grounded = true;
                }
            }
        }
    }
    if (nextActor.mode === 'ship') {
        const targetRotation = clamp(nextActor.vy * 0.07, -0.58, 0.58);
        nextActor.rotation += (targetRotation - nextActor.rotation) * Math.min(1, deltaSeconds * 10);
    }
    else if (nextActor.mode === 'arrow') {
        nextActor.rotation = Math.atan2(nextActor.vy, horizontalSpeed);
    }
    else if (nextActor.mode === 'ball') {
        const radius = Math.max(0.001, nextActor.w / 2);
        nextActor.rotation = normalizeAngle(nextActor.rotation + (horizontalSpeed / radius) * deltaSeconds * Math.sign(nextActor.gravity || 1));
    }
    else if (nextActor.grounded) {
        nextActor.rotation = snapCubeRotation(nextActor.rotation);
    }
    else {
        nextActor.rotation = normalizeAngle(nextActor.rotation + AIR_ROTATION_SPEED * deltaSeconds * Math.sign(nextActor.gravity || 1));
    }
    if (nextActor.x > viewport.worldWidthUnits + nextActor.w + 2.4) {
        return null;
    }
    return hydrateHomeTrafficActorLayout(nextActor, viewport);
}
function hydrateHomeTrafficActorLayout(actor, viewport) {
    const renderSizePx = actor.w * viewport.cellPx;
    const renderX = actor.x * viewport.cellPx;
    const renderY = viewport.verticalOffsetPx + actor.y * viewport.cellPx;
    const altitudeUnits = Math.max(0, viewport.flightMaxY - actor.y);
    const altitudeRatio = clamp(altitudeUnits / (SHIP_FLIGHT_FLOOR_Y - SHIP_FLIGHT_CEILING_Y), 0, 1);
    const isFlying = actor.mode === 'ship' || actor.mode === 'arrow';
    return {
        ...actor,
        renderX,
        renderY,
        renderSizePx,
        shadowScale: isFlying ? 1 - altitudeRatio * 0.42 : actor.grounded ? 1 : 0.86,
        shadowOpacity: isFlying ? 0.34 - altitudeRatio * 0.18 : actor.grounded ? 0.42 : 0.24,
    };
}
function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
}
function randomBetweenFloat(min, max) {
    return min + Math.random() * (max - min);
}
