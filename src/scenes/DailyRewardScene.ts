// ============================================================
// Daily Reward Scene — Login streak rewards
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, DAILY_REWARDS } from '../config/constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../managers/SaveManager';
import { CurrencyManager } from '../managers/CurrencyManager';
import { AudioManager } from '../managers/AudioManager';

export class DailyRewardScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.DAILY_REWARD });
  }

  create(): void {
    const save = SaveManager.getInstance();
    const data = save.getData();
    const today = new Date().toDateString();

    // Calculate streak
    let streak = data.loginStreak;
    const lastReward = data.lastDailyRewardDate;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastReward === today) {
      // Already claimed today — go to menu
      this.scene.start(SCENES.MAIN_MENU);
      return;
    }

    if (lastReward === yesterday) {
      streak++;
    } else if (lastReward !== today) {
      streak = 1; // Reset streak
    }

    // Cap streak at 7 (it loops)
    const streakDay = ((streak - 1) % DAILY_REWARDS.STREAK_DAYS);

    // ---- Background ----
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sparkle particles
    for (let i = 0; i < 20; i++) {
      const star = this.add.text(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        '✨',
        { fontSize: `${Math.random() * 12 + 8}px` },
      ).setAlpha(0);

      this.tweens.add({
        targets: star, alpha: { from: 0, to: 0.7 },
        duration: Math.random() * 2000 + 1000,
        yoyo: true, repeat: -1,
        delay: Math.random() * 2000,
      });
    }

    // ---- Title ----
    this.add.text(GAME_WIDTH / 2, 80, '🎁', { fontSize: '48px' }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, 'DAILY REWARD!', {
      fontSize: '28px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 160, `Day ${streak} Streak! 🔥`, {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN, fontStyle: 'bold',
    }).setOrigin(0.5);

    // ---- Streak Calendar ----
    const calY = 200;
    const dayW = 58;
    const dayH = 70;
    const gap = 6;
    const totalW = 4 * dayW + 3 * gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    for (let i = 0; i < DAILY_REWARDS.STREAK_DAYS; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * (dayW + gap);
      const y = calY + row * (dayH + gap);

      const isPast = i < streakDay;
      const isToday = i === streakDay;
      const isFuture = i > streakDay;

      const dayBg = this.add.graphics();
      if (isToday) {
        dayBg.fillStyle(COLORS.ACCENT_GOLD, 0.3);
        dayBg.lineStyle(2, COLORS.ACCENT_GOLD, 0.9);
      } else if (isPast) {
        dayBg.fillStyle(COLORS.ACCENT_GREEN, 0.15);
        dayBg.lineStyle(1, COLORS.ACCENT_GREEN, 0.4);
      } else {
        dayBg.fillStyle(COLORS.BG_PANEL, 0.7);
        dayBg.lineStyle(1, 0xffffff, 0.1);
      }
      dayBg.fillRoundedRect(x, y, dayW, dayH, 10);
      dayBg.strokeRoundedRect(x, y, dayW, dayH, 10);

      // Day number
      this.add.text(x + dayW / 2, y + 14, `Day ${i + 1}`, {
        fontSize: '10px', fontFamily: 'Arial',
        color: isToday ? COLORS.TEXT_GOLD : (isPast ? '#88cc88' : COLORS.TEXT_GRAY),
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Reward amount
      const coins = DAILY_REWARDS.STREAK_COINS[i];
      const gems = DAILY_REWARDS.STREAK_GEMS[i];

      this.add.text(x + dayW / 2, y + 34, `🪙 ${coins}`, {
        fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD,
      }).setOrigin(0.5);

      if (gems > 0) {
        this.add.text(x + dayW / 2, y + 50, `💎 ${gems}`, {
          fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
        }).setOrigin(0.5);
      }

      // Checkmark for past days
      if (isPast) {
        this.add.text(x + dayW - 8, y + 6, '✓', {
          fontSize: '12px', color: '#2ecc71',
        }).setOrigin(0.5);
      }
    }

    // ---- Reward Summary ----
    const rewardCoins = DAILY_REWARDS.STREAK_COINS[streakDay];
    const rewardGems = DAILY_REWARDS.STREAK_GEMS[streakDay];
    const summaryY = calY + 2 * (dayH + gap) + 30;

    this.add.text(GAME_WIDTH / 2, summaryY, 'Today\'s Reward:', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
    }).setOrigin(0.5);

    let rewardStr = `🪙 ${rewardCoins} Coins`;
    if (rewardGems > 0) rewardStr += `  +  💎 ${rewardGems} Gems`;

    const rewardText = this.add.text(GAME_WIDTH / 2, summaryY + 30, rewardStr, {
      fontSize: '20px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pulsing reward text
    this.tweens.add({
      targets: rewardText, scaleX: 1.1, scaleY: 1.1,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ---- Claim Button ----
    let claimed = false;
    new Button(this, {
      x: GAME_WIDTH / 2, y: summaryY + 85,
      width: 220, height: 52,
      text: '🎁 CLAIM REWARD', fontSize: 18,
      bgColor: COLORS.ACCENT_GOLD,
      hoverColor: 0xffee00,
      textColor: '#1a0a2e',
      onClick: () => {
        if (claimed) return;
        claimed = true;

        // Apply rewards
        CurrencyManager.getInstance().addCoins(rewardCoins);
        if (rewardGems > 0) CurrencyManager.getInstance().addGems(rewardGems);

        save.updateData({
          loginStreak: streak,
          lastDailyRewardDate: today,
        });

        try { AudioManager.getInstance().playDailyReward(); } catch (_) { /* ignore audio errors */ }

        // Go to menu immediately
        this.scene.start(SCENES.MAIN_MENU);
      },
    });

    // ---- Skip Button (fallback) ----
    new Button(this, {
      x: GAME_WIDTH / 2, y: summaryY + 145,
      width: 120, height: 36,
      text: 'Skip →', fontSize: 14,
      bgColor: COLORS.BG_PANEL,
      onClick: () => {
        save.updateData({ lastDailyRewardDate: today });
        this.scene.start(SCENES.MAIN_MENU);
      },
    });
  }
}
