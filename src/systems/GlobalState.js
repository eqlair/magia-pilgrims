import charDataJson from '../data/characters.json';
import gemEffectsJson from '../data/gem_effects.json';
import { SaveManager } from './SaveManager';



export class GlobalState {
    static instance = null;

    constructor() {
        if (GlobalState.instance) {
            return GlobalState.instance;
        }
        
        // グローバルなストック経験値（共有）
        this.stockExp = 0;
        
        // 食料（0〜100）
        this.food = 100;
        
        // 所持SP（魔女撃破時に獲得、休息でSP回復に使用）
        this.stockSp = 0;
        
        // インベントリ
        this.inventory = {
            relics: [],
            gems: []
        };
        
        // オプション設定
        this.options = {
            textWidth: 25
        };
        
        // 保存された隊列編成データ
        this.savedFormation = {};

        // 発動中のタロットカードリスト [{id: Number, isUpright: Boolean}]
        this.activeTarots = [];
        
        // デバッグ機能: 戦闘後に宝石確定ドロップ
        this.debugForceGemDrop = false;
        
        // 12/7, 12/14, 12/21イベントフラグ
        this.event1207Played = false;
        this.event1214Played = false;
        this.event1221Played = false;


        // --- タロット用の一時・永続フラグ ---
        this.extraEnemyLevel = 0; // マップ上の雑魚敵レベル補正
        this.extraWitchLevel = 0; // マップ上の魔女レベル補正
        this.extraWaves = 0; // ウェーブ数増加補正
        this.enemySpeedHalf = false; // 敵速度半減
        this.expMultiplier = 1.0; // EXP倍率
        this.spMultiplier = 1.0; // SP倍率
        this.tarot13_targetHp = null; // No.13(正)のHP変更対象キャラID
        this.tarot13_targetAtk = null; // No.13(正)のATK上昇対象キャラID

        // デバッグ機能: タロットカードをすべて表向きでドローする
        this.tarotAllFaceUp = false;
        
        // デバッグ機能: 敵のステータス倍率（デフォルト1.0）
        this.debugEnemyHpMultiplier = 1.0;     // 1.0
        this.debugEnemyMoveMultiplier = 1.0;   // 1.0
        this.debugEnemyRangeMultiplier = 1.0;  // 1.0
        this.debugEnemySizeMultiplier = 1.0;   // 1.0
        this.debugEnemyHpGrowthRate = 1.0;     // 1.0

        
        // 全キャラクターの永続データ
        this.characters = {
            '001': this.createInitialCharData('001', '紫苑', 1),
            '002': this.createInitialCharData('002', '蒼樹', 1),
            '003': this.createInitialCharData('003', '紅華', 1),
            '004': this.createInitialCharData('004', '黄蘭', 1),
            '005': this.createInitialCharData('005', '李乃果', 1)
        };
        
        GlobalState.instance = this;
    }

    static getInstance() {
        if (!GlobalState.instance) {
            new GlobalState();
        }
        return GlobalState.instance;
    }

    createInitialCharData(id, name, level) {
        const def = charDataJson.characters[id] || {};
        const baseHp = def.baseHp || 1000;
        const baseSp = def.baseSp || 500;

        return {
            id: id,
            name: name,
            level: level,
            exp: 0,
            affection: 0, // 親愛度（旧プロパティ、後方互換のため残す）
            friendships: {}, // 各キャラへの友好度（ID -> 友好度 -10~25）
            friendshipPoints: 0, // 友好度ボーナスポイント
            metCharacters: [], // 一緒に編成したことのあるキャラIDリスト
            meleeLevel: 1, // 近接攻撃レベル
            rangedLevel: 1, // 遠隔攻撃レベル
            gachaFails: 0, // 攻撃レベル上昇ガチャのハズレ回数
            baseHp: baseHp,
            baseSp: baseSp,
            baseAtk: 100, // ベース攻撃力
            baseReload: 100, // ベースリロード速度 (100 = 1.0倍速)
            equipGem: null, // 宝石（1枠）
            equipRelics: [null, null, null, null, null], // レリクス（5枠）
            // 算出される現在値（セーブロード時は再計算するかそのまま保持）
            currentHp: baseHp,
            currentSp: baseSp
        };
    }

