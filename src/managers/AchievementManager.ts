// ============================================================
// Achievement Manager — Track and unlock achievements
// ============================================================
import { SaveManager } from './SaveManager';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
  gemReward: number;
  condition: (data: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_raid', name: 'First Blood', description: 'Complete your first raid', icon: '⚔️', xpReward: 50, coinReward: 100, gemReward: 5, condition: (d) => d.totalRaids >= 1 },
  { id: 'raid_5', name: 'Raider', description: 'Complete 5 raids', icon: '🗡️', xpReward: 100, coinReward: 200, gemReward: 10, condition: (d) => d.totalRaids >= 5 },
  { id: 'raid_25', name: 'Veteran Raider', description: 'Complete 25 raids', icon: '⚔️', xpReward: 300, coinReward: 500, gemReward: 20, condition: (d) => d.totalRaids >= 25 },
  { id: 'raid_100', name: 'Master Thief', description: 'Complete 100 raids', icon: '👻', xpReward: 1000, coinReward: 2000, gemReward: 50, condition: (d) => d.totalRaids >= 100 },
  { id: 'win_1', name: 'Heist Success', description: 'Successfully complete a raid', icon: '✅', xpReward: 50, coinReward: 50, gemReward: 3, condition: (d) => d.totalSuccessfulRaids >= 1 },
  { id: 'win_10', name: 'Pro Thief', description: 'Win 10 raids', icon: '🏆', xpReward: 200, coinReward: 300, gemReward: 15, condition: (d) => d.totalSuccessfulRaids >= 10 },
  { id: 'win_50', name: 'Phantom Elite', description: 'Win 50 raids', icon: '👑', xpReward: 500, coinReward: 1000, gemReward: 30, condition: (d) => d.totalSuccessfulRaids >= 50 },
  { id: 'builder_1', name: 'Architect', description: 'Publish your first vault', icon: '🏗️', xpReward: 100, coinReward: 200, gemReward: 10, condition: (d) => (d.publishedVaults || 0) >= 1 },
  { id: 'builder_5', name: 'Master Builder', description: 'Publish 5 vaults', icon: '🏰', xpReward: 300, coinReward: 500, gemReward: 25, condition: (d) => (d.publishedVaults || 0) >= 5 },
  { id: 'streak_3', name: 'Dedicated', description: '3-day login streak', icon: '🔥', xpReward: 75, coinReward: 150, gemReward: 5, condition: (d) => d.loginStreak >= 3 },
  { id: 'streak_7', name: 'Committed', description: '7-day login streak', icon: '🔥', xpReward: 200, coinReward: 400, gemReward: 15, condition: (d) => d.loginStreak >= 7 },
  { id: 'coins_1000', name: 'Money Bags', description: 'Accumulate 1,000 coins', icon: '🪙', xpReward: 50, coinReward: 0, gemReward: 5, condition: (d) => d.coins >= 1000 },
  { id: 'coins_10000', name: 'Coin Vault', description: 'Accumulate 10,000 coins', icon: '💰', xpReward: 200, coinReward: 0, gemReward: 20, condition: (d) => d.coins >= 10000 },
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', xpReward: 100, coinReward: 200, gemReward: 10, condition: (d) => d.level >= 5 },
  { id: 'level_10', name: 'Phantom Lord', description: 'Reach level 10', icon: '🌟', xpReward: 500, coinReward: 1000, gemReward: 30, condition: (d) => d.level >= 10 },
  { id: 'level_20', name: 'The Architect', description: 'Reach max level 20', icon: '💎', xpReward: 2000, coinReward: 5000, gemReward: 100, condition: (d) => d.level >= 20 },
];

export class AchievementManager {
  private static instance: AchievementManager;

  private constructor() {}

  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  /** Check all achievements and return newly unlocked ones */
  checkAchievements(): Achievement[] {
    const save = SaveManager.getInstance();
    const data = save.getData();
    const unlocked: string[] = data.unlockedAchievements || [];
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (unlocked.includes(achievement.id)) continue;
      try {
        if (achievement.condition(data)) {
          unlocked.push(achievement.id);
          newlyUnlocked.push(achievement);
          // Award rewards
          data.coins += achievement.coinReward;
          data.gems += achievement.gemReward;
          data.xp += achievement.xpReward;
        }
      } catch (_) { /* skip broken conditions */ }
    }

    if (newlyUnlocked.length > 0) {
      save.updateData({ unlockedAchievements: unlocked, coins: data.coins, gems: data.gems, xp: data.xp });
    }

    return newlyUnlocked;
  }

  getUnlockedAchievements(): Achievement[] {
    const unlocked: string[] = SaveManager.getInstance().getData().unlockedAchievements || [];
    return ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
  }

  getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS;
  }

  getProgress(): { unlocked: number; total: number } {
    const unlocked: string[] = SaveManager.getInstance().getData().unlockedAchievements || [];
    return { unlocked: unlocked.length, total: ACHIEVEMENTS.length };
  }

  isUnlocked(id: string): boolean {
    const unlocked: string[] = SaveManager.getInstance().getData().unlockedAchievements || [];
    return unlocked.includes(id);
  }
}
