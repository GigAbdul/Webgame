const LOCAL_EDITOR_DRAFT_PREFIX = 'dashforge:editor:draft';
function getStorageKey(draftStorageKey) {
    return `${LOCAL_EDITOR_DRAFT_PREFIX}:${draftStorageKey}`;
}
export function readLocalEditorDraft(draftStorageKey) {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const rawValue = window.localStorage.getItem(getStorageKey(draftStorageKey));
        if (!rawValue) {
            return null;
        }
        const parsed = JSON.parse(rawValue);
        if (parsed?.version !== 1 ||
            typeof parsed.title !== 'string' ||
            typeof parsed.description !== 'string' ||
            typeof parsed.theme !== 'string' ||
            !parsed.dataJson ||
            typeof parsed.dataJson !== 'object') {
            return null;
        }
        return {
            version: 1,
            title: parsed.title,
            description: parsed.description,
            theme: parsed.theme,
            dataJson: parsed.dataJson,
            levelId: typeof parsed.levelId === 'string' ? parsed.levelId : null,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        };
    }
    catch {
        return null;
    }
}
export function writeLocalEditorDraft(draftStorageKey, draft) {
    if (typeof window === 'undefined') {
        return;
    }
    const nextDraft = {
        version: 1,
        ...draft,
        updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getStorageKey(draftStorageKey), JSON.stringify(nextDraft));
}
export function removeLocalEditorDraft(draftStorageKey) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(getStorageKey(draftStorageKey));
}
export function moveLocalEditorDraft(fromDraftStorageKey, toDraftStorageKey) {
    if (fromDraftStorageKey === toDraftStorageKey) {
        return;
    }
    const draft = readLocalEditorDraft(fromDraftStorageKey);
    if (!draft) {
        return;
    }
    writeLocalEditorDraft(toDraftStorageKey, {
        title: draft.title,
        description: draft.description,
        theme: draft.theme,
        dataJson: draft.dataJson,
        levelId: draft.levelId,
    });
    removeLocalEditorDraft(fromDraftStorageKey);
}
