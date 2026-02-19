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

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
