/**
 * 魔法少女強化プログラム (道場システム) のマスタデータ & ロジック
 */
export const DOJO_SUBJECTS = {
    A: {
        id: 'A',
        name: 'KISO学科',
        desc: '魔法少女としての基礎体力を培う必修学科',
        maxStage: 1, // A学科は1周(5科目)で修了
        subjects: [
            { id: 'A1', name: '基礎強化I', desc: '基礎HP +100', apply: (sb) => { sb.hp = (sb.hp || 0) + 100; } },
            { id: 'A2', name: '基礎強化II', desc: '基礎MP +100', apply: (sb) => { sb.mp = (sb.mp || 0) + 100; } },
            { id: 'A3', name: '基礎強化III', desc: '戦闘中のSP減少を10%緩和', apply: (sb) => { sb.spDrainRate = (sb.spDrainRate || 1.0) * 0.9; } },
            { id: 'A4', name: '基礎強化IV', desc: 'HP回復時のMP効率向上 (MP1→HP33)', apply: (sb) => { sb.hpRecoveryRate = (sb.hpRecoveryRate || 30) + 3; } },
            { id: 'A5', name: '基礎強化V', desc: '基礎攻撃力 +10', apply: (sb) => { sb.atk = (sb.atk || 0) + 10; } },
        ]
    },
    B: {
        id: 'B',
        name: 'WAZA学科',
        desc: '攻撃技と機敏性を高める専攻学科',
        maxStage: 5,
        subjects: [
            { id: 'B1', name: '攻性強化', desc: '基礎攻撃力 +10', apply: (sb) => { sb.atk = (sb.atk || 0) + 10; } },
            { id: 'B2', name: '機敏性強化', desc: '基礎回避率 +5%', apply: (sb) => { sb.evasion = (sb.evasion || 0) + 0.05; } },
            { id: 'B3', name: '攻性潜在力強化', desc: '基礎攻撃力成長率 +2%', apply: (sb) => { sb.atkGrowth = (sb.atkGrowth || 0) + 0.02; } },
            { id: 'B4', name: '機敏性潜在力強化', desc: 'LV1ごとに回避率 +0.5%', apply: (sb) => { sb.evasionPerLevel = (sb.evasionPerLevel || 0) + 0.005; } },
            { id: 'B5', name: '基礎CH倍率強化', desc: 'CH倍率 +30%', apply: (sb) => { sb.critDamage = (sb.critDamage || 0) + 0.30; } },
        ]
    },
    C: {
        id: 'C',
        name: 'KOKORO学科',
        desc: '精神の集中と効率化を図る専攻学科',
        maxStage: 5,
        subjects: [
            { id: 'C1', name: '精神洗浄効率強化', desc: 'SP回復効率 +10% (0.1%→0.11%)', apply: (sb) => { sb.spEfficiency = (sb.spEfficiency || 0.001) * 1.1; } },
            { id: 'C2', name: '呼吸法訓練', desc: '戦闘中のSP減少を10%緩和', apply: (sb) => { sb.spDrainRate = (sb.spDrainRate || 1.0) * 0.9; } },
            { id: 'C3', name: '精神潜在力強化', desc: '基礎MP成長率 +2%', apply: (sb) => { sb.mpGrowth = (sb.mpGrowth || 0) + 0.02; } },
            { id: 'C4', name: '基礎精神力強化', desc: '基礎MP +100', apply: (sb) => { sb.mp = (sb.mp || 0) + 100; } },
            { id: 'C5', name: '基礎CH率強化', desc: '基礎CH率 +3%', apply: (sb) => { sb.critRate = (sb.critRate || 0) + 0.03; } },
        ]
    },
    D: {
        id: 'D',
        name: 'KARADA学科',
        desc: '肉体の頑強さと生命力を極める専攻学科',
        maxStage: 5,
        subjects: [
            { id: 'D1', name: '治癒力強化', desc: 'HP回復時のMP減少を10%緩和', apply: (sb) => { sb.hpRecoveryRate = (sb.hpRecoveryRate || 30) * 1.1; } },
            { id: 'D2', name: '生命潜在力強化', desc: '基礎HP成長率 +2%', apply: (sb) => { sb.hpGrowth = (sb.hpGrowth || 0) + 0.02; } },
            { id: 'D3', name: '基礎生命力強化', desc: '基礎HP +100', apply: (sb) => { sb.hp = (sb.hp || 0) + 100; } },
            { id: 'D4', name: '栄養回収率強化', desc: '食料消耗を10%軽減', apply: (sb) => { sb.foodCostRate = (sb.foodCostRate || 1.0) * 0.9; } },
            { id: 'D5', name: '基礎抵抗力強化', desc: '属性防御・デバフ耐性 +3%軽減', apply: (sb) => { sb.damageResist = (sb.damageResist || 0) + 0.03; } },
        ]
    }
};

/**
 * 履修履歴からステータスボーナスをクリーンに再計算する
 */
