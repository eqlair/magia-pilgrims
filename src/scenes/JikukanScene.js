import Phaser from 'phaser';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { TransitionManager } from '../systems/TransitionManager';
import { FONT_MAIN } from '../config/GameFont';
import { CharacterDetailHelper } from '../components/CharacterDetailHelper';

/** 属性名とカラーヘルパー */
const ATTR_INFO = [
    { id: 'red', name: '情熱 (赤)', color: '#ff5555', icon: 'em_1' },
    { id: 'purple', name: '混沌 (紫)', color: '#dd55ff', icon: 'em_2' },
    { id: 'green', name: '調和 (緑)', color: '#55ff77', icon: 'em_3' },
    { id: 'yellow', name: '犠牲 (黄)', color: '#ffee55', icon: 'em_4' },
    { id: 'blue', name: '統制 (青)', color: '#55bbff', icon: 'em_5' }
];

/** Waspアタック敵種類 (MAP003.xlsxより) */
const ENEMY_TYPES = [
    'スウォーム2', 'フライ2', 'スピリット2', 'マノウォー2', 'ゴブリン2',
    'コボルド2', 'オーク2', 'オーガ2', 'ゴーレム2'
];

/** 魔女行動パターン (MAP003.xlsxより) */
const WITCH_PATTERNS = [
    '標準',
    '標準',
    '加速度加算が倍',
    '加速度加算が半分',
    '各レーンをテレポートするように動く',
    '加速度加算が3倍'
];

/**
 * 🏛️ 時空館シーン (JikukanScene)
 * 上部1/3はイラストを堪能、下部2/3にメニューと直感的な隊列編成を配置
 */
export default class JikukanScene extends Phaser.Scene {
    constructor() {
        super('JikukanScene');
        this.currentMode = 'solo';     // 'solo' | 'trio' | 'quintuple'
        this.currentTab = 'wasp';      // 'wasp' | 'witch' | 'formation'
        this.selectedSlotIndex = null;
        this.currentDetailCharId = null;
    }

    init(data) {
        if (data && data.mode) this.currentMode = data.mode;
        if (data && data.tab) this.currentTab = data.tab;
        this.battleResultData = data || null;
        const gs = GlobalState.getInstance();
        this.isTower = (data && data.isTower !== undefined) ? !!data.isTower : !!gs.isTowerMode;
        if (this.isTower) {
            gs.isTowerMode = true;
        }
    }

    create() {
        TransitionManager.fadeIn(this);
        const { width, height } = this.scale;
        this.gs = GlobalState.getInstance();
        const gs = this.gs;
        this.jState = gs.getJikukanState();

        // 1. 全面暗色背景
        this.add.rectangle(0, 0, width, height, 0x0a0714).setOrigin(0, 0);

        // 2. BGM再生 (002_menu.mp3)
        this.sound.stopAll();
        if (this.cache.audio.exists('002_menu')) {
            this.bgm = this.sound.add('002_menu', { loop: true, volume: 0.5 });
            this.bgm.play();
        }

        // 3. メインコンテナ
        this.mainContainer = this.add.container(0, 0);
        this.detailViewContainer = this.add.container(0, 0).setDepth(100);
        this.detailViewContainer.setVisible(false);
        this.toastContainer = this.add.container(0, 0).setDepth(99999);

        // レリクス・宝石装備画面（EquipmentScene）から戻ったときの再描画リスナー
        this.events.on('resume', () => {
            gs.cleanupJikukanEquipsOnInventoryChange();
            if (this.currentDetailCharId && this.detailViewContainer && this.detailViewContainer.visible) {
                this.showCharacterDetail(this.currentDetailCharId);
            } else {
                this.drawScene();
            }
        });

        // 時空館入場時の整合性チェック
        gs.cleanupJikukanEquipsOnInventoryChange();

        // 4. 戦闘からの帰還ハンドリング (勝利モーダル / 敗北トースト)
        if (this.battleResultData && this.battleResultData.fromJikukanBattle) {
            if (this.battleResultData.victoryResult) {
                // 勝利時は自動的に最新未踏破フロアを選択状態にしておく
                const modeData = this.getModeData();
                const latestFloor = this.currentTab === 'wasp' ? (modeData.waspFloor || 1) : (modeData.witchFloor || 1);
                this.setSelectedFloor(this.currentTab, latestFloor);
            }
        }

        this.drawScene();

        if (this.battleResultData && this.battleResultData.fromJikukanBattle) {
            if (this.battleResultData.victoryResult) {
                this.time.delayedCall(300, () => {
                    this.showVictoryModal(this.battleResultData.victoryResult);
                });
            } else if (this.battleResultData.isDefeated) {
                this.showToast('敗北…ペナルティはありません。再挑戦しよう！');
            } else if (this.battleResultData.isRetreated) {
                this.showToast('戦闘から撤退しました。');
            }
        }
    }

    /**
     * ⚔️ 時空館バトル開始（Wasp / Witch 共通処理）
     */
    startJikukanBattle(type, floor) {
        if (this.bgm) this.bgm.stop();
        this.gs.cleanupJikukanEquipsOnInventoryChange();
        const party = this.getCurrentParty();
        const attrList = ['red', 'purple', 'green', 'yellow', 'blue'];
        const attrStr = attrList[floor % 5];

        let config;
        if (type === 'wasp') {
            let totalEnemyCount = 9 + floor;
            if (this.currentMode === 'trio') totalEnemyCount = 27 + floor * 3;
            if (this.currentMode === 'quintuple') totalEnemyCount = 45 + floor * 5;

            config = {
                rule: 0,
                attribute: attrStr,
                enemyCount: totalEnemyCount,
                waveCount: 2,
                spawnInterval: 0.8,
                isJikukan: true,
                isTower: this.isTower,
                jikukanMode: this.currentMode,
                jikukanType: 'wasp',
                jikukanFloor: floor,
                party: party,
                returnScene: 'JikukanScene'
            };
        } else {
            const majoLevel = Math.max(10, Math.min(50, 10 + Math.floor(floor / 2)));
            const patternIdx = floor % 6;

            config = {
                rule: 0,
                attribute: attrStr,
                enemyCount: 0,
                waveCount: 0,
                isWitchOnly: true,
                majoLevel: majoLevel,
                witchPattern: patternIdx,
                isJikukan: true,
                isTower: this.isTower,
                jikukanMode: this.currentMode,
                jikukanType: 'witch',
                jikukanFloor: floor,
                party: party,
                returnScene: 'JikukanScene'
            };
        }

        TransitionManager.transitionTo(this, 'BattleScene', config);
    }

    getCurrentParty() {
        if (this.currentMode === 'solo') {
            return [this.jState.solo.charId || '001'];
        }
        if (this.currentMode === 'trio') {
            return (this.jState.trio.formation || []).map(f => f.charId);
        }
        return (this.jState.quintuple.formation || []).map(f => f.charId);
    }

