// ============================================================
// Leaderboard Scene — Global rankings
// ============================================================
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, PROGRESSION } from '../config/constants';
import { Button } from '../ui/Button';
import { VaultService } from '../firebase/vaultService';
import { SaveManager } from '../managers/SaveManager';
import { ProgressionManager } from '../managers/ProgressionManager';

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  level: number;
  xp: number;
  totalRaids: number;
  totalSuccessfulRaids: number;
  isCurrentPlayer: boolean;
}

export class LeaderboardScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_DARK, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Header
    this.add.text(GAME_WIDTH / 2, 36, '🏆 GLOBAL LEADERBOARD', {
      fontSize: '20px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back button
    new Button(this, {
      x: 40, y: 36, width: 60, height: 30,
      text: '← Back', fontSize: 12,
      bgColor: COLORS.BG_PANEL,
      onClick: () => this.scene.start(SCENES.MAIN_MENU),
    });

    // Column headers
    const headerY = 68;
    this.add.text(25, headerY, '#', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });
    this.add.text(50, headerY, 'Player', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });
    this.add.text(230, headerY, 'Lvl', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });
    this.add.text(270, headerY, 'XP', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });
    this.add.text(340, headerY, 'Raids', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });
    this.add.text(400, headerY, 'Win%', { fontSize: '11px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, fontStyle: 'bold' });

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0xffffff, 0.1);
    divider.lineBetween(20, headerY + 16, GAME_WIDTH - 20, headerY + 16);

    // Loading text
    this.loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '🔄 Loading rankings...', {
      fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
    }).setOrigin(0.5);

    // Upload current player data first, then load leaderboard
    this.uploadAndLoad();
  }

  private async uploadAndLoad(): Promise<void> {
    const save = SaveManager.getInstance().getData();

    // Upload current player's stats to cloud
    try {
      await VaultService.getInstance().savePlayerProfile(save.playerId, {
        playerName: save.playerName,
        level: save.level,
        xp: save.xp,
        totalRaids: save.totalRaids,
        totalSuccessfulRaids: save.totalSuccessfulRaids,
        totalDefenses: save.totalDefenses,
        coins: save.coins,
      });
    } catch (e) {
      console.log('Profile upload skipped:', e);
    }

    // Fetch leaderboard from cloud
    let entries: LeaderboardEntry[] = [];
    try {
      const cloudData = await VaultService.getInstance().getLeaderboard(20);
      entries = cloudData.map((d: any, i: number) => ({
        rank: i + 1,
        playerName: d.playerName || 'Unknown',
        level: d.level || 1,
        xp: d.xp || 0,
        totalRaids: d.totalRaids || 0,
        totalSuccessfulRaids: d.totalSuccessfulRaids || 0,
        isCurrentPlayer: d.id === save.playerId,
      }));
    } catch (e) {
      console.log('Leaderboard fetch failed:', e);
    }

    // If no cloud data or player not in list, add local player
    const playerInList = entries.some(e => e.isCurrentPlayer);
    if (!playerInList) {
      entries.push({
        rank: entries.length + 1,
        playerName: save.playerName + ' (you)',
        level: save.level,
        xp: save.xp,
        totalRaids: save.totalRaids,
        totalSuccessfulRaids: save.totalSuccessfulRaids,
        isCurrentPlayer: true,
      });
    }

    // Sort by XP descending and reassign ranks
    entries.sort((a, b) => b.xp - a.xp);
    entries.forEach((e, i) => e.rank = i + 1);

    // Remove loading
    if (this.loadingText) this.loadingText.destroy();

    if (entries.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No players yet!\nBe the first to play!', {
        fontSize: '16px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY, align: 'center',
      }).setOrigin(0.5);
      return;
    }

    // Render entries
    const startY = 90;
    const rowH = 42;

    entries.forEach((entry, i) => {
      const y = startY + i * rowH;
      if (y > GAME_HEIGHT - 80) return; // Don't draw off-screen

      // Row background
      const rowBg = this.add.graphics();
      if (entry.isCurrentPlayer) {
        rowBg.fillStyle(COLORS.ACCENT_CYAN, 0.1);
        rowBg.fillRoundedRect(15, y - 4, GAME_WIDTH - 30, rowH - 4, 8);
        rowBg.lineStyle(1, COLORS.ACCENT_CYAN, 0.3);
        rowBg.strokeRoundedRect(15, y - 4, GAME_WIDTH - 30, rowH - 4, 8);
      } else if (entry.rank <= 3) {
        rowBg.fillStyle(COLORS.ACCENT_GOLD, 0.05);
        rowBg.fillRoundedRect(15, y - 4, GAME_WIDTH - 30, rowH - 4, 8);
      }

      // Rank with medal for top 3
      const rankText = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}`;
      this.add.text(25, y + 12, rankText, {
        fontSize: entry.rank <= 3 ? '16px' : '13px',
        fontFamily: 'Arial', color: entry.rank <= 3 ? COLORS.TEXT_GOLD : COLORS.TEXT_WHITE,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Player name
      const nameColor = entry.isCurrentPlayer ? COLORS.TEXT_CYAN : COLORS.TEXT_WHITE;
      const displayName = entry.isCurrentPlayer ? `${entry.playerName} ⭐` : entry.playerName;
      this.add.text(50, y + 12, displayName, {
        fontSize: '13px', fontFamily: 'Arial', color: nameColor,
        fontStyle: entry.isCurrentPlayer ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);

      // Level
      const title = PROGRESSION.TITLE_BY_LEVEL[Math.min(entry.level - 1, PROGRESSION.TITLE_BY_LEVEL.length - 1)];
      this.add.text(230, y + 6, `${entry.level}`, {
        fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.add.text(230, y + 20, title, {
        fontSize: '8px', fontFamily: 'Arial', color: COLORS.TEXT_GRAY,
      }).setOrigin(0, 0.5);

      // XP
      this.add.text(270, y + 12, this.formatNumber(entry.xp), {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_CYAN,
      }).setOrigin(0, 0.5);

      // Total raids
      this.add.text(340, y + 12, `${entry.totalRaids}`, {
        fontSize: '12px', fontFamily: 'Arial', color: COLORS.TEXT_WHITE,
      }).setOrigin(0, 0.5);

      // Win rate
      const winRate = entry.totalRaids > 0
        ? Math.round((entry.totalSuccessfulRaids / entry.totalRaids) * 100) : 0;
      const winColor = winRate >= 70 ? '#2ecc71' : winRate >= 40 ? '#f39c12' : '#e74c3c';
      this.add.text(400, y + 12, `${winRate}%`, {
        fontSize: '12px', fontFamily: 'Arial', color: winColor, fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    });

    // Footer — your stats summary
    const footerY = GAME_HEIGHT - 50;
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.6);
    footerBg.fillRect(0, footerY - 10, GAME_WIDTH, 60);

    const prog = ProgressionManager.getInstance();
    const myRank = entries.find(e => e.isCurrentPlayer)?.rank || '—';
    this.add.text(GAME_WIDTH / 2, footerY + 10, `Your Rank: #${myRank}  |  Level ${prog.getLevel()}  |  ${prog.getTitle()}`, {
      fontSize: '13px', fontFamily: 'Arial', color: COLORS.TEXT_GOLD, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }
}
