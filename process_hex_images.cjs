const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const SRC_DIR = path.join(__dirname, 'public/files/MAP');
const DEST_DIR = path.join(__dirname, 'public/files/MAP_HEX');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

const hexRadius = 120; // 2x resolution of the in-game 60 radius
const hexWidth = Math.ceil(hexRadius * Math.sqrt(3)); // 208
const hexHeight = hexRadius * 2; // 240

const points = [
    { x: 0, y: -hexRadius },
    { x: hexWidth/2, y: -hexRadius/2 },
    { x: hexWidth/2, y: hexRadius/2 },
    { x: 0, y: hexRadius },
    { x: -hexWidth/2, y: hexRadius/2 },
    { x: -hexWidth/2, y: -hexRadius/2 }
];

async function processImage(filename) {
    if (!filename.match(/\.(jpg|jpeg|png)$/i)) return;
    
    const srcPath = path.join(SRC_DIR, filename);
    const destPath = path.join(DEST_DIR, filename.replace(/\.[^/.]+$/, '.png')); // Save as PNG

    try {
        const img = await loadImage(srcPath);
        
        const canvas = createCanvas(hexWidth, hexHeight);
        const ctx = canvas.getContext('2d');

        // Create hex clipping path
        ctx.beginPath();
        points.forEach((p, i) => {
            const px = p.x + hexWidth / 2;
            const py = p.y + hexHeight / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.clip();

        // Calculate scaling to cover the hex (preserve aspect ratio)
        const scaleX = hexWidth / img.width;
        const scaleY = hexHeight / img.height;
        const scale = Math.max(scaleX, scaleY) * 1.05; // 1.05 for overlap buffer

        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (hexWidth - dw) / 2;
        const dy = (hexHeight - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);

        // Save to file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(destPath, buffer);
        console.log(`Processed: ${filename}`);

    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

async function main() {
    const files = fs.readdirSync(SRC_DIR);
    for (const file of files) {
        await processImage(file);
    }
    console.log('All images processed!');
}

main();
