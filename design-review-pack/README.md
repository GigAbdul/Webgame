# Design Review Pack

This folder is a UI-focused snapshot of the project for design review.

It intentionally excludes backend and database code.
The goal is to evaluate visual direction, layout quality, UX clarity, and whether the app feels polished enough.

## Best Places To Start

1. `client/src/pages/levels-page.tsx`
2. `client/src/features/levels/level-card.tsx`
3. `client/src/pages/level-detail-page.tsx`
4. `client/src/pages/play-page.tsx`
5. `client/src/styles/index.css`

## Included Areas

- Main shell and shared UI:
  - `client/src/components/layout.tsx`
  - `client/src/components/arcade-screen-layout.tsx`
  - `client/src/components/ui.tsx`

- Player-facing pages:
  - `client/src/pages/home-page.tsx`
  - `client/src/pages/levels-page.tsx`
  - `client/src/pages/level-detail-page.tsx`
  - `client/src/pages/play-page.tsx`

- Editor and admin screens:
  - `client/src/pages/editor-page.tsx`
  - `client/src/pages/admin-level-page.tsx`
  - `client/src/features/editor/level-editor.tsx`

- Level selection presentation:
  - `client/src/features/levels/level-card.tsx`
  - `client/src/features/levels/difficulty-icon.tsx`
  - `client/src/features/levels/level-presentation.ts`

- Runtime visuals:
  - `client/src/features/game/game-canvas.tsx`

- Styling and assets:
  - `client/src/styles/index.css`
  - `client/public/difficulty-icons/README.txt`

## Notes

- These are copied review files, not the source of truth.
- The current focus is making the app feel closer to a Geometry Dash style game UI.
- The level select screen was recently changed toward a horizontal carousel layout.
