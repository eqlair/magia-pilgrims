import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { RelicGenerator } from '../systems/RelicGenerator';


export default class ResultScene extends Phaser.Scene {
    constructor() {
        super('ResultScene');
    }

    init(data) {
        this.party = data.party || ['001'];
        this.rawEarnedExp = data.earnedExp || 0;
        this.earnedExp = data.earnedExp || 0;
        this.earnedSp = data.earnedSp || 0;
        this.returnScene = data.returnScene || 'AdventureScene';
        this.isTutorial = data.isTutorial || false;
        this.isBoss = data.isBoss || false;
        this.isRelicScreen = false;

        this.relicAnimationPlaying = false;
    }

    create() {
        TransitionManager.fadeIn(this);

        const { width, height } = this.scale;
        
        this.globalState = GlobalState.getInstance();

        // 背景色
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

        // BGMを再生
        if (this.cache.audio.exists('bgm_result')) {
            const resultBgm = this.sound.add('bgm_result', { loop: false, volume: 0 });
            resultBgm.play();
            this.tweens.add({ targets: resultBgm, volume: 0.8, duration: 1000 });
        }

        // 取得経験値の2倍ブースト計算（①過去最高記録以下なら2倍！）
        const rawEarnedExp = this.rawEarnedExp || 0;
        this.isExpBoosted = (this.globalState.currentRunTotalExp || 0) < (this.globalState.maxPastExp || 0);
        this.earnedExp = this.globalState.addRunExp(rawEarnedExp);


        // 取得経験値の分配計算（パーティ人数 N + 1 で均等分配。ストックを+1人目のメンバーとする）
        const partySize = this.party.length || 1;
        const totalDivisor = partySize + 1; // メンバー + ストック(1人分)
        const expPerMember = Math.floor(this.earnedExp / totalDivisor);
        const stockExpAdd = this.earnedExp - (expPerMember * partySize); // 1人分（端数込み）をストック経験値へ加算

        this.globalState.stockExp += stockExpAdd;
        const stockExp = this.globalState.stockExp;

        // 上部テキスト
        this.add.text(width / 2, 80, 'BATTLE RESULT', {
            fontFamily: 'sans-serif', fontSize: '48px', color: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5);

        const boostText = this.isExpBoosted ? ' 🔥[2倍ボーナス発動中!]' : '';
        this.add.text(width / 2, 150, `獲得経験値：${this.earnedExp}${boostText}　獲得SP：${this.earnedSp}`, {
            fontFamily: 'sans-serif', fontSize: '18px', color: this.isExpBoosted ? '#ffdd00' : '#ffffff', fontStyle: this.isExpBoosted ? 'bold' : 'normal'
        }).setOrigin(0.5);

        this.add.text(width / 2, 190, `取得ストック経験値：${stockExpAdd}　SP：${stockExp}`, {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#aaaaff'
        }).setOrigin(0.5);


        const startY = 320;
        const spacingY = 120;

        this.memberUIs = [];

        let chrData = {};
        if (this.cache.json.exists('chr_data')) {
            chrData = this.cache.json.get('chr_data');
        }

        for (let i = 0; i < this.party.length; i++) {
            const charId = this.party[i];
            const stat = this.globalState.characters[charId] || this.globalState.createInitialCharData(charId, `Char ${charId}`, 1);
            if (!this.globalState.characters[charId]) {
                this.globalState.characters[charId] = stat;
            }
            
            // 現在のパーティメンバー同士の編成履歴（metCharacters）を更新
            for (const otherId of this.party) {
                if (otherId !== charId) {
                    if (!stat.metCharacters) stat.metCharacters = [];
                    if (!stat.metCharacters.includes(otherId)) {
                        stat.metCharacters.push(otherId);
                    }
                }
            }
            const cData = chrData[charId] || {};
            const charName = cData.name || stat.name || `Char ${charId}`;
            
            const y = startY + i * spacingY;
            const x = width / 2 - 200;

            // 顔画像
            const face = this.add.image(x, y, `face_${charId}`);
            face.setDisplaySize(80, 80);

            // キャラクター名
            const nameText = this.add.text(x + 60, y - 45, charName, {
                fontFamily: 'sans-serif', fontSize: '24px', color: '#ffccaa', fontStyle: 'bold'
            });

            // ガチャのレベルアップログの表示
            if (this.globalState.levelUpLogs) {
                const logs = this.globalState.levelUpLogs.filter(log => log.charId === charId);
                if (logs.length > 0) {
                    const logText = logs.map(l => l.text).join(' / ');
                    this.add.text(x + 60, y - 75, logText, {
                        fontFamily: 'sans-serif', fontSize: '20px', color: '#ffaa00', fontStyle: 'bold'
                    });
                }
            }

            // 現在のレベル
            const lvText = this.add.text(x + 200, y - 45, `Lv.${stat.level}`, {
                fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            });

            // 経験値バーの背景
            const barBg = this.add.rectangle(x + 60, y, 300, 20, 0x333333).setOrigin(0, 0.5);
            // 経験値バーの中身
            const barFill = this.add.rectangle(x + 60, y, 0, 20, 0x00ff00).setOrigin(0, 0.5);

            // 経験値テキスト
            const reqExp = this.globalState.getRequiredExp(stat.level);
            const expText = this.add.text(x + 60, y + 20, `EXP: ${Math.floor(stat.exp)} / ${reqExp}`, {
                fontFamily: 'sans-serif', fontSize: '20px', color: '#cccccc'
            });

            // レベルアップテキスト (経験値バーの上に配置)
            const levelUpText = this.add.text(x + 210, y - 30, 'LEVEL UP!', {
                fontFamily: 'sans-serif', fontSize: '32px', color: '#ff0000', fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setAlpha(0);

            this.memberUIs.push({
                charId,
                stat,
                lvText,
                barFill,
                expText,
                levelUpText,
                currentExp: stat.exp,
                targetExp: stat.exp + expPerMember
            });
        }

        // Tap to continue
        this.continueText = this.add.text(width / 2, height - 100, 'tap to continue', {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#aaaaaa'
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: this.continueText,
            alpha: 1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // アニメーション実行
        this.animateExp();

        // クリックで次へ
        this.input.on('pointerdown', () => {
            if (this.animating) {
                // アニメーションスキップ (即時反映)
                this.animating = false;
                if (this.expTween) this.expTween.stop();
                this.updateExpDisplay(1.0);
                this.applyFinalExp();
            } else if (!this.isRelicScreen) {
                this.showRelicDrops();
            } else {
                if (this.relicAnimationPlaying) return; // レリクス表示中はスキップ不可にするか、全部即表示するか。とりあえずスキップ不可

                // 白画面フェードアウトしてからシーン遷移
                const whiteScreen = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff)
                    .setAlpha(0).setDepth(9999);
                
                this.tweens.add({
                    targets: whiteScreen,
                    alpha: 1,
                    duration: 1000,
                    onComplete: () => {
                        const retParams = { fromBattle: true, party: this.party, isTutorialStart: this.isTutorial };
                        if (this.scene.isPaused(this.returnScene)) {
                            this.scene.stop();
                            this.scene.resume(this.returnScene, retParams);
                        } else {
                            TransitionManager.transitionTo(this, this.returnScene, retParams);
                        }


                    }
                });
            }
        });
    }

    showRelicDrops() {
        this.isRelicScreen = true;
        this.relicAnimationPlaying = true;

        if (this.continueText) this.continueText.destroy();

        const { width, height } = this.scale;
        
        // 半透明の黒背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(100);

        const drops = RelicGenerator.generateBattleDrops(this.isBoss);
        
        if (this.globalState.debugForceGemDrop) {
            drops.push(RelicGenerator.generateGem(1));
            this.globalState.debugForceGemDrop = false;
        }
        
        if (!this.globalState.inventory) {
            this.globalState.inventory = { relics: [], gems: [] };
        }
        
        // 分別して保存
        drops.forEach(drop => {
            if (drop.type === 'gem') {
                this.globalState.inventory.gems.push(drop);
            } else {
                this.globalState.inventory.relics.push(drop);
            }
        });

        let startY = height / 2 - (drops.length * 20);
        
        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i];
            let color = '#ffffff';
            if (drop.rank === 2) color = '#aaffaa';
            if (drop.rank === 3) color = '#aaaaff';

            const txt = this.add.text(width / 2, startY + (i * 40), `Rank${drop.rank}: ${drop.name}`, {
                fontFamily: 'sans-serif', fontSize: '24px', color: color
            }).setOrigin(0.5).setDepth(101).setAlpha(0);

            this.tweens.add({
                targets: txt,
                alpha: 1,
                y: startY + (i * 40) - 10,
                duration: 500,
                delay: i * 200
            });
        }

        const totalDelay = drops.length * 200 + 500;
        
        this.time.delayedCall(totalDelay, () => {
            this.add.text(width / 2, startY + (drops.length * 40) + 20, `${drops.length}個のレリクスを見つけた。`, {
                fontFamily: 'sans-serif', fontSize: '28px', color: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(101);

            this.continueText = this.add.text(width / 2, height - 100, 'tap to next', {
                fontFamily: 'sans-serif', fontSize: '32px', color: '#aaaaaa'
            }).setOrigin(0.5).setAlpha(0).setDepth(101);

            this.tweens.add({
                targets: this.continueText,
                alpha: 1,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });

            this.relicAnimationPlaying = false;
        });
    }

    animateExp() {
        this.animating = true;
        
        // 事前に各キャラの初期状態を保存し、最終状態をシミュレーション
        for (const ui of this.memberUIs) {
            ui.baseLevel = ui.stat.level;
            ui.baseExp = ui.currentExp;
            
            let simLevel = ui.baseLevel;
            let simExp = ui.baseExp + (ui.targetExp - ui.currentExp); // 得た経験値の合計
            
            while (simExp >= this.globalState.getRequiredExp(simLevel)) {
                simExp -= this.globalState.getRequiredExp(simLevel);
                simLevel++;
            }
            ui.finalLevel = simLevel;
            ui.finalExp = simExp;
        }

        // 1秒かけて経験値が上昇
        this.expTween = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 1500,
            onUpdate: (tween) => {
                const progress = tween.getValue();
                this.updateExpDisplay(progress);
            },
            onComplete: () => {
                if (this.animating) {
                    this.animating = false;
                    this.updateExpDisplay(1.0);
                    this.applyFinalExp();
                }
            }
        });
    }

    updateExpDisplay(progress) {
        for (const ui of this.memberUIs) {
            let totalAdded = (ui.targetExp - ui.currentExp) * progress;
            let currentDisplayExp = ui.baseExp + totalAdded;
            let currentDisplayLevel = ui.baseLevel;

            while (currentDisplayExp >= this.globalState.getRequiredExp(currentDisplayLevel)) {
                currentDisplayExp -= this.globalState.getRequiredExp(currentDisplayLevel);
                currentDisplayLevel++;
            }

            let reqExp = this.globalState.getRequiredExp(currentDisplayLevel);

            ui.lvText.setText(`Lv.${currentDisplayLevel}`);
            ui.expText.setText(`EXP: ${Math.floor(currentDisplayExp)} / ${reqExp}`);
            
            const fillRatio = Math.min(1, currentDisplayExp / reqExp);
            ui.barFill.width = 300 * fillRatio;

            if (currentDisplayLevel > ui.baseLevel && ui.levelUpText.alpha === 0) {
                ui.levelUpText.setAlpha(1);
                this.tweens.add({
                    targets: ui.levelUpText,
                    scale: {from: 1.5, to: 1},
                    duration: 300,
                    ease: 'Bounce.easeOut'
                });
            }
        }
    }

    applyFinalExp() {
        for (const ui of this.memberUIs) {
            let currentLevel = ui.stat.level;
            while (currentLevel < ui.finalLevel) {
                const oldStats = this.globalState.calcStats(ui.charId, this.party);
                ui.stat.level++; // calcStatsのためにレベルを上げる
                const newStats = this.globalState.calcStats(ui.charId, this.party);
                
                // 最大HP/SPの上昇分を現在値に加算
                ui.stat.currentHp += (newStats.maxHp - oldStats.maxHp);
                ui.stat.currentSp += (newStats.maxSp - oldStats.maxSp);
                
                // レベルアップ時に友好度ボーナスポイントを1獲得
                ui.stat.friendshipPoints = (ui.stat.friendshipPoints || 0) + 1;
                
                currentLevel++;
            }
            ui.stat.level = ui.finalLevel;
            ui.stat.exp = ui.finalExp;
        }
        SaveManager.saveGame();
    }
}

