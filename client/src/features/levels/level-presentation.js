export const difficultyOptions = [
    'EASY',
    'NORMAL',
    'HARD',
    'HARDER',
    'INSANE',
    'DEMON',
    'EASY_DEMON',
    'MEDIUM_DEMON',
    'HARD_DEMON',
    'INSANE_DEMON',
    'EXTREME_DEMON',
];
const difficultyPresentationMap = {
    EASY: {
        label: 'Easy',
        shortLabel: 'E',
        meter: 24,
        rewardStars: 2,
        spriteSlug: 'easy',
        primary: '#9fff57',
        secondary: '#4f8408',
        highlight: '#efff9f',
        glow: 'rgba(159,255,87,0.45)',
    },
    NORMAL: {
        label: 'Normal',
        shortLabel: 'N',
        meter: 38,
        rewardStars: 4,
        spriteSlug: 'normal',
        primary: '#ffe86b',
        secondary: '#9a5a05',
        highlight: '#fff7b0',
        glow: 'rgba(255,232,107,0.42)',
    },
    HARD: {
        label: 'Hard',
        shortLabel: 'H',
        meter: 54,
        rewardStars: 6,
        spriteSlug: 'hard',
        primary: '#ffb558',
        secondary: '#ad4300',
        highlight: '#ffe0ac',
        glow: 'rgba(255,181,88,0.4)',
    },
    HARDER: {
        label: 'Harder',
        shortLabel: 'HR',
        meter: 68,
        rewardStars: 8,
        spriteSlug: 'harder',
        primary: '#ff7259',
        secondary: '#a9182d',
        highlight: '#ffc1b5',
        glow: 'rgba(255,114,89,0.42)',
    },
    INSANE: {
        label: 'Insane',
        shortLabel: 'I',
        meter: 84,
        rewardStars: 10,
        spriteSlug: 'insane',
        primary: '#ff62d2',
        secondary: '#7f1497',
        highlight: '#ffc0f3',
        glow: 'rgba(255,98,210,0.42)',
    },
    DEMON: {
        label: 'Demon',
        shortLabel: 'D',
        meter: 90,
        rewardStars: 10,
        spriteSlug: 'demon',
        primary: '#ff6a62',
        secondary: '#80162d',
        highlight: '#ffc6b0',
        glow: 'rgba(255,106,98,0.42)',
    },
    EASY_DEMON: {
        label: 'Easy Demon',
        shortLabel: 'ED',
        meter: 92,
        rewardStars: 10,
        spriteSlug: 'easy-demon',
        primary: '#72ff9f',
        secondary: '#107041',
        highlight: '#d4ffe0',
        glow: 'rgba(114,255,159,0.38)',
    },
    MEDIUM_DEMON: {
        label: 'Medium Demon',
        shortLabel: 'MD',
        meter: 94,
        rewardStars: 10,
        spriteSlug: 'medium-demon',
        primary: '#62ebff',
        secondary: '#0b4f88',
        highlight: '#caffff',
        glow: 'rgba(98,235,255,0.4)',
    },
    HARD_DEMON: {
        label: 'Hard Demon',
        shortLabel: 'HD',
        meter: 96,
        rewardStars: 10,
        spriteSlug: 'hard-demon',
        primary: '#ff79e6',
        secondary: '#8c1674',
        highlight: '#ffd1f6',
        glow: 'rgba(255,121,230,0.42)',
    },
    INSANE_DEMON: {
        label: 'Insane Demon',
        shortLabel: 'ID',
        meter: 98,
        rewardStars: 10,
        spriteSlug: 'insane-demon',
        primary: '#b47cff',
        secondary: '#43228d',
        highlight: '#ebdbff',
        glow: 'rgba(180,124,255,0.4)',
    },
    EXTREME_DEMON: {
        label: 'Extreme Demon',
        shortLabel: 'XD',
        meter: 100,
        rewardStars: 10,
        spriteSlug: 'extreme-demon',
        primary: '#ff5a6c',
        secondary: '#38000d',
        highlight: '#ffd4da',
        glow: 'rgba(255,90,108,0.45)',
    },
};
const unratedPresentation = {
    label: 'Unrated',
    shortLabel: '?',
    meter: 18,
    rewardStars: 0,
    spriteSlug: 'unrated',
    primary: '#d8e3ef',
    secondary: '#54606d',
    highlight: '#ffffff',
    glow: 'rgba(216,227,239,0.35)',
};
export function getDifficultyPresentation(difficulty) {
    if (!difficulty) {
        return unratedPresentation;
    }
    return difficultyPresentationMap[difficulty];
}
export function getDifficultyStars(difficulty) {
    return getDifficultyPresentation(difficulty).rewardStars;
}
export function getDisplayedStars(level) {
    const autoStars = getDifficultyStars(level.difficulty);
    return autoStars > 0 ? autoStars : level.starsReward;
}
export function getDifficultySpritePath(difficulty) {
    return `/difficulty-icons/${getDifficultyPresentation(difficulty).spriteSlug}.png`;
}
export function formatStageNumber(index) {
    return String(index + 1).padStart(2, '0');
}
export function formatThemeName(theme) {
    return theme
        .split('-')
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}