    // 次のレベルアップに必要な経験値を計算
    getRequiredExp(level) {
        if (level >= 13) return 500000;
        return 125 * Math.pow(2, level - 1);
    }

    calcBaseStats(charId) {
        const char = this.characters[charId];
        if (!char) return null;
        
        const levelBonus = (char.level - 1) * 0.05;
        return {
            maxHp: Math.floor(char.baseHp * (1 + levelBonus)),
            maxSp: Math.floor(char.baseSp * (1 + levelBonus)),
            atk: Math.floor(char.baseAtk * (1 + levelBonus)),
            reload: Math.floor(char.baseReload)
        };
    }

    // レベルに応じたステータスの計算（1レベルごとに元の値の5%上昇）
    calcStats(charId, party = [], isFront = null) {
        const char = this.characters[charId];
        if (!char) return null;

        const baseStats = this.calcBaseStats(charId);
        let { maxHp, maxSp, atk, reload } = baseStats;

        // 親愛度ボーナスの計算
        let affectionTotal = 0;
        let affectionBonus = 0;
        if (party && party.length > 0 && party.includes(charId)) {
            // 編成履歴を記録（現在・過去のパーティ同伴）
            for (const otherId of party) {
                if (otherId !== charId) {
                    if (!char.metCharacters) char.metCharacters = [];
                    if (!char.metCharacters.includes(otherId)) {
                        char.metCharacters.push(otherId);
                    }
                }
            }

            for (const otherId of party) {
                if (otherId === charId) continue;
                const otherChar = this.characters[otherId];
                if (otherChar && otherChar.friendships && otherChar.friendships[charId]) {
                    affectionTotal += otherChar.friendships[charId];
                }
            }
            if (affectionTotal > 0) {
                affectionBonus = Math.min(0.50, affectionTotal / 100.0);
            }
        }

        // Modifiers from equipment
        let hpMod = 0;
        let spMod = 0;
        let atkMod = 0;
        let reloadMod = 0;
        let hitRateMod = 0; // 追加: 命中率補正
        let evadeRateMod = 0; // 追加: 回避率補正
        let critRateMod = 0; // 追加: クリティカル率
        let critMultMod = 0; // 追加: クリティカル倍率
        let meleeLevelBonus = 0; // 追加: 近接攻撃LVボーナス
        let rangedLevelBonus = 0; // 追加: 遠距離攻撃LVボーナス
        let charLevelBonus = 0; // 追加: キャラクター一時レベルボーナス
        let expBonusMod = 0; // 追加: 経験値取得量UPボーナス(%)
        let elemMods = { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };

        // 装備品の集計 (ロック中のスロットおよび未装着を除外)
        const validEquips = [];
        if (char.equipRelics && Array.isArray(char.equipRelics)) {
            char.equipRelics.forEach((relic, slotIdx) => {
                if (!relic) return;
                const reqLevel = 1 + slotIdx * 4;
                if ((char.level || 1) < reqLevel) return; // ロック中スロットのレリクスは無効
                validEquips.push(relic);
            });
        }
        if (char.equipGem) {
            validEquips.push(char.equipGem);
        }

        validEquips.forEach(equip => {
            // 1. 特性リスト（traits）または個別プロパティの判定
            const traits = equip.traits || (equip.trait ? [equip.trait] : []);
            traits.forEach(trait => {
                if (!trait) return;
                const tLevel = Number(trait.level || trait.val || 0);
                if (tLevel <= 0) return; // 未開花特性(level === 0)は加算しない！

                const tName = (trait.name || trait.type || '').toString().trim();
                if (!tName) return;

                if (tName.includes('生命力') || tName.includes('HPUP')) {
                    hpMod += tLevel * 0.05;
                } else if (tName.includes('精神力') || tName.includes('SPUP')) {
                    spMod += tLevel * 0.05;
                } else if (tName.includes('攻撃力UP') || tName.includes('ATKUP')) {
                    atkMod += tLevel * 0.05;
                } else if (tName.includes('リロード')) {
                    reloadMod += tLevel * 0.02;
                } else if (tName.includes('命中')) {
                    hitRateMod += tLevel * 0.05;
                } else if (tName.includes('回避')) {
                    evadeRateMod += tLevel * 0.05;
                } else if (tName.includes('CH率') || tName.includes('クリティカル率')) {
                    critRateMod += tLevel * 0.05;
                } else if (tName.includes('CH倍率') || tName.includes('クリティカル倍率')) {
                    critMultMod += tLevel * 0.10;
                } else if (tName.includes('全攻撃') || tName.includes('全攻撃LV') || tName.includes('全攻撃Lv')) {
                    meleeLevelBonus += tLevel;
                    rangedLevelBonus += tLevel;
                } else if (tName.includes('近接')) {
                    meleeLevelBonus += tLevel;
                } else if (tName.includes('遠距離') || tName.includes('遠隔')) {
                    rangedLevelBonus += tLevel;
                } else if (tName.includes('レベルUP') || tName.includes('レベル+') || tName.includes('キャラLV+')) {
                    charLevelBonus += tLevel;
                } else if (tName.includes('経験値') || tName.includes('EXP') || tName.includes('獲得EXP')) {
                    expBonusMod += tLevel * 10;
                } else if (tName.includes('赤属性') || tName.includes('情熱')) {
                    elemMods.red += tLevel * 5;
                } else if (tName.includes('青属性') || tName.includes('統制')) {
                    elemMods.blue += tLevel * 5;
                } else if (tName.includes('緑属性') || tName.includes('調和')) {
                    elemMods.green += tLevel * 5;
                } else if (tName.includes('黄属性') || tName.includes('犠牲')) {
                    elemMods.yellow += tLevel * 5;
                } else if (tName.includes('紫属性') || tName.includes('混沌')) {
                    elemMods.purple += tLevel * 5;
                }
            });

            // 2. 宝石(Gem)の固有テキスト効果(gem_effects.json)のパース
            if (equip.type === 'gem' || char.equipGem === equip) {
                const gemName = equip.name;
                const gemRank = (equip.rank || 1).toString();
                if (gemName && gemEffectsJson && gemEffectsJson[gemName]) {
                    const effectText = gemEffectsJson[gemName].effects ? gemEffectsJson[gemName].effects[gemRank] : null;
                    if (effectText && effectText !== 'なし') {
                        // 固有効果テキストのカンマ分割パース
                        const parts = effectText.split(/[､,]/);
                        parts.forEach(part => {
                            const p = part.trim();
                            // WLV遠近+X
                            let m = p.match(/WLV遠近([+-]\d+)/);
                            if (m) {
                                const val = parseInt(m[1], 10);
                                meleeLevelBonus += val;
                                rangedLevelBonus += val;
                                return;
                            }
                            // WLV近+X / WLV近-X
                            m = p.match(/WLV近([+-]\d+)/);
                            if (m) {
                                meleeLevelBonus += parseInt(m[1], 10);
                                return;
                            }
                            // WLV遠+X / WLV遠-X
                            m = p.match(/WLV遠([+-]\d+)/);
                            if (m) {
                                rangedLevelBonus += parseInt(m[1], 10);
                                return;
                            }
                            // 取得経験値X％増
                            m = p.match(/取得経験値(\d+)％増/);
                            if (m) {
                                expBonusMod += parseInt(m[1], 10);
                                return;
                            }
                        });
                    }
                }
            }

            // 3. 宝石単体に直接近接/遠隔/EXPプロパティが設定されている場合のフォロー
            if (equip.meleeBonus) meleeLevelBonus += Number(equip.meleeBonus);
            if (equip.rangedBonus) rangedLevelBonus += Number(equip.rangedBonus);
            if (equip.expBonus) expBonusMod += Number(equip.expBonus);
            if (equip.meleeLevel) meleeLevelBonus += Number(equip.meleeLevel);
            if (equip.rangedLevel) rangedLevelBonus += Number(equip.rangedLevel);
            if (equip.levelBonus) charLevelBonus += Number(equip.levelBonus);
        });



        
        // --- タロット効果のパッシブ適用 (No.1〜10) ---
        let tarotAtkMod = 0;
        let tarotReloadMod = 0;
        
        // 前後衛の判定（isFrontが渡されていない場合はsavedFormationから推測）
        const actualIsFront = isFront !== null ? isFront : 
            (this.savedFormation && this.savedFormation[charId] ? this.savedFormation[charId].isFront : false);

        if (this.activeTarots && this.activeTarots.length > 0) {
            for (const tarot of this.activeTarots) {
                switch(tarot.id) {
                    case 2:
                        if (tarot.isUpright) {
                            tarotReloadMod += 0.10; // 全員リロード10%短縮
                        }
                        break;
                    case 3:
                        if (tarot.isUpright) {
                            hitRateMod += 0.20; // 命中率20%アップ
                        } else {
                            hitRateMod += 0.10; // 命中率10%アップ
                            tarotAtkMod += 0.10; // 攻撃力10%アップ
                        }
                        break;
                    case 4:
                        if (tarot.isUpright) {
                            tarotAtkMod += 0.20; // 全員攻撃力20%アップ
                        } else {
                            // 前衛20%UP, 後衛10%DOWN
                            tarotAtkMod += actualIsFront ? 0.20 : -0.10;
                        }
                        break;
                    case 6:
                        if (!tarot.isUpright) {
                            if (!actualIsFront) tarotAtkMod += 0.50; // 後衛の攻撃力50%UP
                        }
                        break;
                    case 7:
                        if (tarot.isUpright) {
                            if (affectionTotal > 0) tarotAtkMod += 0.50; // 親愛度プラスで50%UP
                        } else {
                            if (affectionTotal <= 0) tarotAtkMod += 1.00; // 親愛度0以下で100%UP
                        }
                        break;
                    case 8:
                        if (tarot.isUpright) {
                            if (actualIsFront) tarotReloadMod += 0.20; // 前衛ならリロード20%短縮
                        } else {
                            tarotAtkMod += 0.20; // 攻撃20%UP
                            tarotReloadMod -= 0.10; // リロード時間10%UP(遅くなる)
                        }
                        break;
                    case 10:
                        if (tarot.isUpright) {
                            hitRateMod += 0.10; // 命中率10%UP
                        } else {
                            if (!actualIsFront) hitRateMod += 0.20; // 後衛の命中率20%UP
                        }
                        break;
                    case 12:
                        if (tarot.isUpright) {
                            tarotAtkMod += 0.10;
                            hitRateMod += 0.10;
                        }
                        break;
                    case 13:
                        if (tarot.isUpright) {
                            if (this.tarot13_targetAtk === charId) {
                                tarotAtkMod += 0.20;
                            }
                        }
                        break;
                    case 14:
                        if (tarot.isUpright) {
                            critRateMod += 0.05; // クリティカル率5%UP
                        } else {
                            hpMod += 0.50; // 生命力上限50%UP
                        }
                        break;
                    case 15:
                        if (tarot.isUpright) {
                            hitRateMod += 0.10;
                        } else {
                            tarotReloadMod += 0.20; // 短縮
                            hitRateMod -= 0.10;
                        }
                        break;
                    case 16:
                        if (!tarot.isUpright) {
                            spMod += 0.30; // 精神力上限30%UP
                        }
                        break;
                    case 21:
                        if (tarot.isUpright) {
                            if (affectionTotal > 0) tarotAtkMod += 0.50;
                        } else {
                            if (affectionTotal <= 0) tarotAtkMod += 1.00;
                        }
                        break;
                }
            }
        }

        // 攻撃レベル上昇回数による基本攻撃力ボーナス
        const effectiveMeleeLevel = char.meleeLevel + meleeLevelBonus;
        const effectiveRangedLevel = char.rangedLevel + rangedLevelBonus;
        const totalAttackLevelUps = (effectiveMeleeLevel - 1) + (effectiveRangedLevel - 1);
        atkMod += totalAttackLevelUps * 0.10;
        const reloadLevelBonus = totalAttackLevelUps * 3;

        // Apply modifiers (including affection and tarot bonus)
        hpMod += affectionBonus;
        spMod += affectionBonus;
        atkMod += affectionBonus + tarotAtkMod;
        reloadMod += tarotReloadMod;

        maxHp = Math.floor(maxHp * (1 + hpMod));
        maxSp = Math.floor(maxSp * (1 + spMod));
        atk = Math.floor(atk * (1 + atkMod));
        reload = Math.floor(reload * (1 + reloadMod)) + reloadLevelBonus;
        
        if (this.tarot13_targetHp === charId) {
            maxHp = Math.floor(maxHp * 0.75);
        }

        const totalExpBonus = expBonusMod + (this.expMultiplier > 1.0 ? Math.floor((this.expMultiplier - 1.0) * 100) : 0);

        return {
            affection: affectionTotal,
            maxHp,
            maxSp,
            atk,
            reload,
            hitRateBonus: hitRateMod,
            evadeRateBonus: evadeRateMod,
            critRateBonus: critRateMod,
            critMultBonus: critMultMod,
            elemMods,
            meleeLevel: effectiveMeleeLevel,
            rangedLevel: effectiveRangedLevel,
            charLevelBonus,
            expBonus: totalExpBonus
        };
    }


