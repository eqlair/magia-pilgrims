import Phaser from 'phaser';
import { MapProjector } from '../systems/MapProjector';
import { GlobalState } from '../systems/GlobalState';
import { SaveManager } from '../systems/SaveManager';


export default class FormationScene extends Phaser.Scene {
    constructor() {
        super('FormationScene');
    }

    init(data) {
        this.party = data.party || ['001'];
        this.returnScene = data.returnScene || 'CampScene';
        this.globalState = GlobalState.getInstance();
    }

    create() {
        const { width, height } = this.scale;
        
        // 疑似3Dマッププロジェクターの初期化
        this.projector = new MapProjector(width, height);
        
        // 背景用（黒板風の暗い緑）
        this.add.rectangle(0, 0, width, height, 0x1a3a22).setOrigin(0, 0);
        
        // 罫線描画（戦闘と同じレーン）
        this.graphics = this.add.graphics();
        this.drawGrid();

        // キャラクター情報とスプライトを格納する配列
        this.characters = [];
        const laneOffsets = [0, -1, 1, -2, 2];

        // 各キャラクターのスプライト生成
        for (let i = 0; i < this.party.length; i++) {
            const charId = this.party[i];
            
            // 初期レーン・配置（未設定の場合は4-2-1-3-5の順で後列に自動配置）
            const form = this.globalState.assignFormationForNewMember(charId);
            let lane = form.lane;
            let isFront = form.isFront;


            const textureKey = `mini_${charId}`;
            const altTextureKey = `battle_${charId}`;
            let actualTexture = `face_${charId}`;
            
            if (this.textures.exists(textureKey)) {
                actualTexture = textureKey;
            } else if (this.textures.exists(altTextureKey)) {
                actualTexture = altTextureKey;
            }
            
            const sprite = this.add.sprite(0, 0, actualTexture).setOrigin(0.5, 0.5);
            
            this.characters.push({
                charId: charId,
                lane: lane,
                isFront: isFront,
                sprite: sprite
            });
        }
        
        this.updateCharacterPositions();

        // UI描画
        const saveBtn = this.add.text(width / 2, height * 0.05, '保存して戻る', {
            fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', backgroundColor: '#aa3333', padding: { x: 20, y: 10 }
        }).setOrigin(0.5, 0).setInteractive();

        saveBtn.on('pointerdown', () => {
            // 保存処理
            if (!this.globalState.savedFormation) {
                this.globalState.savedFormation = {};
            }
            for (const char of this.characters) {
                this.globalState.savedFormation[char.charId] = {
                    lane: char.lane,
                    isFront: char.isFront
                };
            }
            SaveManager.saveGame();

            // 終了処理
            this.scene.stop();
            this.scene.resume(this.returnScene);
        });
        
        const backBtn = this.add.text(width * 0.05, height * 0.05, '◀ 戻る', {
            fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaaaa', backgroundColor: '#333333', padding: { x: 10, y: 10 }
        }).setOrigin(0, 0).setInteractive();

        backBtn.on('pointerdown', () => {
            // 保存せずに終了
            this.scene.stop();
            this.scene.resume(this.returnScene);
        });

        // 画面上部に説明文
        this.add.text(width / 2, height * 0.15, '上下スワイプ：前衛・後衛\n左右スワイプ：レーン移動', {
            fontFamily: 'sans-serif', fontSize: '20px', color: '#aaaaaa', align: 'center'
        }).setOrigin(0.5, 0);

        // 前衛・後衛のラベルテキスト
        const posFront = this.projector.project(0, 10.0);
        const posBack = this.projector.project(0, 6.0);
        this.add.text(width / 2, posFront.y - 150, 'まえ(せっきんこうげき)', {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setAlpha(0.6);
        this.add.text(width / 2, posBack.y + 150, 'うしろ(えんきょりこうげき)', {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setAlpha(0.6);

        // スワイプ操作の実装
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointerupoutside', this.onPointerUp, this);
    }

    drawDashedLine(x1, y1, x2, y2, dashLength = 15, gapLength = 15) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dashes = Math.floor(distance / (dashLength + gapLength));
        const dashX = (dx / distance) * dashLength;
        const dashY = (dy / distance) * dashLength;
        const gapX = (dx / distance) * gapLength;
        const gapY = (dy / distance) * gapLength;
        
        let currentX = x1;
        let currentY = y1;
        
        for (let i = 0; i < dashes; i++) {
            this.graphics.moveTo(currentX, currentY);
            currentX += dashX;
            currentY += dashY;
            this.graphics.lineTo(currentX, currentY);
            currentX += gapX;
            currentY += gapY;
        }
        this.graphics.moveTo(currentX, currentY);
        this.graphics.lineTo(x2, y2);
    }

    drawGrid() {
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xffffff, 0.5);

        // 奥から手前へのレーン線 (-2 から 2)
        // 間隔を1.8倍に広げたため、境界は -4.5, -2.7, -0.9, 0.9, 2.7, 4.5
        for (let x = -4.5; x <= 4.5; x += 1.8) {
            const start = this.projector.project(x, 20);
            const end = this.projector.project(x, -5);
            this.drawDashedLine(start.x, start.y, end.x, end.y, 10, 15);
        }

        // 横線 (前衛と後衛を隔てる線 z = 8.0)
        const start = this.projector.project(-4.5, 8.0);
        const end = this.projector.project(4.5, 8.0);
        this.drawDashedLine(start.x, start.y, end.x, end.y, 10, 15);
        this.graphics.strokePath();
    }

    getGridCoords(lane, isFront) {
        const z = isFront ? 10.0 : 6.0; // 前衛は中央、後衛も少し手前へ
        const x = lane * 1.8; // 配置間隔を1.8倍に広げる
        return { x, z };
    }

    updateCharacterPositions() {
        // z order sorting
        this.characters.sort((a, b) => {
            const za = a.isFront ? 10.0 : 6.0;
            const zb = b.isFront ? 10.0 : 6.0;
            return zb - za; // 奥(大きいz)を先に描画
        });

        for (const char of this.characters) {
            const { x, z } = this.getGridCoords(char.lane, char.isFront);
            const p = this.projector.project(x, z);
            
            char.sprite.setPosition(p.x, p.y);
            
            // BattleRenderer の CHAR_BASE_SCALE と同等の倍率を計算 (1.0 / baseWidth * 2.0)
            // 見やすさと操作性向上のためさらに1.2倍
            const baseWidth = char.sprite.width || 728;
            char.baseScale = p.scale * (1.0 / baseWidth) * 2.4;
            char.sprite.setScale(char.baseScale); 
            char.sprite.setDepth(100 - z);
        }
    }

    onPointerDown(pointer) {
        this.swipeStartX = pointer.x;
        this.swipeStartY = pointer.y;
        this.grabbedChar = null;
        let minDistanceSq = 70 * 70; // 判定半径を70ピクセルに縮小

        for (const char of this.characters) {
            const { x, z } = this.getGridCoords(char.lane, char.isFront);
            const screenPos = this.projector.project(x, z);
            
            const dx = pointer.x - screenPos.x;
            const dy = pointer.y - screenPos.y; 
            const distanceSq = dx * dx + dy * dy;
            
            // タップ位置に最も近いキャラクターを優先して掴む
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                this.grabbedChar = char;
            }
        }
    }

    onPointerUp(pointer) {
        if (!this.grabbedChar) return;

        const dx = pointer.x - this.swipeStartX;
        const dy = pointer.y - this.swipeStartY;

        const oldLane = this.grabbedChar.lane;
        const oldIsFront = this.grabbedChar.isFront;
        let moved = false;

        // スワイプ判定（反応しやすくするためにしきい値を50から30に緩和）
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
            // 横スワイプ（レーン移動）
            const direction = dx > 0 ? 1 : -1;
            let newLane = this.grabbedChar.lane + direction;
            if (newLane > 2) newLane = 2;
            if (newLane < -2) newLane = -2;
            
            if (this.grabbedChar.lane !== newLane) {
                this.grabbedChar.lane = newLane;
                moved = true;
            }
        } else if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
            // 縦スワイプ（前後衛切り替え）
            const isFront = dy < 0; // 上スワイプ(dyがマイナス)なら前衛、下スワイプなら後衛
            if (this.grabbedChar.isFront !== isFront) {
                this.grabbedChar.isFront = isFront;
                moved = true;
            }
        }
        
