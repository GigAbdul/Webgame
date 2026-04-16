import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getDifficultyPresentation, getDifficultySpritePath } from './level-presentation';
export function DifficultyIcon({ difficulty, size = 'md', showStars = false }) {
    const presentation = getDifficultyPresentation(difficulty);
    const spritePath = getDifficultySpritePath(difficulty);
    const [spriteMissing, setSpriteMissing] = useState(false);
    useEffect(() => {
        setSpriteMissing(false);
    }, [spritePath]);
    const sizeClass = size === 'lg' ? 'gd-stage-orb-lg' : size === 'sm' ? 'gd-stage-orb-sm' : '';
    return (_jsxs("div", { className: ['gd-stage-orb', sizeClass].filter(Boolean).join(' '), "aria-hidden": "true", children: [spriteMissing ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "gd-stage-orb-eyes" }), _jsx("div", { className: "gd-stage-orb-mouth" }), _jsx("span", { className: "gd-stage-orb-code", children: presentation.shortLabel })] })) : (_jsx("img", { src: spritePath, alt: "", className: "gd-stage-orb-sprite", draggable: false, onError: () => setSpriteMissing(true) })), showStars && presentation.rewardStars > 0 ? (_jsxs("span", { className: "gd-stage-orb-stars", children: [presentation.rewardStars, " ", presentation.rewardStars === 1 ? 'STAR' : 'STARS'] })) : null] }));
}
