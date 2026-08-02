import Phaser from 'phaser';
import { TransitionManager } from '../systems/TransitionManager';
import { TutorialUI } from '../systems/TutorialUI';
import { TimeReporter } from '../systems/TimeReporter';
import { EventEngine } from '../systems/EventEngine';
import { SaveManager } from '../systems/SaveManager';
import { FONT_MAIN, fontSize } from '../config/GameFont';

/**
 * 各種汎用システムのデモ・テスト用シーン
 */
export default class DemoScene extends Phaser.Scene {
    constructor() {
        super('DemoScene');
    }

    init(data) {
        this._initData = data || {};
    }

    preload() {
        // メニューBGMがまだロードされていない場合のみロード
        if (!this.cache.audio.exists('bgm_menu')) {
            this.load.audio('bgm_menu', '/files/BGM/002_menu.mp3');
        }
    }

    create() {
        // 明転でフェードインして始まる
        TransitionManager.fadeIn(this);

        // メニューBGM再生（タイトルから引き継ぎ or 直接起動）
        if (!this.sound.get('bgm_menu') || !this.sound.get('bgm_menu').isPlaying) {
            const menuBgm = this.sound.add('bgm_menu', { loop: true, volume: 0 });
            menuBgm.play();
            this.tweens.add({ targets: menuBgm, volume: 0.7, duration: 800 });
            this._menuBgm = menuBgm;
        }

        const { width, height } = this.scale;

        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        this.add.text(width / 2, 40, 'システムデモ画面', {
            fontFamily: FONT_MAIN,
            fontSize: fontSize.medium(width), color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 75, '各ボタンで汎用システムをテストできます', {
            fontFamily: FONT_MAIN,
            fontSize: '16px', color: '#aaaaaa'
        }).setOrigin(0.5);

        const hasSave = SaveManager.hasSaveData();

        // ── ボタン定義 ──
        const buttons = [
            { label: '① 明転テスト\n（緑画面へ遷移）', color: 0x4a6fa5, action: () => TransitionManager.transitionTo(this, 'TransitionTestScene') },
            { label: '② 解説表示テスト', color: 0x3d7a47, action: () => this._testTutorial() },
            { label: '③ 時報テスト\n（12/1 午前）', color: 0x7a5c3d, action: () => this._testTimeReport() },
            { label: '④ イベントエンジン\nテスト', color: 0x6a3d7a, action: () => this._testEventEngine() },
            { label: '⑤ 疑似3Dマップテスト', color: 0x4a7a6a, action: () => this._testMap3D() },
            { label: '⑥ 戦闘システム基盤', color: 0xa54a4a, action: () => this._showBattleConfig() },
            { label: '⑦ アドベンチャーマップデモ', color: 0x5a5a2a, action: () => this._showAdventureConfig() },
            { label: '⑧ タロットカードを引く', color: 0x3d3d7a, action: () => TransitionManager.transitionTo(this, 'TarotScene', { returnScene: 'DemoScene' }) },
            { 
                label: hasSave ? '⑨ 再開\n（マップテスト最後のデータから復帰）' : '⑨ 再開\n（セーブデータなし）', 
                color: hasSave ? 0xd4af37 : 0x555555, 
                action: () => {
                    if (!hasSave) {
                        TutorialUI.show(this, '保存されたセーブデータがまだありません。\n\nマップを散策・移動すると自動セーブされます。', () => {});
                        return;
                    }
                    const saveData = SaveManager.loadGameData();
                    SaveManager.restoreGlobalState(saveData);
                    TransitionManager.transitionTo(this, 'AdventureScene', { fromSave: true });
                } 
            },
        ];

        buttons.forEach((btn, i) => {
            const y = 120 + i * 68; // Spacing adjusted for 9 buttons
            const bg = this.add.rectangle(width / 2, y, width * 0.82, 58, btn.color)
                .setInteractive({ useHandCursor: true });

            this.add.text(width / 2, y, btn.label, {
                fontFamily: FONT_MAIN,
                fontSize: '15px', color: '#ffffff', align: 'center'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                this.sound.stopByKey('bgm_menu');
                btn.action();
            });
            bg.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(btn.color).brighten(30).color));
            bg.on('pointerout', () => bg.setFillStyle(btn.color));
        });
    }


    _testTutorial() {
        TutorialUI.show(
            this,
            'これは「解説表示」システムのテストです。\n\n'
            + '画面の上に半透明ブラックがかかっています。\n'
            + '現在の画面のタップは無効化されています。\n\n'
            + '画面下の「tap to continue」をタップすると\nこの解説が終了し、元の画面に戻ります。',
            () => { console.log('解説表示: 終了'); }
        );
    }

    _testTimeReport() {
        // ゲーム内日付: 12月1日・フェイズ: 午前
        TimeReporter.show(this, 12, 1, '午前', () => {
            console.log('時報表示: 終了');
        });
    }

    _testEventEngine() {
        TransitionManager.transitionTo(this, 'OpScene');
    }

    _testMap3D() {
        TransitionManager.transitionTo(this, 'MapTestScene');
    }

    _showBattleConfig() {
        // すでに表示されていれば無視
        if (document.getElementById('battle-config-panel')) return;

        const { width, height } = this.scale;
        // 下のPhaserボタンへの入力貫通を防ぐ全画面遮断レイヤー
        const modalBlocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setDepth(999)
            .setInteractive();

        const panel = document.createElement('div');
        panel.id = 'battle-config-panel';
        panel.style.position = 'absolute';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        panel.style.border = '2px solid #a54a4a';
        panel.style.padding = '20px';
        panel.style.color = '#fff';
        panel.style.fontFamily = 'sans-serif';
        panel.style.zIndex = '1000';
        panel.style.width = '300px';

        // パネル上のタッチ・クリックイベントがCanvasへ透過しないようにブロック
        ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(evt => {
            panel.addEventListener(evt, (e) => e.stopPropagation());
        });

        panel.innerHTML = `
            <h2 style="margin-top:0; text-align:center; color:#ffaaaa;">Battle Config</h2>
            <div style="margin-bottom: 10px;">
                <label>ルール:</label>
                <select id="bc-rule" style="width:100%;">
                    <option value="0">殲滅</option>
                    <option value="1">防衛</option>
                    <option value="2">突破</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label>敵属性:</label>
                <select id="bc-attr" style="width:100%;">
                    <option value="red">赤 (Ardor)</option>
                    <option value="purple">紫 (Chaos)</option>
                    <option value="green">緑 (Harmony)</option>
                    <option value="yellow">黄 (Sacrifice)</option>
                    <option value="blue">青 (Discipline)</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label>敵数 (1～200):</label>
                <input type="number" id="bc-enemy" value="10" min="1" max="200" style="width:100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>ウェーブ数 (1～10):</label>
                <input type="number" id="bc-wave" value="3" min="1" max="10" style="width:100%;">
            </div>
            <div style="margin-bottom: 20px;">
                <label>魔女レベル (0～8):</label>
                <input type="number" id="bc-majo" value="0" min="0" max="8" style="width:100%;">
            </div>
            <div style="margin-bottom: 20px;">
                <label>参加メンバー:</label><br>
                <label><input type="checkbox" class="bc-party" value="001" checked> 1.紫苑</label><br>
                <label><input type="checkbox" class="bc-party" value="002"> 2.蒼樹</label><br>
                <label><input type="checkbox" class="bc-party" value="003"> 3.紅華</label><br>
                <label><input type="checkbox" class="bc-party" value="004"> 4.黄蘭</label><br>
                <label><input type="checkbox" class="bc-party" value="005"> 5.李乃果</label>
            </div>
            <div style="display:flex; justify-style:space-between;">
                <button id="bc-cancel" style="padding:5px 10px; cursor:pointer;">Cancel</button>
                <button id="bc-start" style="padding:5px 10px; background-color:#a54a4a; color:#fff; border:none; cursor:pointer;">START</button>
            </div>
        `;

        document.body.appendChild(panel);

        const closePanel = () => {
            if (modalBlocker) modalBlocker.destroy();
            panel.remove();
        };

        document.getElementById('bc-cancel').addEventListener('click', closePanel);

        document.getElementById('bc-start').addEventListener('click', () => {
            const partySelect = Array.from(document.querySelectorAll('.bc-party'))
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value);

            const config = {
                rule: parseInt(document.getElementById('bc-rule').value),
                attribute: document.getElementById('bc-attr').value,
                enemyCount: parseInt(document.getElementById('bc-enemy').value, 10) || 10,
                waveCount: parseInt(document.getElementById('bc-wave').value) || 1,
                majoLevel: parseInt(document.getElementById('bc-majo').value) || 0,
                party: partySelect.length > 0 ? partySelect : ['001']
            };
            closePanel();
            TransitionManager.transitionTo(this, 'BattleScene', config);
        });
    }

    _showAdventureConfig() {
        if (document.getElementById('adv-config-panel')) return;

        const { width, height } = this.scale;
        const modalBlocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setDepth(999)
            .setInteractive();

        const panel = document.createElement('div');
        panel.id = 'adv-config-panel';
        panel.style.position = 'absolute';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        panel.style.border = '2px solid #5a5a2a';
        panel.style.padding = '20px';
        panel.style.color = '#fff';
        panel.style.fontFamily = 'sans-serif';
        panel.style.zIndex = '1000';
        panel.style.width = '250px';

        ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(evt => {
            panel.addEventListener(evt, (e) => e.stopPropagation());
        });

        panel.innerHTML = `
            <h2 style="margin-top:0; text-align:center; color:#ffdd77;">Adventure Config</h2>
            <div style="margin-bottom: 20px;">
                <label>参加メンバー:</label><br>
                <label><input type="checkbox" class="ac-party" value="001" checked> 1.紫苑</label><br>
                <label><input type="checkbox" class="ac-party" value="002"> 2.蒼樹</label><br>
                <label><input type="checkbox" class="ac-party" value="003"> 3.黄蘭</label><br>
                <label><input type="checkbox" class="ac-party" value="004"> 4.紅華</label><br>
                <label><input type="checkbox" class="ac-party" value="005"> 5.李乃果</label>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <button id="ac-cancel" style="padding:5px 10px; cursor:pointer;">Cancel</button>
                <button id="ac-start" style="padding:5px 10px; background-color:#5a5a2a; color:#fff; border:none; cursor:pointer;">START</button>
            </div>
        `;

        document.body.appendChild(panel);

        const closePanel = () => {
            if (modalBlocker) modalBlocker.destroy();
            panel.remove();
        };

        document.getElementById('ac-cancel').addEventListener('click', closePanel);

        document.getElementById('ac-start').addEventListener('click', () => {
            const partySelect = Array.from(document.querySelectorAll('.ac-party'))
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value);

            const config = {
                party: partySelect.length > 0 ? partySelect : ['001'],
                isNewGame: true // デモ起動時は全データ・日付・マップをリセット起動
            };
            closePanel();
            TransitionManager.transitionTo(this, 'AdventureScene', config);

        });
    }

}
