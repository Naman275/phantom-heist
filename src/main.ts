// ============================================================
// PHANTOM HEIST — Main Entry Point
// ============================================================
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { VaultBuilderScene } from './scenes/VaultBuilderScene';
import { RaidScene } from './scenes/RaidScene';
import { ReplayScene } from './scenes/ReplayScene';
import { ShopScene } from './scenes/ShopScene';
import { ProfileScene } from './scenes/ProfileScene';
import { DailyRewardScene } from './scenes/DailyRewardScene';
import { VaultSelectScene } from './scenes/VaultSelectScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { SettingsScene } from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 720,
      height: 1280,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    VaultBuilderScene,
    VaultSelectScene,
    RaidScene,
    ReplayScene,
    ShopScene,
    ProfileScene,
    DailyRewardScene,
    HowToPlayScene,
    LeaderboardScene,
    SettingsScene,
  ],
  input: {
    activePointers: 3,
    touch: {
      capture: true,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

new Phaser.Game(config);
