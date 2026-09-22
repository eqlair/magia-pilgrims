import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FILES_DIR = path.join(ROOT_DIR, 'files');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const args = process.argv.slice(2);
const isCheckOnly = args.includes('--check');

console.log('==================================================');
console.log('   Magia Pilgrims アセット最適化 & 判定ツール     ');
console.log('==================================================');
console.log(`ルートディレクトリ: ${ROOT_DIR}`);
console.log(`モード: ${isCheckOnly ? '検査（Check）' : '最適化実行（Optimize）'}\n`);

function getAllFiles(dir, exts = []) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, exts));
        } else {
            const ext = path.extname(item.name).toLowerCase();
            if (exts.length === 0 || exts.includes(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

function getAudioBitrate(filePath) {
    try {
        const cmd = `ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of csv=p=0 "${filePath}"`;
        const res = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        const num = parseInt(res, 10);
        return isNaN(num) ? 0 : Math.round(num / 1000);
    } catch {
        return 0;
    }
}

function checkAssets() {
    console.log('🔍 files/ ディレクトリをスキャン中...');
    const mp3Files = getAllFiles(FILES_DIR, ['.mp3']);
    const wavFiles = getAllFiles(FILES_DIR, ['.wav']);
    const rawImages = getAllFiles(FILES_DIR, ['.png', '.jpg', '.jpeg']);

    const uncompressedMp3 = [];
    for (const file of mp3Files) {
        const bitrate = getAudioBitrate(file);
        // 175kbps以上は未最適化としてフラグ（VBR quality 5 の通常範囲は120〜165kbps）
        if (bitrate > 175) {
            const stat = fs.statSync(file);
            uncompressedMp3.push({
                path: file,
                relPath: path.relative(ROOT_DIR, file),
                sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
                bitrate
            });
        }
    }

    console.log('\n--- 【検査結果】 ---');
    console.log(`■ 未最適化 MP3 (>145kbps): ${uncompressedMp3.length} 件`);
    uncompressedMp3.forEach(f => {
        console.log(`   - ${f.relPath} (${f.bitrate} kbps, ${f.sizeMB} MB)`);
    });

    console.log(`■ WAV ファイル (非圧縮/容量大): ${wavFiles.length} 件`);
    wavFiles.forEach(f => {
        const stat = fs.statSync(f);
        console.log(`   - ${path.relative(ROOT_DIR, f)} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    });

    console.log(`■ 未WebP化 画像 (PNG/JPG): ${rawImages.length} 件`);
    let totalRawImgSize = 0;
    rawImages.forEach(f => {
        totalRawImgSize += fs.statSync(f).size;
    });
    console.log(`   - 合計サイズ: ${(totalRawImgSize / (1024 * 1024)).toFixed(2)} MB`);

    const needsOptimization = uncompressedMp3.length > 0 || wavFiles.length > 0 || rawImages.length > 0;
    if (!needsOptimization) {
        console.log('\n🎉 すべてのアセットが最適化（WebP化・高効率圧縮）されています！');
    } else {
        console.log('\n⚠️ 最適化可能な素材が見つかりました。「npm run optimize:assets」で一括最適化できます。');
    }

    return { uncompressedMp3, wavFiles, rawImages, needsOptimization };
}

function optimizeAssets() {
    const { uncompressedMp3, wavFiles, rawImages } = checkAssets();

    // 1. 未使用WAVファイルの削除
    if (wavFiles.length > 0) {
        console.log('\n🗑️ 未使用WAVファイルの削除中...');
        for (const wav of wavFiles) {
            fs.unlinkSync(wav);
            console.log(`   [削除] ${path.relative(ROOT_DIR, wav)}`);
        }
    }

    // 2. MP3の圧縮 (libmp3lame -q:a 5: 平均約130kbps VBR、高音質＆省容量)
    const allMp3 = getAllFiles(FILES_DIR, ['.mp3']);
    if (allMp3.length > 0) {
        console.log(`\n🎵 MP3音声の最適化圧縮中 (${allMp3.length} 件)...`);
        let beforeTotal = 0;
        let afterTotal = 0;

        for (const file of allMp3) {
            const statBefore = fs.statSync(file);
            beforeTotal += statBefore.size;

            const tempOut = file + '.tmp.mp3';
            const cmd = `ffmpeg -y -v error -i "${file}" -c:a libmp3lame -q:a 5 "${tempOut}"`;
            try {
                execSync(cmd, { stdio: 'inherit' });
                if (fs.existsSync(tempOut)) {
                    const statAfter = fs.statSync(tempOut);
                    if (statAfter.size < statBefore.size) {
                        fs.copyFileSync(tempOut, file);
                        afterTotal += statAfter.size;
                        console.log(`   [圧縮] ${path.basename(file)}: ${(statBefore.size/1024/1024).toFixed(2)}MB -> ${(statAfter.size/1024/1024).toFixed(2)}MB`);
                    } else {
                        afterTotal += statBefore.size;
                        console.log(`   [維持] ${path.basename(file)}: 既に高効率`);
                    }
                    fs.unlinkSync(tempOut);
                }
            } catch (err) {
                console.error(`   [失敗] ${path.basename(file)}:`, err.message);
                if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                afterTotal += statBefore.size;
            }
        }
        console.log(`✨ MP3最適化完了: ${(beforeTotal/1024/1024).toFixed(2)}MB -> ${(afterTotal/1024/1024).toFixed(2)}MB (削減: ${((beforeTotal - afterTotal)/1024/1024).toFixed(2)}MB)`);
    }

    // 3. 画像のWebP変換
    if (rawImages.length > 0) {
        console.log(`\n🖼️ 画像のWebP変換中 (${rawImages.length} 件)...`);
        let beforeImgTotal = 0;
        let afterImgTotal = 0;

        for (const imgPath of rawImages) {
            const ext = path.extname(imgPath).toLowerCase();
            const statBefore = fs.statSync(imgPath);
            beforeImgTotal += statBefore.size;

            const outPath = imgPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            const quality = ext === '.png' ? 85 : 82;
            const cmd = `ffmpeg -y -v error -i "${imgPath}" -c:v libwebp -quality ${quality} "${outPath}"`;

            try {
                execSync(cmd, { stdio: 'inherit' });
                if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
                    const statAfter = fs.statSync(outPath);
                    afterImgTotal += statAfter.size;
                    fs.unlinkSync(imgPath);
                    console.log(`   [WebP化] ${path.basename(imgPath)} -> ${path.basename(outPath)} (${(statBefore.size/1024).toFixed(0)}KB -> ${(statAfter.size/1024).toFixed(0)}KB)`);
                } else {
                    console.error(`   [エラー] 出力ファイルが存在しないか空です: ${outPath}`);
                    afterImgTotal += statBefore.size;
                }
            } catch (err) {
                console.error(`   [失敗] ${path.basename(imgPath)}:`, err.message);
                afterImgTotal += statBefore.size;
            }
        }
        console.log(`✨ 画像WebP化完了: ${(beforeImgTotal/1024/1024).toFixed(2)}MB -> ${(afterImgTotal/1024/1024).toFixed(2)}MB (削減: ${((beforeImgTotal - afterImgTotal)/1024/1024).toFixed(2)}MB)`);
    }

    // 4. プログラムコード・JSONのパス置換
    console.log('\n📝 ソースコード・JSON内の画像参照パスを更新中...');
    updateSourceReferences();

    console.log('\n==================================================');
    console.log('   🎉 全アセットの最適化と参照更新が完了しました！   ');
    console.log('==================================================\n');
}

function updateSourceReferences() {
    const jsFiles = getAllFiles(SRC_DIR, ['.js', '.jsx', '.ts', '.tsx']);
    const jsonFiles = [...getAllFiles(SRC_DIR, ['.json']), ...getAllFiles(FILES_DIR, ['.json'])];

    let totalReplacements = 0;

    // AdventureScene.js の MapFileList ロード部分
    const advPath = path.join(SRC_DIR, 'scenes', 'AdventureScene.js');
    if (fs.existsSync(advPath)) {
        let content = fs.readFileSync(advPath, 'utf8');
        if (content.includes('files/MAP_HEX/${baseName}.png')) {
            content = content.replace('files/MAP_HEX/${baseName}.png', 'files/MAP_HEX/${baseName}.webp');
            console.log('   [更新] AdventureScene.js: MAP_HEX 参照を .webp に更新');
        }
        const targetMapBg = 'this.load.image(`bg_img_${file}`, `files/MAP/${file}`);';
        const replaceMapBg = 'const mapBase = file.replace(/\\.[^/.]+$/, "");\n                this.load.image(`bg_img_${file}`, `files/MAP/${mapBase}.webp`);';
        if (content.includes(targetMapBg)) {
            content = content.replace(targetMapBg, replaceMapBg);
            console.log('   [更新] AdventureScene.js: MAP 背景参照を .webp に更新');
        }
        fs.writeFileSync(advPath, content, 'utf8');
    }

    // 各JSファイルの files/ 参照置換
    for (const file of jsFiles) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        const newContent = content.replace(/(['"`]files\/[^'"`]+?\.)(png|jpg|jpeg)(['"`])/gi, (match, prefix, ext, suffix) => {
            modified = true;
            totalReplacements++;
            return `${prefix}webp${suffix}`;
        });

        if (modified) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`   [更新] ${path.relative(ROOT_DIR, file)}`);
        }
    }

    // 各JSONファイル内の拡張子置換
    for (const file of jsonFiles) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        const newContent = content.replace(/"([^"]+?\.)(png|jpg|jpeg)"/gi, (match, prefix, ext) => {
            modified = true;
            totalReplacements++;
            return `"${prefix}webp"`;
        });

        if (modified) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`   [更新] ${path.relative(ROOT_DIR, file)}`);
        }
    }

    console.log(`合計 ${totalReplacements} 箇所の画像パス参照を更新しました。`);
}

if (isCheckOnly) {
    const res = checkAssets();
    process.exit(res.needsOptimization ? 1 : 0);
} else {
    optimizeAssets();
}
