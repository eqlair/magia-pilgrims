/**
 * 疑似3Dマップの透視投影（パースペクティブ）計算クラス
 * XZ平面上の座標（横幅, 奥行き）を画面上の（x, y, scale）に変換します。
 */
export class MapProjector {
    constructor(screenWidth, screenHeight) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        // デフォルトのカメラパラメータ
        this.cameraHeight = 12.0;               // カメラの高さ (m)
        this.cameraZ = 3.0;                     // カメラの奥行き位置 (m)
        this.pitch = -77.5 * Math.PI / 180;     // 見下ろし角度 (ラジアン)
        this.fov = 620;                         // 視野角（焦点距離）
        this.screenCenterY = 624;               // 画面Yオフセット
    }

    /**
     * ワールド座標 (wx, wz) をスクリーン座標に変換する
     * @param {number} wx 横方向の座標 (m) 中心が0
     * @param {number} wz 奥方向の座標 (m) 手前が0
     * @returns {object} { x: px, y: px, scale: number, depth: number, visible: boolean }
     */
    project(wx, wz) {
        // カメラからの相対座標
        const cx = wx;
        const cy = -this.cameraHeight; // 盤面は Y=0
        const cz = wz - this.cameraZ;

        // X軸周りにピッチ角で回転 (見下ろし)
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);

        const rx = cx;
        const ry = cy * cosP - cz * sinP;
        const rz = cy * sinP + cz * cosP;

        // カメラの後ろにある場合は非表示
        if (rz <= 0.1) {
            return { x: -999, y: -999, scale: 0, depth: -1, visible: false };
        }

        // 透視投影
        const scale = this.fov / rz;
        const screenX = (this.screenWidth / 2) + (rx * scale);
        const screenY = this.screenCenterY - (ry * scale);

        return { x: screenX, y: screenY, scale: scale, depth: rz, visible: true };
    }

    /**
     * スクリーンY座標から、ワールドZ座標を逆算する（盤面 Y=0 と仮定）
     */
    getZForScreenY(screenY) {
        const R = (this.screenCenterY - screenY) / this.fov;
        const cy = -this.cameraHeight;
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);

        const numerator = cy * (cosP - R * sinP);
        const denominator = sinP + R * cosP;
        
        if (Math.abs(denominator) < 0.0001) return this.cameraZ; // 並行で解なし
        
        const cz = numerator / denominator;
        return cz + this.cameraZ;
    }
}