    // タロットカード取得時の即時効果適用

    applyImmediateTarotEffect(tarotId, isUpright) {
        const party = Object.keys(this.savedFormation).length > 0 ? Object.keys(this.savedFormation) : ['001'];
        
        switch(tarotId) {
            case 11:
                if (isUpright) {
                    // 平均レベルの算出
                    let totalLevel = 0;
                    for (const cid of party) {
                        const char = this.characters[cid];
                        if (char) totalLevel += char.level;
                    }
                    const avgLevel = Math.floor(totalLevel / party.length) || 1;
                    const reqExp = this.getRequiredExp(avgLevel);
                    this.stockExp += reqExp;
                    console.log(`[Tarot 11] Added ${reqExp} stock EXP`);
                } else {
                    this.extraWaves += 1;
                }
                break;
            case 13:
                if (isUpright) {
                    // パーティからランダムに2人選ぶ（1人の場合は同じ人が対象）
                    const target1 = party[Math.floor(Math.random() * party.length)];
                    const target2 = party.length > 1 ? party.filter(id => id !== target1)[Math.floor(Math.random() * (party.length - 1))] : target1;
                    this.tarot13_targetHp = target1;
                    this.tarot13_targetAtk = target2;
                } else {
                    this.extraEnemyLevel -= 1;
                    this.extraWaves += 1;
                }
                break;
            case 14:
                if (!isUpright) {
                    // 生命力上限が50%上がるので、現在生命力も50%回復させる
                    for (const cid of party) {
                        const char = this.characters[cid];
                        if (char) {
                            const stats = this.calcBaseStats(cid);
                            const healAmount = Math.floor(stats.maxHp * 0.5);
                            char.currentHp += healAmount;
                        }
                    }
                }
                break;
            case 16:
                if (!isUpright) {
                    for (const cid of party) {
                        const char = this.characters[cid];
                        if (char) {
                            const stats = this.calcBaseStats(cid);
                            const healAmount = Math.floor(stats.maxSp * 0.3);
                            char.currentSp += healAmount;
                        }
                    }
                }
                break;
            case 17:
                if (isUpright) {
                    if (party.length >= 2) {
                        const nonMain = party.filter(id => id !== '001');
                        if (nonMain.length > 0) {
                            const targetId = nonMain[Math.floor(Math.random() * nonMain.length)];
                            const targetChar = this.characters[targetId];
                            if (targetChar) {
                                // 装備品をインベントリに戻す
                                if (targetChar.equipGem) {
                                    this.inventory.gems.push(targetChar.equipGem);
                                    targetChar.equipGem = null;
                                }
                                for (let i = 0; i < targetChar.equipRelics.length; i++) {
                                    if (targetChar.equipRelics[i]) {
                                        this.inventory.relics.push(targetChar.equipRelics[i]);
                                        targetChar.equipRelics[i] = null;
                                    }
                                }
                            }
                            // パーティから除外（EXPをストックに回収）
                            if (targetChar && targetChar.exp) {
                                this.stockExp += targetChar.exp;
                                targetChar.exp = 0;
                            }
                            delete this.savedFormation[targetId];
                            console.log(`[Tarot 17] Removed ${targetId} from party and unequipped items`);
                        }
                    }
                } else {
                    this.extraEnemyLevel += 1;
                    this.extraWaves += 1;
                }
                break;
            case 18:
                if (isUpright) {
                    for (const cid of party) {
                        const char = this.characters[cid];
                        if (char) {
                            if (Math.random() < 0.5) {
                                char.meleeLevel += 1;
                            } else {
                                char.rangedLevel += 1;
                            }
                        }
                    }
                } else {
                    const targetId = party[Math.floor(Math.random() * party.length)];
                    const char = this.characters[targetId];
                    if (char) {
                        char.meleeLevel += 1;
                        char.rangedLevel += 1;
                    }
                }
                break;
            case 19:
                if (isUpright) {
                    this.spMultiplier = 1.5;
                } else {
                    // 最も精神力を失っているメンバーの精神力を最大まで回復できる分のSPを得る
                    let maxMissingSp = 0;
                    for (const cid of party) {
                        const char = this.characters[cid];
                        if (char) {
                            const stats = this.calcStats(cid, party);
                            const missing = stats.maxSp - char.currentSp;
                            if (missing > maxMissingSp) {
                                maxMissingSp = missing;
                            }
                        }
                    }
                    if (maxMissingSp > 0) {
                        this.stockSp += maxMissingSp;
                        console.log(`[Tarot 19] Gained ${maxMissingSp} SP`);
                    }
                }
                break;
            case 20:
                if (isUpright) {
                    this.expMultiplier = 2.0;
                } else {
                    this.extraEnemyLevel += 2;
                }
                break;
            case 22:
                if (isUpright) {
                    this.enemySpeedHalf = true;
                } else {
                    this.extraWitchLevel += 2;
                }
                break;
        }
    }

