/**
 * ゲーム全体で使用するフォント・デザイン定数
 *
 * フォントを変更したい場合はここだけ直せばOK。
 */

import { GlobalState } from '../systems/GlobalState';

// メインフォント（Noto Serif JP: 明朝体・格調ある和風）
export const FONT_MAIN   = '"Noto Serif JP", serif';

const getTextWidth = () => {
    const gs = GlobalState.instance;
    return (gs && gs.options && gs.options.textWidth) ? gs.options.textWidth : 25;
};

// フォントサイズ（画面幅に対する比率で計算する関数）
// width: Phaser の scale.width
export const fontSize = {
    /** 時報・タイトルなど大きめの見出し */
    large:  (width) => Math.floor(width / (getTextWidth() * 0.4)) + 'px',
    /** 通常の見出し・ボタンラベル */
    medium: (width) => Math.floor(width / (getTextWidth() * 0.6)) + 'px',
    /** 会話テキスト・解説テキスト・tips等（textWidth文字/行基準） */
    body:   (width) => Math.floor(width / getTextWidth()) + 'px',
    /** 小さなラベル・バージョン表示など */
    small:  (width) => Math.floor(width / (getTextWidth() * 1.5)) + 'px',
};
