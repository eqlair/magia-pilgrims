import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });

page.on("console", msg => {
    const text = msg.text();
    if (text.includes("NOAH") || text.includes("noahOrb") || text.includes("008") || text.includes("bullet") || text.includes("BattleEngine") || text.includes("TitleScene") || text.includes("SaveManager")) {
        console.log("[BROWSER]", text);
    }
});

try {
    // テスト用スナップショット使用
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

    await page.waitForFunction(() => {
        const scene = window.game?.scene?.getScene("BattleScene");
        return scene && scene.engine && scene.isActive();
    }, { timeout: 25000 });

    console.log("BattleScene ready");
    await new Promise(r => setTimeout(r, 2500));

    const diag1 = await page.evaluate(() => {
        const engine = window.game?.scene?.getScene("BattleScene")?.engine;
        const players = engine?.players || [];
        const noah = players.find(p => p.charId === "008");
        return {
            engineState: engine?.state,
            playerIds: players.map(p => p.charId),
            noahExists: !!noah,
            noahIsDead: noah?.isDead,
            noahHp: noah?.hp,
            noahHasEngine: !!(noah?.engine),
            noahOrbsType: typeof noah?.noahOrbs,
            noahOrbsLength: noah?.noahOrbs?.length ?? "undefined",
            noahMaxOrbs: noah?.maxNoahOrbs,
            noahOrbSpawnTimer: noah?.noahOrbSpawnTimer,
        };
    });
    console.log("DIAG1:", JSON.stringify(diag1));

    await new Promise(r => setTimeout(r, 3000));

    const diag2 = await page.evaluate(() => {
        const engine = window.game?.scene?.getScene("BattleScene")?.engine;
        const noah = engine?.players?.find(p => p.charId === "008");
        const enemies = (engine?.enemies || []).filter(e => !e.isDead && e.hp > 0);
        return {
            noahOrbsLength: noah?.noahOrbs?.length ?? "undefined",
            orbDetails: (noah?.noahOrbs || []).map(o => ({ x: o.x, z: o.z, shootTimer: o.shootTimer, isDead: o.isDead })),
            totalBullets: engine?.bullets?.length ?? 0,
            noahBullets: (engine?.bullets || []).filter(b => b.type === "noah_bullet_008").length,
            aliveEnemies: enemies.length,
        };
    });
    console.log("DIAG2:", JSON.stringify(diag2));

    // 手動でOrbを注入してテスト
    await page.evaluate(() => {
        const engine = window.game?.scene?.getScene("BattleScene")?.engine;
        const noah = engine?.players?.find(p => p.charId === "008");
        if (!noah) { console.log("NOAH_DEBUG: NOT FOUND"); return; }
        if (!noah.noahOrbs) { noah.noahOrbs = []; console.log("NOAH_DEBUG: noahOrbs was undefined, initialized"); }
        noah.maxNoahOrbs = 3;
        noah.noahOrbSpawnTimer = 0;
        if (noah.noahOrbs.length === 0) {
            noah.noahOrbs.push({
                x: (noah.x || 0) + 0.5,
                z: (noah.z || 1) + 2.0,
                size: 0.40, speed: 1.0,
                moveAngle: Math.PI/2, targetAngle: Math.PI/2,
                changeDirTimer: 1.0, wavePhase: 0,
                shootTimer: 0, isDead: false,
                textureKey: "weapon_008_orb"
            });
            console.log("NOAH_DEBUG: manual orb injected");
        } else {
            for (const o of noah.noahOrbs) { o.shootTimer = 0; }
            console.log("NOAH_DEBUG: reset shoot timers on", noah.noahOrbs.length, "orbs");
        }
    });

    await new Promise(r => setTimeout(r, 3000));

    const diag3 = await page.evaluate(() => {
        const engine = window.game?.scene?.getScene("BattleScene")?.engine;
        const noah = engine?.players?.find(p => p.charId === "008");
        return {
            noahOrbsLength: noah?.noahOrbs?.length ?? "undefined",
            orbDetails: (noah?.noahOrbs || []).map(o => ({ x: typeof o.x === "number" ? o.x.toFixed(2) : o.x, z: typeof o.z === "number" ? o.z.toFixed(2) : o.z, shootTimer: typeof o.shootTimer === "number" ? o.shootTimer.toFixed(3) : o.shootTimer, isDead: o.isDead })),
            totalBullets: engine?.bullets?.length ?? 0,
            noahBullets: (engine?.bullets || []).filter(b => b.type === "noah_bullet_008").length,
        };
    });
    console.log("DIAG3 (after injection):", JSON.stringify(diag3));

    await page.screenshot({ path: "./debug_noah_deep.png" });
    console.log("Screenshot saved: debug_noah_deep.png");
} catch(e) {
    console.error("ERROR:", e.message);
    await page.screenshot({ path: "./debug_noah_error.png" }).catch(()=>{});
} finally {
    await browser.close();
}
