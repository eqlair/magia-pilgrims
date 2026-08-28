/**
 * AudioOptimizer.js
 * スマホ(iPhone/Android)内蔵スピーカー向けサウンド最適化システム
 * 
 * 1. 85Hz ハイパスフィルター (Low-Cut):
 *    - スマホスピーカーが物理的に振動しきれずプツプツ音割れ・歪みを起こす
 *      不要な超低音サブベース (20Hz〜80Hz) を安全にカット。
 * 2. 16kHz ローパスフィルター (High-Cut):
 *    - 超高域のシャリシャリした耳障りなデジタルノイズを滑らかに低減。
 * 3. ソフトリミッター (Dynamics Compressor):
 *    - 爆発・レーザー・BGMなどが同時に重なった瞬間の 0dBFS クリッピング（波形潰れによるプツッノイズ）を防止。
 */

export class AudioOptimizer {
    static isInitialized = false;

    /**
     * Phaser Game インスタンスの WebAudio 出力段にマスターフィルターを装着
     * @param {Phaser.Game} game 
     */
    static init(game) {
        if (!game || !game.sound) return;

        const setup = () => {
            const soundMgr = game.sound;
            // WebAudioSoundManager 判定
            if (!soundMgr.context || !soundMgr.masterVolumeNode) {
                // context がまだ起動していない場合は初回サウンド再生時などに再試行
                return false;
            }

            if (soundMgr._isAudioOptimizerAttached) return true;
            soundMgr._isAudioOptimizerAttached = true;

            const ctx = soundMgr.context;

            try {
                // ① 85Hz ハイパスフィルター (スマホスピーカー保護・低音プツプツ完全防止)
                const highpass = ctx.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 85;
                highpass.Q.value = 0.7071; // バタワース平坦特性

                // ② 16kHz ローパスフィルター (高域の耳障りなシャリ付き防止)
                const lowpass = ctx.createBiquadFilter();
                lowpass.type = 'lowpass';
                lowpass.frequency.value = 16000;
                lowpass.Q.value = 0.7071;

                // ③ スタジオ品質ソフトリミッター (複数SE同時再生時の音割れ防止)
                const limiter = ctx.createDynamicsCompressor();
                limiter.threshold.value = -1.5; // -1.5dB以上で優しくリミッティング
                limiter.knee.value = 6.0;        // ソフト接続
                limiter.ratio.value = 20.0;      // リミッター比率
                limiter.attack.value = 0.002;    // 2ms (急激な爆発ピークを即座にガード)
                limiter.release.value = 0.10;    // 100ms (自然な戻り)

                // ルーティング再接続:
                // masterVolumeNode -> highpass (85Hz) -> lowpass (16kHz) -> limiter (-1.5dB) -> destination
                const masterGain = soundMgr.masterVolumeNode;
                masterGain.disconnect();
                masterGain.connect(highpass);
                highpass.connect(lowpass);
                lowpass.connect(limiter);
                limiter.connect(ctx.destination);

                console.log('[AudioOptimizer] 🎧 Smartphone Audio Filter & Soft Limiter (85Hz HPF / 16kHz LPF / -1.5dB Limiter) attached successfully!');
                AudioOptimizer.isInitialized = true;
                return true;
            } catch (e) {
                console.warn('[AudioOptimizer] Failed to attach audio filter:', e);
                return false;
            }
        };

        if (!setup()) {
            // AudioContext はユーザー操作（タップ）後にアンロックされることがあるため、イベントでも待機
            const tryAttach = () => {
                if (setup()) {
                    window.removeEventListener('pointerdown', tryAttach);
                    window.removeEventListener('touchstart', tryAttach);
                    window.removeEventListener('click', tryAttach);
                }
            };
            window.addEventListener('pointerdown', tryAttach, { passive: true });
            window.addEventListener('touchstart', tryAttach, { passive: true });
            window.addEventListener('click', tryAttach, { passive: true });
        }
    }
}
