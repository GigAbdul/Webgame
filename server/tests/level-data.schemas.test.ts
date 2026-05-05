import { describe, expect, it } from 'vitest';
import { createEmptyLevelData, levelDataSchema } from '../src/modules/levels/level-data';

describe('level data schema', () => {
  it('rejects oversized object lists', () => {
    const levelData = createEmptyLevelData();

    const result = levelDataSchema.safeParse({
      ...levelData,
      objects: Array.from({ length: 5001 }, (_, index) => ({
        id: `block-${index}`,
        type: 'GROUND_BLOCK',
        x: index,
        y: 10,
        w: 1,
        h: 1,
        rotation: 0,
        layer: 'gameplay',
        editorLayer: 1,
        props: {},
      })),
    });

    expect(result.success).toBe(false);
  });

  it('rejects unsafe object prop keys', () => {
    const levelData = createEmptyLevelData();

    const result = levelDataSchema.safeParse({
      ...levelData,
      objects: [
        {
          id: 'block-1',
          type: 'GROUND_BLOCK',
          x: 1,
          y: 10,
          w: 1,
          h: 1,
          rotation: 0,
          layer: 'gameplay',
          editorLayer: 1,
          props: {
            constructor: 'pollution',
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
