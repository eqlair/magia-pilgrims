import Phaser from 'phaser';

const CHAR_FRAME_MAP = {
    // 1行目: 数字 (0~9)
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,

    // 2行目: 英大文字 A~M (小文字a~mも兼用)
    'A': 13, 'B': 14, 'C': 15, 'D': 16, 'E': 17, 'F': 18, 'G': 19, 'H': 20, 'I': 21, 'J': 22, 'K': 23, 'L': 24, 'M': 25,
    'a': 13, 'b': 14, 'c': 15, 'd': 16, 'e': 17, 'f': 18, 'g': 19, 'h': 20, 'i': 21, 'j': 22, 'k': 23, 'l': 24, 'm': 25,

    // 3行目: 英大文字 N~Z (小文字n~zも兼用)
    'N': 26, 'O': 27, 'P': 28, 'Q': 29, 'R': 30, 'S': 31, 'T': 32, 'U': 33, 'V': 34, 'W': 35, 'X': 36, 'Y': 37, 'Z': 38,
    'n': 26, 'o': 27, 'p': 28, 'q': 29, 'r': 30, 's': 31, 't': 32, 'u': 33, 'v': 34, 'w': 35, 'x': 36, 'y': 37, 'z': 38,

    // 4行目: 半角スペース (4行目0列目: frame 39) ＆ 各種記号類
    ' ': 39,
    '+': 40,
    '-': 41,
    '/': 42,
    ':': 43,
    '%': 44,
    '.': 45,
    ',': 46,
    '(': 47,
    ')': 48,
    '!': 49,
    '?': 50
};

/**
 * 13列x4行のスプライトシート(letterS.png)から文字・数字・記号を描画する爆速スプライトテキストコンポーネント
 */
export class SpriteText extends Phaser.GameObjects.Container {
    constructor(scene, x, y, text = '', config = {}) {
        super(scene, x, y);
        this.textureKey = config.textureKey || 'letterS';
        this.spacing = config.spacing !== undefined ? config.spacing : 28; // 30px幅の文字用にゆったり配置
        this.textOriginX = config.originX !== undefined ? config.originX : 0.5;
        this.textOriginY = config.originY !== undefined ? config.originY : 0.5;
        this.tintColor = config.tint !== undefined ? config.tint : 0xffffff;
        
        const defaultScale = config.scale !== undefined ? config.scale : 0.8;
        this.setScale(defaultScale);

        this.sprites = [];
        this.currentText = '';
        this.setText(text);
        scene.add.existing(this);
    }

    setOrigin(originX, originY = originX) {
        this.textOriginX = originX;
        this.textOriginY = originY;
        const oldText = this.currentText;
        this.currentText = '';
        return this.setText(oldText);
    }

    setText(text) {
        const str = String(text);
        if (this.currentText === str) return this;
        this.currentText = str;

        // 全体の表示幅(totalWidth)を計算するために、有効な文字の総数をカウント
        let displayCharCount = 0;
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (CHAR_FRAME_MAP[ch] !== undefined) {
                displayCharCount++;
            }
        }

        const totalWidth = displayCharCount > 0 ? (displayCharCount - 1) * this.spacing : 0;
        const startX = -totalWidth * this.textOriginX;

        let charIdx = 0;
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            const frameIdx = CHAR_FRAME_MAP[ch];
            if (frameIdx === undefined) continue;

            let spr = this.sprites[charIdx];
            if (!spr) {
                spr = this.scene.add.image(0, 0, this.textureKey, frameIdx);
                this.add(spr);
                this.sprites[charIdx] = spr;
            } else {
                spr.setFrame(frameIdx);
                spr.setVisible(true);
            }

            spr.setOrigin(0.5, this.textOriginY);
            spr.setPosition(startX + charIdx * this.spacing, 0);

            if (this.tintColor !== 0xffffff) {
                spr.setTint(this.tintColor);
            } else {
                spr.clearTint();
            }

            charIdx++;
        }

        // 使わなくなった余分なスプライトを非表示に
        for (let i = charIdx; i < this.sprites.length; i++) {
            if (this.sprites[i]) {
                this.sprites[i].setVisible(false);
            }
        }

        return this;
    }




    setTint(color) {
        this.tintColor = color;
        for (const spr of this.sprites) {
            if (spr && spr.visible) {
                if (color !== 0xffffff) spr.setTint(color);
                else spr.clearTint();
            }
        }
        return this;
    }
}
