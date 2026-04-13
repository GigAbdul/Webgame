import type { LevelData } from '../../types/models';

export type LocalEditorDraft = {
  version: 1;
  title: string;
  description: string;
  theme: string;
  dataJson: LevelData;
  levelId: string | null;
  updatedAt: string;
};

const LOCAL_EDITOR_DRAFT_PREFIX = 'dashforge:editor:draft';

function getStorageKey(draftStorageKey: string) {
  return `${LOCAL_EDITOR_DRAFT_PREFIX}:${draftStorageKey}`;
}

export function readLocalEditorDraft(draftStorageKey: string): LocalEditorDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(draftStorageKey));

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<LocalEditorDraft>;

    if (
      parsed?.version !== 1 ||
      typeof parsed.title !== 'string' ||
      typeof parsed.description !== 'string' ||
      typeof parsed.theme !== 'string' ||
      !parsed.dataJson ||
      typeof parsed.dataJson !== 'object'
    ) {
      return null;
    }

    return {
      version: 1,
      title: parsed.title,
      description: parsed.description,
      theme: parsed.theme,
      dataJson: parsed.dataJson as LevelData,
      levelId: typeof parsed.levelId === 'string' ? parsed.levelId : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeLocalEditorDraft(draftStorageKey: string, draft: Omit<LocalEditorDraft, 'version' | 'updatedAt'>) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextDraft: LocalEditorDraft = {
    version: 1,
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getStorageKey(draftStorageKey), JSON.stringify(nextDraft));
}

export function removeLocalEditorDraft(draftStorageKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getStorageKey(draftStorageKey));
}

export function moveLocalEditorDraft(fromDraftStorageKey: string, toDraftStorageKey: string) {
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
