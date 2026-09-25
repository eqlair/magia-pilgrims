import Phaser from 'phaser';

/**
 * 巨大タコ魔女（クラーケン）視覚演出コンポーネント
 * 
 * 構成:
 * 1. コールタール水面背景（KrakenBG.jpg）
 *    - 左右±50pxの往復移動（5秒周期、Sine.easeInOut）
 *    - 水平拡縮 110%〜130%（3秒周期、Sine.easeInOut）
 * 2. 本体A（KrakenA.png: 顔・目）＆ 本体B（KrakenB.png: 頭部マントル）
 *    - (0, 0) 同一基準でピッタリ重なる配置（Aが下、Bが上）
 *    - Bは中心基準で常時±2%拡縮（体積保存型の呼吸パルス）
 *    - Aのプカプカ浮力揺れに対し、Bがわずかに遅延追随（軟体感）
 * 3. 8本の脚（KrakenC.png: 触手Rope）
 *    - 奥4本（影色 0x777788、やや小型）、手前4本（通常明度 0xffffff）
 *    - 24分割のPhaser.GameObjects.Ropeによる多関節フォワードキネマティクス（FK）
 *    - 先端ほど激しくしなる複合サイン波（うねり＋小刻みなピロピロ）
 * 4. 左右反転
 *    - ターゲット座標または指定方向に応じて、顔・頭・触手群がスムーズに反転
 */
export class KrakenBossVisual {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x - 中心X（デフォルト270）
     * @param {number} y - 水面中心Y（デフォルト580）
     * @param {object} config - オプション設定
     */
    constructor(scene, x = 270, y = 580, config = {}) {
        this.scene = scene;
        this.baseX = x;
        this.baseY = y;
        this.config = Object.assign({
            bodyScale: 0.52,
            facingRight: false, // デフォルト左向き
            showBg: true,
            tentacleCount: 8
        }, config);

        this.facingRight = this.config.facingRight;
        this.targetFacingRight = this.facingRight;

        // タイマー・アニメーション用内部変数
        this.animTime = 0;
        this.currentFlipScale = this.facingRight ? -1 : 1;

        // コンポーネント保持
        this.bg = null;
        this.bodyContainer = null;
        this.spriteA = null;
        this.spriteB = null;
        this.tentacles = [];

        // 初期構築
        this._initBackground();
        this._initTentacles();
        this._initBody();
    }