    // レベルを上げる処理
    levelUp(charId) {
        const char = this.characters[charId];
        if (!char) return false;

        const reqExp = this.getRequiredExp(char.level);
        const totalAvailable = char.exp + this.stockExp;

        if (totalAvailable >= reqExp) {
            // 必要な経験値をキャラのEXPとストックから差し引く
            let remainingCost = reqExp - char.exp;
            
            if (char.exp >= reqExp) {
                // キャラの所持EXPだけで足りる場合
                char.exp -= reqExp;
            } else {
                // ストックEXPも消費する場合
                char.exp = 0;
                this.stockExp -= remainingCost;
            }

            // レベルアップ前の最大HP
            const oldStats = this.calcStats(charId);

            char.level += 1;

            // レベルアップ後の最大HP
            const newStats = this.calcStats(charId);

            // レベルアップで友好度ボーナスポイントを1獲得
            char.friendshipPoints = (char.friendshipPoints || 0) + 1;

            // 上昇分を現在HPにも加算
            char.currentHp += (newStats.maxHp - oldStats.maxHp);
            char.currentSp += (newStats.maxSp - oldStats.maxSp);
            
            this.save();
            return true;
        }
        
        return false;
    }

    // キャラクターの配置を受け取って攻撃レベル上昇ガチャを回す
    // 巻き戻し用のスナップショット作成・復元
    createSnapshot() {
        return {
            stockExp: this.stockExp,
            food: this.food,
            stockSp: this.stockSp,
            inventory: JSON.parse(JSON.stringify(this.inventory)),
            savedFormation: JSON.parse(JSON.stringify(this.savedFormation)),
            activeTarots: JSON.parse(JSON.stringify(this.activeTarots)),
            extraEnemyLevel: this.extraEnemyLevel,
            extraWitchLevel: this.extraWitchLevel,
            extraWaves: this.extraWaves,
            enemySpeedHalf: this.enemySpeedHalf,
            expMultiplier: this.expMultiplier,
            spMultiplier: this.spMultiplier,
            tarot13_targetHp: this.tarot13_targetHp,
            tarot13_targetAtk: this.tarot13_targetAtk,
            event1207Played: this.event1207Played,
            event1214Played: this.event1214Played,
            event1221Played: this.event1221Played,

            characters: JSON.parse(JSON.stringify(this.characters))
        };
    }

