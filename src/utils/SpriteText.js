import Phaser from 'phaser';

const CHAR_FRAME_MAP = {
    // Row 0 (idx 0~12): 数字 0~9
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,

    // Row 1 (idx 13~25): 英大文字 A~M
    'A': 13, 'B': 14, 'C': 15, 'D': 16, 'E': 17, 'F': 18, 'G': 19, 'H': 20, 'I': 21, 'J': 22, 'K': 23, 'L': 24, 'M': 25,

    // Row 2 (idx 26~38): 英大文字 N~Z
    'N': 26, 'O': 27, 'P': 28, 'Q': 29, 'R': 30, 'S': 31, 'T': 32, 'U': 33, 'V': 34, 'W': 35, 'X': 36, 'Y': 37, 'Z': 38,

    // Row 3 (idx 39~51): 半角スペース ＆ 各種記号類
    ' ': 39, // 半角スペース (Row 3, Col 0)
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
    '?': 50,

    // Row 4 (idx 52~64): 英小文字 a~m
    'a': 52, 'b': 53, 'c': 54, 'd': 55, 'e': 56, 'f': 57, 'g': 58, 'h': 59, 'i': 60, 'j': 61, 'k': 62, 'l': 63, 'm': 64,

    // Row 5 (idx 65~77): 英小文字 n~z
    'n': 65, 'o': 66, 'p': 67, 'q': 68, 'r': 69, 's': 70, 't': 71, 'u': 72, 'v': 73, 'w': 74, 'x': 75, 'y': 76, 'z': 77
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
