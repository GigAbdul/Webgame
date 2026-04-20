import { useMemo } from 'react';
import { create } from 'zustand';
import { createEmptyPlayerSkinRecord, usePlayerSkinsQuery } from './player-skins';
export const playerSkinModes = ['cube', 'ball', 'ship', 'arrow'];
const playerSkinSelectionStorageKey = 'dashforge-player-skin-selection';
const defaultPlayerSkinSelection = createEmptyPlayerSkinRecord('default');
function isPlayerSkinSelectionSource(value) {
    return value === 'default' || value === 'published';
}
function readStoredPlayerSkinSelection() {
    if (typeof window === 'undefined') {
        return defaultPlayerSkinSelection;
    }
    const raw = window.localStorage.getItem(playerSkinSelectionStorageKey);
    if (!raw) {
        return defaultPlayerSkinSelection;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            cube: isPlayerSkinSelectionSource(parsed.cube) ? parsed.cube : 'default',
            ball: isPlayerSkinSelectionSource(parsed.ball) ? parsed.ball : 'default',
            ship: isPlayerSkinSelectionSource(parsed.ship) ? parsed.ship : 'default',
            arrow: isPlayerSkinSelectionSource(parsed.arrow) ? parsed.arrow : 'default',
        };
    }
    catch {
        return defaultPlayerSkinSelection;
    }
}
function persistPlayerSkinSelection(selection) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(playerSkinSelectionStorageKey, JSON.stringify(selection));
}
export function resolveSelectedPlayerSkinRecord(selection, publishedSkins) {
    return {
        cube: selection.cube === 'published' ? publishedSkins?.cube ?? null : null,
        ball: selection.ball === 'published' ? publishedSkins?.ball ?? null : null,
        ship: selection.ship === 'published' ? publishedSkins?.ship ?? null : null,
        arrow: selection.arrow === 'published' ? publishedSkins?.arrow ?? null : null,
    };
}
export const usePlayerSkinSelectionStore = create((set) => ({
    selection: readStoredPlayerSkinSelection(),
    setSelection: (mode, source) => {
        set((state) => {
            const nextSelection = {
                ...state.selection,
                [mode]: source,
            };
            persistPlayerSkinSelection(nextSelection);
            return {
                selection: nextSelection,
            };
        });
    },
}));
export function useSelectedPlayerSkinRecord() {
    const selection = usePlayerSkinSelectionStore((state) => state.selection);
    const playerSkinsQuery = usePlayerSkinsQuery();
    const publishedSkins = playerSkinsQuery.data?.skins ?? null;
    return useMemo(() => resolveSelectedPlayerSkinRecord(selection, publishedSkins), [publishedSkins, selection]);
}
