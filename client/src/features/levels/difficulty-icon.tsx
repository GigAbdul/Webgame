import { useEffect, useState } from 'react';
import type { Level } from '../../types/models';
import { getDifficultyPresentation, getDifficultySpritePath } from './level-presentation';

type DifficultyIconProps = {
  difficulty: Level['difficulty'];
  size?: 'sm' | 'md' | 'lg';
  showStars?: boolean;
};

export function DifficultyIcon({ difficulty, size = 'md', showStars = false }: DifficultyIconProps) {
  const presentation = getDifficultyPresentation(difficulty);
  const spritePath = getDifficultySpritePath(difficulty);
  const [spriteMissing, setSpriteMissing] = useState(false);

  useEffect(() => {
    setSpriteMissing(false);
  }, [spritePath]);

  const sizeClass = size === 'lg' ? 'gd-stage-orb-lg' : size === 'sm' ? 'gd-stage-orb-sm' : '';

  return (
    <div className={['gd-stage-orb', sizeClass].filter(Boolean).join(' ')} aria-hidden="true">
      {spriteMissing ? (
        <>
          <div className="gd-stage-orb-eyes" />
          <div className="gd-stage-orb-mouth" />
          <span className="gd-stage-orb-code">{presentation.shortLabel}</span>
        </>
      ) : (
        <img
          src={spritePath}
          alt=""
          className="gd-stage-orb-sprite"
          draggable={false}
          onError={() => setSpriteMissing(true)}
        />
      )}

      {showStars && presentation.rewardStars > 0 ? (
        <span className="gd-stage-orb-stars">
          {presentation.rewardStars} {presentation.rewardStars === 1 ? 'STAR' : 'STARS'}
        </span>
      ) : null}
    </div>
  );
}