        if (moved) {
            for (const otherChar of this.characters) {
                // 同じレーンに配置される場合はスワップ（前後衛問わず同じX軸を禁止）
                if (otherChar !== this.grabbedChar && otherChar.lane === this.grabbedChar.lane) {
                    otherChar.lane = oldLane;
                    // 他のキャラのisFrontはそのままにすることで純粋なレーン交換となる
                    break;
                }
            }
        }
        
        this.updateCharacterPositions();
        this.grabbedChar = null;
    }

    update(time, delta) {
        if (!this.characters) return;
        
        const timeSec = time / 1000;
        
        for (const char of this.characters) {
            // 呼吸アニメーション
            if (char.baseScale) {
                // キャラごとに少しタイミングをずらして呼吸させる
                const breath = Math.sin(timeSec * Math.PI * 1.5 + char.charId * 0.5) * 0.05;
                char.sprite.setScale(char.baseScale * (1.0 + breath));
            }

            // 2秒ごとにランダムな向き・ポーズに変更
            if (!char.nextPoseTime || time > char.nextPoseTime) {
                char.nextPoseTime = time + 2000;
                // battle_ 系のスプライトシートを前提とし、最大フレームを超えないよう制限
                if (char.sprite.texture && char.sprite.texture.frameTotal > 1) {
                    const randomFrame = Math.floor(Math.random() * 8);
                    if (randomFrame < char.sprite.texture.frameTotal) {
                        char.sprite.setFrame(randomFrame);
                    }
                }
            }
        }
    }
}
