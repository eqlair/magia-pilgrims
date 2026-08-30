import Phaser from 'phaser';
import { SpriteText } from '../utils/SpriteText';


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

        // 描画更新の最初に、削除されたエンティティのスプライトを消去する
        for (const [entity, sprite] of this.spriteMap.entries()) {
            if (entity.isDead) {
                // プレイヤーキャラクター（charIdを持つ味方本体）は死亡後も倒れ絵を描画し、突破戦では画面下に流すため即時消去しない
                const isPlayerChar = !!entity.charId;
                if (isPlayerChar) {
                    const isBreakthrough = (this.scene.battleConfig && this.scene.battleConfig.rule === 2);
                    // 突破戦で完全に画面手前下端外（z < -2.0）に流れ去った場合のみ消去
                    if (isBreakthrough && entity.z < -2.0) {
                        sprite.destroy();
                        if (entity.sprite2) entity.sprite2.destroy();
                        this.spriteMap.delete(entity);
                        if (this.uiMap.has(entity)) {
                            const ui = this.uiMap.get(entity);
                            if (ui) {
                                if (ui.hpBg) ui.hpBg.destroy(); if (ui.hpBar) ui.hpBar.destroy(); 
                                if (ui.ultBg) ui.ultBg.destroy(); if (ui.ultBar) ui.ultBar.destroy();
                                if (ui.spBg) ui.spBg.destroy(); if (ui.spBar) ui.spBar.destroy(); 
                            }
                            this.uiMap.delete(entity);
                        }
                    }
                    continue;
                }

                sprite.destroy();
                if (entity.sprite2) {
                    entity.sprite2.destroy();
                }
                this.spriteMap.delete(entity);
                
                if (this.uiMap.has(entity)) {
                    const ui = this.uiMap.get(entity);
                    if (ui) {
                        if (ui.hpBg) ui.hpBg.destroy(); if (ui.hpBar) ui.hpBar.destroy(); 
                        if (ui.ultBg) ui.ultBg.destroy(); if (ui.ultBar) ui.ultBar.destroy();
                        if (ui.spBg) ui.spBg.destroy(); if (ui.spBar) ui.spBar.destroy(); 
                    }
                    this.uiMap.delete(entity);
                }

            }
        }

        // プレイヤーの描画更新
        for (const p of this.engine.players) {
            let charTex = `battle_${p.charId}`;
            if (p.charId === '009' && p.isUltimateActive) {
                charTex = 'battle_009_adult';
            }
            this._updateSprite(p, charTex);
            this._updateUI(p);

            // ノア(008)の自律浮遊エネルギー球体の描画
            if (p.charId === '008') {
                this._updateNoahOrbs(p);
            }
        }

        // 敵の描画更新
        for (const e of this.engine.enemies) {
            if (e.isDead) continue;
            this._updateSprite(e, e.textureKey || 'enemy');
            this._updateUI(e);
        }

        // PvP敵魔法少女の描画更新
        if (this.engine.isPvpBattle && this.engine.pvpEnemies) {
            for (const ep of this.engine.pvpEnemies) {
                const charTex = `battle_${ep.charId}`;
                this._updateSprite(ep, charTex);
                this._updateUI(ep);
            }
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
            else if (b.type === 'weapon_004') textureKey = 'weapon_004';
            else if (b.type === 'swing_004' || b.type === 'weapon_004_ribbon') textureKey = 'weapon_004_ribbon';
            else if (b.type === 'weapon_005' || b.type === 'swing_005') textureKey = 'weapon_005';
            else if (b.type === 'sankosho_007' || b.type === 'sankosho_circle_007' || b.type === 'weapon_007' || b.type === 'ultimate_007') textureKey = 'weapon_007';
            else if (b.type === 'noah_bullet_008' || b.type === 'weapon_008_bullet') textureKey = 'weapon_008_bullet';
            else if (b.type === 'special_field_008') textureKey = 'weapon_008_orb';
            else if (b.type === 'ultimate_008') textureKey = b.textureKey || 'weapon_008_ult_a';
            else if (b.type === 'pollen_smoke_009' || b.type === 'smoke_field_009' || b.type === 'weapon_009_pollen') textureKey = 'weapon_009_pollen';
            else if (b.type === 'spear_spin_009' || b.type === 'spear_throw_009' || b.type === 'weapon_009' || b.type === 'weapon_009_spear' || b.type === 'swing_009') textureKey = 'weapon_009';
            else if (b.type === 'icicle_large_010' || b.type === 'icicle_small_010' || b.type === 'weapon_010_icicle') textureKey = 'weapon_010_icicle';
            else if (b.type === 'ice_block_010' || b.type === 'ice_barrier_010' || b.type === 'weapon_010_iceblock') textureKey = 'weapon_010_iceblock';
            else if (b.type === 'swing_ultimate_002') textureKey = 'weapon_002';
            else if (b.type === 'laser_011' || b.type === 'weapon_011') textureKey = 'weapon_011';
            else if (b.type === 'barrier_011' || b.type === 'weapon_011b') textureKey = 'weapon_011b';
            else if (b.type === 'special_barrier_011' || b.type === 'ultimate_011' || b.type === 'ultimate_burst_field_011' || b.type === 'special_barrier_010' || b.type === 'ultimate_010') textureKey = 'nrg';
            // 汎用: swing_XXX 形式
            else if (b.type && b.type.startsWith('swing_')) {
                const id = b.type.replace('swing_', '');
                textureKey = `weapon_${id}`;
            }

            if (textureKey) {
                this._updateSprite(b, textureKey);
                if (b.type === 'special_barrier_011' || b.type === 'ultimate_011' || b.type === 'special_barrier_010' || b.type === 'ultimate_010' || (b.type && b.type.includes('barrier') && !b.type.includes('ice'))) {
                    const sprite = this.spriteMap.get(b);
                    if (sprite) {
                        sprite.setTint(0x00ffff);
                        sprite.setBlendMode(Phaser.BlendModes.ADD);
                    }
                } else if (b.type === 'smoke_field_009' || b.type === 'pollen_smoke_009') {
                    const sprite = this.spriteMap.get(b);
                    if (sprite) {
                        sprite.setAlpha(0.85);
                    }
                } else if (b.type === 'smoke_field_009') {
                    const sprite = this.spriteMap.get(b);
                    if (sprite) {
                        sprite.clearTint();
                        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
                        const currentAlpha = b.alpha !== undefined ? b.alpha : Math.max(0, b.lifeTime / 2.0);
                        sprite.setAlpha(currentAlpha);
                    }
                } else if (b.type === 'pollen_smoke_009') {
                    const sprite = this.spriteMap.get(b);
                    if (sprite) {
                        sprite.clearTint();
                        sprite.setBlendMode(Phaser.BlendModes.NORMAL);
                        sprite.setAlpha(1.0);
                    }
                }
            }

            // ノア(008)の必殺技フェニックス残像描画 (0.1秒遅れ: 75%, 0.2秒遅れ: 50%)
            if (b.type === 'ultimate_008' && !b.isDead) {
                this._updateNoahUltTrails(b);
            }
        }

        // ノア必殺技残像のクリーンアップ（本体が死んだり弾丸リストから消えた場合に即座に消去）
        if (this.noahUltTrailMap) {
            for (const [ultBullet, trails] of this.noahUltTrailMap.entries()) {
                if (!this.engine.bullets.includes(ultBullet) || ultBullet.isDead) {
                    if (trails.s1) trails.s1.destroy();
                    if (trails.s2) trails.s2.destroy();
                    this.noahUltTrailMap.delete(ultBullet);
                }
            }
        }

        


        // キック弾の範囲描画は不要になったため消去

        // 爆発エフェクトは_updateEffect側でbomb.pngスプライトとして処理


        
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
            // 弾丸・バリア弾・手りゅう弾は画像の中心(0.5, 0.5)を基準点に。キャラは基本足元(1.0)だが、魔女は表示を1/3下げるため0.666にする
            const isBarrier = (entity.type && (entity.type.includes('barrier') || entity.type.includes('010')));
            const isProjectile = textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey === 'nrg' || textureKey.startsWith('weapon_') || isBarrier;
            let originY = 1.0;
            if (isProjectile) {
                // スイングの場合は持ち手(1.0)を軸にする
                if ((entity.type && entity.type.startsWith('swing_')) || entity.type === 'ultimate_003') {
                    originY = 1.0;
                } else {
                    originY = 0.5; // バリア弾を含む各種飛び道具は画像中心(0.5)を中心点にする！
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
            const isBarrier = (entity.type && (entity.type.includes('barrier') || entity.type.includes('010')));
            const isProjectile = textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey === 'nrg' || textureKey.startsWith('weapon_') || isBarrier;
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
            const isDown = (entity.hp <= 0 || entity.isDead || entity.isDying);
            if (!isProjectile && entity.attackShakeTimer > 0 && !isDown) {
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
                let baseTex = `battle_${charId}`;
                let motionTex = `battle_${charId}_b`;

                // 009 リフィエル変身時は大人姿のスプライトシートを使用
                if (charId === '009' && entity.isUltimateActive) {
                    baseTex = 'battle_009_adult';
                    motionTex = 'battle_009_adult_b';
                }

                const cs = entity.combatState;
                const isAttacking = cs && (cs.phase === 'acting');
                const isReloading = cs && (cs.phase === 'reloading');

                // 攻撃・近接モーション中かどうかの判定
                let isAttackMotion = false;
                if (entity.isEnemy) {
                    if (charId === '001' || charId === '005') {
                        isAttackMotion = (entity.kickTimer > 0 || !!entity.isKickAttacking);
                    } else {
                        isAttackMotion = (entity.attackAnimTimer > 0);
                    }
                } else {
                    if (charId === '001' || charId === '005') {
                        // 紫苑・李乃果: 実際にキック発動中のときのみ表示
                        isAttackMotion = (entity.kickTimer > 0 || !!entity.isKickAttacking);
                    } else if (charId === '010') {
                        // プロセル: 攻撃実行中(acting) または 必殺技乱射中
                        isAttackMotion = isAttacking || !!entity.isUltimateActive;
                    } else if (charId === '009') {
                        // リフィエル: 攻撃実行中(acting) または 必殺技変身中
                        isAttackMotion = isAttacking || !!entity.isUltimateActive;
                    } else {
                        // 蒼樹(002)・紅華(003)・黄蘭(004): 攻撃実行中(acting)のみ
                        isAttackMotion = isAttacking;
                    }
                }

                if (entity.hp <= 0 || entity.isDead) {
                    // 死亡ダウンフレーム
                    if (charId === '009') {
                        sprite.setTexture(motionTex);
                        sprite.setFrame(6); // 倒れダウン
                    } else {
                        sprite.setTexture(baseTex);
                        sprite.setFrame(6); // 死亡フレーム（index 6）
                    }
                } else if (isAttackMotion && this.scene.textures.exists(motionTex)) {
                    // ── 攻撃特殊モーション (_bシート) ──
                    sprite.setTexture(motionTex);
                    if (!entity.isEnemy) {
                        // 味方プレイヤーの攻撃: 基本は背面(3:奥向き攻撃)
                        let frame = 3;
                        if (entity.targetEnemy) {
                            const dx = entity.targetEnemy.x - entity.x;
                            const dz = entity.targetEnemy.z - entity.z;
                            if (dz < -1.0) frame = 0; // 手前
                            else if (dx > 2.0 && dz < 2.0) frame = 2; // 右
                            else if (dx < -2.0 && dz < 2.0) frame = 1; // 左
                            else frame = 3; // 奥
                        }
                        sprite.setFrame(frame);
                    } else {
                        // 敵魔法少女の攻撃: 基本は正面(0:手前向き攻撃)
                        let frame = 0;
                        if (entity.targetEnemy) {
                            const dx = entity.targetEnemy.x - entity.x;
                            const dz = entity.targetEnemy.z - entity.z;
                            if (dz > 1.0) frame = 3; // 奥
                            else if (dx > 2.0 && Math.abs(dz) < 2.0) frame = 2; // 右
                            else if (dx < -2.0 && Math.abs(dz) < 2.0) frame = 1; // 左
                            else frame = 0; // 手前
                        }
                        sprite.setFrame(frame);
                    }

                } else if (isBreakthrough) {
                    // 突破ステージ: 基本は全キャラ上向き走行(コマ4,5を0.25s交互)
                    const runFrame = Math.floor(this.scene.time.now / 250) % 2 === 0 ? 4 : 5;

                    let useBaseTex = false;
                    let targetFrame = null;

                    if (entity.targetEnemy && isAttackMotion) {
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        if (dz < -1.0) targetFrame = 0;
                        else if (dx > 2.0 && dz < 2.0) targetFrame = 2;
                        else if (dx < -2.0 && dz < 2.0) targetFrame = 1;
                        else targetFrame = 3;
                    } else if (entity.targetEnemy && (isAttacking || isReloading)) {
                        const dx = entity.targetEnemy.x - entity.x;
                        const dz = entity.targetEnemy.z - entity.z;
                        if (dz < -1.0) { useBaseTex = true; targetFrame = 0; }
                        else if (dx > 2.0 && dz < 2.0) { useBaseTex = true; targetFrame = 2; }
                        else if (dx < -2.0 && dz < 2.0) { useBaseTex = true; targetFrame = 1; }
                        else targetFrame = runFrame;
                    } else {
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
                        sprite.setFrame(3);
                    }

                } else {
                    // 通常時 (baseTex: 0:正面/手前, 1:左, 2:右, 3:背面/奥)
                    sprite.setTexture(baseTex);
                    if (!entity.isEnemy) {
                        // ── 味方プレイヤー: 基本は背面(3:奥/後ろ姿・通常立ち) ──
                        let frame = 3;
                        if (entity.targetEnemy) {
                            const dx = entity.targetEnemy.x - entity.x;
                            const dz = entity.targetEnemy.z - entity.z;
                            if (dz < -1.0) frame = 0; // 手前
                            else if (dx > 2.0 && dz < 2.0) frame = 2; // 右
                            else if (dx < -2.0 && dz < 2.0) frame = 1; // 左
                            else frame = 3; // 奥
                        }
                        sprite.setFrame(frame);
                    } else {
                        // ── 敵魔法少女: 基本は正面(0:手前/顔が見える) ──
                        let frame = 0;
                        if (entity.targetEnemy) {
                            const dx = entity.targetEnemy.x - entity.x;
                            const dz = entity.targetEnemy.z - entity.z;
                            if (dz > 1.0) frame = 3; // 奥
                            else if (dx > 2.0 && Math.abs(dz) < 2.0) frame = 2; // 右
                            else if (dx < -2.0 && Math.abs(dz) < 2.0) frame = 1; // 左
                            else frame = 0; // 手前
                        }
                        sprite.setFrame(frame);
                    }
                }
            }



            // プレイヤーキャラ等のダメージ傾き（倒れている時は傾けず安定）
            if (entity.owner === 'player' && !isProjectile) {
                if (!isDown && entity.damageTiltTimer > 0) {
                    sprite.setAngle(-15 * (entity.damageTiltTimer / 0.2));
                } else {
                    sprite.setAngle(0);
                }
            }

            // 🌿 リフィエル変身中の継続オーラ: 大人姿に子供姿とnrgオーバーレイを重ねて光らせる
            if (entity.charId === '009' && entity.isUltimateActive && !isProjectile && !isDown) {
                // 子供姿（半透明）を重ねる
                let childSprite = entity._ultChildSprite;
                if (!childSprite) {
                    childSprite = this.scene.add.sprite(0, 0, 'battle_009', 0).setOrigin(0.5, 1.0);
                    entity._ultChildSprite = childSprite;
                }
                const childFrame = sprite.frame?.name ?? 3;
                childSprite.setTexture('battle_009');
                childSprite.setFrame(childFrame);
                childSprite.setPosition(sprite.x, sprite.y);
                childSprite.setScale(sprite.scaleX, sprite.scaleY);
                childSprite.setDepth(sprite.depth - 1);
                childSprite.setAlpha(0.35);
                childSprite.setVisible(true);
                childSprite.setTint(0xaaffaa);
                childSprite.setBlendMode(Phaser.BlendModes.ADD);

                // nrg 加算合成グロウ（ゆっくり点滅）
                let nrgSprite = entity._ultNrgSprite;
                if (!nrgSprite) {
                    nrgSprite = this.scene.add.sprite(0, 0, 'nrg').setOrigin(0.5, 0.5);
                    entity._ultNrgSprite = nrgSprite;
                }
                const pulse = 0.55 + 0.45 * Math.sin((this.scene.time.now || 0) * 0.004);
                const nrgBase = nrgSprite.width || 200;
                const nrgScale = p.scale * (2.5 / nrgBase);
                nrgSprite.setPosition(sprite.x, sprite.y - p.scale * 1.0);
                nrgSprite.setScale(nrgScale);
                nrgSprite.setTint(0xaaffaa);
                nrgSprite.setBlendMode(Phaser.BlendModes.ADD);
                nrgSprite.setAlpha(pulse * 0.7);
                nrgSprite.setDepth(sprite.depth + 1);
                nrgSprite.setVisible(true);
            } else if (entity._ultChildSprite) {
                entity._ultChildSprite.setVisible(false);
                if (entity._ultNrgSprite) entity._ultNrgSprite.setVisible(false);
            }

            // 呼吸アニメーション（生存時: ±5%, 倒れ時: ±1.5%の微弱な息遣い）
            let scaleAnim = 1.0;
            if (entity.breathPhase !== undefined) {
                const breathAmp = isDown ? 0.015 : 0.05;
                scaleAnim = 1.0 + Math.sin(entity.breathPhase) * breathAmp;
            }

            // 色付け（デバフ状態や属性ごとの敵弾丸用など）
            if (entity.owner === 'enemy' && entity.stunTimer > 0 && !isDown) {
                // スタン/デバフ状態：デバフ属性カラー（黄欄=黄色 0xffff22）のフィルターを被せる
                const debuffColor = entity.debuffColor !== undefined ? entity.debuffColor : 0xffff22;
                sprite.setTint(debuffColor);
                sprite.setBlendMode(Phaser.BlendModes.NORMAL);
            } else if (textureKey === 'enemy_bullet' || (entity.owner === 'enemy' && (textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'nrg'))) {
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
                sprite.setBlendMode(Phaser.BlendModes.ADD); // 💥 敵の放つ弾丸：加算合成（重なるほど明るく白熱発光！）
            } else if (textureKey === 'weapon_010' || textureKey === 'weapon_010b' || textureKey === 'nrg' || (entity.type && (entity.type.includes('barrier') || entity.type.includes('010')))) {
                // 🛡️ 白蓮のバリア弾各種・レーザー
                sprite.setBlendMode(Phaser.BlendModes.ADD); // 加算合成で鮮やかに発光！
            } else {
                sprite.clearTint();
                sprite.setBlendMode(Phaser.BlendModes.NORMAL);
            }


            if (entity.owner === 'enemy' && !isPlayerChar) {
                // フレームの更新
                sprite.setFrame(entity.frame || 0);

                if (!entity.isBoss) {
                    // 通常の敵は少し揺れるアニメーション (死亡消滅中は静止)
                    if (entity.damageTiltTimer > 0 && !entity.isDying) {
                        sprite.setAngle(-15 * (entity.damageTiltTimer / 0.2));
                    } else if (!entity.isDying) {
                        sprite.setAngle(Math.sin(this.scene.time.now / 300 + entity.z) * 5);
                    } else {
                        sprite.setAngle(0);
                    }
                } else {
                    // ボス(魔女)撃破時の小爆発振動角度
                    if (entity.isDying && entity.bossShakeTimer > 0 && entity.bossShakeAngle !== undefined) {
                        sprite.setAngle(entity.bossShakeAngle);
                    } else {
                        sprite.setAngle(0);
                    }
                }
            }

            if (textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'grenade' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_')) {
                // entity.size (m) に対応するスケールを計算
                // baseWidthピクセルの画像が、ワールド上でentity.size(m)の幅になるようにする
                const baseWidth = sprite.width || 100; 
                
                // ★視認性向上のための描画倍率（当たり判定はそのまま、見た目だけ大きくする）
                // 雑魚敵の通常弾丸(ball.png / enemy_bullet)のみ3.5倍、魔法少女の弾丸・手りゅう弾等はプレイヤーと同じ1.5倍
                let visualMultiplier = (textureKey === 'enemy_bullet') ? 3.5 : 1.5;
                if (textureKey === 'weapon_002') {
                    // 回転中(swing_ultimate_002)は元のサイズ(1.5)、飛んでいく時のみ2倍(3.0)に拡大
                    visualMultiplier = (entity.type === 'swing_ultimate_002') ? 1.5 : 3.0;
                }
                if (textureKey === 'weapon_004') visualMultiplier = 0.75; // 黄蘭の弾丸は見た目1/2
                if (textureKey === 'hit_effect6') visualMultiplier = 8.0;  // キック衝撃波
                if (textureKey === 'weapon_009_pollen' || entity.type === 'pollen_smoke_009' || entity.type === 'smoke_field_009') visualMultiplier = 1.0;



                
                sprite.setScale(p.scale * ((entity.size * visualMultiplier) / baseWidth));

                
                // 進行方向に向ける（弾丸のみ、手りゅう弾は回転させないかクルクル回すか）
                if (textureKey === 'weapon_008_orb') {
                    // ノアのエネルギー球体 / 特技フィールド (special_field_008)
                    const baseSize = sprite.height || 200;
                    const isSpecialField = entity.type === 'special_field_008';
                    const visualSize = isSpecialField ? 3.0 : (entity.size || 0.30) * 2.0;
                    const targetScale = p.scale * (visualSize / baseSize);
                    sprite.setScale(targetScale);
                    sprite.setAngle((this.scene.time.now || 0) * 0.08);
                    sprite.setBlendMode(Phaser.BlendModes.ADD);
                    sprite.setDepth(1000 - p.depth + 30);
                    sprite.setAlpha(isSpecialField ? 0.25 : 1.0); // 特技フィールドは不透明度25%で上品に発光！
                } else if (textureKey === 'weapon_008_bullet') {
                    // 赤いレーザー弾丸: 進行方向に向けて鮮やかに発光（大きく太く見やすく！）
                    const baseHeight = sprite.height || 360;
                    const baseWidth = sprite.width || 180;
                    const visualLength = 4.0; // 長さ約4m相当の太いレーザービーム
                    const scaleY = p.scale * (visualLength / baseHeight);
                    const scaleX = scaleY * 1.8; // 横幅も1.8倍に太く
                    sprite.setScale(scaleX, scaleY);
                    const angle = Math.atan2(-entity.vz, entity.vx) * 180 / Math.PI + 90;
                    sprite.setAngle(angle);
                } else if (textureKey === 'weapon_010') {
                    // 白蓮のレーザー弾: 青白いレーザービームを加算合成で発光 (長さ2m, 幅等倍比率1.0)
                    const baseHeight = sprite.height || 360;
                    const baseWidth = sprite.width || 180;
                    const visualLength = 2.0;
                    const scaleY = p.scale * (visualLength / baseHeight);
                    const scaleX = scaleY * 1.0;
                    sprite.setScale(scaleX, scaleY);
                    const angle = Math.atan2(-entity.vz, entity.vx) * 180 / Math.PI + 90;
                    sprite.setAngle(angle);
                    sprite.setTint(0x00ffff);
                    sprite.setBlendMode(Phaser.BlendModes.ADD);
                    sprite.setDepth(1000 - p.depth + 40);
                    sprite.setAlpha(1.0);
                } else if (textureKey === 'weapon_010b' || textureKey === 'nrg') {
                    // 白蓮のバリア弾各種 (barrier_010, special_barrier_010, ultimate_010): 直径サイズに合わせて加算合成で美しく回転発光
                    const baseSize = sprite.width || 200;
                    const visualSize = entity.size || 2.5;
                    const targetScale = p.scale * (visualSize / baseSize);
                    sprite.setScale(targetScale);
                    sprite.setAngle((this.scene.time.now || 0) * 0.06);
                    sprite.setTint(0x00ffff);
                    sprite.setBlendMode(Phaser.BlendModes.ADD);
                    sprite.setDepth(1000 - p.depth + 35);
                    sprite.setAlpha(1.0);
                } else if (textureKey === 'weapon_008_ult_a' || textureKey === 'weapon_008_ult_b') {
                    // 不死鳥フェニックス必殺技: 幅と高さの比率をそれぞれ独立にワールドスケール
                    const baseWidth = sprite.width || 300;
                    const baseHeight = sprite.height || 200;
                    const visualW = entity.visualWidth || (entity.size ? entity.size * 1.5 : 6.0);
                    const visualH = entity.visualHeight || (entity.size || 4.0);
                    const scaleX = p.scale * (visualW / baseWidth);
                    const scaleY = p.scale * (visualH / baseHeight);
                    sprite.setScale(scaleX, scaleY);
                    sprite.setAngle(0);
                    sprite.setBlendMode(Phaser.BlendModes.ADD);
                    sprite.setDepth(1000 - p.depth + 45);
                    sprite.setAlpha(1.0);
                } else if (textureKey === 'bullet' || textureKey === 'enemy_bullet' || textureKey === 'hit_effect6' || textureKey.startsWith('weapon_')) {
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
                        if (entity.type === 'swing_003') angleRange = 270; // 1.5回転分(±270度 = 計540度)
                        if (entity.type === 'swing_ultimate_002') angleRange = 180; // 360度薙ぎ払い

                        // 軌跡と画像の回転方向を合わせる
                        const dir = entity.armDir || entity.swingDir || 1;
                        if (entity.type === 'swing_009') {
                            // 🌿 リフィエルの二重振り子槍回し
                            // originY=1.0（根本基準）なので、setAngle は「根本→先端の方向」を指定
                            // アームの現在角度から、槍自体は高速自転(720度/0.5秒)する
                            const armAngleDeg = entity.currentArmAngle !== undefined
                                ? entity.currentArmAngle * 180 / Math.PI  // ワールド角度をそのまま
                                : entity.baseAngle * 180 / Math.PI;
                            // Phaserのy軸反転補正: atan2(dz,dx) → +90でY軸合わせ
                            // 槍が根本から先端方向＝アーム外向き＝curAngle方向、+ 自転スピン
                            sprite.setAngle(-armAngleDeg + 90 + (progress * 720 * dir));
                        } else {
                            sprite.setAngle(baseAngle + (angleRange * dir) - (angleRange*2 * progress * dir));
                        }

                        // サイズ調整
                        if (entity.type === 'swing_003' || entity.type === 'swing_009') {
                            // 槍の見た目を2.5m相当に調整
                            const baseHeight = sprite.height || 100;
                            const targetScale = p.scale * (2.5 / baseHeight);
                            sprite.setScale(targetScale);
                        } else if (entity.type === 'swing_002') {
                            // 青樹の剣: 画面上で3.0m相当の長さに設定
                            const baseHeight = sprite.height || 100;
                            const targetScale = p.scale * (3.0 / baseHeight);
                            sprite.setScale(targetScale);
                        } else {
                            let scaleMult = 1.5;
                            sprite.setScale(sprite.scale * scaleMult);
                        }

                        // swing_003 のみ双頭槍の対向スプライト2を表示 (swing_009 は1本で自転するので不要)
                        if (entity.type === 'swing_003') {
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
                        } else if (entity.sprite2) {
                            // swing_009 など不要なsprite2は非表示
                            entity.sprite2.setVisible(false);
                        }
                        
                        if (entity.type === 'swing_004') {
                            sprite.setVisible(true);
                            // 黄蘭の近接攻撃(004003b.png)も蒼樹の剣と同様に長めの3.0m相当でスイング表示
                            const baseHeight = sprite.height || 100;
                            const targetScale = p.scale * (3.0 / baseHeight);
                            sprite.setScale(targetScale);
                        } else if (entity.type === 'swing_ultimate_004') {
                            sprite.setVisible(false);
                        }
                    } else if (entity.type === 'ultimate_003') {
                        // 必殺技は常に回転
                        sprite.setAngle(entity.spinAngle * 180 / Math.PI);
                        
                        const hitRadius = entity.hitRange !== undefined ? entity.hitRange : (entity.size / 2);
                        const baseHeight = sprite.height || 100;
                        const targetScale = p.scale * (3.0 / baseHeight);
                        sprite.setScale(targetScale);

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
                    } else if (entity.spinAngle !== undefined) {
                        // ななよの三鈷杵やスピン武器
                        sprite.setAngle(entity.spinAngle * 180 / Math.PI);
                        const baseHeight = sprite.height || 100;
                        const targetScale = p.scale * (1.8 / baseHeight);
                        sprite.setScale(targetScale);
                    } else if (entity.spinSpeed !== undefined) {
                        // 黄蘭の必殺技後に舞う004003b.png: 全てをランダムな回転方向、速度でゆっくり回転
                        const dt = (this.scene.game.loop.delta / 1000);
                        entity.spinAngle = (entity.spinAngle || 0) + entity.spinSpeed * dt;
                        sprite.setAngle(entity.spinAngle * 180 / Math.PI);
                    } else {
                        // 通常の飛ぶ武器
                        if (textureKey === 'weapon_009' || entity.type === 'weapon_009') {
                            const baseHeight = sprite.height || 360;
                            const targetScale = p.scale * (2.5 / baseHeight);
                            sprite.setScale(targetScale);
                        }
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

                if (entity.isBoss && entity.isDying && entity.bossShakeTimer > 0 && entity.bossShakeScale !== undefined) {
                    scaleAnim *= entity.bossShakeScale;
                }

                sprite.setScale(finalScale * scaleAnim);
            }

            // 死亡演出（透過）や特殊エフェクト透過
            if (entity.isDying) {
                if (entity.isBoss) {
                    // ボス(魔女)の場合：第3段階(deathTimer 3.5s〜4.5s)で1秒かけてフェードアウト！
                    if (entity.deathTimer < 3.5) {
                        sprite.setAlpha(1.0);
                    } else {
                        const fadeProgress = Math.min(1.0, (entity.deathTimer - 3.5) / 1.0);
                        sprite.setAlpha(Math.max(0, 1.0 - fadeProgress));
                    }
                } else {
                    // 通常の敵：1.0秒かけて透明に消えてゆく
                    sprite.setAlpha(Math.max(0, 1.0 - (entity.deathTimer / 1.0)));
                }
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
                ultBar: this.scene.add.rectangle(0, 0, 100, 10, 0xff0000).setOrigin(0.5, 0.5)
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
            
            // 死にかけ（透明化中）の時はゲージも透明に
            if (entity.isDying) {
                const alpha = Math.max(0, entity.deathTimer / 0.5);
                ui.hpBg.setAlpha(alpha); ui.hpBar.setAlpha(alpha);
                ui.ultBg.setAlpha(alpha); ui.ultBar.setAlpha(alpha);
                ui.spBg.setAlpha(alpha); ui.spBar.setAlpha(alpha);
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

                // 敵はSPなし
                if (entity.owner === 'enemy') {
                    ui.spBg.setVisible(false); ui.spBar.setVisible(false);
                } else {
                    ui.ultBg.setAlpha(alpha); ui.ultBar.setAlpha(alpha);
                    ui.spBg.setAlpha(alpha); ui.spBar.setAlpha(alpha);
                }

                // 死亡時は頭上ゲージを非表示
                if (entity.isDead || entity.hp <= 0) {
                    ui.hpBg.setVisible(false); ui.hpBar.setVisible(false);
                    ui.ultBg.setVisible(false); ui.ultBar.setVisible(false);
                    ui.spBg.setVisible(false); ui.spBar.setVisible(false);
                }
            }
        } else {
            ui.hpBg.setVisible(false);
            ui.hpBar.setVisible(false);
            ui.ultBg.setVisible(false);
            ui.ultBar.setVisible(false);
            ui.spBg.setVisible(false);
            ui.spBar.setVisible(false);
        }
    }


    // 浮遊テキスト描画（スプライト文字 letterS.png を使用して描画を超爆速化）
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
                if (ft.type === 'kuji_word') {
                    textObj = this.scene.add.text(0, 0, ft.amount.toString(), {
                        fontSize: ft.fontSize || '36px',
                        fontFamily: 'sans-serif',
                        color: ft.color || '#ffd700',
                        stroke: ft.stroke || '#000000',
                        strokeThickness: ft.strokeThickness || 6,
                        fontStyle: 'bold',
                        shadow: { offsetX: 0, offsetY: 0, color: '#ff8800', blur: 12, stroke: true, fill: true }
                    }).setOrigin(0.5, 0.5);
                    textObj.isPhaserText = true;
                } else if (ft.type === 'skill' || /[^\x00-\x7F]/.test(ft.amount.toString())) {
                    textObj = this.scene.add.text(0, 0, ft.amount.toString(), {
                        fontSize: '20px',
                        fontFamily: 'sans-serif',
                        color: '#ffdd00',
                        stroke: '#000000',
                        strokeThickness: 4,
                        fontStyle: 'bold'
                    }).setOrigin(0.5, 0.5);
                    textObj.isPhaserText = true;
                } else {
                    let tint = 0xff3333; // 赤:通常
                    if (ft.type === 'critical') tint = 0xffff00; // 黄:クリティカル
                    else if (ft.type === 'resist') tint = 0xcc33ff; // 紫:軽減
                    else if (ft.type === 'miss') tint = 0xaaaaaa; // グレー:miss/reloading
                    else if (ft.type === 'heal') tint = 0x33ff66; // 緑:回復
                    else if (ft.type === 'barrier') tint = 0x00ccff; // 青:バリア
                    else if (ft.type === 'skill') tint = 0xffaa00; // オレンジ:スキル
                    
                    textObj = new SpriteText(this.scene, 0, 0, ft.amount.toString(), {
                        tint: tint,
                        spacing: 28,
                        originX: 0.5,
                        originY: 0.5
                    });
                }
                this.floatingTextMap.set(ft.id, textObj);
            } else {
                textObj.setText(ft.amount.toString());
            }

            const p = this.projector.project(ft.x, ft.z);
            if (p.visible) {
                textObj.setVisible(true);
                if (textObj.isPhaserText) {
                    let scale = (p.scale / 70.0);
                    if (ft.type === 'kuji_word') {
                        scale = Math.max(1.0, (p.scale / 70.0) * 1.5);
                    }
                    textObj.setPosition(p.x, p.y - p.scale * 2.0 - (ft.yOffset || 0) * p.scale);
                    textObj.setScale(scale);
                } else {
                    let textScale = (p.scale / 70.0) * 0.8;
                    textObj.setPosition(p.x, p.y - p.scale * 2.0 - (ft.yOffset || 0) * p.scale);
                    textObj.setScale(textScale);
                }
                
                // 寿命0.4秒以下からフェードアウト
                const fadeProgress = Math.max(0, (0.4 - ft.lifeTime) / 0.4);
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
            if (eff.type && (eff.type.startsWith('element_hit_') || eff.type.startsWith('enemy_death_'))) {
                const effId = eff.type.split('_')[2] || '1';
                obj = this.scene.add.sprite(0, 0, `hit_effect${effId}`);
                // 生成ごとに上下左右反転＆角度のランダム付与
                const fx = Math.random() < 0.5;
                const fy = Math.random() < 0.5;
                obj.setFlip(fx, fy);
                obj.setAngle([0, 90, 180, 270][Math.floor(Math.random() * 4)]);
                obj.setDepth(2000);
            } else if (eff.type === 'kick_hit') {
                obj = this.scene.add.sprite(0, 0, 'hit_effect6');
                const fx = Math.random() < 0.5;
                const fy = Math.random() < 0.5;
                obj.setFlip(fx, fy);
                obj.setAngle([0, 90, 180, 270][Math.floor(Math.random() * 4)]);
                obj.setDepth(2000);
            } else if (eff.type === 'slash_hit') {
                obj = this.scene.add.sprite(0, 0, 'slash');
                obj.setOrigin(0.5, 1.0); // 横長だけどグラフィック上側が先端。下側が手前
                obj.setDepth(2500);
            } else if (eff.type === 'buff_circle' || eff.type === 'barrier_hit' || eff.type === 'ultimate_burst_010' || eff.type === 'ultimate_burst_009') {
                obj = this.scene.add.sprite(0, 0, 'nrg');
                obj.setBlendMode(Phaser.BlendModes.ADD); // 加算合成で黒枠を完全透明化しエネルギー発光！
                obj.setDepth(1500);
            } else if (eff.type === 'grenade_explosion') {
                obj = this.scene.add.sprite(0, 0, 'grenade_explosion');
                const fx = Math.random() < 0.5;
                const fy = Math.random() < 0.5;
                obj.setFlip(fx, fy);
                obj.setAngle([0, 90, 180, 270][Math.floor(Math.random() * 4)]);
                obj.setBlendMode(Phaser.BlendModes.ADD); // 加算合成（重なるほど明るく発光）
                obj.setDepth(1800);
            } else if (eff.type === 'explosion' || eff.type === 'noah_bullet_explosion' || eff.type === 'bomb' || eff.type === 'witch_bomb' || (eff.type && eff.type.startsWith('majo_death'))) {
                obj = this.scene.add.sprite(0, 0, 'bomb');
                // 毎回「通常」「左右反転」「上下反転」「上下左右反転」の4パターン全種＋90度刻みの角度バリエーションをランダム付与
                const fx = Math.random() < 0.5;
                const fy = Math.random() < 0.5;
                obj.setFlip(fx, fy);
                obj.setAngle([0, 90, 180, 270][Math.floor(Math.random() * 4)]);
                obj.setBlendMode(Phaser.BlendModes.ADD); // 💥 加算合成（重なるほど明るく白熱発光！）
                obj.setDepth(1800);
            } else {


                obj = this.scene.add.graphics();
            }


            this.effectMap.set(eff, obj);
        }
        
        const p = this.projector.project(eff.x, eff.z);
        if (p.visible) {
            let progress = 1.0 - (eff.lifeTime / eff.maxLife);

            if (eff.type === 'slash_hit') {
                obj.setPosition(p.x, p.y - p.scale * 0.8);
                const custom = eff.customData || {};

                if (custom.color !== undefined) {
                    obj.setTint(custom.color);
                }

                // 2.5Dプロジェクション画面ピクセル上での確実な視覚角度を計算
                let angleDeg = 0;
                if (custom.srcX !== undefined && custom.targetX !== undefined) {
                    const pChar = this.projector.project(custom.srcX, custom.srcZ);
                    const pTarget = this.projector.project(custom.targetX, custom.targetZ);
                    const screenDx = pTarget.x - pChar.x;
                    const screenDy = pTarget.y - pChar.y;
                    const screenAngleRad = Math.atan2(screenDy, screenDx);
                    // 画面上で真上(-Y)に攻撃した時、回転0度(上側y=0が先端、下側y=1が手前)になるよう+90度補正
                    angleDeg = (screenAngleRad * 180 / Math.PI) + 90;
                } else {
                    angleDeg = ((custom.angleRad || 0) * 180 / Math.PI) + 90;
                }

                obj.setAngle(angleDeg);

                const alpha = Math.max(0, eff.lifeTime / eff.maxLife);
                obj.setAlpha(alpha);

                const baseWidth = obj.width || 200;
                const sizeM = 3.75; // 1.5倍に拡大した見た目サイズ (3.75m相当)
                obj.setScale(p.scale * (sizeM / baseWidth));
                return;
            }



            if (eff.type === 'ultimate_burst_010') {
                obj.setPosition(p.x, p.y - p.scale * 1.5);
                obj.setTint(0x00ffff);
                obj.setBlendMode(Phaser.BlendModes.ADD);
                const currentRadius = (eff.radius || 4.0) * p.scale * (progress * 1.2);
                const baseWidth = obj.width || 200;
                obj.setScale((currentRadius * 2.5) / baseWidth);
                obj.setAlpha(1.0 - progress);
                return;
            }

            if (eff.type === 'ultimate_burst_009') {
                // 🌿 リフィエル必殺技発動: nrg.png 加算合成バーストフラッシュ
                // 前半(0〜0.3s): 急速拡大しながら最大輝度 → 後半(0.3〜0.6s): フェードアウト
                obj.setPosition(p.x, p.y - p.scale * 1.0);
                obj.setTint(0xaaffaa); // 緑白の光
                obj.setBlendMode(Phaser.BlendModes.ADD);
                const baseWidth = obj.width || 200;
                // 前半は急速拡大（0→1.5倍）、後半は維持
                const expandProgress = Math.min(1.0, progress / 0.5);
                const currentRadius = (eff.radius || 3.0) * p.scale * (0.3 + expandProgress * 0.7);
                obj.setScale((currentRadius * 2.0) / baseWidth);
                // アルファ: 前半はキープ、後半はフェードアウト
                const alpha = progress < 0.5 ? 1.0 : (1.0 - (progress - 0.5) / 0.5);
                obj.setAlpha(alpha);
                obj.setDepth(1000 + 10); // キャラより前面
                return;
            }

            if (eff.type === 'buff_circle' || eff.type === 'barrier_hit') {


                // キャラクターを包むオーラ・リングエフェクト: nrg.png (200x200) スプライト
                obj.setPosition(p.x, p.y - p.scale * 1.0); // 腰〜胸の高さ
                
                let colorHex = 0x33ff66;
                const customColor = eff.customData?.color;
                if (typeof customColor === 'number') {
                    colorHex = customColor;
                } else if (typeof customColor === 'string') {
                    if (customColor === 'green') colorHex = 0x33ff66;
                    else if (customColor === 'cyan') colorHex = 0x00ffff;
                    else if (customColor === 'purple') colorHex = 0xd033ff;
                    else if (customColor === 'yellow') colorHex = 0xffff33;
                    else if (customColor === 'red') colorHex = 0xff3344;
                } else if (eff.type === 'barrier_hit') {
                    colorHex = 0x00ffff;
                }

                obj.setTint(colorHex);
                obj.setBlendMode(Phaser.BlendModes.ADD); // 鮮やかに発光

                const radiusPx = (eff.radius || 1.5) * p.scale;
                const baseWidth = obj.width || 200;

                if (eff.type === 'buff_circle') {
                    // 中心に向かってスーッと収束しながら輝く
                    const currentRadius = radiusPx * (0.3 + progress * 0.7);
                    obj.setScale((currentRadius * 2.5) / baseWidth);
                    obj.setAlpha(progress * 0.85);
                } else {
                    // barrier_hit: パッと表示されてフェードアウト
                    obj.setScale((radiusPx * 2.2) / baseWidth);
                    const alpha = (eff.customData?.alpha || 0.6) * progress;
                    obj.setAlpha(alpha);
                }
                obj.setDepth(1000 - p.depth + 1);
                return;
            }

            if (eff.type === 'grenade_explosion') {

                // 手りゅう弾爆発: grenade.png (200x200) を使用。適正スケールに調整
                obj.setPosition(p.x, p.y - p.scale * 0.5);
                const radiusPx = (eff.radius || 1.5) * p.scale;
                const baseWidth = obj.width || 200; // 200px
                const scaleFactor = 0.5 + progress * 1.0;
                obj.setScale((radiusPx * 3.0 * scaleFactor) / baseWidth);
                obj.setAlpha(Math.max(0, (1.0 - progress) * 0.95));
                obj.clearTint(); // 着色しない
                return;
            }

            if (eff.type === 'explosion' || eff.type === 'noah_bullet_explosion' || eff.type === 'bomb' || eff.type === 'witch_bomb' || eff.type === 'enemy_death' || (eff.type && eff.type.startsWith('majo_death'))) {

                // 爆発エフェクト (魔女死亡・雑魚死亡・ノア弾丸爆発時含む): bomb.png (300x300) を使用。加算合成で急拡大＆発光フェード
                obj.setPosition(p.x, p.y - p.scale * 0.5);
                const radiusPx = (eff.radius || 1.5) * p.scale;
                const baseWidth = obj.width || 300;
                
                // 魔女死亡時の小爆発(majo_death_2)はサイズ5倍、最終大爆発(majo_death_3)は超巨大に拡大
                let sizeMult = 2.5;
                if (eff.type === 'noah_bullet_explosion') sizeMult = 2.0;
                if (eff.type === 'enemy_death') sizeMult = 1.5;
                if (eff.type === 'majo_death_2') sizeMult = 5.0;
                if (eff.type === 'majo_death_3') sizeMult = 8.5;

                const scaleFactor = 0.4 + progress * 1.3;
                obj.setScale((radiusPx * sizeMult * scaleFactor) / baseWidth);
                
                // 加算合成（ADD）では序盤に高輝度発光し、終盤にかけて自然に光が収束フェードアウト
                const isWitchFinal = eff.type === 'majo_death_3';
                let alpha = 1.0;
                if (progress < 0.15) {
                    alpha = 1.0; // 瞬間最大発光（白熱）
                } else {
                    alpha = Math.max(0, (1.0 - (progress - 0.15) / 0.85));
                }
                if (isWitchFinal) {
                    obj.setAlpha(alpha);
                } else {
                    obj.setAlpha(alpha * 0.9);
                }
                if (obj.clearTint) obj.clearTint();
                return;
            }

            
            if ((eff.type && (eff.type.startsWith('element_hit_') || eff.type.startsWith('enemy_death_'))) || eff.type === 'kick_hit') {

                obj.setPosition(p.x, p.y - p.scale * 1.0); // 衝突点(腰の高さ)
                
                let sizeM = 0;
                let alpha = 0.8;
                const phase1Prog = 0.1 / 0.6; // 0.1秒の割合
                const custom = eff.customData || {};
                const isFatal = custom.isFatal || (eff.type && eff.type.startsWith('enemy_death_'));
                
                let startSize = isFatal ? 0.05 : 0.2 / 3.0;
                let midSize = isFatal ? ((eff.radius || 1.5) * 0.35) : 0.75 / 3.0;
                let endSize = isFatal ? midSize * 1.4 : 1.0 / 3.0;
                
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
            this.sysText = new SpriteText(this.scene, this.scene.scale.width / 2, this.scene.scale.height / 3, '', {
                tint: 0xff3333,
                spacing: 24,
                originX: 0.5,
                originY: 0.5
            }).setDepth(3000);
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
            this.battleInfoText = new SpriteText(this.scene, this.scene.scale.width / 2, 20, '', {
                tint: 0xffffff,
                spacing: 28,
                originX: 0.5,
                originY: 0.5
            }).setDepth(9999).setScale(0.48);
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
            this.battleInfoText.setText(`ENEMY ${enemiesRemaining}/${totalEnemies}  WAVE ${currentWave}/${totalWaves}  TIME ${min}:${sec}`);
        }
    }



    // ノア(008)のエネルギー球体描画更新
    _updateNoahOrbs(p) {
        if (!this.noahOrbSpriteMap) this.noahOrbSpriteMap = new Map();

        const activeOrbs = (!p.isDead && p.noahOrbs) ? p.noahOrbs : [];

        // 不要になったスプライトの削除
        for (const [orb, sprite] of this.noahOrbSpriteMap.entries()) {
            if (!activeOrbs.includes(orb) || orb.isDead) {
                sprite.destroy();
                this.noahOrbSpriteMap.delete(orb);
            }
        }

        // アクティブな球体の描画
        for (const orb of activeOrbs) {
            if (orb.isDead) continue;
            let sprite = this.noahOrbSpriteMap.get(orb);
            if (!sprite) {
                sprite = this.scene.add.sprite(0, 0, 'weapon_008_orb', 0).setOrigin(0.5, 0.5);
                sprite.setBlendMode(Phaser.BlendModes.ADD);
                this.noahOrbSpriteMap.set(orb, sprite);
            }

            const proj = this.projector.project(orb.x, orb.z);
            if (proj.visible) {
                sprite.setVisible(true);
                sprite.setPosition(proj.x, proj.y - proj.scale * 1.0); // 腰〜胸の高さ
                sprite.setDepth(1000 - proj.depth + 50); // 最前面

                const baseSize = sprite.height || 200;
                const visualSize = (orb.size || 0.30) * 2.0; // 直径30cm相当の小ぶりで可愛いサイズ（約0.6m相当）
                const targetScale = proj.scale * (visualSize / baseSize);
                sprite.setScale(targetScale);
                sprite.setAngle((this.scene.time.now || 0) * 0.08);
                sprite.setAlpha(1.0);
            } else {
                sprite.setVisible(false);
            }
        }
    }

    // ノア(008)の必殺技フェニックスの残像描画 (0.1秒遅れ: 不透明度75%、0.2秒遅れ: 不透明度50%、加算合成)
    _updateNoahUltTrails(ultBullet) {
        if (!this.noahUltTrailMap) this.noahUltTrailMap = new Map();
        let trails = this.noahUltTrailMap.get(ultBullet);
        if (!trails) {
            const s1 = this.scene.add.sprite(0, 0, 'weapon_008_ult_a', 0).setOrigin(0.5, 0.5);
            s1.setBlendMode(Phaser.BlendModes.ADD);
            s1.setAlpha(0.75); // 1つ目の残像: 不透明度75%

            const s2 = this.scene.add.sprite(0, 0, 'weapon_008_ult_a', 0).setOrigin(0.5, 0.5);
            s2.setBlendMode(Phaser.BlendModes.ADD);
            s2.setAlpha(0.50); // 2つ目の残像: 不透明度50%

            trails = { s1, s2 };
            this.noahUltTrailMap.set(ultBullet, trails);
        }

        const history = ultBullet.poseHistory || [];

        // 0.1秒前のポーズを検索 (age が 0.1s に最も近いもの)
        let pose1 = null, minDiff1 = 999;
        // 0.2秒前のポーズを検索 (age が 0.2s に最も近いもの)
        let pose2 = null, minDiff2 = 999;

        for (const h of history) {
            const diff1 = Math.abs(h.age - 0.10);
            if (diff1 < minDiff1) {
                minDiff1 = diff1;
                pose1 = h;
            }
            const diff2 = Math.abs(h.age - 0.20);
            if (diff2 < minDiff2) {
                minDiff2 = diff2;
                pose2 = h;
            }
        }

        // 残像1 (0.1秒前、不透明度75%)
        if (pose1 && minDiff1 < 0.08) {
            const p1 = this.projector.project(pose1.x, pose1.z);
            if (p1.visible) {
                trails.s1.setVisible(true);
                trails.s1.setTexture(pose1.textureKey || 'weapon_008_ult_a');
                trails.s1.setPosition(p1.x, p1.y - p1.scale * 1.0);
                const bW = trails.s1.width || 300;
                const bH = trails.s1.height || 200;
                trails.s1.setScale(p1.scale * ((pose1.width || 6.0) / bW), p1.scale * ((pose1.height || 4.0) / bH));
                trails.s1.setDepth(1000 - p1.depth + 44);
                trails.s1.setAlpha(0.75);
            } else {
                trails.s1.setVisible(false);
            }
        } else {
            trails.s1.setVisible(false);
        }

        // 残像2 (0.2秒前、不透明度50%)
        if (pose2 && minDiff2 < 0.08) {
            const p2 = this.projector.project(pose2.x, pose2.z);
            if (p2.visible) {
                trails.s2.setVisible(true);
                trails.s2.setTexture(pose2.textureKey || 'weapon_008_ult_a');
                trails.s2.setPosition(p2.x, p2.y - p2.scale * 1.0);
                const bW = trails.s2.width || 300;
                const bH = trails.s2.height || 200;
                trails.s2.setScale(p2.scale * ((pose2.width || 6.0) / bW), p2.scale * ((pose2.height || 4.0) / bH));
                trails.s2.setDepth(1000 - p2.depth + 43);
                trails.s2.setAlpha(0.50);
            } else {
                trails.s2.setVisible(false);
            }
        } else {
            trails.s2.setVisible(false);
        }
    }

    // クリーンアップ
    destroy() {
        for (const sprite of this.spriteMap.values()) {
            sprite.destroy();
        }
        this.spriteMap.clear();

        if (this.noahOrbSpriteMap) {
            for (const sprite of this.noahOrbSpriteMap.values()) {
                sprite.destroy();
            }
            this.noahOrbSpriteMap.clear();
        }

        if (this.noahUltTrailMap) {
            for (const trails of this.noahUltTrailMap.values()) {
                if (trails.s1) trails.s1.destroy();
                if (trails.s2) trails.s2.destroy();
            }
            this.noahUltTrailMap.clear();
        }

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

