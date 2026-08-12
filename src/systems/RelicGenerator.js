import relicWords from '../data/relic_words.json';
import gemEffects from '../data/gem_effects.json';
import { GlobalState } from './GlobalState';


export class RelicGenerator {
    static TRAIT_LIST = [
        '攻撃力UP(%)', '命中率UP(%)', 'リロード短縮(%)',
        '生命力UP(%)', '精神力UP(%)', 'レベルUP',
        '赤属性UP(%)', '青属性UP(%)', '緑属性UP(%)',
        '黄属性UP(%)', '紫属性UP(%)', '回避率(%)',
        'CH率(%)', 'CH倍率(%)', '取得経験値UP(%)'
    ];

    static RANK_MAX_LEVEL = {
        1: 3, 2: 5, 3: 7, 4: 9, 5: 11, 6: 13, 7: 15, 8: 15
    };

    static generateTraits(rank) {
        // 3つの異なる特性を選ぶ
        const shuffled = [...this.TRAIT_LIST].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        
        let maxLevel = this.RANK_MAX_LEVEL[rank] || 3;
        
        // maxLevel分を3つの特性にランダムに割り振る
        const levels = [0, 0, 0];
        for (let i = 0; i < maxLevel; i++) {
            levels[Math.floor(Math.random() * 3)]++;
        }

        return [
            { name: selected[0], level: levels[0] },
            { name: selected[1], level: levels[1] },
            { name: selected[2], level: levels[2] }
        ];
    }

    static generateRelic(rank) {
        const pList = relicWords.prefixes[rank] || relicWords.prefixes[1];
        const aList = relicWords.adjectives;
        const nList = relicWords.nouns;
        
        const prefix = pList[Math.floor(Math.random() * pList.length)] || '';
        const adj = aList[Math.floor(Math.random() * aList.length)] || '';
        const noun = nList[Math.floor(Math.random() * nList.length)] || '';
        
        return {
            id: 'relic_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            type: 'relic',
            name: `${prefix}${adj}${noun}`,
            rank: rank,
            traits: this.generateTraits(rank),
            isLocked: false
        };
    }

    static generateGem() {
        const gemNames = Object.keys(gemEffects);
        const name = gemNames[Math.floor(Math.random() * gemNames.length)];
        const rank = gemEffects[name]?.minRank || 1;
        
        // 3つの異なる特性を選ぶ
        const shuffled = [...this.TRAIT_LIST].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        
        // 生成時は特性は一つも開花していない
        const activeCount = 0;
        
        const traits = selected.map((t, idx) => ({
            name: t,
            level: idx < activeCount ? 5 : 0 // Level 5相当（生ステータス加算などで25%等に対応させる）
        }));

        return {
            id: 'gem_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            type: 'gem',
            name: name,
            rank: rank,
            traits: traits,
            isLocked: false
        };
    }

    static generateBattleDrops(isBoss = false) {
        const drops = [];
        const gs = GlobalState.getInstance();
        const isFoolUpright = gs.activeTarots.some(t => t.id === 1 && t.isUpright);
        const bossMult = isBoss ? 2.0 : 1.0;
        const rareMult = (isFoolUpright ? 2.0 : 1.0) * bossMult;
        
        // Rank 1: 2 to 6 drops (ボス時は4〜8個)
        const minDrops = isBoss ? 4 : 2;
        const numRank1 = minDrops + Math.floor(Math.random() * 5);
        for (let i = 0; i < numRank1; i++) {
            drops.push(this.generateRelic(1));
        }
        
        // Rank 2: 20% chance (ボス時 40%)
        if (Math.random() < Math.min(1.0, 0.20 * rareMult)) {
            drops.push(this.generateRelic(2));
        }
        
        // Rank 3: 5% chance (ボス時 10%)
        if (Math.random() < Math.min(1.0, 0.05 * rareMult)) {
            drops.push(this.generateRelic(3));
        }
        
        // Gem: 1% chance (ボス時 2%)
        if (Math.random() < Math.min(1.0, 0.01 * rareMult)) {
            drops.push(this.generateGem(1));
        }
        
        return drops;
    }

    static generateExplorationDrops(isGenericHex = false) {
        const drops = [];
        const gs = GlobalState.getInstance();
        const isFoolUpright = gs.activeTarots.some(t => t.id === 1 && t.isUpright);
        const genericMult = isGenericHex ? 0.5 : 1.0;
        const rareMult = (isFoolUpright ? 2.0 : 1.0) * genericMult;

        // Rank 1: 2〜8個
        const numRank1 = 2 + Math.floor(Math.random() * 7);
        for (let i = 0; i < numRank1; i++) {
            drops.push(this.generateRelic(1));
        }
        // Rank 2: 30% (汎用時 15%)
        if (Math.random() < Math.min(1.0, 0.30 * rareMult)) {
            drops.push(this.generateRelic(2));
        }
        // Rank 3: 10% (汎用時 5%, 愚者時 20%)
        if (Math.random() < Math.min(1.0, 0.10 * rareMult)) {
            drops.push(this.generateRelic(3));
        }
        // Gem: 1% (汎用時 0.5%, 愚者時 2%)
        if (Math.random() < Math.min(1.0, 0.01 * rareMult)) {
            drops.push(this.generateGem(1));
        }
        return drops;
    }


}
