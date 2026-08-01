
const fs = require('fs');
let code = fs.readFileSync('src/scenes/AdventureScene.js', 'utf8');

// 1. Remove duplicate this.showTimeSignal();
code = code.replace(
    /this\.moveToHex\(this\.grid\[this\.playerRow\]\[this\.playerCol\], false\);\s+\/\/\s*最初の時報を表示\s+this\.showTimeSignal\(\);\s+\/\/ -- カメラ設定 --/g,
    'this.moveToHex(this.grid[this.playerRow][this.playerCol], false);\n        // -- カメラ設定 --'
);

// 2. Set this._pendingTarot = true at game start
code = code.replace(
    /this\.party = this\._initData\.party \|\| \['001'\];\s+this\.moveToHex/g,
    'this.party = this._initData.party || [\'001\'];\n        this._pendingTarot = true;\n        this.moveToHex'
);

// 3. Fix fadeRect
code = code.replace(
    /const fadeRect = this\.add\.rectangle\(width \/ 2, height \/ 2, width, height, 0xffffff\)\s*\n\s*\.setAlpha\(0\)\.setDepth\(9999\);\s*\n\s*this\.tweens\.add\(\{[\s\S]*?onComplete: \(\) => \{\s*this\.scene\.pause\(\);\s*\/\/ 復帰時に白画面が残らないよう、即座に破棄\s*fadeRect\.destroy\(\);/g,
    'const fadeRect = this.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0xffffff)\\n            .setAlpha(0).setDepth(9999).setScrollFactor(0);\\n\\n        this.persistentFadeRect = fadeRect;\\n\\n        this.tweens.add({\\n            targets: fadeRect,\\n            alpha: 1,\\n            duration: 800,\\n            ease: \\'Sine.easeInOut\\',\\n            onComplete: () => {\\n                this.scene.pause();\\n                // 復帰時にチラつくのを防ぐため、fadeRectは即座に破棄せず、resume時に破棄する'
);

// 4. Handle persistentFadeRect in resume
const resumeTarget = 'if (data && data.startBattle) {\\n                console.log(\\'Battle Started!\\', data);\\n                \\n                // 属性番号(1~5)を文字列に変換\\n                const attrMap = { 1: \\'red\\', 2: \\'purple\\', 3: \\'green\\', 4: \\'yellow\\', 5: \\'blue\\' };\\n                const attrStr = attrMap[data.enemyAttr] || \\'red\\';\\n\\n                const config = {\\n                    rule: 0, // 殲滅\\n                    attribute: attrStr,\\n                    enemyCount: this.globalEnemyCount,\\n                    waveCount: Math.ceil(this.globalWaveCount),\\n                    enemyLevel: this.globalEnemyLevel + (data.enemyLevel || 1) - 1,\\n                    majoLevel: data.majoLevel || 0,\\n                    isOverlay: true, // AdventureSceneの上に重ねて表示\\n                    returnScene: \\'AdventureScene\\', // 終了後に戻るシーン\\n                    party: this.party // 現在のパーティ情報を渡す\\n                };\\n\\n                // AdventureSceneをポーズし、BattleSceneを重ねて起動\\n                this.scene.pause();\\n                this.scene.launch(\\'BattleScene\\', config);\\n                \\n            } else {\\n                if (this._pendingTarot) {\\n                    this._pendingTarot = false;\\n                    this.scene.pause();\\n                    this.scene.launch(\\'TarotScene\\', { returnScene: \\'AdventureScene\\', party: this.party });\\n                } else {\\n                    // 通常のマップ復帰\\n                    TransitionManager.fadeIn(this);\\n                }\\n            }';

const resumeReplacement = 'if (data && data.startBattle) {\\n                console.log(\\'Battle Started!\\', data);\\n                \\n                const attrMap = { 1: \\'red\\', 2: \\'purple\\', 3: \\'green\\', 4: \\'yellow\\', 5: \\'blue\\' };\\n                const attrStr = attrMap[data.enemyAttr] || \\'red\\';\\n\\n                const config = {\\n                    rule: 0,\\n                    attribute: attrStr,\\n                    enemyCount: this.globalEnemyCount,\\n                    waveCount: Math.ceil(this.globalWaveCount),\\n                    enemyLevel: this.globalEnemyLevel + (data.enemyLevel || 1) - 1,\\n                    majoLevel: data.majoLevel || 0,\\n                    isOverlay: true,\\n                    returnScene: \\'AdventureScene\\',\\n                    party: this.party\\n                };\\n\\n                this.scene.pause();\\n                this.scene.launch(\\'BattleScene\\', config);\\n            } else {\\n                if (this.persistentFadeRect) {\\n                    this.tweens.add({\\n                        targets: this.persistentFadeRect,\\n                        alpha: 0,\\n                        duration: 800,\\n                        onComplete: () => {\\n                            if (this.persistentFadeRect) {\\n                                this.persistentFadeRect.destroy();\\n                                this.persistentFadeRect = null;\\n                            }\\n                        }\\n                    });\\n                } else {\\n                    TransitionManager.fadeIn(this);\\n                }\\n\\n                if (this._pendingTarot) {\\n                    this._pendingTarot = false;\\n                    this.scene.pause();\\n                    this.scene.launch(\\'TarotScene\\', { returnScene: \\'AdventureScene\\', party: this.party });\\n                }\\n            }\\n            \\n            if (data && data.fromBattle && this.persistentFadeRect) {\\n                this.persistentFadeRect.destroy();\\n                this.persistentFadeRect = null;\\n            }';

code = code.replace(resumeTarget, resumeReplacement);
fs.writeFileSync('src/scenes/AdventureScene.js', code, 'utf8');
console.log('Update Complete');