    restoreSnapshot(data) {
        if (!data) return;
        Object.assign(this, JSON.parse(JSON.stringify(data)));
    }

    rollAttackLevelGacha(charId, isFront) {
        const char = this.characters[charId];
        if (!char) return { type: null, denominator: 1 };
        
        // 両方ともレベル7の場合はガチャを回さない
        if (char.meleeLevel >= 7 && char.rangedLevel >= 7) {
            return { type: null, denominator: 1 };
        }

        const totalLevelUps = (char.meleeLevel - 1) + (char.rangedLevel - 1);
        const baseDenominator = 100 + (totalLevelUps * 100);
        // ハズレ回数分だけ分母を減らす（最低分母は1とする）
        const currentDenominator = Math.max(1, baseDenominator - char.gachaFails);

        const roll = Math.random();
        const probability = 1.0 / currentDenominator;

        if (roll <= probability) {
            // 当選
            char.gachaFails = 0;
            let leveledUpType = null;

            if (isFront) {
                if (char.meleeLevel < 7) {
                    char.meleeLevel++;
                    leveledUpType = 'melee';
                } else if (char.rangedLevel < 7) {
                    char.rangedLevel++;
                    leveledUpType = 'ranged';
                }
            } else {
                if (char.rangedLevel < 7) {
                    char.rangedLevel++;
                    leveledUpType = 'ranged';
                } else if (char.meleeLevel < 7) {
                    char.meleeLevel++;
                    leveledUpType = 'melee';
                }
            }

            console.log(`[Gacha] ${char.name} ${leveledUpType} Level Up! (Now: Melee ${char.meleeLevel}, Ranged ${char.rangedLevel})`);
            return { type: leveledUpType, denominator: currentDenominator };
        } else {
            // ハズレ
            char.gachaFails++;
            return { type: null, denominator: currentDenominator };
        }
    }

