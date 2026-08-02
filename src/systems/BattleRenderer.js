/**
 * BattleEngineの論理データを元に、MapProjectorを使って2.5D描画を行うクラス
 */
export class BattleRenderer {
    constructor(scene, engine, projector) {
        this.scene = scene;
        this.engine = engine;
        this.projector = projector;

        // 論理エンティティとPhaserのスプライトを紐づけるマップ
        this.spriteMap = new Map();
        this.uiMap = new Map();

        // 1m幅を基準としたキャラのベーススケール（フレームサイズ150px基準）
        this.CHAR_BASE_SCALE = 1.0 / 150 * 2.0; 

    }

    update() {
        if (this.beamGraphics) {
            this.beamGraphics.clear();
        }
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(100);
        }
        this.debugGraphics.clear();

        // 描画更新の最初に、削除されたエンティティのスプライトを消去する
        for (const [entity, sprite] of this.spriteMap.entries()) {
            if (entity.isDead) {
                sprite.destroy();
                if (entity.sprite2) {
                    entity.sprite2.destroy();
                }
                this.spriteMap.delete(entity);
                
                if (this.uiMap.has(entity)) {
                    const ui = this.uiMap.get(entity);
                    ui.hpBg.destroy(); ui.hpBar.destroy(); 
                    ui.spBg.destroy(); ui.spBar.destroy(); 
                    ui.hpText.destroy(); ui.spText.destroy();
                    this.uiMap.delete(entity);
                }
            }
        }

        // プレイヤーの描画更新
        for (const p of this.engine.players) {
            const charTex = `battle_${p.charId}`;
            this._updateSprite(p, charTex);
            this._updateUI(p);
        }

        // 敵の描画更新
        for (const e of this.engine.enemies) {
            if (e.isDead) continue;
            this._updateSprite(e, e.textureKey || 'enemy');
            this._updateUI(e);
        }

        // 弾の描画更新
        for (const b of this.engine.bullets) {
            if (b.isDead) continue;
            // 弾の種類に応じて画像を変える (手りゅう弾はサイズが大きく設定されているので判別可能か、typeを持たせる)
            let textureKey = null;
            if (b.type === 'grenade') textureKey = 'grenade';
            else if (b.type === 'bullet') textureKey = 'bullet';
            else if (b.type === 'enemy_bullet') textureKey = 'enemy_bullet';

            else if (b.type === 'weapon_002' || b.type === 'swing_002') textureKey = 'weapon_002';
            else if (b.type === 'weapon_003' || b.type === 'swing_003' || b.type === 'ultimate_003') textureKey = 'weapon_003';
            else if (b.type === 'weapon_004' || b.type === 'swing_004') textureKey = 'weapon_004';
            else if (b.type === 'weapon_005' || b.type === 'swing_005') textureKey = 'weapon_005';
            else if (b.type === 'swing_ultimate_002') textureKey = 'weapon_002';
            // 汎用: swing_XXX 形式(中心数値ID) の手割り
            else if (b.type && b.type.startsWith('swing_')) {
                const id = b.type.replace('swing_', '');
                textureKey = `weapon_${id}`;
            }

            if (textureKey) {
                this._updateSprite(b, textureKey);
            }
        }
        
        // キック弾丸・爆発エフェクトの Graphics 描画
        if (!this.aoeGraphics) {
            this.aoeGraphics = this.scene.add.graphics();
        }
        this.aoeGraphics.clear();
        this.aoeGraphics.setDepth(1200);

        // キック弾の範囲描画は不要になったため消去

        // 爆発エフェクト（手りゅう弾）の描画更新
        for (const e of this.engine.effects) {
            if (e.type === 'explosion') {
                const p = this.projector.project(e.x, e.z);
                if (p.visible) {
                    // 半径 1.0m の赤い円
                    const radius = p.scale * e.radius;
                    // 残り時間で透明度を調整
                    const alpha = Math.max(0, e.lifeTime / e.maxLife);
                    this.aoeGraphics.fillStyle(0xff0000, alpha * 0.5); // 半透明の赤
                    this.aoeGraphics.fillCircle(p.x, p.y, radius);
                }
            }
        }

        
        // デバッグ用: スイング武器の命中判定(hitbox)描画は非表示にしました
        
        // エフェクト（爆発や特殊効果）の描画
        for (const eff of this.engine.effects) {
            if (eff.isDead) continue;
            this._updateEffect(eff);
        }
        
        // 浮遊テキスト（ダメージ数値）の描画更新
        this._updateFloatingTexts();

        // 警告やウェーブ通知などのシステムテキスト
        this._updateSystemUI();

