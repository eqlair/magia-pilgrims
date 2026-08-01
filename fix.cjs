const fs = require('fs');

let code = fs.readFileSync('src/scenes/AdventureScene.js', 'utf8');

// target 1
let t1 = `        const fadeRect = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
            .setAlpha(0).setDepth(9999);

        this.tweens.add({
            targets: fadeRect,
            alpha: 1,
            duration: 800,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.scene.pause();
                // 復帰時に白画面が残らないよう、即座に破棄
                fadeRect.destroy();`;

let r1 = `        const fadeRect = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)
            .setAlpha(0).setDepth(9999).setScrollFactor(0);

        this.persistentFadeRect = fadeRect;

        this.tweens.add({
            targets: fadeRect,
            alpha: 1,
            duration: 800,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.scene.pause();`;

// replace t1 using string split join for both newline styles
code = code.split(t1).join(r1);
code = code.split(t1.replace(/\n/g, '\r\n')).join(r1.replace(/\n/g, '\r\n'));

// target 2
let t2 = `            if (data && data.startBattle) {
                console.log('Battle Started!', data);
                
                // 属性番号(1~5)を文字列に変換
                const attrMap = { 1: 'red', 2: 'purple', 3: 'green', 4: 'yellow', 5: 'blue' };
                const attrStr = attrMap[data.enemyAttr] || 'red';

                const config = {
                    rule: 0, // 殲滅
                    attribute: attrStr,
                    enemyCount: this.globalEnemyCount,
                    waveCount: Math.ceil(this.globalWaveCount),
                    enemyLevel: this.globalEnemyLevel + (data.enemyLevel || 1) - 1,
                    majoLevel: data.majoLevel || 0,
                    isOverlay: true, // AdventureSceneの上に重ねて表示
                    returnScene: 'AdventureScene', // 終了後に戻るシーン
                    party: this.party // 現在のパーティ情報を渡す
                };

                // AdventureSceneをポーズし、BattleSceneを重ねて起動
                this.scene.pause();
                this.scene.launch('BattleScene', config);
                
            } else {
                if (this._pendingTarot) {
                    this._pendingTarot = false;
                    this.scene.pause();
                    this.scene.launch('TarotScene', { returnScene: 'AdventureScene', party: this.party });
                } else {
                    // 通常のマップ復帰
                    TransitionManager.fadeIn(this);
                }
            }`;

let r2 = `            if (data && data.startBattle) {
                console.log('Battle Started!', data);
                
                const attrMap = { 1: 'red', 2: 'purple', 3: 'green', 4: 'yellow', 5: 'blue' };
                const attrStr = attrMap[data.enemyAttr] || 'red';

                const config = {
                    rule: 0,
                    attribute: attrStr,
                    enemyCount: this.globalEnemyCount,
                    waveCount: Math.ceil(this.globalWaveCount),
                    enemyLevel: this.globalEnemyLevel + (data.enemyLevel || 1) - 1,
                    majoLevel: data.majoLevel || 0,
                    isOverlay: true,
                    returnScene: 'AdventureScene',
                    party: this.party
                };

                this.scene.pause();
                this.scene.launch('BattleScene', config);
            } else {
                if (this.persistentFadeRect) {
                    this.tweens.add({
                        targets: this.persistentFadeRect,
                        alpha: 0,
                        duration: 800,
                        onComplete: () => {
                            if (this.persistentFadeRect) {
                                this.persistentFadeRect.destroy();
                                this.persistentFadeRect = null;
                            }
                        }
                    });
                } else {
                    TransitionManager.fadeIn(this);
                }

                if (this._pendingTarot) {
                    this._pendingTarot = false;
                    this.scene.pause();
                    this.scene.launch('TarotScene', { returnScene: 'AdventureScene', party: this.party });
                }
            }
            
            if (data && data.fromBattle && this.persistentFadeRect) {
                this.persistentFadeRect.destroy();
                this.persistentFadeRect = null;
            }`;

code = code.split(t2).join(r2);
code = code.split(t2.replace(/\n/g, '\r\n')).join(r2.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/scenes/AdventureScene.js', code, 'utf8');
console.log('Update Complete');
