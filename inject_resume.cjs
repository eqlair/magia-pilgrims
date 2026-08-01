const fs = require('fs');
let code = fs.readFileSync('src/scenes/AdventureScene.js', 'utf8');

const injection = `        // 撤退または全滅からの復帰
        if (data && (data.isGameOver || data.isRetreated)) {
            if (this._preBattleSnapshot) {
                this.restoreSnapshot(this._preBattleSnapshot);
                this._preBattleSnapshot = null;
            }
            const msg = data.isGameOver ? '部隊は全滅した…' : '戦闘から撤退した。';
            // 簡単なメッセージ表示
            const txt = this.add.text(this.scale.width/2, this.scale.height/2, msg, {
                fontSize: '32px', color: '#ff4444', backgroundColor: '#000', padding: {x:20, y:20}
            }).setOrigin(0.5).setDepth(3000);
            this.time.delayedCall(3000, () => txt.destroy());
            
            // BGM再開
            this.sound.stopAll();
            if (this.cache.audio.exists('bgm_hexen')) {
                const mapBgm = this.sound.add('bgm_hexen', { loop: true, volume: 0 });
                mapBgm.play();
                this.tweens.add({ targets: mapBgm, volume: 0.5, duration: 1000 });
            }
            return;
        }

        // 夜探索からの勝利復帰
        if (data && data.isNightExploration && data.fromBattle) {
            const gs = GlobalState.getInstance();
            gs.food = 140; // 食料回復
            this._updateFoodDisplay();
            
            // レリクス・宝石ドロップ生成
            const drops = RelicGenerator.generateBattleDrops();
            if (!gs.inventory) gs.inventory = { relics: [], gems: [] };
            drops.forEach(drop => {
                if (drop.type === 'gem') gs.inventory.gems.push(drop);
                else gs.inventory.relics.push(drop);
            });
            
            this.scene.pause();
            this.scene.launch('EventScene', {
                events: [
                    { cmd: 'bg', key: 'ev_expr' },
                    { cmd: 'text', name: '', body: '夜の危険な探索を乗り越え、\\n充分な量の食料を手に入れた！' }
                ],
                returnScene: 'AdventureScene',
                fromExploration: true,
                explorationDrops: drops
            });
            return;
        }
`;

code = code.replace("        // 他のシーン（EventSceneなど）から復帰したときの処理\n        this.events.on('resume', (scene, data) => {", "        // 他のシーン（EventSceneなど）から復帰したときの処理\n        this.events.on('resume', (scene, data) => {\n" + injection);
fs.writeFileSync('src/scenes/AdventureScene.js', code, 'utf8');
console.log('Done');