    /**
     * コールタール水面背景の初期化
     */
    _initBackground() {
        if (!this.config.showBg) return;

        const { width, height } = this.scene.scale;
        const bgCenterX = width / 2;
        const bgCenterY = height / 2;

        // 画面全体を隙間なくカバーする基準スケール（安全マージン込み）
        const baseScale = 0.62;

        this.bg = this.scene.add.image(bgCenterX, bgCenterY, 'kraken_bg');
        this.bg.setDepth(1);
        this.bg.setScale(baseScale * 1.10, baseScale);

        // 左右往復移動: 5秒（5000ms）かけて左右に±50px往復
        this.scene.tweens.add({
            targets: this.bg,
            x: { from: bgCenterX - 50, to: bgCenterX + 50 },
            duration: 5000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 水平拡縮: 3秒（3000ms）かけて 110%〜130% 拡大縮小
        this.scene.tweens.add({
            targets: this.bg,
            scaleX: { from: baseScale * 1.10, to: baseScale * 1.30 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * 8本の触手（Rope）の初期化
     */
    _initTentacles() {
        const SEGMENTS = 24;

        // 8本の触手の設定（奥4本、手前4本）
        // offsetX: 体中心からのXオフセット（水面左右から生える）
        // offsetY: 水面基準からのYオフセット
        // baseAngleDeg: 触手が伸びる基本角度（真上が -90°）
        // length: 触手の長さ（ダイナミックに画面上方へ伸びる）
        // speed1, speed2: 波の速さ
        // isBack: 奥レイヤーフラグ（暗いtint、下層depth）
        const tentacleDefs = [
            // ── 奥レイヤー（4本）：頭部背後・左右の水面から高く突き出す ──
            { id: 0, isBack: true,  offsetX: -260, offsetY:  90, baseAngleDeg: -130, length: 740, amp1: 28, amp2: 16, speed1: 1.5, speed2: 3.1, phase: 0.0, widthMul: 1.25 },
            { id: 1, isBack: true,  offsetX: -170, offsetY:  70, baseAngleDeg: -106, length: 800, amp1: 32, amp2: 18, speed1: 1.3, speed2: 2.7, phase: 1.9, widthMul: 1.35 },
            { id: 2, isBack: true,  offsetX:  170, offsetY:  70, baseAngleDeg:  -74, length: 800, amp1: 32, amp2: 18, speed1: 1.4, speed2: 2.8, phase: 3.6, widthMul: 1.35 },
            { id: 3, isBack: true,  offsetX:  260, offsetY:  90, baseAngleDeg:  -50, length: 740, amp1: 28, amp2: 16, speed1: 1.6, speed2: 3.2, phase: 5.2, widthMul: 1.25 },

            // ── 手前レイヤー（4本）：頭部・顔の左右両脇の水面下から手前に迫るように生える ──
            { id: 4, isBack: false, offsetX: -290, offsetY: 145, baseAngleDeg: -128, length: 700, amp1: 36, amp2: 22, speed1: 1.2, speed2: 2.5, phase: 1.1, widthMul: 1.45 },
            { id: 5, isBack: false, offsetX: -210, offsetY: 185, baseAngleDeg: -108, length: 740, amp1: 40, amp2: 24, speed1: 1.1, speed2: 2.3, phase: 2.8, widthMul: 1.55 },
            { id: 6, isBack: false, offsetX:  210, offsetY: 185, baseAngleDeg:  -72, length: 740, amp1: 38, amp2: 24, speed1: 1.2, speed2: 2.4, phase: 4.5, widthMul: 1.55 },
            { id: 7, isBack: false, offsetX:  290, offsetY: 145, baseAngleDeg:  -52, length: 700, amp1: 35, amp2: 20, speed1: 1.3, speed2: 2.6, phase: 6.2, widthMul: 1.45 },
        ];

        this.tentacles = tentacleDefs.map(def => {
            // Ropeの生成 (horizontal = false: 縦長画像用)
            const rope = this.scene.add.rope(0, 0, 'kraken_c', null, SEGMENTS, false);
            
            // レイヤーの深さと色調
            if (def.isBack) {
                rope.setDepth(15);
                if (rope.setColors) rope.setColors(0x656578); // 影色
            } else {
                rope.setDepth(35);
                if (rope.setColors) rope.setColors(0xffffff); // 通常明度
            }

            // Ropeの頂点カスタム計算（滑らかな太さとパース）
            rope.nodeHalfWidths = new Float32Array(SEGMENTS);
            rope.updateVertices = function() {
                const points = this.points;
                const vertices = this.vertices;
                const perp = this._perp;
                const total = points.length;
                this.dirty = false;
                if (total < 1) return;

                let lastPoint = points[0];
                let nextPoint;

                for (let i = 0; i < total; i++) {
                    const point = points[i];
                    const index = i * 4;
                    if (i < total - 1) {
                        nextPoint = points[i + 1];
                    } else {
                        nextPoint = point;
                    }

                    perp.x = nextPoint.y - lastPoint.y;
                    perp.y = -(nextPoint.x - lastPoint.x);
                    const perpLength = Math.hypot(perp.x, perp.y);
                    if (perpLength > 0.001) {
                        perp.x /= perpLength;
                        perp.y /= perpLength;
                    } else {
                        perp.x = 0;
                        perp.y = 1;
                    }

                    const halfW = (this.nodeHalfWidths && this.nodeHalfWidths[i] !== undefined) 
                        ? this.nodeHalfWidths[i] 
                        : 20;

                    vertices[index]     = point.x + perp.x * halfW;
                    vertices[index + 1] = point.y + perp.y * halfW;
                    vertices[index + 2] = point.x - perp.x * halfW;
                    vertices[index + 3] = point.y - perp.y * halfW;

                    lastPoint = point;
                }
            };

            return {
                def,
                rope,
                SEGMENTS,
                // 各セグメントの現在座標
                points: Array.from({ length: SEGMENTS }, () => ({ x: 0, y: 0 }))
            };
        });
    }

    /**
     * 本体（A: 顔・目 ＆ B: 頭部マントル）の初期化
     */
    _initBody() {
        const bs = this.config.bodyScale;

        // A（顔・目）：下層
        this.spriteA = this.scene.add.image(this.baseX, this.baseY, 'kraken_a');
        this.spriteA.setOrigin(0.5, 0.5);
        this.spriteA.setScale(bs);
        this.spriteA.setDepth(20);

        // B（頭部マントル）：上層・中心基準でAに重なる
        this.spriteB = this.scene.add.image(this.baseX, this.baseY, 'kraken_b');
        this.spriteB.setOrigin(0.5, 0.5);
        this.spriteB.setScale(bs);
        this.spriteB.setDepth(25);

        // Bの位置追従用内部座標
        this.bodyBX = this.baseX;
        this.bodyBY = this.baseY;
    }

    /**
     * ターゲット位置を指定（ターゲットのX座標に応じて左右反転）
     * @param {number} targetX 
     */
    setTargetX(targetX) {
        this.setFacing(targetX > this.baseX);
    }

    /**
     * 向きを直接設定
     * @param {boolean} isRight - true: 右向き, false: 左向き
     */
    setFacing(isRight) {
        this.targetFacingRight = isRight;
    }

    /**
     * 向きをトグル反転
     */
    toggleFacing() {
        this.setFacing(!this.targetFacingRight);
    }

    /**
     * 毎フレームの更新処理
     * @param {number} time - 経過ミリ秒
     * @param {number} delta - デルタタイム秒
     */
    update(time, delta) {
        const sec = time * 0.001;
        this.animTime = sec;

        // ── 左右反転の滑らかなスケール遷移 ──
        const targetScale = this.targetFacingRight ? -1 : 1;
        this.currentFlipScale += (targetScale - this.currentFlipScale) * Math.min(1, delta * 10);
        const flipSign = this.currentFlipScale;

        const bs = this.config.bodyScale;

        // ── 1. A（顔・目）の浮力プカプカ揺れ ──
        // 4秒周期で ±3.5px 上下に揺れる
        const floatOffsetY = Math.sin(sec * 1.5) * 3.5;
        const currentAY = this.baseY + floatOffsetY;
        const currentAX = this.baseX;

        this.spriteA.setPosition(currentAX, currentAY);
        this.spriteA.setScale(bs * flipSign, bs);

        // ── 2. B（頭部マントル）のうごめき＆遅延追随 ──
        // 常時±2%（0.98〜1.02）拡縮する呼吸パルス（体積保存型：縦が伸びると横が縮む）
        const pulse = 1.0 + Math.sin(sec * 2.8) * 0.022;
        const pulseCounter = 1.0 / pulse;

        // Aへのわずかな遅延追随（lerp補間）
        this.bodyBX += (currentAX - this.bodyBX) * Math.min(1, delta * 12);
        this.bodyBY += (currentAY - this.bodyBY) * Math.min(1, delta * 8);

        this.spriteB.setPosition(this.bodyBX, this.bodyBY);
        this.spriteB.setScale(bs * flipSign * pulseCounter, bs * pulse);

        // ── 3. 8本の脚（触手Rope）のフォワードキネマティクス計算 ──
        this._updateTentacles(sec, flipSign);
    }

    /**
     * 触手8本の頂点更新
     */
    _updateTentacles(sec, flipSign) {
        const bs = this.config.bodyScale;

        this.tentacles.forEach(t => {
            const { def, rope, SEGMENTS } = t;

            // 左右反転に応じた生え際（水面）の計算
            const rootX = this.baseX + (def.offsetX * bs * flipSign);
            const rootY = this.baseY + (def.offsetY * bs);

            // 基準角度の反転計算
            // 真上は -90度 (-Math.PI/2)
            let baseAngleRad = Phaser.Math.DegToRad(def.baseAngleDeg);
            if (flipSign < 0) {
                // 水平軸反転: -90度を軸に対称化
                baseAngleRad = -Math.PI - baseAngleRad;
            }

            const totalLength = def.length * bs;
            const segLen = totalLength / (SEGMENTS - 1);

            // フォワードキネマティクスで根元から先端へ伸ばす
            // Ropeテクスチャの仕様:
            // points[0] が先端（細い尖り）、points[SEGMENTS-1] が根元（水面の太い吸盤）
            const calculatedPoints = new Array(SEGMENTS);
            
            // 根元ノード
            let curX = rootX;
            let curY = rootY;
            calculatedPoints[SEGMENTS - 1] = { x: curX, y: curY };

            // 根元から先端方向へノードを順に計算
            for (let i = SEGMENTS - 2; i >= 0; i--) {
                // s: 根元で0.0、先端で1.0
                const s = 1.0 - (i / (SEGMENTS - 1));

                // 複合サイン波:
                // wave1: 大きくゆったり曲がる主波
                // wave2: 先端が細かくピロピロしなる副波
                const wave1 = Math.sin(sec * def.speed1 + def.phase + s * 2.2) * Phaser.Math.DegToRad(def.amp1) * Math.pow(s, 1.2);
                const wave2 = Math.sin(sec * def.speed2 + def.phase * 1.5 + s * 4.0) * Phaser.Math.DegToRad(def.amp2) * Math.pow(s, 2.0);

                // 反転時は曲がり波の向きも反転
                const totalWave = (wave1 + wave2) * (flipSign >= 0 ? 1 : -1);

                const currentAngle = baseAngleRad + totalWave;

                curX += Math.cos(currentAngle) * segLen;
                curY += Math.sin(currentAngle) * segLen;

                calculatedPoints[i] = { x: curX, y: curY };
            }

            // Ropeのpoints配列へ転送＆太さ（幅）を設定
            for (let i = 0; i < SEGMENTS; i++) {
                if (rope.points[i]) {
                    rope.points[i].x = calculatedPoints[i].x;
                    rope.points[i].y = calculatedPoints[i].y;
                }

                // s: 先端0.0、根元1.0（インデックスi=0が先端、i=SEGMENTS-1が根元）
                const s = i / (SEGMENTS - 1);
                // 根元は太く吸盤を強調、先端はシャープにしなる（ダイナミックな大タコ触手）
                const widthMul = def.widthMul || 1.3;
                const baseHalfW = 46 * bs * widthMul * (0.28 + 0.72 * s);
                rope.nodeHalfWidths[i] = baseHalfW * (def.isBack ? 0.90 : 1.0);
            }

            rope.updateVertices();
        });
    }

    /**
     * 破棄処理
     */
    destroy() {
        if (this.bg) this.bg.destroy();
        if (this.spriteA) this.spriteA.destroy();
        if (this.spriteB) this.spriteB.destroy();
        this.tentacles.forEach(t => {
            if (t.rope) t.rope.destroy();
        });
        this.tentacles = [];
    }
}
