import { defineConfig } from 'vite';

function getBuildVersion() {
    const now = new Date();
    const jstOffset = 9 * 60;
    const localOffset = now.getTimezoneOffset();
    const jstDate = new Date(now.getTime() + (jstOffset + localOffset) * 60 * 1000);

    const yy = String(jstDate.getFullYear()).slice(-2);
    const mm = String(jstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(jstDate.getDate()).padStart(2, '0');
    const hh = String(jstDate.getHours()).padStart(2, '0');
    const min = String(jstDate.getMinutes()).padStart(2, '0');

    const num = parseInt(`${yy}${mm}${dd}${hh}${min}`, 10);
    const hex = num.toString(16).toUpperCase();
    return `ver.0.1${hex}`;
}

export default defineConfig({
    base: './',
    define: {
        __APP_VERSION__: JSON.stringify(getBuildVersion())
    }
});
