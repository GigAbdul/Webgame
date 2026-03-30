export function canGrantReward(input: { isOfficial: boolean; alreadyRewarded: boolean }) {
  return input.isOfficial && !input.alreadyRewarded;
}

export function computeUserStatsFromRewards(rewards: Array<{ starsAwarded: number }>) {
  return {
    totalStars: rewards.reduce((sum, reward) => sum + reward.starsAwarded, 0),
    completedOfficialLevels: rewards.length,
  };
}

