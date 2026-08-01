import Phaser from 'phaser';

export class FogEffect {
    /**
     * @param {Phaser.Scene} scene - 表示するシーン
     * @param {number} attribute - 敵の属性(1~5)
     * @param {number} depth - 描画深度 (デフォルト: 15)
     */
    constructor(scene, attribute, depth = 15) {
        this.scene = scene;
        this.isActive = false;
        this.isFadingOut = false;
        this.fadeInMultiplier = 1; // フェードイン等の外部制御用乗数
        
        const { width, height } = scene.scale;
        this.width = width;
        this.height = height;

        const attrEffKey = `map_eff${attribute}`;
        if (scene.textures.exists(attrEffKey)) {
            this.bgEffect = scene.add.image(width / 2, height / 2, attrEffKey);
            this.bgEffect.setAlpha(0); // 最初は0
            this.bgEffect.setDepth(depth);
            this.bgEffect.setBlendMode(Phaser.BlendModes.ADD);

            this.bgEffectState = {
                time: 0,
                baseScale: Math.max(width / this.bgEffect.width, height / this.bgEffect.height)
            };
            this.isActive = true;
        }
    }

    /**
     * 毎フレーム呼ぶ更新処理
     */
    update(dt) {
        if (!this.isActive || !this.bgEffect || this.isFadingOut) return;

        this.bgEffectState.time += dt;
        const t = this.bgEffectState.time;
        
        // スケール: スクリーンサイズの1.4倍〜2.0倍
        const scaleMult = 1.4 + ((Math.sin(t * 0.5) + 1) / 2) * 0.6; 
        
        // 画面全体を覆うため、縦の圧縮を解除
        const currentScaleX = this.bgEffectState.baseScale * scaleMult;
        const actualScaleX = currentScaleX * 2.0; 
        const actualScaleY = currentScaleX * 2.0; 

        this.bgEffect.setScale(actualScaleX, actualScaleY);

        // 不透明度: 0%〜30% (alpha 0.0 ~ 0.3) に乗数をかける
        const alpha = ((Math.sin(t * 1.3) + 1) / 2) * 0.3 * this.fadeInMultiplier;
        this.bgEffect.setAlpha(alpha);

        // 移動: 端が見えない範囲内でランダム(サイン波)に移動
        const maxMoveX = Math.max(0, (this.bgEffect.width * actualScaleX - this.width) / 2);
        const maxMoveY = Math.max(0, (this.bgEffect.height * actualScaleY - this.height) / 2);
        
        const offsetX = Math.sin(t * 0.3) * Math.cos(t * 0.7) * maxMoveX;
        const offsetY = Math.sin(t * 0.4) * Math.cos(t * 0.6) * maxMoveY;
        
        // 画面全体を覆うため、Yの中心は画面中央にする
        const basePosY = this.height * 0.5; 
        this.bgEffect.setPosition(this.width / 2 + offsetX, basePosY + offsetY);
    }

    /**
     * フェードアウトして消す
     */
    fadeOut(duration = 2000) {
        if (!this.isActive || !this.bgEffect) return;
        
        this.isFadingOut = true; // updateによるアルファ上書きを停止
        this.scene.tweens.killTweensOf(this.bgEffect); // 念のため実行中のTweenがあれば停止
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