export function recalculateDojoStatsBonus(charData) {
    if (!charData.dojo) return;
    const sb = {
        hp: 0, mp: 0, atk: 0, spDrainRate: 1.0, spEfficiency: 0.001, hpRecoveryRate: 30,
        evasion: 0, atkGrowth: 0, mpGrowth: 0, hpGrowth: 0, evasionPerLevel: 0,
        critDamage: 0, critRate: 0, foodCostRate: 1.0, damageResist: 0
    };

    const deptKeys = ['A', 'B', 'C', 'D'];
    for (const key of deptKeys) {
        const deptState = charData.dojo.subjects?.[key];
        const deptDef = DOJO_SUBJECTS[key];
        if (!deptState || !deptDef) continue;

        // 過去の完了周回分 (stage > 1 の場合、完了した周回の全科目を適用)
        const completedStages = Math.max(0, (deptState.stage || 1) - 1);
        for (let s = 0; s < completedStages; s++) {
            for (const subj of deptDef.subjects) {
                subj.apply(sb, charData);
            }
        }

        // 現在のステージで履修済みの科目
        if (Array.isArray(deptState.learned)) {
            for (const subjId of deptState.learned) {
                const subj = deptDef.subjects.find(s => s.id === subjId);
                if (subj) {
                    subj.apply(sb, charData);
                }
            }
        }
    }

    charData.dojo.statsBonus = sb;
    return sb;
}

/**
 * キャラの道場データの初期化（旧データの自動クリーンアップ含む）
 */
export function initCharacterDojo(charData) {
    if (!charData.dojo) {
        charData.dojo = {
            totalTrainCount: 0,
            kisoCompleted: false,
            subjects: {
                A: { stage: 1, learned: [] },
                B: { stage: 1, learned: [] },
                C: { stage: 1, learned: [] },
                D: { stage: 1, learned: [] }
            },
            statsBonus: {
                hp: 0, mp: 0, atk: 0, spDrainRate: 1.0, spEfficiency: 0.001, hpRecoveryRate: 30,
                evasion: 0, atkGrowth: 0, mpGrowth: 0, hpGrowth: 0, evasionPerLevel: 0,
                critDamage: 0, critRate: 0, foodCostRate: 1.0, damageResist: 0
            }
        };
    }
    // 旧フォーマット等の互換対応
    if (!charData.dojo.subjects) {
        charData.dojo.subjects = {
            A: { stage: 1, learned: [] },
            B: { stage: 1, learned: [] },
            C: { stage: 1, learned: [] },
            D: { stage: 1, learned: [] }
        };
    }
    for (const key of ['A', 'B', 'C', 'D']) {
        if (!charData.dojo.subjects[key]) {
            charData.dojo.subjects[key] = { stage: 1, learned: [] };
        }
    }

    // 異常値（整数値で保存されていたデータ）の自動再計算・正規化
    if (charData.dojo.statsBonus && (charData.dojo.statsBonus.evasion > 1.0 || charData.dojo.statsBonus.critRate > 1.0 || charData.dojo.statsBonus.critDamage > 5.0)) {
        recalculateDojoStatsBonus(charData);
    } else if (!charData.dojo.statsBonus) {
        recalculateDojoStatsBonus(charData);
    }

    return charData.dojo;
}

/**
 * 次の訓練費用を取得
 */
export function getDojoTrainCost(charData) {
    const dojo = initCharacterDojo(charData);
    return (dojo.totalTrainCount + 1) * 50;
}

/**
 * 指定学科で未履修の科目をランダムに1つ履修する
 * @returns {object|null} 履修した科目オブジェクト、またはnull（満了時）
 */
export function performDojoTraining(charData, deptKey) {
    const dojo = initCharacterDojo(charData);
    const dept = DOJO_SUBJECTS[deptKey];
    if (!dept) return null;

    const deptState = dojo.subjects[deptKey];
    if (deptKey !== 'A' && !dojo.kisoCompleted) return null; // A未修了なら受講不可
    if (deptState.stage > dept.maxStage) return null; // 最大段階到達

    // 現在の段階でまだ履修していない科目を抽出
    const unlearned = dept.subjects.filter(s => !deptState.learned.includes(s.id));
    if (unlearned.length === 0) return null;

    // ランダム抽選
    const chosenSubject = unlearned[Math.floor(Math.random() * unlearned.length)];

    // 履修登録
    deptState.learned.push(chosenSubject.id);
    dojo.totalTrainCount += 1;

    // 全5科目履修完了時の判定
    if (deptState.learned.length >= dept.subjects.length) {
        if (deptKey === 'A') {
            dojo.kisoCompleted = true;
        } else {
            // 次の段階へステップアップ（最大段階まで）
            if (deptState.stage < dept.maxStage) {
                deptState.stage += 1;
                deptState.learned = []; // 次の段階用にクリア
            } else {
                deptState.stage = dept.maxStage + 1; // 満了マーク
            }
        }
    }

    // ステータスボーナスを再計算
    recalculateDojoStatsBonus(charData);

    return chosenSubject;
}
