import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';
import { RelicGenerator } from '../systems/RelicGenerator';
import { CharacterLossManager } from '../systems/CharacterLossManager';


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
        this.enemyLevel = data.enemyLevel || 1;
        this.majoLevel = data.majoLevel || 0;
        this.isNightExploration = data.isNightExploration || false;
        this.isTower21Boss = data.isTower21Boss || false;
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

        this.add.text(width / 2, 190, `取得ストック経験値：${stockExpAdd}`, {
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

                // ★ SP0のキャラクターがいるかチェックし、復帰・ロスト選択ダイアログを表示
                this.showSpZeroRevivalSequence(() => {
                    this.proceedToReturnScene();
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

        const drops = RelicGenerator.generateBattleDrops(this.isBoss, this.enemyLevel);
        
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
            let rankLabel = `[Rank ${drop.rank}]`;
            if (drop.type === 'gem') {
                color = '#44ffff';
                rankLabel = `[宝石]`;
            } else if (drop.rank === 2) {
                color = '#aaffaa'; // R
                rankLabel = `[R]`;
            } else if (drop.rank === 3) {
                color = '#88ccff'; // SR
                rankLabel = `[SR]`;
            } else if (drop.rank === 4) {
                color = '#ffcc00'; // SSR
                rankLabel = `[SSR]`;
            } else if (drop.rank >= 5) {
                color = '#ff55ff'; // UR
                rankLabel = `[UR]`;
            } else {
                rankLabel = `[N]`;
            }

            const txt = this.add.text(width / 2, startY + (i * 40), `${rankLabel} ${drop.name}`, {
                fontFamily: 'sans-serif', fontSize: '24px', color: color, fontStyle: drop.rank >= 4 ? 'bold' : 'normal'
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
                
                // レベルアップ時に編成中の仲間からランダムに1人選んで友好度+1（一人旅や全員上限の場合はボーナスポイント獲得）
                this.globalState.allocateLevelUpFriendship(ui.charId, this.party);
                
                currentLevel++;
            }
            ui.stat.level = ui.finalLevel;
            ui.stat.exp = ui.finalExp;
        }
        SaveManager.saveGame();
    }

    proceedToReturnScene(retParamsOverride = null) {
        // 白画面フェードアウトしてからシーン遷移
        const whiteScreen = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff)
            .setAlpha(0).setDepth(9999);
        
        this.tweens.add({
            targets: whiteScreen,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                const retParams = retParamsOverride || { 
                    fromBattle: true, 
                    party: this.party, 
                    isTutorialStart: this.isTutorial,
                    isNightExploration: this.isNightExploration,
                    fromTower21Boss: this.isTower21Boss
                };
                if (this.scene.isPaused(this.returnScene)) {
                    this.scene.stop();
                    this.scene.resume(this.returnScene, retParams);
                } else {
                    TransitionManager.transitionTo(this, this.returnScene, retParams);
                }
            }
        });
    }

    /**
     * 精神力(SP)が0のキャラクターに対する2000SP復帰・ロスト確認シーケンス
     */
    showSpZeroRevivalSequence(onDone) {
        const gs = this.globalState;
        const spZeroMembers = (this.party || []).filter(id => {
            const c = gs.characters[id];
            return c && (c.currentSp || 0) <= 0;
        });

        if (spZeroMembers.length === 0) {
            onDone();
            return;
        }

        const { width, height } = this.scale;
        const DEPTH = 10000;

        // 全面真っ黒な背景
        const blackBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
            .setDepth(DEPTH).setInteractive();

        // 不穏な静寂（BGM停止）
        if (this.sound) this.sound.stopAll();

        let currentIndex = 0;
        const container = this.add.container(0, 0).setDepth(DEPTH + 1);

        const processMember = () => {
            if (currentIndex >= spZeroMembers.length) {
                // 全員の処理が終了
                container.destroy();
                blackBg.destroy();
                onDone();
                return;
            }

            container.removeAll(true);
            const charId = spZeroMembers[currentIndex];
            const charData = gs.characters[charId];
            const charName = charData ? charData.name : `Char ${charId}`;
            const isShion = (charId === '001');

            const startY = height / 2 - 120;

            // キャラクター顔画像（少し暗め・悲痛な演出）
            const face = this.add.image(width / 2, startY, `face_${charId}`)
                .setDisplaySize(100, 100).setTint(0x666666);
            container.add(face);

            // メッセージ本文
            const msgText = this.add.text(width / 2, startY + 90, 
                `${charName} は SP 2000 を使って\n回復させないと復帰できません。`, {
                fontFamily: 'sans-serif',
                fontSize: '22px',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 10
            }).setOrigin(0.5);
            container.add(msgText);

            // 所持SP表示
            const stockSpText = this.add.text(width / 2, startY + 170, `所持SP：${Math.floor(gs.stockSp || 0).toLocaleString()}`, {
                fontFamily: 'sans-serif',
                fontSize: '20px',
                color: '#aaaaff'
            }).setOrigin(0.5);
            container.add(stockSpText);

            // エラーメッセージ（SP不足時に冷酷に表示される）
            const errorText = this.add.text(width / 2, startY + 215, '', {
                fontFamily: 'sans-serif',
                fontSize: '20px',
                color: '#ff4444',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(errorText);

            // ボタン配置
            const btnY = startY + 280;
            
            // 「はい」ボタン
            const yesBtn = this.add.text(width / 2 - 90, btnY, '　はい　', {
                fontFamily: 'sans-serif',
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#222222',
                padding: { x: 16, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            
            // 「いいえ」ボタン
            const noBtn = this.add.text(width / 2 + 90, btnY, ' いいえ ', {
                fontFamily: 'sans-serif',
                fontSize: '24px',
                color: '#cccccc',
                backgroundColor: '#222222',
                padding: { x: 16, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            container.add([yesBtn, noBtn]);

            // 「はい」を押したときの処理
            yesBtn.on('pointerdown', () => {
                if ((gs.stockSp || 0) < 2000) {
                    // ★ 普段なら押せないのに押せてしまい、冷酷に「SPが足りません」と表示されるのみ
                    errorText.setColor('#ff4444').setText('SPが足りません');
                    return;
                }

                // SPが足りている場合：2000消費して精神力を全快
                gs.stockSp -= 2000;
                const stats = gs.calcStats(charId, this.party);
                const maxSp = stats ? stats.maxSp : (charData?.maxSp || 500);
                if (charData) {
                    charData.currentSp = maxSp;
                    if ((charData.currentHp || 0) <= 0) {
                        charData.currentHp = Math.floor((stats?.maxHp || charData.maxHp || 1000) * 0.2); // HPも20%回復
                    }
                }
                stockSpText.setText(`所持SP：${Math.floor(gs.stockSp || 0).toLocaleString()}`);
                SaveManager.saveGame();

                // 復帰通知
                yesBtn.disableInteractive();
                noBtn.disableInteractive();
                errorText.setColor('#88ff88').setText(`${charName} の精神力が全回復しました。`);
                this.time.delayedCall(1500, () => {
                    currentIndex++;
                    processMember();
                });
            });

            // 「いいえ」を押したときの処理（諦める）
            noBtn.on('pointerdown', () => {
                yesBtn.disableInteractive();
                noBtn.disableInteractive();

                if (isShion) {
                    // 紫苑（001）がSP0で諦めた場合 ➔ リスポーンイベント（event_resp / event_tow_res）へ直行
                    errorText.setColor('#ff4444').setText('紫苑は力尽きてしまった……');
                    this.time.delayedCall(1800, () => {
                        container.destroy();
                        blackBg.destroy();
                        // AdventureSceneへ周回・リスポーンフラグを渡して復帰
                        const retParams = {
                            fromBattle: true,
                            isGameOver: true,
                            sionFinalSp: 0,
                            isSionMentalBreak: true,
                            party: this.party,
                            isNightExploration: this.isNightExploration,
                            fromTower21Boss: this.isTower21Boss
                        };
                        if (this.scene.isPaused(this.returnScene)) {
                            this.scene.stop();
                            this.scene.resume(this.returnScene, retParams);
                        } else {
                            TransitionManager.transitionTo(this, this.returnScene, retParams);
                        }
                    });
                    return;
                }

                // 仲間キャラクターの場合 ➔ 各キャラの固有一枚絵（evx）を表示して喪失イベントへ
                container.setVisible(false);
                blackBg.setVisible(false);

                CharacterLossManager.triggerSingleLoss(this, charId, () => {
                    // 喪失イベント終了後、パーティリストを更新して次のキャラへ
                    this.party = (this.party || []).filter(id => id !== charId);
                    blackBg.setVisible(true);
                    container.setVisible(true);
                    currentIndex++;
                    processMember();
                });
            });
        };

        processMember();
    }
}