    drawScene() {
        this.mainContainer.removeAll(true);
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();
        const jState = this.jState;

        // ══════════════════════════════════════════════════
        // 🖼️ 【画面上部 1/3 エリア (y = 0 〜 340)】 イラスト鑑賞エリア
        // 戻るボタン以外は何も置かず、美しい絵をそのまま見せる！
        // ══════════════════════════════════════════════════
        const bannerVisibleH = 340; // 画面高さ960の約1/3強
        if (this.textures.exists('jikukan_banner')) {
            const banner = this.add.image(width / 2, 0, 'jikukan_banner').setOrigin(0.5, 0);
            const bannerScale = width / banner.width;
            banner.setScale(bannerScale);
            this.mainContainer.add(banner);
        } else {
            const placeholder = this.add.rectangle(width / 2, bannerVisibleH / 2, width, bannerVisibleH, 0x221a3a);
            this.mainContainer.add(placeholder);
        }

        // イラスト下部の自然なグラデーション影
        const shadow = this.add.rectangle(width / 2, bannerVisibleH - 12, width, 36, 0x0a0714, 0.96).setOrigin(0.5, 0.5);
        this.mainContainer.add(shadow);

        // 戻るボタンだけを左上にシンプルに配置
        const backBtn = this.add.text(14, 24, '◀ 戻る', {
            fontFamily: FONT_MAIN,
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 12, y: 6 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            if (this.bgm) this.bgm.stop();
            TransitionManager.transitionTo(this, 'AdventureScene', {
                isTower: this.isTower
            });
        });
        this.mainContainer.add(backBtn);

        // 🥋 道場直接移動ボタン（dojo2.jpg: 道場解放時のみ表示）
        if (gs.isDojoUnlocked) {
            const btnX = 108;
            const btnY = 4;
            const btnImg = this.add.image(btnX, btnY, 'dojo_icon').setOrigin(0, 0);
            const targetW = 84;
            const scale = targetW / btnImg.width;
            btnImg.setScale(scale);
            btnImg.setInteractive({ useHandCursor: true });

            const strokeRect = this.add.rectangle(btnX, btnY, btnImg.displayWidth, btnImg.displayHeight)
                .setOrigin(0, 0)
                .setStrokeStyle(1.5, 0x886644);

            btnImg.on('pointerdown', () => {
                btnImg.setAlpha(0.7);
                if (this.bgm) this.bgm.stop();
                SaveManager.saveGame(this);
                TransitionManager.transitionTo(this, 'DojoScene', {
                    isTower: this.isTower
                });
            });
            btnImg.on('pointerup', () => btnImg.setAlpha(1.0));
            btnImg.on('pointerout', () => btnImg.setAlpha(1.0));

            this.mainContainer.add([btnImg, strokeRect]);
        }

        // ── 📊 イラスト左側: 時空館ステータス表示 ──
        const statCardX = 14;
        const statCardY = 56;
        const statCardW = 236;
        const statCardH = 118;

        const statCardBg = this.add.rectangle(statCardX, statCardY, statCardW, statCardH, 0x000000, 0.72)
            .setOrigin(0, 0)
            .setStrokeStyle(1.4, 0xaa88dd);
        this.mainContainer.add(statCardBg);

        const currentLvl = jState.sharedLevel || 1;
        const currentWins = jState.sharedLevelWins || 0;
        const reqWins = currentLvl;

        const statItems = [
            { label: '共通キャラLv', val: `Lv.${currentLvl} (${currentWins}/${reqWins})`, color: '#ffffff', valColor: '#66ffcc' },
            { label: '近接攻撃Lv', val: `Lv.${jState.sharedMeleeLevel || 1}`, color: '#ffbbbb', valColor: '#ff8888' },
            { label: '遠隔攻撃Lv', val: `Lv.${jState.sharedRangedLevel || 1}`, color: '#bbddff', valColor: '#66ccff' },
            { label: '限定SP', val: `${Math.floor(jState.limitedSp || 0).toLocaleString()}`, color: '#ffee88', valColor: '#ffea44' }
        ];

        statItems.forEach((item, idx) => {
            const iy = statCardY + 16 + idx * 26;
            const lbl = this.add.text(statCardX + 12, iy, item.label, {
                fontFamily: FONT_MAIN,
                fontSize: '13px',
                color: item.color,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0, 0.5);

            const val = this.add.text(statCardX + statCardW - 12, iy, item.val, {
                fontFamily: FONT_MAIN,
                fontSize: '14px',
                color: item.valColor,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(1, 0.5);

            this.mainContainer.add([lbl, val]);
        });

        // ══════════════════════════════════════════════════
        // 🎮 【画面下部 2/3 エリア (y = 345 〜 960)】 メニュー＆操作エリア
        // ══════════════════════════════════════════════════

        // ── 1. モード切替タブ（ソロ / トリオ / クインテッド） ──
        const modeTabY = bannerVisibleH + 18; // 約 358px
        const modes = [
            { id: 'solo', label: 'ソロ（1人）' },
            { id: 'trio', label: 'トリオ（3人）' },
            { id: 'quintuple', label: 'クインテッド（5人）' }
        ];
        const modeTabW = (width - 24) / modes.length;
        const modeTabH = 40;

        modes.forEach((m, idx) => {
            const tx = 12 + modeTabW * idx + modeTabW / 2;
            const isSelected = this.currentMode === m.id;

            const bg = this.add.rectangle(tx, modeTabY, modeTabW - 6, modeTabH, isSelected ? 0x5a2d8a : 0x1a1328)
                .setStrokeStyle(1.8, isSelected ? 0xdd99ff : 0x3d2c54)
                .setInteractive({ useHandCursor: true });

            const txt = this.add.text(tx, modeTabY, m.label, {
                fontFamily: FONT_MAIN,
                fontSize: '15px',
                color: isSelected ? '#ffffff' : '#9988bb',
                fontStyle: isSelected ? 'bold' : 'normal'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                if (this.currentMode !== m.id) {
                    this.currentMode = m.id;
                    this.drawScene();
                }
            });

            this.mainContainer.add([bg, txt]);
        });

        // ── 2. サブナビゲーション（Wasp / Witch / 参加キャラ選択） ──
        const subNavY = modeTabY + 44; // 約 402px
        const subTabs = [
            { id: 'wasp', label: '⚔️ Waspアタック' },
            { id: 'witch', label: '🧙‍♀️ Witchアタック' },
            { id: 'formation', label: '👥 参加キャラ選択' }
        ];
        const subTabW = (width - 24) / subTabs.length;
        const subTabH = 36;

        subTabs.forEach((tab, idx) => {
            const tx = 12 + subTabW * idx + subTabW / 2;
            const isCurrent = this.currentTab === tab.id;

            const bg = this.add.rectangle(tx, subNavY, subTabW - 6, subTabH, isCurrent ? 0x3d2c5e : 0x161022)
                .setStrokeStyle(1.8, isCurrent ? 0xffcc44 : 0x3a284c)
                .setInteractive({ useHandCursor: true });

            const txt = this.add.text(tx, subNavY, tab.label, {
                fontFamily: FONT_MAIN,
                fontSize: '14px',
                color: isCurrent ? '#ffee55' : '#aa99bb',
                fontStyle: isCurrent ? 'bold' : 'normal'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                if (this.currentTab !== tab.id) {
                    this.currentTab = tab.id;
                    this.drawScene();
                }
            });

            this.mainContainer.add([bg, txt]);
        });

        // ── 4. メインコンテンツ描画 (y ≈ 440 〜) ──
        const contentTopY = subNavY + 24;

        if (this.currentTab === 'wasp') {
            this.drawWaspAttackView(contentTopY);
        } else if (this.currentTab === 'witch') {
            this.drawWitchAttackView(contentTopY);
        } else if (this.currentTab === 'formation') {
            this.drawFormationView(contentTopY);
        }
    }

    getModeData() {
        if (this.currentMode === 'solo') return this.jState.solo;
        if (this.currentMode === 'trio') return this.jState.trio;
        return this.jState.quintuple;
    }

    getModeLabel() {
        if (this.currentMode === 'solo') return 'ソロ（1人）';
        if (this.currentMode === 'trio') return 'トリオ（3人）';
        return 'クインテッド（5人）';
    }

    getSelectedFloor(type) {
        const modeData = this.getModeData();
        const maxFloor = type === 'wasp' ? (modeData.waspFloor || 1) : (modeData.witchFloor || 1);
        if (!this._selectedFloor) this._selectedFloor = {};
        const key = `${this.currentMode}_${type}`;
        if (this._selectedFloor[key] === undefined || this._selectedFloor[key] === null) {
            this._selectedFloor[key] = maxFloor;
        }
        if (this._selectedFloor[key] > maxFloor) {
            this._selectedFloor[key] = maxFloor;
        }
        if (this._selectedFloor[key] < 1) {
            this._selectedFloor[key] = 1;
        }
        return this._selectedFloor[key];
    }

    setSelectedFloor(type, val) {
        const modeData = this.getModeData();
        const maxFloor = type === 'wasp' ? (modeData.waspFloor || 1) : (modeData.witchFloor || 1);
        if (!this._selectedFloor) this._selectedFloor = {};
        const key = `${this.currentMode}_${type}`;
        this._selectedFloor[key] = Math.max(1, Math.min(maxFloor, val));
    }

    /**
     * ⚔️ Waspアタック（雑魚戦）ビュー
     */
    drawWaspAttackView(topY) {
        const { width, height } = this.scale;
        const modeData = this.getModeData();
        const maxFloor = modeData.waspFloor || 1;
        const floor = this.getSelectedFloor('wasp');
        const isCleared = floor < maxFloor;

        const enemy1Idx = floor % 9;
        const enemy2Idx = floor % 8;
        const attrIdx = floor % 5;
        const attr = ATTR_INFO[attrIdx];
        const enemy1Name = ENEMY_TYPES[enemy1Idx];
        const enemy2Name = ENEMY_TYPES[enemy2Idx];

        let totalEnemyCount = 9 + floor;
        if (this.currentMode === 'trio') totalEnemyCount = 27 + floor * 3;
        if (this.currentMode === 'quintuple') totalEnemyCount = 45 + floor * 5;

        // チャレンジ情報パネル (下端が y ≈ 590px 付近)
        const panelW = width - 24;
        const panelH = 150;
        const panelY = topY + panelH / 2 + 4;

        const panelBg = this.add.rectangle(width / 2, panelY, panelW, panelH, isCleared ? 0x141828 : 0x181328, 0.96)
            .setStrokeStyle(2, isCleared ? 0x446699 : 0xcc8833);
        this.mainContainer.add(panelBg);

        const panelTop = panelY - panelH / 2;

        // 階層切り替えUI: [≪10] [◀] 地下 XX 階 [▶] [10≫]
        const canPrev = floor > 1;
        const canNext = floor < maxFloor;
        const canPrev10 = floor > 10;
        const canNext10 = floor + 10 <= maxFloor;

        // [≪10]
        const btnPrev10 = this.add.text(32, panelTop + 38, '≪', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canPrev10 ? '#ffffff' : '#555566',
            backgroundColor: canPrev10 ? '#2a2244' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canPrev10) {
            btnPrev10.setInteractive({ useHandCursor: true });
            btnPrev10.on('pointerdown', () => {
                this.setSelectedFloor('wasp', floor - 10);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnPrev10);

        // [◀]
        const btnPrev = this.add.text(66, panelTop + 38, '◀', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canPrev ? '#ffffff' : '#555566',
            backgroundColor: canPrev ? '#3d2c5e' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canPrev) {
            btnPrev.setInteractive({ useHandCursor: true });
            btnPrev.on('pointerdown', () => {
                this.setSelectedFloor('wasp', floor - 1);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnPrev);

        // 地下XX階
        const floorText = this.add.text(145, panelTop + 38, `地下 ${floor} 階`, {
            fontFamily: FONT_MAIN,
            fontSize: '25px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: isCleared ? '#446699' : '#cc8833', blur: 6, fill: true }
        }).setOrigin(0.5);
        this.mainContainer.add(floorText);

        // [▶]
        const btnNext = this.add.text(224, panelTop + 38, '▶', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canNext ? '#ffffff' : '#555566',
            backgroundColor: canNext ? '#3d2c5e' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canNext) {
            btnNext.setInteractive({ useHandCursor: true });
            btnNext.on('pointerdown', () => {
                this.setSelectedFloor('wasp', floor + 1);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnNext);

        // [10≫]
        const btnNext10 = this.add.text(258, panelTop + 38, '≫', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canNext10 ? '#ffffff' : '#555566',
            backgroundColor: canNext10 ? '#2a2244' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canNext10) {
            btnNext10.setInteractive({ useHandCursor: true });
            btnNext10.on('pointerdown', () => {
                this.setSelectedFloor('wasp', floor + 10);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnNext10);

        // 状態バッジ（未踏破 / 突破済）
        if (isCleared) {
            const badgeBg = this.add.rectangle(356, panelTop + 38, 142, 26, 0x1a2e4c, 0.95)
                .setStrokeStyle(1.2, 0x5599ee);
            const badgeTxt = this.add.text(356, panelTop + 38, '✨ 突破済（報酬なし）', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#88ccff', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.mainContainer.add([badgeBg, badgeTxt]);

            // [最新階へ] ボタン
            const btnLatest = this.add.text(458, panelTop + 38, '最新階', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#ddbbff', backgroundColor: '#331a4c', padding: { x: 6, y: 4 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            btnLatest.on('pointerdown', () => {
                this.setSelectedFloor('wasp', maxFloor);
                this.drawScene();
            });
            this.mainContainer.add(btnLatest);
        } else {
            const badgeBg = this.add.rectangle(330, panelTop + 38, 78, 26, 0x884411, 0.95)
                .setStrokeStyle(1.2, 0xffaa44);
            const badgeTxt = this.add.text(330, panelTop + 38, '⚔️ 未踏破', {
                fontFamily: FONT_MAIN, fontSize: '12px', color: '#ffee88', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.mainContainer.add([badgeBg, badgeTxt]);
        }

        // デバッグ時のみ階層スキップボタンを表示
        if (GlobalState.IS_DEBUG_MODE) {
            const plusBtn = this.add.text(502, panelTop + 38, '[+1]', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#aaffaa', backgroundColor: '#113322', padding: { x: 4, y: 3 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            plusBtn.on('pointerdown', () => {
                modeData.waspFloor = maxFloor + 1;
                this.setSelectedFloor('wasp', modeData.waspFloor);
                SaveManager.saveGame(this);
                this.drawScene();
            });
            this.mainContainer.add(plusBtn);
        }

        // 出現敵情報
        const wave2EnemyCount = Math.round(totalEnemyCount * 1.2);
        const grandTotalCount = totalEnemyCount + wave2EnemyCount;
        const infoText1 = this.add.text(20, panelTop + 80, `属性: ${attr.name}　|　敵数: 計${grandTotalCount}体 (W1: ${totalEnemyCount}体, W2: ${wave2EnemyCount}体)`, {
            fontFamily: FONT_MAIN, fontSize: '15px', color: attr.color, fontStyle: 'bold'
        });
        const infoText2 = this.add.text(20, panelTop + 110, `構成: ① ${enemy1Name} (RC%9)　② ${enemy2Name} (RC%8)`, {
            fontFamily: FONT_MAIN, fontSize: '14px', color: '#eaeaff'
        });
        this.mainContainer.add([infoText1, infoText2]);

        // 挑戦ボタン
        const startBtnY = panelTop + panelH + 34;
        const btnBgColor = isCleared ? 0x223555 : 0x8a2444;
        const btnStrokeColor = isCleared ? 0x5588cc : 0xff88aa;
        const startBtn = this.add.rectangle(width / 2, startBtnY, width * 0.85, 52, btnBgColor)
            .setStrokeStyle(2, btnStrokeColor)
            .setInteractive({ useHandCursor: true });

        const btnLabel = isCleared ? '⚔️ 再挑戦する（報酬はありません！）' : '⚔️ この階層に挑戦する';
        const startBtnText = this.add.text(width / 2, startBtnY, btnLabel, {
            fontFamily: FONT_MAIN, fontSize: isCleared ? '18px' : '20px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.startJikukanBattle('wasp', floor);
        });
        startBtn.on('pointerover', () => startBtn.setAlpha(0.85));
        startBtn.on('pointerout', () => startBtn.setAlpha(1.0));
        this.mainContainer.add([startBtn, startBtnText]);

        // 下部説明カード
        const rewardCardY = startBtnY + 54;
        this.drawRewardAndRulesCard(rewardCardY, floor, isCleared);
    }

    /**
     * 🧙‍♀️ Witchアタック（魔女戦）ビュー
     */
    drawWitchAttackView(topY) {
        const { width, height } = this.scale;
        const modeData = this.getModeData();
        const maxFloor = modeData.witchFloor || 1;
        const floor = this.getSelectedFloor('witch');
        const isCleared = floor < maxFloor;

        const attrIdx = floor % 5;
        const patternIdx = floor % 6;
        const attr = ATTR_INFO[attrIdx];
        const patternName = WITCH_PATTERNS[patternIdx];

        const panelW = width - 24;
        const panelH = 150;
        const panelY = topY + panelH / 2 + 4;

        const panelBg = this.add.rectangle(width / 2, panelY, panelW, panelH, isCleared ? 0x1a182e : 0x201228, 0.96)
            .setStrokeStyle(2, isCleared ? 0x665588 : 0xcc4488);
        this.mainContainer.add(panelBg);

        const panelTop = panelY - panelH / 2;

        // 階層切り替えUI: [≪10] [◀] 地下 XX 階 [▶] [10≫]
        const canPrev = floor > 1;
        const canNext = floor < maxFloor;
        const canPrev10 = floor > 10;
        const canNext10 = floor + 10 <= maxFloor;

        // [≪10]
        const btnPrev10 = this.add.text(32, panelTop + 38, '≪', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canPrev10 ? '#ffffff' : '#555566',
            backgroundColor: canPrev10 ? '#2a2244' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canPrev10) {
            btnPrev10.setInteractive({ useHandCursor: true });
            btnPrev10.on('pointerdown', () => {
                this.setSelectedFloor('witch', floor - 10);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnPrev10);

        // [◀]
        const btnPrev = this.add.text(66, panelTop + 38, '◀', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canPrev ? '#ffffff' : '#555566',
            backgroundColor: canPrev ? '#3d2c5e' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canPrev) {
            btnPrev.setInteractive({ useHandCursor: true });
            btnPrev.on('pointerdown', () => {
                this.setSelectedFloor('witch', floor - 1);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnPrev);

        // 地下XX階
        const floorText = this.add.text(145, panelTop + 38, `地下 ${floor} 階`, {
            fontFamily: FONT_MAIN,
            fontSize: '25px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: isCleared ? '#665588' : '#cc4488', blur: 6, fill: true }
        }).setOrigin(0.5);
        this.mainContainer.add(floorText);

        // [▶]
        const btnNext = this.add.text(224, panelTop + 38, '▶', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canNext ? '#ffffff' : '#555566',
            backgroundColor: canNext ? '#3d2c5e' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canNext) {
            btnNext.setInteractive({ useHandCursor: true });
            btnNext.on('pointerdown', () => {
                this.setSelectedFloor('witch', floor + 1);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnNext);

        // [10≫]
        const btnNext10 = this.add.text(258, panelTop + 38, '≫', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: canNext10 ? '#ffffff' : '#555566',
            backgroundColor: canNext10 ? '#2a2244' : '#11111e', padding: { x: 7, y: 5 }
        }).setOrigin(0.5);
        if (canNext10) {
            btnNext10.setInteractive({ useHandCursor: true });
            btnNext10.on('pointerdown', () => {
                this.setSelectedFloor('witch', floor + 10);
                this.drawScene();
            });
        }
        this.mainContainer.add(btnNext10);

        // 状態バッジ（未踏破 / 突破済）
        if (isCleared) {
            const badgeBg = this.add.rectangle(356, panelTop + 38, 142, 26, 0x241d3a, 0.95)
                .setStrokeStyle(1.2, 0x8877bb);
            const badgeTxt = this.add.text(356, panelTop + 38, '✨ 突破済（報酬なし）', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#c8bbff', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.mainContainer.add([badgeBg, badgeTxt]);

            // [最新階へ] ボタン
            const btnLatest = this.add.text(458, panelTop + 38, '最新階', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#ddbbff', backgroundColor: '#331a4c', padding: { x: 6, y: 4 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            btnLatest.on('pointerdown', () => {
                this.setSelectedFloor('witch', maxFloor);
                this.drawScene();
            });
            this.mainContainer.add(btnLatest);
        } else {
            const badgeBg = this.add.rectangle(330, panelTop + 38, 78, 26, 0x6e205c, 0.95)
                .setStrokeStyle(1.2, 0xff88cc);
            const badgeTxt = this.add.text(330, panelTop + 38, '🧙 未踏破', {
                fontFamily: FONT_MAIN, fontSize: '12px', color: '#ffccff', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.mainContainer.add([badgeBg, badgeTxt]);
        }

        // デバッグ時のみ階層スキップボタンを表示
        if (GlobalState.IS_DEBUG_MODE) {
            const plusBtn = this.add.text(502, panelTop + 38, '[+1]', {
                fontFamily: FONT_MAIN, fontSize: '11px', color: '#aaffaa', backgroundColor: '#113322', padding: { x: 4, y: 3 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            plusBtn.on('pointerdown', () => {
                modeData.witchFloor = maxFloor + 1;
                this.setSelectedFloor('witch', modeData.witchFloor);
                SaveManager.saveGame(this);
                this.drawScene();
            });
            this.mainContainer.add(plusBtn);
        }

        const infoText1 = this.add.text(20, panelTop + 80, `魔女属性: ${attr.name} (RC%5)`, {
            fontFamily: FONT_MAIN, fontSize: '16px', color: attr.color, fontStyle: 'bold'
        });
        const infoText2 = this.add.text(20, panelTop + 110, `行動パターン: ${patternName} (RC%6)`, {
            fontFamily: FONT_MAIN, fontSize: '14px', color: '#ffccff'
        });
        this.mainContainer.add([infoText1, infoText2]);

        // 挑戦ボタン
        const startBtnY = panelTop + panelH + 34;
        const btnBgColor = isCleared ? 0x2e2544 : 0x6e205c;
        const btnStrokeColor = isCleared ? 0x8877bb : 0xff88cc;
        const startBtn = this.add.rectangle(width / 2, startBtnY, width * 0.85, 52, btnBgColor)
            .setStrokeStyle(2, btnStrokeColor)
            .setInteractive({ useHandCursor: true });

        const btnLabel = isCleared ? '🧙‍♀️ 再挑戦する（報酬はありません！）' : '🧙‍♀️ 魔女に挑戦する';
        const startBtnText = this.add.text(width / 2, startBtnY, btnLabel, {
            fontFamily: FONT_MAIN, fontSize: isCleared ? '18px' : '20px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.startJikukanBattle('witch', floor);
        });
        startBtn.on('pointerover', () => startBtn.setAlpha(0.85));
        startBtn.on('pointerout', () => startBtn.setAlpha(1.0));
        this.mainContainer.add([startBtn, startBtnText]);

        // 下部説明カード
        const rewardCardY = startBtnY + 54;
        this.drawRewardAndRulesCard(rewardCardY, floor, isCleared);
    }

    /**
     * 下部説明・報酬カード (文字を大きく！)
     */
    drawRewardAndRulesCard(startY, floor, isCleared = false) {
        const { width, height } = this.scale;
        const rewardSp = 1000 + (100 * floor);

        const cardW = width - 24;
        const cardH = height - startY - 20;
        const cardY = startY + cardH / 2;

        const cardBg = this.add.rectangle(width / 2, cardY, cardW, cardH, 0x120e20, 0.94)
            .setStrokeStyle(1.5, 0x483a60);
        this.mainContainer.add(cardBg);

        const top = cardY - cardH / 2 + 12;

        let rTitleText = `💰 クリア報酬: 限定SP +${rewardSp.toLocaleString()}`;
        let bTextStr = `🎁 特別フロア報酬: ${this.getNextFloorBonusText(floor)}`;
        let rTitleColor = '#ffea66';
        let bTextColor = '#ff99dd';

        if (isCleared) {
            rTitleText = '💰 クリア報酬: 突破済（報酬はありません！）';
            bTextStr = '🎁 特別フロア報酬: 突破済（報酬はありません！）';
            rTitleColor = '#ffaa66';
            bTextColor = '#9999bb';
        }

        const rTitle = this.add.text(20, top, rTitleText, {
            fontFamily: FONT_MAIN, fontSize: '17px', color: rTitleColor, fontStyle: 'bold'
        });

        const bText = this.add.text(20, top + 28, bTextStr, {
            fontFamily: FONT_MAIN, fontSize: '14px', color: bTextColor, fontStyle: 'bold'
        });

        const line = this.add.line(0, 0, 20, top + 54, width - 20, top + 54, 0x3d3050).setOrigin(0, 0);

        const ruleTitle = this.add.text(20, top + 64, '【時空館の心得】', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: '#66ffcc', fontStyle: 'bold'
        });

        const rules = [
            '・食料や時間の消費はなく、常時全力＆全快で何度でも挑めます。',
            '・敗北や撤退によるペナルティは一切ありません。',
            '・突破済みのフロアには何度でも再挑戦可能です（腕試し用・報酬なし）。',
            '・未踏破フロアで「現在の共有Lv」回勝利するごとに共有LvがUPします。',
            '・獲得した「限定SP」や「レリクス・宝石」は通常モードへ持ち帰れます。'
        ];

        rules.forEach((r, i) => {
            const ruleLine = this.add.text(20, top + 90 + i * 22, r, {
                fontFamily: FONT_MAIN, fontSize: '13px', color: '#d0c8e8'
            });
            this.mainContainer.add(ruleLine);
        });

        this.mainContainer.add([rTitle, bText, line, ruleTitle]);
    }

    getNextFloorBonusText(floor) {
        const bonuses = [];
        if (floor % 100 === 0) bonuses.push('GRレリクス');
        if (floor % 99 === 0) bonuses.push('ダイヤ/アレキサンドライト');
        if (floor % 50 === 0) bonuses.push('MRレリクス');
        if (floor % 32 === 0) bonuses.push('高級宝石(ルビー等)');
        if (floor % 20 === 0) bonuses.push('URレリクス');
        if (floor % 10 === 0) bonuses.push('SSRレリクス');
        if (floor % 8 === 0) bonuses.push('中級宝石(オニキス等)');
        if (floor % 5 === 0) bonuses.push('SRレリクス');
        if (floor % 2 === 0) bonuses.push('初級宝石(ガーネット等)');
        if (floor % 1 === 0) bonuses.push('Rレリクス');

        return bonuses.length > 0 ? bonuses.slice(0, 2).join(' ＋ ') : 'Rレリクス';
    }

    /**
     * 👥 参加キャラ選択 ＆ 縦長・上下スワイプ隊列編成ビュー
     * 縦に広く取り、直感的に上下スワイプで前衛/後衛を切り替える！
     * 操作時は即時自動セーブ（保存ボタン不要）
     */
    drawFormationView(topY) {
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        // 案内テキスト (操作説明)
        const guideY = topY + 12;
        const guideText = this.add.text(width / 2, guideY, `【${this.getModeLabel()}】 上下スワイプで位置移動 ／ タップで装備・ステータス`, {
            fontFamily: FONT_MAIN, fontSize: '13px', color: '#ffddaa', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.mainContainer.add(guideText);

        // スロット一覧の構築
        let slots = [];
        if (this.currentMode === 'solo') {
            slots = [{ charId: this.jState.solo.charId, lane: this.jState.solo.lane, isFront: this.jState.solo.isFront, index: 0 }];
        } else if (this.currentMode === 'trio') {
            slots = (this.jState.trio.formation || []).map((f, i) => ({ ...f, index: i }));
        } else {
            slots = (this.jState.quintuple.formation || []).map((f, i) => ({ ...f, index: i }));
        }

        const slotCount = slots.length;
        const slotW = (width - 24) / Math.max(1, slotCount);

        // 縦長コートエリア (y = 485 〜 870, 高さ約385px！)
        const courtTop = guideY + 18;
        const courtH = height - courtTop - 65; // 約 380px
        const courtY = courtTop + courtH / 2;

        // コート背景（上部＝前衛ゾーン、下部＝後衛ゾーン）
        const courtBg = this.add.rectangle(width / 2, courtY, width - 24, courtH, 0x140e22, 0.95)
            .setStrokeStyle(1.8, 0x554477);
        this.mainContainer.add(courtBg);

        // 前衛・後衛の境界ライン（中央に点線風）
        const midY = courtTop + courtH * 0.48;
        const divLine = this.add.line(0, 0, 18, midY, width - 18, midY, 0x483a60).setOrigin(0, 0);
        this.mainContainer.add(divLine);

        // ゾーンラベル
        const frontLabel = this.add.text(22, courtTop + 10, '⚔️ 前衛エリア', {
            fontFamily: FONT_MAIN, fontSize: '13px', color: '#ff8888', fontStyle: 'bold'
        });
        const backLabel = this.add.text(22, midY + 8, '🏹 後衛エリア', {
            fontFamily: FONT_MAIN, fontSize: '13px', color: '#88bbff', fontStyle: 'bold'
        });
        this.mainContainer.add([frontLabel, backLabel]);

        // 各キャラのY座標ターゲット (前衛時 vs 後衛時)
        const frontY = courtTop + courtH * 0.24;
        const backY = midY + courtH * 0.24;

        slots.forEach((slot, i) => {
            const sx = 12 + slotW * i + slotW / 2;
            const cData = gs.characters[slot.charId] || gs.characters['001'];
            const targetY = slot.isFront ? frontY : backY;

            // キャラクターカードコンテナ
            const charCard = this.add.container(sx, targetY);

            // カード背景
            const cardW = slotW - 8;
            const cardH = 124;
            const cardBg = this.add.rectangle(0, 0, cardW, cardH, slot.isFront ? 0x2e1533 : 0x152238, 0.96)
                .setStrokeStyle(2, slot.isFront ? 0xff6688 : 0x4488ff)
                .setInteractive({ useHandCursor: true });
            charCard.add(cardBg);

            // レーン表示ラベル
            let laneLabel = '';
            if (slotCount === 1) {
                laneLabel = '中央';
            } else if (slotCount === 3) {
                const names = ['上段', '中段', '下段'];
                laneLabel = names[i] || '';
            } else if (slotCount === 5) {
                const names = ['最上段', '上段', '中段', '下段', '最下段'];
                laneLabel = names[i] || '';
            }

            // 位置ラベル (レーン + 前衛/後衛)
            const posText = this.add.text(0, -cardH / 2 + 12, `${laneLabel} ${slot.isFront ? '【前衛】' : '【後衛】'}`, {
                fontFamily: FONT_MAIN,
                fontSize: slotCount === 5 ? '10px' : '13px',
                color: slot.isFront ? '#ff99aa' : '#99ccff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            charCard.add(posText);

            // 顔画像
            const faceKey = `face_${cData.id}`;
            if (this.textures.exists(faceKey)) {
                const face = this.add.image(0, -6, faceKey);
                const maxDim = slotCount === 5 ? 44 : 54;
                const scale = maxDim / Math.max(face.width, face.height);
                face.setScale(scale);
                charCard.add(face);
            }

            // キャラ名
            const nameText = this.add.text(0, cardH / 2 - 30, cData.name, {
                fontFamily: FONT_MAIN,
                fontSize: slotCount === 5 ? '12px' : '14px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            charCard.add(nameText);

            // 操作ガイド (スワイプ方向 ＆ タップで装備変更)
            const arrowText = this.add.text(0, cardH / 2 - 12, slot.isFront ? '▼後衛へ / 👆装備' : '▲前衛へ / 👆装備', {
                fontFamily: FONT_MAIN,
                fontSize: slotCount === 5 ? '9px' : '11px',
                color: '#ffea66',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            charCard.add(arrowText);

            // ── 上下スワイプ＆タップ判定の実装 ──
            let startY = 0;
            let startTime = 0;

            cardBg.on('pointerdown', (pointer) => {
                startY = pointer.y;
                startTime = Date.now();
                cardBg.setAlpha(0.8);
            });

            cardBg.on('pointerup', (pointer) => {
                cardBg.setAlpha(1.0);
                const dy = pointer.y - startY;
                const dt = Date.now() - startTime;

                // 上スワイプ (前衛へ移動)
                if (dy < -20 && dt < 800) {
                    if (!slot.isFront) {
                        this.setSlotPosition(slot, i, true);
                    }
                }
                // 下スワイプ (後衛へ移動)
                else if (dy > 20 && dt < 800) {
                    if (slot.isFront) {
                        this.setSlotPosition(slot, i, false);
                    }
                }
                // タップ (短時間・低移動量ならステータス・装備変更画面を開く！)
                else if (Math.abs(dy) < 15 && dt < 500) {
                    this.showCharacterDetail(slot.charId);
                }
            });

            // ── 「🔄 変更」ボタン（コート下部に固定配置） ──
            const changeBtnY = courtTop + courtH - 26;
            const changeBtn = this.add.text(sx, changeBtnY, '🔄 変更', {
                fontFamily: FONT_MAIN,
                fontSize: slotCount === 5 ? '12px' : '14px',
                color: '#ffffff',
                backgroundColor: '#8a2454',
                padding: { x: slotCount === 5 ? 6 : 12, y: 5 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            changeBtn.on('pointerdown', () => {
                this.openCharacterSelectModal(i);
            });
            changeBtn.on('pointerover', () => changeBtn.setAlpha(0.85));
            changeBtn.on('pointerout', () => changeBtn.setAlpha(1.0));

            this.mainContainer.add([charCard, changeBtn]);
        });

        // 画面最下部: 自動保存の案内
        const autoSaveNotice = this.add.text(width / 2, height - 20, '※配置やキャラ変更はリアルタイムに自動保存されます', {
            fontFamily: FONT_MAIN, fontSize: '12px', color: '#8877aa'
        }).setOrigin(0.5);
        this.mainContainer.add(autoSaveNotice);
    }

    /** キャラクターのステータス詳細・装備画面（レリクス・宝石着脱）を表示 */
    showCharacterDetail(charId, slideDir = null) {
        this.currentDetailCharId = charId;
        this.detailViewContainer.setVisible(true);
        CharacterDetailHelper.showDetailView(this, charId, 'JikukanScene', this.detailViewContainer, () => {
            this.detailViewContainer.removeAll(true);
            this.detailViewContainer.setVisible(false);
            this.currentDetailCharId = null;
            this.drawScene();
        }, slideDir);
    }

    showFriendshipView(charId) {
        CharacterDetailHelper.showFriendshipView(this, charId, 'JikukanScene', this.detailViewContainer, () => {
            this.showCharacterDetail(charId);
        });
    }

    showElementResistanceView(charId) {
        CharacterDetailHelper.showElementResistanceView(this, charId, 'JikukanScene', this.detailViewContainer, () => {
            this.showCharacterDetail(charId);
        });
    }

    /** スロットの前衛/後衛切り替え＆即時自動セーブ */
    setSlotPosition(slot, slotIndex, isFront) {
        slot.isFront = isFront;
        if (this.currentMode === 'solo') {
            this.jState.solo.isFront = isFront;
        } else if (this.currentMode === 'trio') {
            this.jState.trio.formation[slotIndex].isFront = isFront;
        } else {
            this.jState.quintuple.formation[slotIndex].isFront = isFront;
        }
        SaveManager.saveGame(this);
        this.drawScene();
        this.showToast(isFront ? '【前衛】に配置しました！' : '【後衛】に配置しました！');
    }

    createJumpingCharacters(centerX, baseY) {
        const gs = GlobalState.getInstance();
        let charIds = [];
        if (this.currentMode === 'solo') {
            charIds = [this.jState.solo.charId || '001'];
        } else if (this.currentMode === 'trio') {
            charIds = (this.jState.trio.formation || []).map(f => f.charId);
        } else {
            charIds = (this.jState.quintuple.formation || []).map(f => f.charId);
        }

        const count = charIds.length;
        const spacing = count === 5 ? 26 : 38;
        const startX = centerX - ((count - 1) * spacing) / 2;

        charIds.forEach((cid, i) => {
            const x = startX + i * spacing;
            const y = baseY;

            let textureKey = `mini_${cid}`;
            if (!this.textures.exists(textureKey)) {
                textureKey = `face_${cid}`;
            }

            if (this.textures.exists(textureKey)) {
                const sprite = this.add.sprite(x, y, textureKey, 0).setOrigin(0.5, 0.5);
                const baseScale = count === 5 ? 0.38 : 0.48;
                if (textureKey.startsWith('mini_')) {
                    sprite.setScale(baseScale);
                } else {
                    sprite.setScale(baseScale * 0.75);
                }

                this.tweens.add({
                    targets: sprite,
                    y: y - 16,
                    duration: 380,
                    ease: 'Sine.easeOut',
                    yoyo: true,
                    repeat: -1,
                    delay: i * 140
                });

                this.mainContainer.add(sprite);
            }
        });
    }

    openCharacterSelectModal(slotIndex) {
        const { width, height } = this.scale;
        const gs = GlobalState.getInstance();

        if (this.charModalContainer) {
            this.charModalContainer.destroy();
        }

        this.charModalContainer = this.add.container(0, 0).setDepth(20000);

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.85)
            .setOrigin(0, 0)
            .setInteractive();
        this.charModalContainer.add(backdrop);

        const modalW = width * 0.9;
        const modalH = height * 0.65;
        const modalBox = this.add.rectangle(width / 2, height / 2, modalW, modalH, 0x191426)
            .setStrokeStyle(2, 0xcc88ff);
        this.charModalContainer.add(modalBox);

        const title = this.add.text(width / 2, height / 2 - modalH / 2 + 24, '参加キャラクターを選択', {
            fontFamily: FONT_MAIN, fontSize: '18px', color: '#ffccff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.charModalContainer.add(title);

        const closeBtn = this.add.text(width / 2 + modalW / 2 - 24, height / 2 - modalH / 2 + 24, '✕', {
            fontFamily: FONT_MAIN, fontSize: '20px', color: '#ffaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.charModalContainer.destroy());
        this.charModalContainer.add(closeBtn);

        const eligibleCharIds = ['001', '002', '003', '004', '005', '007', '008', '009', '010', '011'];
        const availableChars = [];
        for (const cid of eligibleCharIds) {
            const c = gs.characters[cid];
            if (c && (c.hasAccompanied || c.isJoined || cid === '001' || GlobalState.IS_DEBUG_MODE)) {
                availableChars.push(c);
            }
        }

        const cols = 4;
        const cellW = (modalW - 24) / cols;
        const cellH = 80;
        const startX = width / 2 - modalW / 2 + 12 + cellW / 2;
        const startY = height / 2 - modalH / 2 + 70 + cellH / 2;

        // 現在のモードの編成リストを取得
        let currentPartyIds = [];
        if (this.currentMode === 'solo') {
            currentPartyIds = [this.jState.solo.charId];
        } else if (this.currentMode === 'trio') {
            currentPartyIds = (this.jState.trio.formation || []).map(f => f.charId);
        } else {
            currentPartyIds = (this.jState.quintuple.formation || []).map(f => f.charId);
        }

        availableChars.forEach((c, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = startX + col * cellW;
            const cy = startY + row * cellH;

            const charBtn = this.add.container(cx, cy);

            const inSlotIdx = currentPartyIds.indexOf(c.id);
            const isInParty = inSlotIdx !== -1;
            const isCurrentSlot = (this.currentMode === 'solo' && inSlotIdx === 0) || (inSlotIdx === slotIndex);

            const cBg = this.add.rectangle(0, 0, cellW - 6, cellH - 6, isInParty ? 0x1d2238 : 0x271e3d)
                .setStrokeStyle(1.5, isInParty ? 0x5588cc : 0x554477)
                .setInteractive({ useHandCursor: true });
            charBtn.add(cBg);

            const faceKey = `face_${c.id}`;
            if (this.textures.exists(faceKey)) {
                const face = this.add.image(0, -10, faceKey);
                const scale = 40 / Math.max(face.width, face.height);
                face.setScale(scale);
                charBtn.add(face);
            }

            const name = this.add.text(0, 20, c.name, {
                fontFamily: FONT_MAIN, fontSize: '12px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            charBtn.add(name);

            if (isInParty) {
                const badgeBg = this.add.rectangle(cellW / 2 - 24, -cellH / 2 + 10, 40, 16, isCurrentSlot ? 0x883344 : 0x225577, 0.95);
                const badgeText = this.add.text(cellW / 2 - 24, -cellH / 2 + 10, isCurrentSlot ? '選択中' : '参加中', {
                    fontFamily: FONT_MAIN, fontSize: '9px', color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0.5);
                charBtn.add([badgeBg, badgeText]);
            }

            cBg.on('pointerdown', () => {
                if (this.currentMode === 'solo') {
                    this.jState.solo.charId = c.id;
                    this.showToast(`${c.name} に変更しました！`);
                } else if (this.currentMode === 'trio') {
                    const existingIdx = (this.jState.trio.formation || []).findIndex((f, idx) => idx !== slotIndex && f.charId === c.id);
                    if (existingIdx !== -1) {
                        const oldCharId = this.jState.trio.formation[slotIndex].charId;
                        this.jState.trio.formation[existingIdx].charId = oldCharId;
                        this.jState.trio.formation[slotIndex].charId = c.id;
                        const oldChar = gs.characters[oldCharId] || { name: '仲間' };
                        this.showToast(`${c.name} と ${oldChar.name} を入れ替えました！`);
                    } else if (this.jState.trio.formation[slotIndex]) {
                        this.jState.trio.formation[slotIndex].charId = c.id;
                        this.showToast(`${c.name} に変更しました！`);
                    }
                } else {
                    const existingIdx = (this.jState.quintuple.formation || []).findIndex((f, idx) => idx !== slotIndex && f.charId === c.id);
                    if (existingIdx !== -1) {
                        const oldCharId = this.jState.quintuple.formation[slotIndex].charId;
                        this.jState.quintuple.formation[existingIdx].charId = oldCharId;
                        this.jState.quintuple.formation[slotIndex].charId = c.id;
                        const oldChar = gs.characters[oldCharId] || { name: '仲間' };
                        this.showToast(`${c.name} と ${oldChar.name} を入れ替えました！`);
                    } else if (this.jState.quintuple.formation[slotIndex]) {
                        this.jState.quintuple.formation[slotIndex].charId = c.id;
                        this.showToast(`${c.name} に変更しました！`);
                    }
                }
                SaveManager.saveGame(this);
                this.charModalContainer.destroy();
                this.drawScene();
            });

            cBg.on('pointerover', () => cBg.setStrokeStyle(2, 0x00ffff));
            cBg.on('pointerout', () => cBg.setStrokeStyle(1.5, isInParty ? 0x5588cc : 0x554477));

            this.charModalContainer.add(charBtn);
        });
    }

    /**
     * 🎉 時空館バトル勝利時のリザルトモーダル
     */
    showVictoryModal(result) {
        const { width, height } = this.scale;

        if (this.victoryModalContainer) {
            this.victoryModalContainer.destroy();
        }

        this.victoryModalContainer = this.add.container(0, 0).setDepth(30000);

        // 暗幕
        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.82)
            .setOrigin(0, 0)
            .setInteractive();
        this.victoryModalContainer.add(backdrop);

        // ウィンドウ枠
        const modalW = width * 0.88;
        const modalH = height * 0.56;
        const modalBox = this.add.rectangle(width / 2, height / 2, modalW, modalH, 0x1a1228)
            .setStrokeStyle(2.5, 0xffcc44);
        this.victoryModalContainer.add(modalBox);

        const top = height / 2 - modalH / 2 + 24;

        // 突破済みフロアの再挑戦勝利モーダル
        if (result.isRechallenge) {
            const titleText = this.add.text(width / 2, top, `🎉 地下 ${result.floor} 階 突破！（再挑戦）`, {
                fontFamily: FONT_MAIN,
                fontSize: '24px',
                color: '#ffee44',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5);
            this.victoryModalContainer.add(titleText);

            const msgBoxY = top + 60;
            const msgBox = this.add.rectangle(width / 2, msgBoxY + 50, modalW - 32, 110, 0x120c1e, 0.9)
                .setStrokeStyle(1.2, 0x5577aa);
            this.victoryModalContainer.add(msgBox);

            const notice1 = this.add.text(width / 2, msgBoxY + 28, '✨ 突破済（報酬はありません！）', {
                fontFamily: FONT_MAIN, fontSize: '18px', color: '#ffcc66', fontStyle: 'bold'
            }).setOrigin(0.5);

            const notice2 = this.add.text(width / 2, msgBoxY + 68, 'このフロアはすでに突破済みのため、報酬はありません。\n戦闘のテストやDPS測定などに何度でもご活用ください！', {
                fontFamily: FONT_MAIN, fontSize: '13px', color: '#d0c8e8', align: 'center', lineSpacing: 5
            }).setOrigin(0.5);
            this.victoryModalContainer.add([notice1, notice2]);

            // 閉じるボタン
            const closeBtnY = height / 2 + modalH / 2 - 34;
            const closeBtn = this.add.rectangle(width / 2, closeBtnY, modalW * 0.7, 44, 0x2e3a5a)
                .setStrokeStyle(2, 0x6688cc)
                .setInteractive({ useHandCursor: true });
            const closeBtnText = this.add.text(width / 2, closeBtnY, '閉じる', {
                fontFamily: FONT_MAIN, fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            closeBtn.on('pointerdown', () => {
                this.victoryModalContainer.destroy();
                this.drawScene();
            });
            closeBtn.on('pointerover', () => closeBtn.setAlpha(0.85));
            closeBtn.on('pointerout', () => closeBtn.setAlpha(1.0));

            this.victoryModalContainer.add([closeBtn, closeBtnText]);
            return;
        }

        // 勝利タイトル
        const titleText = this.add.text(width / 2, top, `🎉 地下 ${result.floor} 階 突破！`, {
            fontFamily: FONT_MAIN,
            fontSize: '26px',
            color: '#ffee44',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.victoryModalContainer.add(titleText);

        // 成長表示カード
        const growBoxY = top + 55;
        const growBox = this.add.rectangle(width / 2, growBoxY + 32, modalW - 32, 70, 0x120c1e, 0.9)
            .setStrokeStyle(1.2, 0x775599);
        this.victoryModalContainer.add(growBox);

        let lvUpHeader = '';
        let skillUpStr = '';
        let skillColor = '#ffffff';

        if (result.isLevelUp) {
            lvUpHeader = `全員共通キャラLv: Lv.${result.sharedLevel} (+1UP!)`;
            if (result.levelUpSkill === 'melee') {
                skillUpStr = `近接攻撃Lv.${result.sharedMeleeLevel} (+1UP!) / 遠隔攻撃Lv.${result.sharedRangedLevel}`;
                skillColor = '#ff9999';
            } else if (result.levelUpSkill === 'ranged') {
                skillUpStr = `近接攻撃Lv.${result.sharedMeleeLevel} / 遠隔攻撃Lv.${result.sharedRangedLevel} (+1UP!)`;
                skillColor = '#99ccff';
            } else {
                skillUpStr = `近接攻撃Lv.${result.sharedMeleeLevel} (MAX) / 遠隔攻撃Lv.${result.sharedRangedLevel} (MAX)`;
                skillColor = '#ffcc66';
            }
        } else {
            lvUpHeader = `全員共通キャラLv: Lv.${result.sharedLevel} (${result.currentWins}/${result.requiredWins})`;
            const remaining = (result.requiredWins || result.sharedLevel) - (result.currentWins || 0);
            skillUpStr = `次のレベルアップまで あと ${remaining} 勝！`;
            skillColor = '#aaccff';
        }

        const lvUpText1 = this.add.text(width / 2, growBoxY + 18, lvUpHeader, {
            fontFamily: FONT_MAIN, fontSize: '16px', color: '#66ffcc', fontStyle: 'bold'
        }).setOrigin(0.5);

        const lvUpText2 = this.add.text(width / 2, growBoxY + 44, skillUpStr, {
            fontFamily: FONT_MAIN, fontSize: '13px', color: skillColor, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.victoryModalContainer.add([lvUpText1, lvUpText2]);

        // 獲得限定SP
        const spBoxY = growBoxY + 86;
        const spAmount = result.earnedSp || result.spGained || 0;
        const spText = this.add.text(width / 2, spBoxY, `💰 獲得限定SP: +${spAmount.toLocaleString()} SP`, {
            fontFamily: FONT_MAIN, fontSize: '18px', color: '#ffea44', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.victoryModalContainer.add(spText);

        // 獲得アイテム・ドロップ品
        const dropBoxY = spBoxY + 36;
        const dropTitle = this.add.text(width / 2, dropBoxY, '🎁 特別フロア獲得アイテム', {
            fontFamily: FONT_MAIN, fontSize: '14px', color: '#ff99dd', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.victoryModalContainer.add(dropTitle);

        if (result.drops && result.drops.length > 0) {
            result.drops.forEach((drop, idx) => {
                const dy = dropBoxY + 28 + idx * 26;
                const dName = drop.type === 'gem' ? `[宝石] ${drop.name} (Rank ${drop.rank})` : `[レリクス] ${drop.name} (Rank ${drop.rank})`;
                const itemText = this.add.text(width / 2, dy, dName, {
                    fontFamily: FONT_MAIN, fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0.5);
                this.victoryModalContainer.add(itemText);
            });
        } else {
            const noItemText = this.add.text(width / 2, dropBoxY + 28, '（特別フロア到達時に豪華報酬を獲得できます）', {
                fontFamily: FONT_MAIN, fontSize: '12px', color: '#887799'
            }).setOrigin(0.5);
            this.victoryModalContainer.add(noItemText);
        }

        // フッターボタン（「もどる」と「次のフロアに挑む」）
        const closeBtnY = height / 2 + modalH / 2 - 34;
        const btnW = modalW * 0.44;
        const btnH = 44;

        // ◀ もどる ボタン
        const backBtnX = width / 2 - modalW * 0.24;
        const backBtn = this.add.rectangle(backBtnX, closeBtnY, btnW, btnH, 0x223555)
            .setStrokeStyle(2, 0x5588cc)
            .setInteractive({ useHandCursor: true });
        const backBtnText = this.add.text(backBtnX, closeBtnY, '◀ もどる', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        backBtn.on('pointerdown', () => {
            this.victoryModalContainer.destroy();
            this.drawScene();
        });
        backBtn.on('pointerover', () => backBtn.setAlpha(0.85));
        backBtn.on('pointerout', () => backBtn.setAlpha(1.0));

        // ⚔️ 次のフロアに挑む ボタン
        const nextFloor = result.nextFloor || (result.clearedFloor ? result.clearedFloor + 1 : null);
        const nextBtnX = width / 2 + modalW * 0.24;
        const nextBtn = this.add.rectangle(nextBtnX, closeBtnY, btnW, btnH, 0x8a2444)
            .setStrokeStyle(2, 0xff88aa)
            .setInteractive({ useHandCursor: true });
        const nextBtnText = this.add.text(nextBtnX, closeBtnY, '⚔️ 次のフロアへ', {
            fontFamily: FONT_MAIN, fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        nextBtn.on('pointerdown', () => {
            this.victoryModalContainer.destroy();
            if (nextFloor) {
                this.setSelectedFloor(this.currentTab, nextFloor);
                this.startJikukanBattle(this.currentTab, nextFloor);
            } else {
                this.drawScene();
            }
        });
        nextBtn.on('pointerover', () => nextBtn.setAlpha(0.85));
        nextBtn.on('pointerout', () => nextBtn.setAlpha(1.0));

        this.victoryModalContainer.add([backBtn, backBtnText, nextBtn, nextBtnText]);
    }

    showToast(message) {
        const { width, height } = this.scale;

        const toast = this.add.text(width / 2, height * 0.90, message, {
            fontFamily: FONT_MAIN,
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000dd',
            padding: { x: 18, y: 9 },
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(99999);

        this.toastContainer.add(toast);

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: height * 0.86,
            duration: 1800,
            ease: 'Power2',
            onComplete: () => toast.destroy()
        });
    }
}