    save() {
        try {
            SaveManager.saveGame();
        } catch (e) {
            console.error('[GlobalState] Save error:', e);
        }
    }

    /** 周回（ループ）用リセット処理 */
    resetForNewLoop() {
        // 全キャラクターのステータス・装備リセット（友好度は維持）
        for (const id in this.characters) {
            const char = this.characters[id];
            if (!char) continue;

            // 装備を外し、インベントリへ送る
            if (char.equipGem) {
                if (!this.inventory.gems) this.inventory.gems = [];
                this.inventory.gems.push(char.equipGem);
                char.equipGem = null;
            }
            if (char.equipRelics && Array.isArray(char.equipRelics)) {
                if (!this.inventory.relics) this.inventory.relics = [];
                for (let i = 0; i < char.equipRelics.length; i++) {
                    if (char.equipRelics[i]) {
                        this.inventory.relics.push(char.equipRelics[i]);
                        char.equipRelics[i] = null;
                    }
                }
            }

            // レベルアップに消費した必要経験値と現在の経験値をストック経験値に回収
            let expToReturn = char.exp || 0;
            for (let lvl = 1; lvl < (char.level || 1); lvl++) {
                expToReturn += this.getRequiredExp(lvl);
            }
            this.stockExp += expToReturn;

            // レベル・能力値・攻撃レベルを初期値に戻す
            const initial = this.createInitialCharData(id, char.name, 1);
            char.level = 1;
            char.exp = 0;
            char.meleeLevel = 1;
            char.rangedLevel = 1;
            char.gachaFails = 0;
            char.baseHp = initial.baseHp;
            char.baseSp = initial.baseSp;
            char.baseAtk = initial.baseAtk;
            char.baseReload = initial.baseReload;
            char.currentHp = initial.baseHp;
            char.currentSp = initial.baseSp;
            // 友好度（friendships, friendshipPoints, metCharacters, affection）は保持
        }

        // 編成のリセット（紫苑のみを残してみんな離脱）
        this.savedFormation = {
            '001': { lane: 0, isFront: true }
        };

        // イベントフラグのリセット
        this.event1207Played = false;
        this.event1214Played = false;
        this.event1221Played = false;
        this.event1221WildhuntPlayed = false;


        // タロット関係のリセット
        this.activeTarots = [];
        this.tarot13_targetHp = null;
        this.tarot13_targetAtk = null;

        // マップ・難易度補正のリセット
        this.extraEnemyLevel = 0;
        this.extraWitchLevel = 0;
        this.extraWaves = 0;
        this.enemySpeedHalf = false;
        this.expMultiplier = 1.0;
        this.spMultiplier = 1.0;
        this.debugEnemySizeMultiplier = 1.0;
        this.debugEnemyHpMultiplier = 1.0;
        this.debugEnemyMoveMultiplier = 1.0;
        this.debugEnemyRangeMultiplier = 1.0;
        this.debugEnemyHpGrowthRate = 1.0;

        // リソースのリセット
        this.food = 100;
    }

}


