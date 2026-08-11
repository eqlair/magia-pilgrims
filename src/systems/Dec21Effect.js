import Phaser from 'phaser';

/**
 * 12月21日専用の背景ゆらゆらエフェクト管理クラス (Dec21Effect)
 * BG_06.png (bg_dec21_effect) を使用し、12/21の間画面全体でゆらゆら揺らめく
 */
export class Dec21Effect {
    /**
     * @param {Phaser.Scene} scene - 表示対象シーン (AdventureScene 等)
     * @param {number} depth - 描画深度 (デフォルト: 12)
     */
    constructor(scene, depth = 12) {
        this.scene = scene;
        this.isActive = false;
        this.isFadingOut = false;
        this.fadeInMultiplier = 1;

        const { width, height } = scene.scale;
        this.width = width;
        this.height = height;

        const textureKey = 'bg_dec21_effect';
        if (scene.textures.exists(textureKey)) {
            this.bgEffect = scene.add.image(width / 2, height / 2, textureKey);
            this.bgEffect.setAlpha(0);
            this.bgEffect.setDepth(depth);
            this.bgEffect.setBlendMode(Phaser.BlendModes.ADD);

            this.bgEffectState = {
                time: 0,
                baseScale: Math.max(width / this.bgEffect.width, height / this.bgEffect.height)
            };
            this.isActive = true;

            // スムーズにフェードイン
            scene.tweens.add({
                targets: this.bgEffect,
                alpha: 0.35,
                duration: 1500
            });
        }
    }

    /**
     * 毎フレームの更新処理（ゆらゆら動かす）
     * @param {number} dt - 経過秒数
     */
    update(dt) {
        if (!this.isActive || !this.bgEffect || this.isFadingOut) return;

        this.bgEffectState.time += dt;
        const t = this.bgEffectState.time;

        // スケール: 1.3倍〜1.9倍の間でゆるやかに拡大縮小
        const scaleMult = 1.3 + ((Math.sin(t * 0.4) + 1) / 2) * 0.6;
        const actualScaleX = this.bgEffectState.baseScale * scaleMult * 1.5;
        const actualScaleY = this.bgEffectState.baseScale * scaleMult * 1.5;

        this.bgEffect.setScale(actualScaleX, actualScaleY);

        // 不透明度: 0.15 〜 0.4 でサイン波でゆらゆら変動
        const alpha = (0.15 + ((Math.sin(t * 1.1) + 1) / 2) * 0.25) * this.fadeInMultiplier;
        this.bgEffect.setAlpha(alpha);

        // 位置の揺らめき移動
        const maxMoveX = Math.max(0, (this.bgEffect.width * actualScaleX - this.width) / 2);
        const maxMoveY = Math.max(0, (this.bgEffect.height * actualScaleY - this.height) / 2);

        const offsetX = Math.sin(t * 0.35) * Math.cos(t * 0.6) * maxMoveX * 0.5;
        const offsetY = Math.sin(t * 0.45) * Math.cos(t * 0.5) * maxMoveY * 0.5;

        this.bgEffect.setPosition(this.width / 2 + offsetX, this.height / 2 + offsetY);
    }

    fadeOut(duration = 1500) {
        if (!this.isActive || !this.bgEffect) return;

        this.isFadingOut = true;
        this.scene.tweens.killTweensOf(this.bgEffect);
        this.scene.tweens.add({
            targets: this.bgEffect,
            alpha: 0,
            duration: duration,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    destroy() {
        this.isActive = false;
        if (this.bgEffect) {
            this.bgEffect.destroy();
            this.bgEffect = null;
        }
    }
}
