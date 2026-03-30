export type LeaderboardUser = {
  id: string;
  username: string;
  totalStars: number;
  completedOfficialLevels: number;
};

export function sortLeaderboardUsers(users: LeaderboardUser[]) {
  return [...users].sort((left, right) => {
    if (right.totalStars !== left.totalStars) {
      return right.totalStars - left.totalStars;
    }

    if (right.completedOfficialLevels !== left.completedOfficialLevels) {
      return right.completedOfficialLevels - left.completedOfficialLevels;
    }

    return left.username.localeCompare(right.username);
  });
}