        // 画面上部の戦闘情報UI
        this._updateBattleInfo();
    }

    _updateSprite(entity, textureKey) {
        let sprite = this.spriteMap.get(entity);
        if (!sprite) {
            // 弾丸や手りゅう弾は画像の中心を基準点に。キャラは基本足元(1.0)だが、魔女は表示を1/3下げるため0.666にする
            const isProjectile = textureKey === 'bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_');
            let originY = 1.0;
            if (isProjectile) {
                // スイングの場合は持ち手(1.0)を軸にする
                if ((entity.type && entity.type.startsWith('swing_')) || entity.type === 'ultimate_003') {
                    originY = 1.0;
                } else {
                    originY = 0.5;
                }
            } else if (entity.isBoss) {
                originY = 0.666; // Z軸方向（画面下方向）に1/3下げる
            }

            sprite = this.scene.add.sprite(0, 0, textureKey, 0).setOrigin(0.5, originY);
            this.spriteMap.set(entity, sprite);
        }

        const p = this.projector.project(entity.x, entity.z);
        if (p.visible) {
            sprite.setVisible(true);
            
            // 弾丸や手りゅう弾はキャラの足元(Y)ではなく、腰の高さ（おおよそ1.0mの高さ）に表示する
            const isProjectile = textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_');
            let heightOffset = isProjectile ? p.scale * 1.0 : 0;
            if (entity.animY) {
                heightOffset += p.scale * entity.animY;
            }
            // 突破ステージ(rule === 2)での全プレイヤーキャラ非攻撃時の上向き走行ピョンピョン跳ね演出
            const isBreakthrough = (this.scene.battleConfig && this.scene.battleConfig.rule === 2);
            if (entity.owner === 'player' && !isProjectile && isBreakthrough) {
                const cs = entity.combatState;
                const isAttacking = cs && (cs.phase === 'acting' || cs.phase === 'reloading');
                if (!isAttacking && !entity.isDead && entity.hp > 0) {
                    const hopPhase = (this.scene.time.now % 250) / 250;
                    const hopOffset = Math.sin(hopPhase * Math.PI) * 0.12; // ごく小さい跳ね
                    heightOffset += p.scale * hopOffset;
                }
            }


            let finalX = p.x;
            let finalY = p.y - heightOffset;
            if (!isProjectile && entity.attackShakeTimer > 0) {
                const shakeMag = 0.2 * p.scale;
                finalX += (Math.random() - 0.5) * shakeMag;
                finalY += (Math.random() - 0.5) * shakeMag;
            }
            sprite.setPosition(finalX, finalY);
            
            // Zソート（手前にあるものほど p.depth(rz) が小さくなるため、1000 から引いて手前を上に描画）
            sprite.setDepth(1000 - p.depth);
            
            // 魔女（ボス）の場合はサイズ確認用のデバッグ円を描画
            if (entity.isBoss && this.debugGraphics) {
                // p.x, p.y は画面座標。物理サイズ(entity.size)を画面上のピクセルに変換する
                const screenRadius = entity.size / 2 * this.PPU * p.scale;
                this.debugGraphics.lineStyle(2, 0xff0000, 1.0);
                this.debugGraphics.strokeCircle(p.x, p.y, screenRadius);
            }

            // 向きおよびテクスチャ・モーションの変更 (武器・弾は除外してプレイヤー本体のみ対象)
            const isPlayerChar = textureKey.startsWith('battle_') && !isProjectile;

            if (isPlayerChar) {
                const charId = entity.charId || '001';
                const baseTex = `battle_${charId}`;
                const motionTex = `battle_${charId}_b`;

                const cs = entity.combatState;
                const isAttacking = cs && (cs.phase === 'acting' || cs.phase === 'reloading');

                // 近接攻撃（コンボ）中かどうかの判定
                let isMeleeMotion = false;
                if (cs && cs.comboType === 'near') {
                    if (charId === '001' || charId === '005') {
                        // 紫苑・李乃果: 実際にキック発動中(kickTimer > 0 または isKickAttacking)のときのみ表示！
                        isMeleeMotion = (entity.kickTimer > 0 || !!entity.isKickAttacking);
                    } else {
                        // 蒼樹(002)・紅華(003)・黄蘭(004): 攻撃実行中(acting)のみ
                        isMeleeMotion = (cs.phase === 'acting');
                    }
                }

                if (entity.hp <= 0) {
                    sprite.setTexture(baseTex);
                    sprite.setFrame(6); // 死亡フレーム（7番目, index 6）
                } else if (isMeleeMotion && this.scene.textures.exists(motionTex)) {
                    // 近接特殊モーション
                    sprite.setTexture(motionTex);
                    let frame = 3; // デフォルト: 下向き(手前)
                    let angle = null;
                    if (entity.kickAngle !== undefined && entity.kickAngle !== null) {
                        angle = entity.kickAngle;
                    } else if (entity.targetEnemy) {
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        angle = Math.atan2(dz, dx) * 180 / Math.PI;
                    }
                    if (angle !== null) {
                        const isUp = (angle <= -45 && angle >= -135);      // 上/奥 (dz < 0)
                        const isRight = (angle >= -45 && angle <= 45);     // 右 (dx > 0)
                        const isLeft = (angle >= 135 || angle <= -135);    // 左 (dx < 0)
                        const isDown = (!isUp && !isRight && !isLeft);     // 下/手前 (dz > 0)

                        // 統一仕様: 0:上(背面), 1:左, 2:右, 3:下(前)
                        if (isDown) frame = 3;
                        else if (isLeft) frame = 1;
                        else if (isRight) frame = 2;
                        else if (isUp) frame = 0;
                    }
                    sprite.setFrame(frame);

                } else if (isBreakthrough) {
                    // 突破ステージ: 基本は全キャラ上向き走行(コマ4,5を0.25s交互)
                    const runFrame = Math.floor(this.scene.time.now / 250) % 2 === 0 ? 4 : 5;

                    let useBaseTex = false;
                    let targetFrame = null;

                    if (entity.targetEnemy && isMeleeMotion) {
                        // 近接攻撃中: _bシート(motionTex)の近接攻撃コマ(0, 1, 2, 3)
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        const angle = Math.atan2(dz, dx) * 180 / Math.PI;
                        if (angle >= 45 && angle <= 135)          targetFrame = 3; // 下(手前)向き攻撃
                        else if (angle >= 135 || angle <= -135)   targetFrame = 1; // 左向き攻撃
                        else if (angle >= -45 && angle <= 45)     targetFrame = 2; // 右向き攻撃
                        else                                      targetFrame = 0; // 上(奥)向き攻撃
                    } else if (entity.targetEnemy && isAttacking) {
                        // 遠距離攻撃中(飛び道具): 
                        // 横・手前向き射撃時は通常スプライト(baseTex)でその方向を向く。前(奥)向き射撃時は走行を継続！
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        const angle = Math.atan2(dz, dx) * 180 / Math.PI;
                        if (angle >= 45 && angle <= 135) {
                            useBaseTex = true;
                            targetFrame = 3; // 手前(下)向き
                        } else if (angle >= 135 || angle <= -135) {
                            useBaseTex = true;
                            targetFrame = 1; // 左向き
                        } else if (angle >= -45 && angle <= 45) {
                            useBaseTex = true;
                            targetFrame = 2; // 右向き
                        } else {
                            // 前(奥)向き射撃 → 走行継続
                            targetFrame = runFrame;
                        }
                    } else {
                        // 非攻撃時: 上向き走行継続
                        targetFrame = runFrame;
                    }

                    if (useBaseTex) {
                        sprite.setTexture(baseTex);
                        sprite.setFrame(targetFrame);
                    } else if (this.scene.textures.exists(motionTex)) {
                        sprite.setTexture(motionTex);
                        sprite.setFrame(targetFrame);
                    } else {
                        sprite.setTexture(baseTex);
                        sprite.setFrame(0);
                    }



                } else {
                    // 通常のアニメーション (baseTex)
                    sprite.setTexture(baseTex);
                    if (entity.targetEnemy) {
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        const angle = Math.atan2(dz, dx) * 180 / Math.PI;
                        let frame = 3; // デフォルト: 下向き
                        if (angle > 45 && angle < 135) frame = 3; // 下(手前)
                        else if (angle >= 135 || angle <= -135) frame = 1; // 左
                        else if (angle >= -45 && angle <= 45) frame = 2; // 右
                        else frame = 0; // 上(背面)
                        sprite.setFrame(frame);
                    } else {
                        sprite.setFrame(3); // デフォルト: 下向き
                    }
                }


            }

 else if (textureKey.startsWith('battle_')) {
                if (entity.hp <= 0 && entity.owner === 'player') {
                    sprite.setFrame(6); // 死亡フレーム（7番目, index 6）
                } else if (entity.targetEnemy) {
                    const dx = entity.targetEnemy.x - entity.x;
                    const dz = entity.targetEnemy.z - entity.z;
                    const angle = Math.atan2(dz, dx) * 180 / Math.PI;
                    let frame = 0; // デフォルト: 上向き
                    if (angle > 45 && angle < 135) frame = 0;  // 下→上フレームに統一修正後は0:上
                    else if (angle >= -45 && angle <= 45) frame = 1;
                    else if (angle >= 135 || angle <= -135) frame = 2;
                    else frame = 3;
                    sprite.setFrame(frame);
                } else {
                    sprite.setFrame(3); // デフォルト: 下向き
                }
            }



            // プレイヤーキャラ等のダメージ傾き
            if (entity.owner === 'player' && !isProjectile) {
                if (entity.damageTiltTimer > 0) {
                    sprite.setAngle(-15 * (entity.damageTiltTimer / 0.2));
                } else {
                    if (entity.damageTiltTimer > 0) {
                        sprite.setAngle(-15 * (entity.damageTiltTimer / 0.2));
                    } else {
                        sprite.setAngle(0);
                    }
                }
            }

            // 呼吸アニメーション（±5%の拡縮）
            let scaleAnim = 1.0;
            if (entity.breathPhase !== undefined) {
                scaleAnim = 1.0 + Math.sin(entity.breathPhase) * 0.05;
            }

            // 色付け（属性ごとの敵弾丸用など）
            if (textureKey === 'enemy_bullet') {
                let tintColor = entity.color;
                if (tintColor === undefined || tintColor === null) {
                    const attrColors = {
                        red: 0xff3344,
                        purple: 0xd033ff,
                        green: 0x33ff66,
                        yellow: 0xffff33,
                        blue: 0x33aaff
                    };
                    tintColor = attrColors[entity.attribute] || 0xff4444;
                }
                sprite.setTint(tintColor);
                sprite.setBlendMode(Phaser.BlendModes.ADD); // 発光感のある鮮やかな着色
            } else {
                sprite.clearTint();
                sprite.setBlendMode(Phaser.BlendModes.NORMAL);
            }

            if (entity.owner === 'enemy') {
                // フレームの更新
                sprite.setFrame(entity.frame || 0);

                if (!entity.isBoss) {
                    // 通常の敵は少し揺れるアニメーション
                    if (entity.damageTiltTimer > 0) {
                        sprite.setAngle(-15 * (entity.damageTiltTimer / 0.2));
                    } else {
                        sprite.setAngle(Math.sin(this.scene.time.now / 300 + entity.z) * 5);
                    }
                } else {
                    sprite.setAngle(0);
                }
            }

            if (textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_')) {
                // entity.size (m) に対応するスケールを計算
                // baseWidthピクセルの画像が、ワールド上でentity.size(m)の幅になるようにする
                const baseWidth = sprite.width || 100; 
                
                // ★視認性向上のための描画倍率（当たり判定はそのまま、見た目だけ大きくする）
                // 敵の弾丸(ball.png)は画面で見やすく美しい球体サイズ(3.5倍)に調整
                let visualMultiplier = (entity.owner === 'enemy') ? 3.5 : 1.5;
                if (textureKey === 'enemy_bullet') visualMultiplier = 3.5;
                if (textureKey === 'weapon_004') visualMultiplier = 0.75; // 黄蘭の弾丸は見た目1/2
                if (textureKey === 'hit_effect6') visualMultiplier = 8.0;  // キック衝撃波はしっかり目立つサイズにする

                
                sprite.setScale(p.scale * ((entity.size * visualMultiplier) / baseWidth));

                
                // 進行方向に向ける（弾丸のみ、手りゅう弾は回転させないかクルクル回すか）
                if (textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_')) {
                    if (entity.type && entity.type.startsWith('swing_')) {
                        // 扇状にスイングさせる
                        const progress = 1.0 - (entity.lifeTime / (entity.maxLife || 0.5)); 
                        // TargetEnemy の方向を向くベース角（親が向いている方向）
                        let baseAngle = 0;
                        if (entity.baseAngle !== undefined && entity.baseAngle !== null) {
                            baseAngle = -entity.baseAngle * 180 / Math.PI + 90;
                        } else if (entity.sourceEntity && entity.sourceEntity.targetEnemy) {
                            const dx = entity.sourceEntity.targetEnemy.x - entity.sourceEntity.x;
                            const dz = entity.sourceEntity.targetEnemy.z - entity.sourceEntity.z;
                            baseAngle = Math.atan2(-dz, dx) * 180 / Math.PI + 90;
                        }
                        let angleRange = 60;
                        if (entity.type === 'swing_004') angleRange = 90; // 180度(±90)
                        if (entity.type === 'swing_003') angleRange = 360; // 720度回転(±360)で回転速度2倍
                        if (entity.type === 'swing_ultimate_002') angleRange = 180; // 360度薙ぎ払い
                        
                        // 軌跡（時計回り）と画像の回転方向を合わせるため、マイナス方向に回転させる
                        const dir = entity.swingDir || 1;
                        sprite.setAngle(baseAngle + (angleRange * dir) - (angleRange*2 * progress * dir));
                        // サイズ調整
                        if (entity.type === 'swing_003') {
                            // 槍の見た目が長すぎたため、青樹と同じく3.0m相当に調整
                            const baseHeight = sprite.height || 100;
                            const targetScale = p.scale * (3.0 / baseHeight);
                            sprite.setScale(targetScale);
                        } else if (entity.type === 'swing_002') {
                            // 青樹の剣: 画面上で3.0m相当の長さに設定（以前の1.5mから倍増）
                            const baseHeight = sprite.height || 100;
                            const targetScale = p.scale * (3.0 / baseHeight);
                            sprite.setScale(targetScale);
                        } else {
                            let scaleMult = 1.5; // スイング時のデフォルト拡大率
                            sprite.setScale(sprite.scale * scaleMult);
                        }

                        if (entity.type === 'swing_003') {
                            // 180度反対方向の同じ槍を表示
                            let sprite2 = entity.sprite2;
                            if (!sprite2) {
                                sprite2 = this.scene.add.sprite(0, 0, textureKey, 0).setOrigin(sprite.originX, sprite.originY);
                                entity.sprite2 = sprite2;
                            }
                            sprite2.setVisible(true);
                            sprite2.setDepth(sprite.depth);
                            sprite2.setPosition(sprite.x, sprite.y);
                            sprite2.setScale(sprite.scaleX, sprite.scaleY);
                            sprite2.setAngle(sprite.angle + 180);
                        }
                        
                        if (entity.type === 'swing_004' || entity.type === 'swing_ultimate_004') {
                            sprite.setVisible(false); // 根本の弾丸スプライトは非表示
                            if (entity.type === 'swing_004') {
                                if (!this.beamGraphics) {
                                    this.beamGraphics = this.scene.add.graphics();
                                    this.beamGraphics.setDepth(100);
                                }
                                // 扇状の残像を描画
                                const radius = (entity.hitRange || 1.5) * p.scale; // 描画半径
                            this.beamGraphics.fillStyle(0xffff00, Math.max(0, 0.4 * (1.0 - progress))); // 徐々に消える
                            this.beamGraphics.beginPath();
                            this.beamGraphics.moveTo(p.x, p.y);
                            const startRad = (baseAngle - 90 - (angleRange * dir)) * Math.PI / 180;
                            const currentRad = (baseAngle - 90 - (angleRange * dir) + (angleRange*2 * progress * dir)) * Math.PI / 180;
                            this.beamGraphics.arc(p.x, p.y, radius, startRad, currentRad, dir === -1);
                            this.beamGraphics.closePath();
                            this.beamGraphics.fillPath();
                            }
                        }
                    } else if (entity.type === 'ultimate_003') {
                        // 必殺技は常に回転
                        sprite.setAngle(entity.spinAngle * 180 / Math.PI);
                        
                        // 画像の長さを十分な大きさに固定（直径4m以上に見えるように）
                        const hitRadius = entity.hitRange !== undefined ? entity.hitRange : (entity.size / 2);
                        const baseHeight = sprite.height || 100;
                        
                        // 実は通常攻撃(swing_003)が半径3.0m相当のスケールだったため、
                        // 半径2.0m(直径4m)を指定すると通常攻撃より小さく見えてしまっていました。
                        // 今回は見た目をその半分(2.5)に落とします。 -> ユーザーの「直径4m(片側2m)」の希望に完全に合わせるため 2.0 にします -> 1.5倍にするため 3.0 にします
                        const targetScale = p.scale * (3.0 / baseHeight);
                        sprite.setScale(targetScale);
                        
                        // デバッグ用の当たり判定の円を描画
                        if (this.debugGraphics) {
                            const hitRadius = entity.hitRange !== undefined ? entity.hitRange : (entity.size / 2);
                            this.debugGraphics.lineStyle(2, 0xffff00, 0.5); // 黄色で半透明
                            // isProjectile のため heightOffset 分上に描画されているのに合わせる
                            this.debugGraphics.strokeCircle(p.x, p.y - (p.scale * 1.0), hitRadius * p.scale);
                        }
                        
                        // 180度反対方向の同じ槍を表示してケツで繋げる
                        let sprite2 = entity.sprite2;
                        if (!sprite2) {
                            sprite2 = this.scene.add.sprite(0, 0, textureKey, 0).setOrigin(sprite.originX, sprite.originY);
                            entity.sprite2 = sprite2;
                        }
                        sprite2.setVisible(true);
                        sprite2.setDepth(sprite.depth);
                        sprite2.setPosition(sprite.x, sprite.y);
                        sprite2.setScale(sprite.scaleX, sprite.scaleY);
                        sprite2.setAngle(sprite.angle + 180);
                    } else {
                        // 通常の飛ぶ武器
                        const angle = Math.atan2(-entity.vz, entity.vx) * 180 / Math.PI + 90;
                        sprite.setAngle(angle);
                    }
                } else if (textureKey === 'grenade') {
                    // 手りゅう弾はクルクル回る
                    sprite.setAngle(this.scene.time.now * 0.5);
                }
            } else {
                // キャラクターや敵など、画像の本来のサイズ比率を維持したまま奥行き(p.scale)スケールを適用
                let finalScale = 0;
                if (entity.isBoss) {
                    // 魔女の大きさ（m）を画面ピクセルに正確に反映する
                    const baseWidth = sprite.width || 256;
                    finalScale = p.scale * (entity.size / baseWidth);
                    
                    // ★ 登場アニメーション
                    if (entity.spawnAnimTimer !== undefined && entity.spawnAnimTimer > 0) {
                        const progress = 1.0 - (entity.spawnAnimTimer / entity.spawnAnimMax); // 0.0 -> 1.0
                        // 拡大率2倍から1倍へ
                        finalScale *= (2.0 - progress);
                        // 不透明度0%から100%へ
                        sprite.setAlpha(progress);
                    } else {
                        sprite.setAlpha(1.0);
                    }
                } else {
                    const baseWidth = sprite.width || 150;
                    finalScale = p.scale * (this.CHAR_BASE_SCALE * (150 / baseWidth));

                    if (entity.owner === 'enemy') {
                        finalScale *= (entity.size || 1.0);
                    }
                    if (entity.spawnDropTimer !== undefined && entity.spawnDropTimer > 0) {
                        const progress = Math.max(0, Math.min(1.0, 1.0 - (entity.spawnDropTimer / 1.0)));
                        finalScale *= (2.0 - progress);
                    }
                }

                sprite.setScale(finalScale * scaleAnim);
            }

            // 死亡演出（透過）や特殊エフェクト透過
            if (entity.isDying) {
                // エクセル設定の「1秒かけて透明に消えてゆく」に合わせて1.0 - (timer / 1.0)
                sprite.setAlpha(Math.max(0, 1.0 - (entity.deathTimer / 1.0)));
            } else if (textureKey === 'hit_effect6') {
                sprite.setAlpha(0.7); // 半透明キック弾

            } else if (entity.spawnDropTimer !== undefined && entity.spawnDropTimer > 0) {
                const progress = Math.max(0, Math.min(1.0, 1.0 - (entity.spawnDropTimer / 1.0)));
                sprite.setAlpha(progress);
            } else {
                if (entity.opacity !== undefined) {
                    sprite.setAlpha(entity.opacity);
                } else {
                    sprite.setAlpha(1.0);
                }
            }
        } else {
            sprite.setVisible(false);
        }
    }

    _updateUI(entity) {
        let ui = this.uiMap.get(entity);
        if (!ui) {
            ui = {
                hpBg: this.scene.add.rectangle(0, 0, 100, 10, 0x000000, 0.5).setOrigin(0.5, 0.5),
                hpBar: this.scene.add.rectangle(0, 0, 100, 10, 0x00ff00).setOrigin(0.5, 0.5),
                spBg: this.scene.add.rectangle(0, 0, 100, 10, 0x000000, 0.5).setOrigin(0.5, 0.5),
                spBar: this.scene.add.rectangle(0, 0, 100, 10, 0x0000ff).setOrigin(0.5, 0.5),
                ultBg: this.scene.add.rectangle(0, 0, 100, 10, 0x000000, 0.5).setOrigin(0.5, 0.5),
                ultBar: this.scene.add.rectangle(0, 0, 100, 10, 0xff0000).setOrigin(0.5, 0.5),
                // fontSizeは画面幅(540)に対するサイズ（約11px）に設定
                hpText: this.scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5),
                spText: this.scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5)
            };
            this.uiMap.set(entity, ui);
        }

        const p = this.projector.project(entity.x, entity.z);
        if (p.visible && !entity.isDead && !entity.isDying) {
            // キャラより少し手前に描画する
            const depth = 1000 - p.depth + 0.1;
            
            // 1m幅、太さ10cm
            const maxWidth = p.scale * 1.0;
            const height = p.scale * 0.1;
            
            const hpRatio = entity.maxHp > 0 ? Math.max(0, entity.hp / entity.maxHp) : 0;
            const spRatio = entity.maxSp > 0 ? Math.max(0, entity.sp / entity.maxSp) : 0;
            
            let ultRatio = 0;
            let ultColor = 0x880088; // 紫（リロード中）
            if (entity.owner === 'player') {
                if (entity.ultimateCooldown > 0 && entity.maxUltimateCooldown > 0) {
                    // リロード中（0% -> 100%へ伸びる）
                    ultRatio = 1.0 - (entity.ultimateCooldown / entity.maxUltimateCooldown);
                } else {
                    const cost = entity.charId === '005' ? 25 + entity.wlv : 10 + entity.wlv;
                    if (entity.sp >= cost) {
                        ultRatio = 1.0;
                        ultColor = 0xff0000; // 赤（発動可能）
                    } else {
                        ultRatio = 0.0;
                    }
                }
            }

            // Originが0.5なので幅を変えると中心に向かって縮む
            ui.hpBg.setSize(maxWidth, height);
            ui.hpBar.setSize(maxWidth * hpRatio, height);
            
            ui.ultBg.setSize(maxWidth, height);
            ui.ultBar.setSize(maxWidth * ultRatio, height);
            ui.ultBar.setFillStyle(ultColor);

            ui.spBg.setSize(maxWidth, height);
            ui.spBar.setSize(maxWidth * spRatio, height);
            
            // 位置調整 (キャラの足元 p.y より少し下)
            const hpY = p.y + p.scale * 0.1;
            const ultY = p.y + p.scale * 0.25; // 必殺技ゲージを間に挟む
            const spY = p.y + p.scale * 0.40;
            
            ui.hpBg.setPosition(p.x, hpY).setDepth(depth).setVisible(true);
            ui.hpBar.setPosition(p.x, hpY).setDepth(depth).setVisible(true);
            
            if (entity.owner === 'player') {
                ui.ultBg.setPosition(p.x, ultY).setDepth(depth).setVisible(true);
                ui.ultBar.setPosition(p.x, ultY).setDepth(depth).setVisible(true);
            } else {
                ui.ultBg.setVisible(false);
                ui.ultBar.setVisible(false);
            }

            ui.spBg.setPosition(p.x, spY).setDepth(depth).setVisible(true);
            ui.spBar.setPosition(p.x, spY).setDepth(depth).setVisible(true);
            
            // テキストのスケール（奥行きに関係なく固定サイズ11pxで表示）
            ui.hpText.setText(`${Math.ceil(entity.hp)}`);
            ui.hpText.setPosition(p.x, hpY).setDepth(depth + 0.1).setVisible(true).setScale(1);
            
            ui.spText.setText(`${Math.ceil(entity.sp)}`);
            ui.spText.setPosition(p.x, spY).setDepth(depth + 0.1).setVisible(true).setScale(1);
            
            // 死にかけ（透明化中）の時はゲージも透明に
            if (entity.isDying) {
                const alpha = Math.max(0, entity.deathTimer / 0.5);
                ui.hpBg.setAlpha(alpha); ui.hpBar.setAlpha(alpha);
                ui.ultBg.setAlpha(alpha); ui.ultBar.setAlpha(alpha);
                ui.spBg.setAlpha(alpha); ui.spBar.setAlpha(alpha);
                ui.hpText.setAlpha(alpha); ui.spText.setAlpha(alpha);
            } else {
                let alpha = 1.0;
                if (entity.owner === 'enemy') {
                    // 敵の場合は被弾後1秒間だけ表示（最初の0.5秒は1.0、後の0.5秒で0.0へ）
                    const timeSinceDamaged = this.engine.time - entity.lastDamagedTime;
                    if (timeSinceDamaged < 0.5) {
                        alpha = 1.0;
                    } else if (timeSinceDamaged < 1.0) {
                        alpha = 1.0 - ((timeSinceDamaged - 0.5) / 0.5);
                    } else {
                        alpha = 0.0;
                    }
                }

                ui.hpBg.setAlpha(alpha); ui.hpBar.setAlpha(alpha);
                ui.hpText.setAlpha(alpha);
                
                // 敵はSPなし
                if (entity.owner === 'enemy') {
                    ui.spBg.setVisible(false); ui.spBar.setVisible(false);
                    ui.spText.setVisible(false);
                } else {
                    ui.ultBg.setAlpha(alpha); ui.ultBar.setAlpha(alpha);
                    ui.spBg.setAlpha(alpha); ui.spBar.setAlpha(alpha);
                    ui.spText.setAlpha(alpha);
                }
            }
        } else {
            ui.hpBg.setVisible(false);
            ui.hpBar.setVisible(false);
            ui.ultBg.setVisible(false);
            ui.ultBar.setVisible(false);
            ui.spBg.setVisible(false);
            ui.spBar.setVisible(false);
            ui.hpText.setVisible(false);
            ui.spText.setVisible(false);
        }
    }

    // 浮遊テキスト描画
    _updateFloatingTexts() {
        if (!this.floatingTextMap) this.floatingTextMap = new Map();
        
        // 不要になったテキストを削除
        for (const [id, textObj] of this.floatingTextMap.entries()) {
            if (!this.engine.floatingTexts.find(ft => ft.id === id)) {
                textObj.destroy();
                this.floatingTextMap.delete(id);
            }
        }

        // 新規追加・更新
        for (const ft of this.engine.floatingTexts) {
            let textObj = this.floatingTextMap.get(ft.id);
            if (!textObj) {
                let color = '#ff0000'; // 赤:通常
                if (ft.type === 'critical') color = '#ffff00'; // 黄:クリティカル・有効
                else if (ft.type === 'resist') color = '#cc00ff'; // 紫:軽減
                else if (ft.type === 'miss') color = '#aaaaaa'; // グレー:miss
                else if (ft.type === 'heal') color = '#00ff00'; // 緑:回復
                else if (ft.type === 'barrier') color = '#0088ff'; // 青:バリア
                else if (ft.type === 'skill') color = '#ffaa00'; // オレンジ:スキル
                
                textObj = this.scene.add.text(0, 0, ft.amount.toString(), {
                    fontSize: '100px',
                    color: color,
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 10
                }).setOrigin(0.5, 0.5);
                
                this.floatingTextMap.set(ft.id, textObj);
            }

            const p = this.projector.project(ft.x, ft.z);
            if (p.visible) {
                textObj.setVisible(true);
                // 上に移動させる (yOffset) + キャラクターの頭上付近 (p.scale * 2.0程度)
                // 100pxのフォントに対して、p.scale (1mあたりのピクセル数, 奥行きで40〜100程度) を使ってスケールする
                // 元の1/4のサイズにするため p.scale / 200.0 と設定
                let textScale = p.scale / 200.0;
                if (ft.type === 'skill') {
                    textScale *= 0.66; // スキル発動時のテキストは2/3のサイズ
                }
                
                // yOffsetはメートル単位(ft.yOffset) * p.scaleでピクセル数に変換
                textObj.setPosition(p.x, p.y - p.scale * 2.0 - ft.yOffset * p.scale);
                textObj.setScale(textScale);
                
                // 寿命0.5秒以下(後半の0.5秒)からフェードアウト
                const fadeProgress = Math.max(0, (0.5 - ft.lifeTime) / 0.5);
                textObj.setAlpha(1.0 - fadeProgress);
                textObj.setDepth(2000); // 常に最前面
            } else {
                textObj.setVisible(false);
            }
        }
    }

    _updateEffect(eff) {
        if (!this.effectMap) this.effectMap = new Map();
        
        let obj = this.effectMap.get(eff);
        if (!obj) {
            if (eff.type && eff.type.startsWith('element_hit_')) {
                const effId = eff.type.split('_')[2];
                obj = this.scene.add.sprite(0, 0, `hit_effect${effId}`);
                obj.setDepth(2000);
            } else if (eff.type === 'kick_hit') {
                obj = this.scene.add.sprite(0, 0, 'hit_effect6');
                obj.setDepth(2000);
            } else {
                obj = this.scene.add.graphics();
            }
            this.effectMap.set(eff, obj);
        }
        
        const p = this.projector.project(eff.x, eff.z);
        if (p.visible) {
            let progress = 1.0 - (eff.lifeTime / eff.maxLife);
            
            if ((eff.type && eff.type.startsWith('element_hit_')) || eff.type === 'kick_hit') {
                obj.setPosition(p.x, p.y - p.scale * 1.0); // 衝突点(腰の高さ)
                
                let sizeM = 0;
                let alpha = 0.8;
                const phase1Prog = 0.1 / 0.6; // 0.1秒の割合
                const custom = eff.customData || {};
                const isFatal = custom.isFatal || false;
                
                let startSize = isFatal ? 0.05 : 0.2 / 3.0;
                let midSize = isFatal ? ((custom.targetSize || 1.0) * 0.5) : 0.75 / 3.0;
                let endSize = isFatal ? midSize * 1.2 : 1.0 / 3.0;
                
                if (eff.type === 'kick_hit') {
                    startSize = 0.13;
                    midSize = 0.53;
                    endSize = 0.8;
                }
                
                // 画像の余白（透過部分）が広いため、指定されたサイズが小さく見えるのを補正
                const paddingMult = 4.0;
                startSize *= paddingMult;
                midSize *= paddingMult;
                endSize *= paddingMult;
                
                if (progress < phase1Prog) {
                    const t = progress / phase1Prog;
                    sizeM = startSize + (midSize - startSize) * t;
                    alpha = 0.8;
                } else {
                    const t = (progress - phase1Prog) / (1.0 - phase1Prog);
                    sizeM = midSize + (endSize - midSize) * t;
                    alpha = 0.8 * (1.0 - t);
                }
                
                const baseWidth = obj.width || 256;
                obj.setScale(p.scale * (sizeM / baseWidth));
                obj.setAlpha(alpha);
                
                // パターンごとの反転・回転適用 (0-7)
                const pat = custom.pattern !== undefined ? custom.pattern : 0;
                const rot = (pat >= 4) ? 90 : 0;
                const fx = (pat === 2 || pat === 3 || pat === 6 || pat === 7);
                const fy = (pat === 1 || pat === 3 || pat === 5 || pat === 7);
                obj.setAngle(rot);
                obj.setFlipX(fx);
                obj.setFlipY(fy);
                
                return;
            }
            
            const graphics = obj;
            graphics.clear();
            
            // 半径をmからピクセルに変換
            const radiusPx = eff.radius * p.scale;
            
            if (eff.type === 'weapon_004_ribbon') {
                // 黄色いリボンが急速に伸びて、根本から消えていく
                const logicalLength = 25.0; // 論理的な長さ(25m)
                const maxPxLength = logicalLength * p.scale;
                let startLength = 0;
                let endLength = maxPxLength;
                
                if (progress < 0.2) {
                    // 最初の0.2秒で最大長まで伸びる
                    endLength = maxPxLength * Math.pow(progress / 0.2, 0.5);
                } else {
                    // 残りの時間で根本が先端に向かって消えていく
                    const fadeProgress = (progress - 0.2) / 0.8;
                    startLength = maxPxLength * fadeProgress;
                }
                
                const angleRad = (eff.angle || 0) * Math.PI / 180;
                
                // キャラクターの中心（足元から0.5m上）を起点にする
                const centerY = p.y - p.scale * 0.5;
                
                const startX = p.x + Math.sin(angleRad) * startLength;
                const startY = centerY - Math.cos(angleRad) * startLength;
                const endX = p.x + Math.sin(angleRad) * endLength;
                const endY = centerY - Math.cos(angleRad) * endLength;

                graphics.lineStyle(0.3 * p.scale, 0xffff00, 1.0); // 太さ30cm
                graphics.beginPath();
                graphics.moveTo(startX, startY);
                graphics.lineTo(endX, endY);
                graphics.strokePath();
                graphics.setDepth(100);
            } else if (eff.type === 'swing_trail') {
                const alpha = (1.0 - progress) * 0.75;
                const color = eff.customData?.color || 0x00ffff;
                
                // 時間経過で細くなる（テーパリング）
                const taperScale = Math.max(0.1, 1.0 - progress);
                const lineWidth = radiusPx * taperScale; // 以前は radiusPx * 2 だったので、実質半分の太さ以下からスタート
                
                if (eff.customData && eff.customData.prevX !== undefined) {
                    const prevP = this.projector.project(eff.customData.prevX, eff.customData.prevZ);
                    if (prevP.visible && p.visible) {
                        graphics.lineStyle(lineWidth, color, alpha);
                        graphics.beginPath();
                        graphics.moveTo(prevP.x, prevP.y - prevP.scale * 1.0);
                        graphics.lineTo(p.x, p.y - p.scale * 1.0);
                        graphics.strokePath();
                    } else {
                        graphics.fillStyle(color, alpha);
                        graphics.fillCircle(p.x, p.y - p.scale * 1.0, lineWidth / 2);
                    }
                } else {
                    graphics.fillStyle(color, alpha);
                    graphics.fillCircle(p.x, p.y - p.scale * 1.0, lineWidth / 2);
                }
                graphics.setDepth(1000 - p.depth);
            } else if (eff.type === 'barrier_hit') {
                const color = eff.customData?.color || 0x00ffff;
                const alpha = eff.customData?.alpha || 0.5;
                // ダメージを受けた時のエフェクトなので徐々に消える
                graphics.fillStyle(color, alpha * progress);
                // 足元ではなく腰の高さに描画する
                graphics.fillCircle(p.x, p.y - p.scale * 1.0, radiusPx);
                graphics.setDepth(1000 - p.depth);
            } else if (eff.type === 'buff_circle') {
                const colorStr = eff.customData?.color || 'green';
                let colorHex = 0x00ff00;
                if (colorStr === 'green') colorHex = 0x00ff00;
                else if (colorStr === 'cyan') colorHex = 0x00ffff;
                else if (colorStr === 'purple') colorHex = 0xcc00ff;

                // 0.5秒かけて中心へ縮小しながら消える
                const currentRadius = radiusPx * progress;
                const alpha = progress * 0.6; // 半透明(最大0.6)
                
                graphics.fillStyle(colorHex, alpha);
                graphics.fillCircle(p.x, p.y - p.scale * 1.0, currentRadius); // 腰の高さ
                graphics.setDepth(1000 - p.depth + 1); // キャラより手前
            } else {
                graphics.fillStyle(0xff0000, (1.0 - progress) * 0.5);
                graphics.fillCircle(p.x, p.y, radiusPx * progress);
                graphics.setDepth(1000 - p.depth);
            }
        }
    }

    _updateSystemUI() {
        if (!this.sysText) {
            this.sysText = this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 3, '', {
                fontSize: '48px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 8
            }).setOrigin(0.5, 0.5).setDepth(3000);
            this.sysTextTimer = 0;
        }

        // イベントキューから取り出す
        while (this.engine.eventQueue.length > 0) {
            const msg = this.engine.eventQueue.shift();
            this.sysText.setText(msg);
            this.sysText.setAlpha(1.0);
            this.sysText.setScale(0.1);
            this.sysTextTimer = 3.0; // 3秒表示
            
            // ポップアップアニメーション
            this.scene.tweens.add({
                targets: this.sysText,
                scale: 1.0,
                duration: 500,
                ease: 'Back.easeOut'
            });
        }

        if (this.sysTextTimer > 0) {
            this.sysTextTimer -= (this.scene.game.loop.delta / 1000);
            if (this.sysTextTimer <= 0) {
                this.scene.tweens.add({
                    targets: this.sysText,
                    alpha: 0,
                    duration: 500
                });
            }
        }
        
        // 死んだエフェクトのクリーンアップ
        if (this.effectMap) {
            for (const [eff, g] of this.effectMap.entries()) {
                if (!this.engine.effects.includes(eff)) {
                    g.destroy();
                    this.effectMap.delete(eff);
                }
            }
        }
    }

    _updateBattleInfo() {
        if (!this.battleInfoText) {
            this.battleInfoText = this.scene.add.text(this.scene.scale.width / 2, 12, '', {
                fontFamily: 'sans-serif',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5, 0).setDepth(9999);
        }

        // 突破モード(rule === 2)の場合は突破HUDがあるため非表示
        if (this.scene.battleConfig && this.scene.battleConfig.rule === 2) {
            this.battleInfoText.setText('');
            return;
        }

        const aliveEnemies = this.engine.enemies.filter(e => !e.isDead && !e.isDying).length;
        const enemiesRemaining = aliveEnemies + Math.max(0, this.engine.enemyCountPerWave - this.engine.spawnedInWave);
        const totalEnemies = this.engine.enemyCountPerWave || 0;
        
        const currentWave = this.engine.currentWave || 1;
        const totalWaves = this.engine.totalWaves || 1;
        
        const timeSec = Math.floor(this.engine.waveTime || 0);
        const min = Math.floor(timeSec / 60);
        const sec = (timeSec % 60).toString().padStart(2, '0');
        
        // ボス演出中やクリア後、あるいはボス戦中は Enemy/Wave を非表示にする
        if (this.engine.waveState === 'boss_presentation') {
            this.battleInfoText.setText('');
        } else if (this.engine.waveState === 'boss') {
            const boss = this.engine.enemies.find(e => e.isBoss);
            if (boss) {
                this.battleInfoText.setText(`WITCH HP ${Math.ceil(boss.hp)} / ${boss.maxHp}`);
            } else {
                this.battleInfoText.setText('');
            }
        } else if (this.engine.waveState === 'cleared') {
            this.battleInfoText.setText('');
        } else if (currentWave > totalWaves) {
            // ウェーブをすべてクリアした後は非表示にする
            this.battleInfoText.setText('');
        } else {
            this.battleInfoText.setText(`Enemy ${enemiesRemaining}/${totalEnemies}  Wave ${currentWave}/${totalWaves}  Time ${min}:${sec}`);
        }
    }


    // クリーンアップ
    destroy() {
        for (const sprite of this.spriteMap.values()) {
            sprite.destroy();
        }
        this.spriteMap.clear();

        for (const ui of this.uiMap.values()) {
            ui.hpBg.destroy(); ui.hpBar.destroy(); 
            ui.ultBg.destroy(); ui.ultBar.destroy();
            ui.spBg.destroy(); ui.spBar.destroy(); 
            ui.hpText.destroy(); ui.spText.destroy();
        }
        this.uiMap.clear();

        if (this.floatingTextMap) {
            for (const textObj of this.floatingTextMap.values()) {
                textObj.destroy();
            }
            this.floatingTextMap.clear();
        }
        if (this.battleInfoText) {
            this.battleInfoText.destroy();
        }
    }
}
