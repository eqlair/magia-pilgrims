// src/scene/MiniGameScene.js
import Phaser3 from "phaser";

// src/core/romdata.js
var ROM = { "floors": [{ "seed": 449, "level": 0, "entries": [[16, 18, 2, 0], [22, 12, 4, 0], [1, 2, 11, 3], [2, 28, 11, 7], [23, 22, 11, 1]], "name": "CITY OF GHOST" }, { "seed": 26796, "level": 1, "entries": [[4, 25, 11, 0], [27, 28, 13, 2], [29, 20, 5, 0], [1, 1, 7, 0]], "name": "FLOOR OF UMQI" }, { "seed": 12880, "level": 2, "entries": [[1, 24, 11, 1]], "name": "FLOOR OF PANC" }, { "seed": 61216, "level": 1, "entries": [[25, 28, 11, 0], [4, 11, 13, 4], [29, 28, 5, 1]], "name": "FLOOR OF MAYP" }, { "seed": 12838, "level": 2, "entries": [[29, 4, 11, 3], [4, 6, 13, 5], [18, 22, 13, 6]], "name": "FLOOR OF MGNC" }, { "seed": 22427, "level": 3, "entries": [[7, 4, 11, 4]], "name": "FLOOR OF TLPH" }, { "seed": 18059, "level": 3, "entries": [[2, 6, 11, 4], [18, 14, 7, 1]], "name": "FLOOR OF SLOG" }, { "seed": 18060, "level": 1, "entries": [[29, 26, 11, 0], [6, 6, 13, 8]], "name": "FLOOR OF SMOG" }, { "seed": 17188, "level": 2, "entries": [[27, 4, 11, 7], [1, 2, 11, 15], [16, 12, 13, 9], [29, 10, 5, 2]], "name": "FLOOR OF MEOD" }, { "seed": 47779, "level": 3, "entries": [[1, 16, 11, 8], [28, 16, 13, 10], [5, 2, 13, 11]], "name": "FLOOR OF UDVK" }, { "seed": 52144, "level": 4, "entries": [[26, 2, 11, 9]], "name": "FLOOR OF VAWL" }, { "seed": 39038, "level": 4, "entries": [[2, 4, 11, 9], [11, 4, 13, 12]], "name": "FLOOR OF ROTI" }, { "seed": 43995, "level": 5, "entries": [[16, 14, 11, 11], [4, 4, 11, 13], [29, 24, 13, 14]], "name": "FLOOR OF XLUL" }, { "seed": 17784, "level": 4, "entries": [[28, 4, 13, 12], [25, 2, 5, 3]], "name": "FLOOR OF RIOF" }, { "seed": 22146, "level": 6, "entries": [[1, 2, 11, 12], [3, 12, 5, 4]], "name": "FLOOR OF SCPG" }, { "seed": 26225, "level": 1, "entries": [[28, 2, 13, 8], [17, 26, 13, 16]], "name": "FLOOR OF RBQG" }, { "seed": 52720, "level": 2, "entries": [[22, 28, 11, 15], [9, 10, 13, 17], [1, 20, 13, 18]], "name": "FLOOR OF ZAWN" }, { "seed": 25946, "level": 3, "entries": [[3, 3, 11, 16]], "name": "FLOOR OF PKQF" }, { "seed": 4352, "level": 3, "entries": [[4, 15, 11, 16], [19, 25, 13, 19], [26, 16, 7, 2]], "name": "FLOOR OF KALB" }, { "seed": 61743, "level": 4, "entries": [[4, 10, 11, 18], [21, 16, 13, 20]], "name": "FLOOR OF MPZB" }, { "seed": 56797, "level": 5, "entries": [[3, 28, 11, 19], [27, 12, 13, 21]], "name": "FLOOR OF XNXN" }, { "seed": 752, "level": 6, "entries": [[18, 12, 11, 20], [1, 22, 11, 22], [1, 4, 13, 31], [18, 18, 7, 3]], "name": "FLOOR OF ZAKC" }, { "seed": 13398, "level": 5, "entries": [[1, 2, 11, 23], [13, 15, 13, 21], [4, 5, 6, 5]], "name": "FLOOR OF PGNE" }, { "seed": 30303, "level": 4, "entries": [[26, 4, 13, 24], [24, 20, 13, 22], [10, 14, 13, 25]], "name": "FLOOR OF PPRG" }, { "seed": 30310, "level": 7, "entries": [[8, 4, 11, 23]], "name": "FLOOR OF QGRG" }, { "seed": 21585, "level": 5, "entries": [[27, 26, 11, 23], [11, 2, 13, 26], [13, 12, 7, 4]], "name": "FLOOR OF PBPE" }, { "seed": 4959, "level": 6, "entries": [[3, 14, 11, 25], [19, 28, 13, 27]], "name": "FLOOR OF PPLD" }, { "seed": 13411, "level": 7, "entries": [[2, 2, 11, 26], [21, 28, 13, 28]], "name": "FLOOR OF QDNE" }, { "seed": 39037, "level": 8, "entries": [[14, 5, 11, 27], [25, 20, 11, 31], [1, 2, 13, 29], [8, 27, 7, 5], [1, 22, 5, 6]], "name": "FLOOR OF RNTI" }, { "seed": 0, "level": 9, "entries": [[2, 2, 11, 28], [28, 28, 13, 30]], "name": "FLOOR OF KAKA" }, { "seed": 4952, "level": 10, "entries": [[1, 28, 11, 29], [20, 6, 0, 0], [19, 2, 15, 0]], "name": "FLOOR OF PILD" }, { "seed": 21577, "level": 7, "entries": [[20, 26, 11, 21], [23, 24, 13, 28], [22, 25, 6, 6]], "name": "FLOOR OF OJPE" }], "monsters": [{ "size": 4, "color": 15, "ac": 0, "lvl": 1, "flag": 0 }, { "size": 4, "color": 5, "ac": 1, "lvl": 1, "flag": 0 }, { "size": 4, "color": 8, "ac": 0, "lvl": 1, "flag": 255 }, { "size": 4, "color": 12, "ac": 1, "lvl": 2, "flag": 0 }, { "size": 4, "color": 14, "ac": 2, "lvl": 3, "flag": 2 }, { "size": 4, "color": 5, "ac": 1, "lvl": 2, "flag": 1 }, { "size": 4, "color": 10, "ac": 2, "lvl": 2, "flag": 1 }, { "size": 4, "color": 12, "ac": 1, "lvl": 2, "flag": 255 }, { "size": 4, "color": 8, "ac": 2, "lvl": 6, "flag": 1 }, { "size": 4, "color": 15, "ac": 10, "lvl": 2, "flag": 1 }, { "size": 9, "color": 14, "ac": 3, "lvl": 4, "flag": 2 }, { "size": 4, "color": 8, "ac": 4, "lvl": 5, "flag": 3 }, { "size": 4, "color": 5, "ac": 10, "lvl": 4, "flag": 1 }, { "size": 9, "color": 15, "ac": 6, "lvl": 7, "flag": 3 }, { "size": 4, "color": 5, "ac": 10, "lvl": 4, "flag": 255 }, { "size": 9, "color": 12, "ac": 6, "lvl": 8, "flag": 255 }, { "size": 9, "color": 5, "ac": 8, "lvl": 8, "flag": 3 }, { "size": 9, "color": 14, "ac": 10, "lvl": 8, "flag": 3 }, { "size": 9, "color": 8, "ac": 10, "lvl": 10, "flag": 3 }, { "size": 9, "color": 10, "ac": 9, "lvl": 11, "flag": 255 }, { "size": 9, "color": 5, "ac": 12, "lvl": 12, "flag": 3 }, { "size": 9, "color": 13, "ac": 13, "lvl": 11, "flag": 3 }, { "size": 9, "color": 12, "ac": 13, "lvl": 13, "flag": 3 }, { "size": 9, "color": 8, "ac": 12, "lvl": 14, "flag": 3 }, { "size": 12, "color": 10, "ac": 14, "lvl": 14, "flag": 3 }, { "size": 9, "color": 12, "ac": 14, "lvl": 16, "flag": 3 }, { "size": 16, "color": 8, "ac": 15, "lvl": 15, "flag": 3 }, { "size": 12, "color": 5, "ac": 16, "lvl": 16, "flag": 3 }, { "size": 16, "color": 12, "ac": 17, "lvl": 17, "flag": 3 }, { "size": 16, "color": 13, "ac": 18, "lvl": 18, "flag": 3 }, { "size": 16, "color": 14, "ac": 18, "lvl": 19, "flag": 3 }, { "size": 16, "color": 10, "ac": 18, "lvl": 20, "flag": 3 }], "acde": [47, 63, 59, 75, 78, 94, 90, 106, 110, 126, 120, 136, 136, 152, 152, 168, 50, 82, 31, 63, 62, 94, 92, 124, 124, 156, 30, 46, 60, 76, 92, 108, 15, 15, 15, 15, 5, 15, 15, 47, 79, 101, 133, 165, 207, 15, 15, 15, 15, 15, 15], "chestW": [[255, 0], [64, 2], [128, 1], [32, 3], [64, 2], [16, 4], [32, 3], [8, 5], [16, 4], [4, 6], [8, 5], [2, 7], [4, 6], [1, 8], [2, 7], [1, 9], [32, 2], [8, 4], [255, 0], [32, 2], [64, 2], [8, 3], [16, 4], [2, 5], [4, 6], [1, 7], [255, 1], [32, 3], [64, 3], [8, 5], [16, 4], [2, 6], [8, 2], [4, 3], [2, 4], [1, 5], [1, 6], [0, 0], [64, 1], [64, 3], [64, 6], [32, 2], [32, 4], [32, 6], [1, 4]], "shop": [[1, 10], [3, 50], [5, 100], [7, 500], [9, 1e3], [11, 3e3], [13, 6e3], [17, 30], [19, 5], [21, 50], [23, 500], [25, 5e3], [27, 10], [29, 100], [31, 1e3], [39, 10], [42, 20]], "warp": [[1, 1, 1], [6, 18, 14], [18, 26, 16], [21, 18, 18], [25, 13, 12], [28, 8, 27]], "reward": [[30, 19, 2], [3, 23, 2], [10, 5, 10], [20, 7, 2], [31, 2, 2], [26, 1, 20], [30, 17, 16], [0, 5, 28], [2, 20, 2], [5, 14, 6], [17, 26, 28], [13, 16, 18], [14, 22, 2], [24, 13, 24]], "metaTown": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 5, 11, 12, 6, 7, 13, 14, 8, 9, 1, 2, 10, 9, 3, 4, 10, 5, 11, 12, 6, 7, 13, 14, 8, 9, 0, 0, 10, 9, 0, 0, 10, 5, 15, 16, 6, 7, 17, 18, 8, 9, 1, 2, 10, 9, 3, 4, 10, 5, 15, 16, 6, 7, 17, 18, 8, 9, 0, 0, 10, 9, 0, 0, 10, 19, 0, 0, 19, 20, 9, 10, 20, 20, 1, 2, 20, 20, 3, 4, 20, 19, 0, 0, 19, 20, 9, 10, 20, 20, 0, 0, 20, 20, 0, 0, 20, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 2, 9, 9, 3, 4, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 0, 0, 9, 9, 0, 0, 9, 9, 9, 9, 9, 9, 29, 30, 9, 9, 31, 32, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 2, 9, 9, 3, 4, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 25, 26, 9, 9, 27, 28, 9], "metaDun": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 2, 3, 4, 3, 4, 1, 2, 1, 2, 3, 4, 3, 4, 7, 0, 0, 7, 8, 9, 10, 8, 7, 11, 12, 7, 8, 0, 0, 8, 5, 6, 5, 6, 0, 9, 10, 0, 0, 11, 12, 0, 5, 6, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 7, 8, 13, 14, 8, 7, 15, 16, 7, 8, 0, 0, 8, 5, 6, 5, 6, 0, 13, 14, 0, 0, 15, 16, 0, 5, 6, 5, 6, 0, 0, 0, 0, 0, 35, 36, 0, 0, 37, 38, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 0, 0, 19, 20, 0, 0, 0, 0, 0, 7, 0, 0, 7, 8, 0, 0, 8, 7, 0, 0, 7, 8, 0, 0, 8, 5, 6, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 5, 6, 1, 2, 1, 2, 3, 4, 3, 4, 7, 31, 32, 7, 8, 33, 34, 8, 1, 2, 1, 2, 3, 4, 3, 4, 7, 21, 22, 7, 8, 23, 24, 8, 1, 2, 1, 2, 3, 4, 3, 4, 7, 31, 32, 7, 8, 33, 34, 8, 1, 2, 1, 2, 3, 4, 3, 4, 7, 25, 26, 7, 8, 27, 28, 8, 1, 2, 1, 2, 3, 4, 3, 4, 7, 31, 32, 7, 8, 33, 34, 8, 1, 2, 1, 2, 3, 4, 3, 4, 7, 0, 0, 7, 8, 0, 0, 8], "titles": [["WARRIOR", "SWORDMASTER", "HERO", "SWASHBUCKLER", "MYRMIDON", "CHAMPION", "SUPERHERO", "PALADIN", "LORD"], ["ACOLYTE", "ADEPT", "PRIEST", "VICAR", "CURATE", "ELDER", "CANON", "BISHOP", "LAMA"], ["ROGUE", "FOOTPAT", "CUTPURSE", "ROBBER", "BURGLAR", "FLICHER", "SHARPER", "MAGSMAN", "MASTER THIEF"], ["MEDIUM", "EVOKER", "SEER", "CONJURER", "ENCHANTER", "WARLOCK", "SORCERER", "NECROMANCER", "WIZARD"]], "keyColors": [32, 80, 112, 128, 160, 208, 240] };

// src/core/mapgen.js
var MAP_W = 32;
var MAP_H = 31;
var CRand = class {
  constructor(seed = 0) {
    this.s = seed >>> 0;
  }
  srand(seed) {
    this.s = seed & 65535;
  }
  rand() {
    this.s = Math.imul(this.s, 1103515245) + 12345 >>> 0;
    return this.s >>> 16 & 32767;
  }
};
function generateFloor(f, randomSeed = 0) {
  const fl = ROM.floors[f];
  const level = fl.level;
  const rng = new CRand();
  rng.srand(f === 29 ? randomSeed & 65535 : fl.seed);
  const GUARD = 64;
  const mem = new Uint8Array(GUARD + MAP_W * MAP_H + 64);
  const at = (r, c) => GUARD + r * 32 + c;
  for (let i = 0; i < 992; i++) mem[GUARD + i] = 1;
  for (let r = 0; r < 31; r++) mem[at(r, 31)] = 0;
  mem[at(1, 1)] = 0;
  let cur = at(1, 1);
  let packed = 0;
  const stack = [];
  const DIRS = [[-32, 255, 0], [1, 0, 1], [32, 1, 0], [-1, 0, 255]];
  for (let iter = 0; iter < 224; iter++) {
    for (; ; ) {
      let c = 0;
      if (mem[cur - 2] === 1) c++;
      if (mem[cur + 2] === 1) c++;
      if (mem[cur - 64] === 1) c++;
      if (mem[cur + 64] === 1) c++;
      if (c === 0) {
        const a = stack.length ? stack.pop() : 0;
        packed = a;
        cur = at(1, 1) + (a & 15) * 64 + (a >> 4) * 2;
        continue;
      }
      if (c >= 2) stack.push(packed);
      break;
    }
    for (; ; ) {
      const d = rng.rand() % 4;
      const [de, dr, dc] = DIRS[d];
      if (mem[cur + 2 * de] !== 1) continue;
      mem[cur + de] = 0;
      mem[cur + 2 * de] = 0;
      cur += 2 * de;
      const lo = (packed & 15) + dr & 255;
      const hi = (packed >> 4) + dc << 4 & 255;
      packed = (hi | lo) & 255;
      break;
    }
  }
  for (let t = 0; t < 20; t++) {
    if ((rng.rand() & 3) !== 0) continue;
    const x0 = rng.rand() % 14, y0 = rng.rand() % 14;
    const w = rng.rand() % Math.min(14 - x0, 3) + 2;
    const h = rng.rand() % Math.min(14 - y0, 3) + 2;
    let p = GUARD + y0 * 64 + x0 * 2;
    for (let i = 0; i < w; i++) {
      p++;
      if (mem[p] === 0) mem[p] = 2;
      p++;
    }
    for (let i = 0; i < h; i++) {
      p += 32;
      if (mem[p] === 0) mem[p] = 3;
      p += 32;
    }
    for (let i = 0; i < w; i++) {
      p--;
      if (mem[p] === 0) mem[p] = 2;
      p--;
    }
    for (let i = 0; i < h; i++) {
      p -= 32;
      if (mem[p] === 0) mem[p] = 3;
      p -= 32;
    }
    p += 1 + 32;
    for (let r = 0; r < 2 * h - 1; r++) for (let c2 = 0; c2 < 2 * w - 1; c2++) mem[p + r * 32 + c2] = 4;
  }
  if (f === 29) {
    mem[at(3, 2)] = 0;
    mem[at(29, 28)] = 0;
  }
  if (f === 0) {
    for (let i = 0; i < 1024; i++) {
      const v = mem[GUARD + i];
      if (v === 2 || v === 3 || v === 4) mem[GUARD + i] = 0;
    }
    for (let r = 1; r <= 29; r++) for (let c = 1; c <= 29; c++) {
      const p = at(r, c);
      if (mem[p] !== 1) continue;
      let bc;
      const below = mem[p + 32];
      if (below === 1) bc = 2;
      else if (below === 0) bc = mem[p - 32] === 0 ? 4 : 3;
      else continue;
      const k = rng.rand() % bc;
      if (k === 0) continue;
      mem[p] = k === 1 ? 10 : k === 2 ? 8 : 6;
    }
  } else {
    for (let r = 1; r <= 29; r++) for (let c = 1; c <= 29; c++) {
      const p = at(r, c);
      if (mem[p] === 4) {
        mem[p] = 0;
        continue;
      }
      if (mem[p] !== 1 || mem[p + 32] !== 0) continue;
      const l = rng.rand() & 255;
      const b = Math.max(0, 6 - level) + 1;
      if (l % b >> 1 === 0) mem[p] = 15;
    }
  }
  for (const [x, y, type] of fl.entries) mem[at(y, x)] = type;
  return { map: mem.slice(GUARD, GUARD + MAP_W * MAP_H), level, entries: fl.entries, name: fl.name };
}

// src/core/rules.js
var TICK_MS = 1e3 / 15;
var INV_SIZE = 12;
var FOOD_PRICE = 1;
var CLASS = { FIGHTER: 0, CLERIC: 1, THIEF: 2, MAGICIAN: 3 };
var CLASS_NAMES = ["FIGHTER", "PRIEST", "THIEF", "WIZARD"];
var CLASS_SPEED = [0.9, 1, 1.15, 1];
var CHASE_SPEED = 0.75;
var HP_DIE = [18, 14, 16, 12];
var EXP_BASE = [200, 250, 150, 250];
var HP_UP = [16, 13, 12, 11];
var startHP = (cls) => 8 + HP_DIE[cls];
var hpForLevel = (cls, lv) => startHP(cls) + (lv - 1) * HP_UP[cls];
var TITLES = ROM.titles;
var FastRNG = class {
  constructor(seed = 1234) {
    this.s = seed & 65535;
  }
  next() {
    this.s = Math.imul(this.s, 17357) + 4933 & 65535;
    const r = Math.random() * 256 | 0;
    const l = (r ^ this.s) & 255;
    const h = (l ^ this.s >> 8) & 255;
    return { a: h, l, h, hl: h << 8 | l };
  }
  byte() {
    return this.next().a;
  }
  word() {
    return this.next().hl;
  }
  /** sum of n rolls of 1..sides ($B634) */
  dice(n, sides) {
    let t = 0;
    for (let i = 0; i < n; i++) t += sides > 0 ? this.word() % sides + 1 : 1;
    return t;
  }
  chance(n) {
    return this.word() % n === 0;
  }
};
var PLUS2_FIRST = 60;
var PLUS2_BASE = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
var isPlus2 = (id) => id >= PLUS2_FIRST && id < PLUS2_FIRST + PLUS2_BASE.length;
var baseKind = (id) => id >= 1 && id <= 16 ? "weapon" : id <= 18 ? "bow" : id <= 26 ? "armor" : id <= 32 ? "shield" : id <= 38 ? "ring" : id <= 45 ? "potion" : id <= 51 ? "amulet" : id <= 58 ? "key" : "none";
var ITEM_KIND = (id) => isPlus2(id) ? baseKind(PLUS2_BASE[id - PLUS2_FIRST]) : baseKind(id);
var itemValue = (id) => {
  if (isPlus2(id)) {
    const b = PLUS2_BASE[id - PLUS2_FIRST];
    return itemValue(b) + itemValue(b) - itemValue(b - 1);
  }
  return id >= 1 && id <= 51 ? ROM.acde[id - 1] >> 4 : 0;
};
var canUse = (id, cls) => {
  if (isPlus2(id)) id = PLUS2_BASE[id - PLUS2_FIRST];
  return id >= 1 && id <= 51 && (ROM.acde[id - 1] & 8 >> cls) !== 0;
};
var plus2MinLv = (id) => ROM.chestW[PLUS2_BASE[id - PLUS2_FIRST] - 1][1] + 1;
var PLUS2_CHANCE = 1e4;
var RING_FLAG = { 33: 0, 34: 1, 35: 2, 36: 3, 37: 4, 38: 5 };
var DM_RING = 38;
var FOOD_ID = 59;
var SHOP = ROM.shop.map(([id, p]) => ({ id, price: p * 10 }));
var COLOR_EN = ["GREEN", "BLUE", "CYAN", "RED", "YELLOW", "PURPLE", "WHITE"];
var ITEM_NAMES = [
  null,
  "STAFF",
  "STAFF+1",
  "DAGGER",
  "DAGGER+1",
  "MACE",
  "MACE+1",
  "SWORD",
  "SWORD+1",
  "M-STAR",
  "M-STAR+1",
  "AXE",
  "AXE+1",
  "LONGSWORD",
  "LONGSWORD+1",
  "GREATSWORD",
  "GREATSWORD+1",
  // 1-16 weapons
  "BOW",
  "BOW+1",
  // 17-18
  "ROBE",
  "ROBE+1",
  "LEATHER",
  "LEATHER+1",
  "BREAST",
  "BREAST+1",
  "ARMOR",
  "ARMOR+1",
  // 19-26 armour
  "BUCKLER",
  "BUCKLER+1",
  "S-SHIELD",
  "S-SHIELD+1",
  "L-SHIELD",
  "L-SHIELD+1",
  // 27-32 shields
  "R-DEFENSE",
  "R-ACCURACY",
  "R-POWER",
  "R-HEALING",
  "R-MAGIC",
  "RING OF ELIS",
  // 33-38 rings
  "P-HEAL",
  "P-RECOVER",
  "P-LIFE",
  "P-MANA",
  "P-MAGIC",
  "P-WIZARD",
  "P-MAXLIFE"
  // 39-45 potions
];
function itemName(id) {
  const k = ITEM_KIND(id);
  if (k === "amulet") return `${COLOR_EN[id - 46]} AMULET`;
  if (k === "key") return `${COLOR_EN[id - 52]} KEY`;
  if (isPlus2(id)) return ITEM_NAMES[PLUS2_BASE[id - PLUS2_FIRST]].replace("+1", "+2");
  return ITEM_NAMES[id] || "";
}
function itemNameLines(id) {
  const n = itemName(id);
  if (n.length <= 10) return [n];
  const p = n.lastIndexOf("+") > 0 ? n.lastIndexOf("+") : n.lastIndexOf(" ");
  return p > 0 ? [n.slice(0, p).trim(), n.slice(p).trim()] : [n];
}
function itemInfo(id) {
  const k = ITEM_KIND(id), v = itemValue(id);
  const RING_TXT = ["\u307C\u3046\u304E\u3087 +3", "\u3053\u3046\u3052\u304D\u304C \u3042\u305F\u308A\u3084\u3059\u3044", "\u3053\u3046\u3052\u304D\u306E DICE x2", "HP\u304C \u3044\u3064\u3082 \u304B\u3044\u3075\u304F", "MP\u304C \u3044\u3064\u3082 \u304B\u3044\u3075\u304F", "\u3067\u3093\u305B\u3064\u306E \u3086\u3073\u308F"];
  const POT_TXT = ["HP\u304B\u3044\u3075\u304F 1D20", "HP\u304B\u3044\u3075\u304F 1D60", "HP\u304B\u3044\u3075\u304F 1D255", "MP\u304B\u3044\u3075\u304F 1D20", "MP\u304B\u3044\u3075\u304F 1D60", "MP\u304B\u3044\u3075\u304F 1D255", "\u3055\u3044\u3060\u3044HP +1D10"];
  if (k === "weapon" || k === "bow") return `POWER ${v}`;
  if (k === "armor" || k === "shield") return `\u307C\u3046\u304E\u3087 +${v}`;
  if (k === "ring") return RING_TXT[id - 33];
  if (k === "potion") return POT_TXT[id - 39];
  if (k === "amulet") {
    const [f] = ROM.warp[id - 46], fl = ROM.floors[f];
    return `B${fl.level}F ${fl.name.split(" ").pop()} \u3078 WARP`;
  }
  return "";
}
var SPELLS = {
  [CLASS.MAGICIAN]: [
    null,
    { name: "MAZ", kind: "shot", die: 6, color: 7, ptype: 0 },
    { name: "GANK", kind: "guard" },
    { name: "CHARP", kind: "shot", die: 12, color: 7, ptype: 1, stun: true, wide: true },
    { name: "HONG", kind: "shot", die: 18, color: 8, ptype: 1, easy: true },
    { name: "ZBOLT", kind: "shot", die: 24, color: 10, ptype: 2, speed: 2, pierce: true, wide: true },
    { name: "ILYUCK", kind: "shot", die: 18, color: 7, ptype: "ily", speed: 2, pierce: true, ghost: true, easy: true, stun: true }
  ],
  [CLASS.CLERIC]: [
    null,
    { name: "KATU", kind: "shot", die: 2, color: 15, ptype: 3, stun: true },
    { name: "NAR", kind: "heal" },
    { name: "NHEN", kind: "freeze" },
    { name: "HOMRET", kind: "home" }
  ]
};
var STUN_TICKS = 15;
var EASY_HIT = 4;
function spellsKnown(cls, level) {
  if (cls === CLASS.MAGICIAN) return Math.min(level, 6);
  if (cls === CLASS.CLERIC) return Math.min(level + 1 >> 1, 4);
  return 0;
}
var MONSTERS = ROM.monsters;
function newMember(rng, cls, name) {
  const hp = startHP(cls);
  return {
    name,
    cls,
    level: 1,
    hp,
    maxhp: hp,
    mp: 0,
    gold: 8 * rng.dice(8, 4),
    exp: 0,
    dm: false,
    keys: 0,
    items: new Array(INV_SIZE).fill(0),
    food: hp
  };
}
function levelFromExp(cls, exp) {
  let lv = 1, th = EXP_BASE[cls];
  while (lv < 9 && exp >= th) {
    th *= 2;
    lv++;
  }
  return lv;
}
function expForLevel(cls, lv) {
  return lv <= 1 ? 0 : EXP_BASE[cls] * 2 ** (lv - 2);
}
function title(m) {
  return m.dm ? "DUNGEON MASTER" : TITLES[m.cls][m.level - 1];
}
function evalEquip(m, gank = 0) {
  const items = m.items.slice().sort((a2, b) => b - a2);
  const r = { weaponDie: 1, bow: 0, armor: 0, flags: [0, 0, 0, 0, 0, 0], inUse: 0 };
  const usable = (id) => canUse(id, m.cls);
  const used = [];
  const best = (kind) => {
    let b = 0;
    for (const id of items) if (ITEM_KIND(id) === kind && usable(id) && (!b || itemValue(id) > itemValue(b))) b = id;
    return b;
  };
  const w = best("weapon");
  if (w) {
    r.weaponDie = itemValue(w);
    used.push(w);
  }
  const bowId = best("bow");
  if (bowId) {
    r.bow = itemValue(bowId);
    used.push(bowId);
  }
  const a = best("armor");
  if (a) {
    r.armor = itemValue(a);
    used.push(a);
  }
  const sh = best("shield");
  if (sh) {
    r.armor += itemValue(sh);
    used.push(sh);
  }
  r.armor += gank;
  for (const id of items) if (id >= 33 && id <= 38 && usable(id) && !r.flags[RING_FLAG[id]]) {
    r.flags[RING_FLAG[id]] = 1;
    used.push(id);
  }
  if (r.flags[0]) r.armor += 3;
  if (r.flags[5]) {
    r.flags[3] = 1;
    if (m.cls === CLASS.CLERIC || m.cls === CLASS.MAGICIAN) r.flags[4] = 1;
  }
  const rest = items.slice();
  for (const id of used) rest.splice(rest.indexOf(id), 1);
  m.items.splice(0, m.items.length, ...used, ...rest);
  r.inUse = used.length;
  return r;
}
var isCaster = (m) => m.cls === CLASS.CLERIC || m.cls === CLASS.MAGICIAN;

// src/core/ai.js
var FOLLOW_DIST = 3;
var GAP = 1;
var FIGHT_TICKS = 15;
var AIM_TICKS = 3;
var COOL_TICKS = 12;
var HEAL_POTIONS = [39, 40, 41];
var N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
var AI = {
  // ------------------------------------------------------------ navigation grid
  /**
   * passable nodes (top-left of a 2x2 footprint, walls/chests only; monsters & people ignored).
   * v0.22: kept until the place changes (a door opens, a chest goes); the distance fields are per turn.
   */
  navGrid(loc) {
    const sig = `${loc.ver || 0},${loc.chests.length}`, N = loc._nav;
    if (N && N.sig === sig) {
      if (N.t !== this.tickCount) {
        N.t = this.tickCount;
        N.fields = /* @__PURE__ */ new Map();
      }
      return N;
    }
    const W3 = loc.w - 1, H2 = loc.h - 1, pass = new Uint8Array(W3 * H2);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W3; x++) pass[y * W3 + x] = this.probe(loc, x, y).wall ? 0 : 1;
    loc._nav = { sig, t: this.tickCount, W: W3, H: H2, pass, fields: /* @__PURE__ */ new Map() };
    return loc._nav;
  },
  /** BFS distance field (8-way, no corner cutting) from a set of source nodes */
  distField(loc, key, sources) {
    const nav = this.navGrid(loc);
    if (nav.fields.has(key)) return nav.fields.get(key);
    const { W: W3, H: H2, pass } = nav, dist = new Int16Array(W3 * H2).fill(-1), q = queueBuf(W3 * H2);
    let qh = 0, qt = 0;
    for (const [x, y] of sources) {
      if (x < 0 || y < 0 || x >= W3 || y >= H2 || !pass[y * W3 + x] || dist[y * W3 + x] >= 0) continue;
      dist[y * W3 + x] = 0;
      q[qt++] = y * W3 + x;
    }
    while (qh < qt) {
      const i = q[qh++], x = i % W3, y = i / W3 | 0;
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W3 || ny >= H2) continue;
        const j = ny * W3 + nx;
        if (!pass[j] || dist[j] >= 0) continue;
        if (dx && dy && (!pass[y * W3 + nx] || !pass[ny * W3 + x])) continue;
        dist[j] = dist[i] + 1;
        q[qt++] = j;
      }
    }
    const f = { W: W3, H: H2, dist, at: (x, y) => x < 0 || y < 0 || x >= W3 || y >= H2 ? -1 : dist[y * W3 + x] };
    nav.fields.set(key, f);
    return f;
  },
  /** nodes around a (possibly fractional) position */
  nodesAround(x, y) {
    const xs = [.../* @__PURE__ */ new Set([Math.floor(x), Math.ceil(x)])], ys = [.../* @__PURE__ */ new Set([Math.floor(y), Math.ceil(y)])];
    const r = [];
    for (const yy of ys) for (const xx of xs) r.push([xx, yy]);
    return r;
  },
  /**
   * walk down a distance field. returns 'arrived' (at a source node), 'moved', 'monster' (blocked by one: attacked)
   * or 'stuck'.
   */
  walkField(a, f, speed, attack = true) {
    const loc = a.loc;
    let budget = speed, moved = false;
    for (let it = 0; it < 3 && budget > 1e-6; it++) {
      let tx, ty;
      const onNode = Number.isInteger(a.x) && Number.isInteger(a.y);
      if (onNode) {
        const here = f.at(a.x, a.y);
        if (here === 0) return moved ? "moved" : "arrived";
        let best = null, bd = here < 0 ? 1e9 : here;
        for (const [dx2, dy2] of N8) {
          const nx2 = a.x + dx2, ny2 = a.y + dy2, d2 = f.at(nx2, ny2);
          if (d2 < 0 || d2 >= bd) continue;
          if (dx2 && dy2 && (f.at(a.x + dx2, a.y) < 0 || f.at(a.x, a.y + dy2) < 0)) continue;
          bd = d2;
          best = [nx2, ny2];
        }
        if (!best) return moved ? "moved" : "stuck";
        [tx, ty] = best;
      } else {
        let best = null, bd = 1e9;
        for (const [nx2, ny2] of this.nodesAround(a.x, a.y)) {
          const d2 = f.at(nx2, ny2);
          if (d2 >= 0 && d2 < bd) {
            bd = d2;
            best = [nx2, ny2];
          }
        }
        if (!best) return moved ? "moved" : "stuck";
        [tx, ty] = best;
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      const s = Math.min(budget, d), nx = a.x + dx / d * s, ny = a.y + dy / d * s;
      a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0;
      const mon = this.monsterAt(loc, nx, ny);
      if (mon) {
        if (attack) this.melee(a, mon);
        return "monster";
      }
      if (this.probe(loc, nx, ny).wall) return moved ? "moved" : "stuck";
      this.place(a, nx, ny);
      budget -= s;
      moved = true;
    }
    if (moved) {
      a.step = (a.step || 0) + 1;
      if ((a.step & 1) === 0) a.anim ^= 1;
      this.afterMove(a);
    }
    return moved ? "moved" : "stuck";
  },
  // ------------------------------------------------------------ per tick
  /** everybody except the controlled character */
  runFollowers() {
    const lead = this.focusActor();
    if (!lead || lead.state !== "active") return;
    for (const a of this.actors) {
      if (a === lead || a.state !== "active" || a.loc !== lead.loc) continue;
      a.ai = a.ai || { aim: 0, cool: 0 };
      if (a.ai.cool > 0) a.ai.cool--;
      if (this.ai === false) continue;
      a.following = false;
      if (a.ai.aim > 0) {
        if (--a.ai.aim === 0) this.fireSupport(a);
        continue;
      }
      if (a.ai.cool === 0 && this.decideSupport(a)) continue;
      if (this.member(a).cls === CLASS.FIGHTER && this.guardStep(a)) continue;
      if (this.member(a).cls === CLASS.THIEF && this.chestStep(a)) continue;
      this.followStep(a, lead);
    }
    this.spaceFollowers(lead);
  },
  speedOf(a) {
    return CLASS_SPEED[this.member(a).cls];
  },
  followStep(a, lead) {
    a.following = true;
    const cx = a.x + 1, cy = a.y + 1, lx = lead.x + 1, ly = lead.y + 1, dl = Math.hypot(cx - lx, cy - ly);
    if (dl <= FOLLOW_DIST + 1e-6) {
      a.idle = true;
      return;
    }
    const ahead = (o) => o !== a && o !== lead && o.state === "active" && o.loc === a.loc && o.following && Math.hypot(o.x + 1 - lx, o.y + 1 - ly) < dl;
    const tooClose = (x, y) => this.actors.some((o) => ahead(o) && Math.max(Math.abs(o.x - x), Math.abs(o.y - y)) < 2 + GAP - 1e-6);
    if (this.actors.some((o) => ahead(o) && Math.max(Math.abs(o.x - a.x), Math.abs(o.y - a.y)) <= 2 + GAP + 0.02)) {
      a.idle = true;
      return;
    }
    a.idle = false;
    const f = this.distField(a.loc, `lead${lead.x.toFixed(2)},${lead.y.toFixed(2)}`, this.nodesAround(lead.x, lead.y));
    const x0 = a.x, y0 = a.y, full = Math.min(this.speedOf(a), Math.max(0.05, dl - FOLLOW_DIST));
    for (const k of [1, 0.5, 0.25]) {
      a.x = x0;
      a.y = y0;
      const r = this.walkField(a, f, full * k, true);
      if (r === "monster" || !tooClose(a.x, a.y)) return;
    }
    a.x = x0;
    a.y = y0;
    a.idle = true;
  },
  /** followers keep half a character between each other, walking or waiting (the leader is ignored) */
  spaceFollowers(lead) {
    const fs = this.actors.filter((o) => o !== lead && o.state === "active" && o.loc === lead.loc && o.following);
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const p = fs[i], q = fs[j], dx = q.x - p.x, dy = q.y - p.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2 + GAP - 1e-6) continue;
      const far = Math.hypot(q.x - lead.x, q.y - lead.y) >= Math.hypot(p.x - lead.x, p.y - lead.y) ? q : p;
      const near = far === q ? p : q, sx = far.x - near.x, sy = far.y - near.y;
      const tries = Math.abs(sx) >= Math.abs(sy) ? [[Math.sign(sx) || 1, 0], [0, Math.sign(sy) || 1], [0, -(Math.sign(sy) || 1)]] : [[0, Math.sign(sy) || 1], [Math.sign(sx) || 1, 0], [-(Math.sign(sx) || 1), 0]];
      for (const [ux, uy] of tries) {
        const nx = far.x + ux * 0.25, ny = far.y + uy * 0.25;
        if (this.isFree(far.loc, nx, ny)) {
          this.place(far, nx, ny);
          break;
        }
      }
    }
  },
  // ------------------------------------------------------------ fighter: protect friends
  guardStep(a) {
    const loc = a.loc;
    let tgt = a.guard && loc.monsters.includes(a.guard) ? a.guard : null;
    if (!tgt) {
      let best = null, bt = -1;
      for (const m of loc.monsters) if (m && m.hitAlly !== void 0 && this.tickCount - m.hitAlly <= FIGHT_TICKS && m.hitAlly > bt) {
        bt = m.hitAlly;
        best = m;
      }
      tgt = best;
    }
    a.guard = tgt;
    if (!tgt) return false;
    a.idle = false;
    const src = [];
    for (let y = tgt.y - 1; y <= tgt.y + tgt.h - 1; y++) for (let x = tgt.x - 1; x <= tgt.x + tgt.w - 1; x++) src.push([x, y]);
    const f = this.distField(loc, `mon${tgt.x},${tgt.y},${tgt.w}`, src);
    const r = this.walkField(a, f, this.speedOf(a), true);
    if (r === "stuck" && !this.monsterAt(loc, a.x - 0.5, a.y - 0.5, 3, 3)) a.guard = null;
    return true;
  },
  // ------------------------------------------------------------ thief: open chests after the room is cleared
  chestStep(a) {
    const loc = a.loc;
    if (loc.kind !== "room" || loc.monsters.some(Boolean)) return false;
    const gold = loc.ground.filter((g) => g.id === 255 && !g.food);
    if (!loc.chests.length && !gold.length) return false;
    a.idle = false;
    const src = [];
    for (const g of gold) src.push([g.x, g.y]);
    for (const c of loc.chests) src.push([c.x - 2, c.y], [c.x + 2, c.y], [c.x, c.y - 2], [c.x, c.y + 2]);
    const f = this.distField(loc, "chests" + loc.chests.length + "," + gold.length + "," + loc.chests.map((c) => c.x + "." + c.y).join(), src);
    const r = this.walkField(a, f, this.speedOf(a), false);
    if (r === "arrived") {
      const c = loc.chests.find((c2) => Math.abs(c2.x - a.x) === 2 && c2.y === a.y || Math.abs(c2.y - a.y) === 2 && c2.x === a.x);
      if (c) {
        a.dir = c.x > a.x ? 1 : c.x < a.x ? 3 : c.y > a.y ? 2 : 0;
        this.bump(a, c, true);
      } else this.pickup(a);
    }
    return true;
  },
  // ------------------------------------------------------------ support fire
  /** monsters someone is fighting right now, nearest first, with a clear line of fire from a */
  supportTarget(a, throughWalls = false) {
    const loc = a.loc, cx = a.x + 1, cy = a.y + 1;
    const v = loc.kind === "map" ? loc.view : null;
    const onScreen = (m) => !v || m.x + m.w > v.x && m.x < v.x + this.viewW && m.y + m.h > v.y && m.y < v.y + this.viewH;
    const ms = loc.monsters.filter((m) => m && onScreen(m) && !this.hiddenMonster(m)).sort((p, q) => Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) - Math.hypot(q.x + q.w / 2 - cx, q.y + q.h / 2 - cy));
    return ms.find((m) => throughWalls || this.lineOfFire(loc, a, m)) || null;
  },
  /** vision limits (scene sets this.vision): monsters outside the lit window are not targeted */
  hiddenMonster(m) {
    const V = this.vision;
    if (!V || !V.dark || m.loc.kind !== "map") return false;
    const L = this.focusActor();
    if (!L) return false;
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    return Math.abs(cx - (L.x + 1)) > V.half || Math.abs(cy - (L.y + 1)) > V.half;
  },
  lineOfFire(loc, a, m) {
    const x0 = a.x, y0 = a.y, x1 = m.x + m.w / 2 - 1, y1 = m.y + m.h / 2 - 1;
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.5);
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (this.monsterAt(loc, x + 0.2, y + 0.2, 1.6, 1.6) === m) return true;
      if (this.probe(loc, x + 0.3, y + 0.3, 1.4, 1.4).wall) return false;
    }
    return true;
  },
  /** choose an action; returns true when an aim has started */
  decideSupport(a) {
    const m = this.member(a), cls = m.cls;
    if (cls === CLASS.FIGHTER || a.proj) return false;
    const ilyuck = cls === CLASS.MAGICIAN && this.wizardWant(a) === 6;
    const tgt = this.supportTarget(a, ilyuck && a.loc.kind === "room");
    if (!tgt) return false;
    let act = null;
    if (cls === CLASS.THIEF) {
      if (a.eq.bow > 0) act = { kind: "bow" };
    } else if (cls === CLASS.CLERIC) {
      const known = spellsKnown(cls, m.level);
      const hurt = this.actors.some((o) => o.state === "active" && o.loc === a.loc && this.member(o).hp <= this.member(o).maxhp / 2);
      if (hurt && known >= 2 && m.mp >= 2) act = { kind: "spell", idx: 2 };
      else if (known >= 1 && m.mp >= 1) act = { kind: "spell", idx: 1 };
    } else if (cls === CLASS.MAGICIAN) {
      const w = this.wizardWant(a);
      if (w) act = { kind: "spell", idx: w };
    }
    if (!act) return false;
    a.ai.aim = AIM_TICKS;
    a.ai.act = act;
    a.ai.tgt = tgt;
    a.idle = false;
    a.dir = Math.abs(tgt.x - a.x) > Math.abs(tgt.y - a.y) ? tgt.x > a.x ? 1 : 3 : tgt.y > a.y ? 2 : 0;
    return true;
  },
  /** the attack spell a wizard would use now: the last one cast, stepping down while MP is short (0: none) */
  wizardWant(a) {
    const m = this.member(a), list = SPELLS[CLASS.MAGICIAN], known = spellsKnown(CLASS.MAGICIAN, m.level);
    const isAtk = (i) => list[i] && list[i].kind === "shot";
    const want = Math.min(a.lastAtk && isAtk(a.lastAtk) ? a.lastAtk : 1, known);
    for (let i = want; i >= 1; i--) if (isAtk(i) && m.mp >= i) return i;
    return 0;
  },
  fireSupport(a) {
    const { act, tgt } = a.ai;
    a.ai.act = null;
    a.ai.cool = COOL_TICKS;
    const target = tgt && a.loc.monsters.includes(tgt) ? tgt : this.supportTarget(a, act.kind === "spell" && act.idx === 6 && this.member(a).cls === CLASS.MAGICIAN && a.loc.kind === "room");
    if (!target) return;
    if (act.kind === "bow") {
      if (this.shoot(a, a.eq.bow, 8, 0, target)) this.sound(9);
    } else this.castSpell(a, act.idx, { target, auto: true });
  },
  // ------------------------------------------------------------ autopilot (tap a spot on the floor map)
  /**
   * may the leader's 2x2 footprint stand at node (x,y)? only on mapped cells; closed doors count as open (we knock).
   * `allow`: cell indices (cy*32+cx) whose door-type characters also count as open (the stairs / the inn we head for)
   */
  autoFootOk(loc, x, y, keys, f = this.floor.f, allow = null) {
    if (x < 0 || y < 0 || x > loc.w - 2 || y > loc.h - 2) return false;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const cx = x + i, cy = y + j;
      if (!this.isSeen(f, cx >> 2, cy >> 2)) return false;
      const pr = this.probe(loc, cx, cy, 1, 1);
      if (!pr.wall) continue;
      if (pr.chest || !pr.door) return false;
      if (allow && allow.has(pr.door[1] * 32 + pr.door[0])) continue;
      if (loc.town) return false;
      const t = loc.tile(pr.door[0], pr.door[1]);
      if (t === 2 || t === 3) continue;
      if ((t === 5 || t === 6) && keys & 1 << (loc.entryIdx.get(pr.door[1] * 32 + pr.door[0]) ?? 0)) continue;
      return false;
    }
    return true;
  },
  /** BFS distance field over the leader's footprints toward node (tx,ty); the target's own cell may be a closed door */
  autoField(loc, tx, ty, keys) {
    const key = `auto${tx},${ty},${keys},${loc.ver || 0},${loc.chests.length},${this.mapDirty || 0},${this.floor.f}`;
    if (loc._autoF && loc._autoF.key === key) return loc._autoF.f;
    const W3 = loc.w - 1, H2 = loc.h - 1, pass = new Uint8Array(W3 * H2), allow = /* @__PURE__ */ new Set([(ty >> 2) * 32 + (tx >> 2)]);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W3; x++) pass[y * W3 + x] = this.autoFootOk(loc, x, y, keys, this.floor.f, allow) ? 1 : 0;
    const f = bfsField(pass, W3, H2, [[tx, ty]]);
    loc._autoF = { key, f };
    return f;
  },
  /** start walking to map cell (cx,cy). returns false when it cannot be reached through mapped ground */
  autopilotTo(cx, cy) {
    const lead = this.focusActor();
    if (!lead || lead.state !== "active" || lead.loc !== this.mapLoc) return false;
    const loc = this.mapLoc, keys = this.sharedKeys();
    let tgt = null;
    for (const [ox, oy] of [[1, 1], [1, 0], [0, 1], [2, 1], [1, 2], [0, 0], [2, 0], [0, 2], [2, 2]]) {
      const x = cx * 4 + ox, y = cy * 4 + oy;
      if (this.autoFootOk(loc, x, y, keys) && !this.probe(loc, x, y).wall) {
        tgt = [x, y];
        break;
      }
    }
    if (!tgt) return false;
    const f = this.autoField(loc, tgt[0], tgt[1], keys);
    if (!this.nodesAround(lead.x, lead.y).some(([x, y]) => f.at(x, y) >= 0)) return false;
    this.auto = { tx: tgt[0], ty: tgt[1], loc, stuck: 0 };
    this.msg("\u3058\u3069\u3046\u3067 \u3044\u3069\u3046\u3059\u308B");
    return true;
  },
  cancelAutopilot(quiet = false) {
    if (this.auto || this.homeRun) {
      this.auto = null;
      this.homeRun = null;
      if (!quiet) this.msg("\u3058\u3069\u3046 \u3044\u3069\u3046\u3092 \u3084\u3081\u305F");
    }
  },
  autoStep(lead) {
    const A = this.auto;
    if (!lead || lead.state !== "active" || lead.loc !== A.loc || this.mode !== "play") {
      this.auto = null;
      return;
    }
    const loc = lead.loc, keys = this.sharedKeys(), f = this.autoField(loc, A.tx, A.ty, keys);
    const r = this.walkField(lead, f, this.speedOf(lead), true);
    if (r === "arrived" || lead.x === A.tx && lead.y === A.ty) {
      this.auto = null;
      if (A.home) {
        this.act(lead);
        return;
      }
      this.msg("\u3068\u3046\u3061\u3083\u304F");
      return;
    }
    if (r !== "stuck") return;
    if (Number.isInteger(lead.x) && Number.isInteger(lead.y)) {
      const here = f.at(lead.x, lead.y);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const d = f.at(lead.x + dx, lead.y + dy);
        if (d < 0 || d >= here) continue;
        const pr = this.probe(loc, lead.x + dx, lead.y + dy);
        if (pr.door && !pr.chest) {
          lead.dir = dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0;
          this.bump(lead, pr.door, false);
          return;
        }
      }
    }
    if (++A.stuck > 45) {
      this.auto = null;
      this.homeRun = null;
      this.msg(A.home ? "\u3058\u3069\u3046 \u3044\u3069\u3046\u3092 \u3084\u3081\u305F" : "\u305D\u3053\u306B\u306F \u3044\u3051\u307E\u305B\u3093");
    }
  },
  // ------------------------------------------------------------ v0.20: run back to the inn
  /**
   * start the run home: a priest who knows HOMRET and has the MP casts it; otherwise the party walks
   * (known stairs and mapped ground only, the GREEN-type amulet warp when it is shorter), floor after floor.
   */
  startHomeRun() {
    const lead = this.focusActor();
    if (!lead || lead.state !== "active" || this.mode !== "play") return false;
    const pr = this.actors.find((a) => a.state === "active" && this.member(a).cls === CLASS.CLERIC && spellsKnown(CLASS.CLERIC, this.member(a).level) >= 4 && this.member(a).mp >= 4);
    if (pr) {
      this.msg(`${this.member(pr).name} \u306F HOMRET\u3092 \u3068\u306A\u3048\u305F`);
      this.castSpell(pr, 4, { auto: true });
      return true;
    }
    if (lead.loc !== this.mapLoc) {
      this.msg("\u3078\u3084\u3092 \u3067\u3066\u304B\u3089 \u306B\u3057\u3088\u3046");
      this.sound(1);
      return false;
    }
    const leg = this.homePlan(lead);
    if (!leg) {
      this.msg("\u304B\u3048\u308A\u307F\u3061\u304C \u308F\u304B\u3089\u306A\u3044");
      this.sound(1);
      return false;
    }
    this.homeRun = { since: this.tickCount };
    this.msg("INN\u3078 \u3082\u3069\u308B");
    this.homeLeg(lead, leg);
    return true;
  },
  /** can the run home start? (HOMRET ready, or a known way from here). for the INN button */
  canGoHome() {
    const lead = this.focusActor();
    if (!lead || lead.state !== "active" || this.mode !== "play") return "no";
    if (this.actors.some((a) => a.state === "active" && this.member(a).cls === CLASS.CLERIC && spellsKnown(CLASS.CLERIC, this.member(a).level) >= 4 && this.member(a).mp >= 4)) return "ok";
    if (lead.loc !== this.mapLoc) return "room";
    return this.homePlan(lead) ? "ok" : "noway";
  },
  /** between legs (after stairs / a warp): plan again from where the leader stands */
  homeContinue(lead) {
    if (!lead || lead.state !== "active" || lead.loc !== this.mapLoc || this.pause > 0) return;
    const leg = this.homePlan(lead);
    if (!leg) {
      this.homeRun = null;
      this.msg("\u304B\u3048\u308A\u307F\u3061\u304C \u308F\u304B\u3089\u306A\u3044");
      return;
    }
    this.homeLeg(lead, leg);
  },
  homeLeg(lead, leg) {
    if (leg.kind === "amulet") {
      this.useAmulet(leg.id);
      return;
    }
    this.auto = { tx: leg.x, ty: leg.y, loc: this.mapLoc, stuck: 0, home: leg.kind };
  },
  /**
   * shortest way home from the leader (Dijkstra over: start, used stairs, amulet warp points, the inn door).
   * walking distances come from BFS fields over the mapped ground of each floor. returns the first leg:
   * {kind:'stairs'|'inn', x, y} to walk to on this floor, or {kind:'amulet', id}.
   */
  homePlan(lead) {
    const am = this.automap, keys = this.sharedKeys(), STAIR = 20, WARP = 30;
    const node = (f, cx, cy) => ({ f, x: cx * 4 + 1, y: cy * 4 + 2, cx, cy });
    const stairsOn = (f) => {
      const out = [];
      for (const k in am.stairs) {
        const [sf, cx, cy] = k.split(",").map(Number);
        if (sf !== f) continue;
        const d = am.stairs[k];
        const back = ROM.floors[d].entries.find(([, , t, dd]) => (t === 11 || t === 13) && dd === f);
        if (back) out.push({ at: node(f, cx, cy), to: node(d, back[0], back[1]) });
      }
      return out;
    };
    const INN = node(0, 16, 18);
    const passCache = /* @__PURE__ */ new Map();
    const fieldFrom = (f, src) => {
      const loc = this.locOf(f);
      if (!loc) return null;
      let P = passCache.get(f);
      if (!P) {
        const allow = new Set(stairsOn(f).map((s) => s.at.cy * 32 + s.at.cx));
        for (const [ex, ey, t] of ROM.floors[f].entries) if (t === 11 || t === 13 || f === 0 && t === 2) allow.add(ey * 32 + ex);
        const W3 = loc.w - 1, H2 = loc.h - 1, pass = new Uint8Array(W3 * H2);
        for (let j = 0; j < H2; j++) for (let i = 0; i < W3; i++) pass[j * W3 + i] = this.autoFootOk(loc, i, j, keys, f, allow) ? 1 : 0;
        P = { W: W3, H: H2, pass };
        passCache.set(f, P);
      }
      return bfsField(P.pass, P.W, P.H, src);
    };
    const cur = this.floor.f;
    const start = { f: cur, x: Math.round(lead.x), y: Math.round(lead.y), src: this.nodesAround(lead.x, lead.y) };
    const best = /* @__PURE__ */ new Map(), queue = [];
    const push = (n, d, first) => {
      const k = `${n.f},${n.x},${n.y}`;
      if (best.has(k) && best.get(k) <= d) return;
      best.set(k, d);
      queue.push({ n, d, first });
    };
    push(start, 0, null);
    for (let id = 46; id <= 51; id++) if (this.hasAmulet(id)) {
      const [wf, wx, wy] = ROM.warp[id - 46];
      push(node(wf, wx, wy), WARP, { kind: "amulet", id });
    }
    let goal = null;
    while (queue.length) {
      queue.sort((p, q) => p.d - q.d);
      const { n, d, first } = queue.shift();
      if (best.get(`${n.f},${n.x},${n.y}`) < d) continue;
      if (n.goal) {
        goal = { d, first };
        break;
      }
      const fld = fieldFrom(n.f, n.src || [[n.x, n.y]]);
      if (!fld) continue;
      const dist = (x, y) => {
        let b = -1;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const v = fld.at(x + i, y + j);
          if (v >= 0 && (b < 0 || v < b)) b = v;
        }
        return b;
      };
      for (const s of stairsOn(n.f)) {
        const w = dist(s.at.x, s.at.y);
        if (w < 0) continue;
        push(s.to, d + w + STAIR, first || { kind: "stairs", x: s.at.x, y: s.at.y });
      }
      if (n.f === 0) {
        const w = dist(INN.x, INN.y);
        if (w >= 0) push({ ...INN, goal: true }, d + w, first || { kind: "inn", x: INN.x, y: INN.y });
      }
    }
    return goal ? goal.first : null;
  },
  // ------------------------------------------------------------ last chance: drink a healing potion at HP 0
  autoPotion(a) {
    const m = this.member(a);
    for (const id of HEAL_POTIONS) {
      const slot = m.items.indexOf(id);
      if (slot < 0 || ITEM_KIND(id) !== "potion" || !canUse(id, m.cls)) continue;
      this.useItem(a, slot, true);
      if (m.hp > 0) {
        this.msg(`${m.name} \u306F \u3068\u3063\u3055\u306B POTION\u3092 \u306E\u3093\u3060`);
        return true;
      }
    }
    return false;
  }
};
var QBUF = new Int32Array(0);
function queueBuf(n) {
  if (QBUF.length < n) QBUF = new Int32Array(n);
  return QBUF;
}
function bfsField(pass, W3, H2, sources) {
  const dist = new Int16Array(W3 * H2).fill(-1), q = queueBuf(W3 * H2);
  let qh = 0, qt = 0;
  for (const [sx, sy] of sources) if (sx >= 0 && sy >= 0 && sx < W3 && sy < H2 && pass[sy * W3 + sx]) {
    dist[sy * W3 + sx] = 0;
    q[qt++] = sy * W3 + sx;
  }
  while (qh < qt) {
    const i = q[qh++], x = i % W3, y = i / W3 | 0;
    for (const [dx, dy] of N8) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W3 || ny >= H2) continue;
      const j = ny * W3 + nx;
      if (!pass[j] || dist[j] >= 0) continue;
      if (dx && dy && (!pass[y * W3 + nx] || !pass[ny * W3 + x])) continue;
      dist[j] = dist[i] + 1;
      q[qt++] = j;
    }
  }
  return { W: W3, H: H2, dist, at: (x, y) => x < 0 || y < 0 || x >= W3 || y >= H2 ? -1 : dist[y * W3 + x] };
}
function installAI(GameClass) {
  Object.assign(GameClass.prototype, AI);
}

// src/core/automap.js
var MAP_KEY = "dm_remake_map_v1";
var FLOORS = 32;
var CW = 32;
var CH = 31;
function newAutomap() {
  return {
    v: 1,
    seen: {},
    // floor -> array of 31 uint32 row masks (cells walked through + adjacent non-floor cells)
    rooms: {},
    // floor -> [cell index ...]  rooms ever entered
    found: [],
    // {f, cx, cy, id}  reward rooms whose item was picked up (keys, amulets, the ring)
    stairs: {},
    // "f,cx,cy" -> destination floor (stairs that were used)
    links: [],
    // "a-b" floors connected by a used staircase, "a>b" amulet warp known
    floors: [0],
    // floors visited
    rewardRooms: []
    // "f,cx,cy" rooms entered that hold an event item (shown as "?" until it is picked up)
  };
}
function loadAutomap(storage) {
  try {
    const s = storage && storage.getItem(MAP_KEY);
    if (s) return Object.assign(newAutomap(), JSON.parse(s));
  } catch (e) {
  }
  return null;
}
var Automap = {
  persistMap() {
    try {
      this.storage && this.storage.setItem(MAP_KEY, JSON.stringify(this.automap));
    } catch (e) {
    }
  },
  seenRows(f) {
    return this.automap.seen[f] || (this.automap.seen[f] = new Array(CH).fill(0));
  },
  isSeen(f, cx, cy) {
    const r = this.automap.seen[f];
    return !!r && cx >= 0 && cx < CW && cy >= 0 && cy < CH && (r[cy] >>> cx & 1) === 1;
  },
  /** called on arrival at a floor */
  mapArrive(f) {
    const am = this.automap;
    if (f === 29) {
      am.seen[29] = new Array(CH).fill(0);
      am.rooms[29] = [];
    }
    if (!am.rewardRooms) am.rewardRooms = [];
    if (!am.floors.includes(f)) am.floors.push(f);
    this.persistMap();
  },
  /** every turn: mark the cells the party stands in and the walls/doors around them */
  mapUpdate() {
    if (!this.floor || !this.mapLoc) return;
    const f = this.floor.f, rows = this.seenRows(f), loc = this.mapLoc;
    let changed = false;
    const mark = (cx, cy) => {
      if (cx < 0 || cx >= CW || cy < 0 || cy >= CH || rows[cy] >>> cx & 1) return;
      rows[cy] = (rows[cy] | 1 << cx) >>> 0;
      changed = true;
    };
    const open = (x, y) => x >= 0 && x < CW && y >= 0 && y < CH && loc.tile(x, y) === 0;
    for (const a of this.actors) {
      if (a.state !== "active" || a.loc !== loc) continue;
      const [cx, cy] = this.centerCell(a);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        mark(nx, ny);
        if ((dx || dy) && open(nx, ny)) for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++) mark(nx + ex, ny + ey);
      }
    }
    if (changed) this.mapDirty = (this.mapDirty || 0) + 1;
  },
  mapRoomEntered(cx, cy) {
    const f = this.floor.f, list = this.automap.rooms[f] || (this.automap.rooms[f] = []), i = cy * CW + cx;
    if (!list.includes(i)) {
      list.push(i);
      this.mapDirty = (this.mapDirty || 0) + 1;
    }
    if (ROM.reward.some(([rf, rx, ry]) => rf === f && rx === cx && ry === cy)) {
      const am = this.automap, k = `${f},${cx},${cy}`;
      if (!am.rewardRooms) am.rewardRooms = [];
      if (!am.rewardRooms.includes(k)) {
        am.rewardRooms.push(k);
        this.mapDirty = (this.mapDirty || 0) + 1;
      }
    }
  },
  mapFound(reward, id) {
    const { f, cx, cy } = reward;
    if (!this.automap.found.some((o) => o.f === f && o.cx === cx && o.cy === cy)) this.automap.found.push({ f, cx, cy, id });
    if (id >= 46 && id <= 51) {
      const [wf] = ROM.warp[id - 46];
      const k = `${f}>${wf}`;
      if (!this.automap.links.includes(k)) this.automap.links.push(k);
    }
    this.mapDirty = (this.mapDirty || 0) + 1;
    this.persistMap();
  },
  mapStairs(f, cx, cy, dest, bx, by) {
    const am = this.automap;
    am.stairs[`${f},${cx},${cy}`] = dest;
    if (bx !== void 0) am.stairs[`${dest},${bx},${by}`] = f;
    const k = f < dest ? `${f}-${dest}` : `${dest}-${f}`;
    if (!am.links.includes(k)) am.links.push(k);
  }
};
function installAutomap(GameClass) {
  Object.assign(GameClass.prototype, Automap);
}
function stairEdges() {
  const set = /* @__PURE__ */ new Set(), out = [];
  ROM.floors.forEach((fl, f) => {
    for (const [, , t, d] of fl.entries) if ((t === 11 || t === 13) && d >= 0 && d < FLOORS) {
      const k = f < d ? `${f}-${d}` : `${d}-${f}`;
      if (!set.has(k)) {
        set.add(k);
        out.push(f < d ? [f, d] : [d, f]);
      }
    }
  });
  return out;
}
var floorLevel = (f) => ROM.floors[f].level;
var shortName = (f) => f === 0 ? "CITY" : ROM.floors[f].name.split(" ").pop();
var bLabel = (f) => f === 0 ? "TOWN" : `B${ROM.floors[f].level}F`;
var bTitle = (f) => f === 0 ? "CITY OF GHOST" : `B${ROM.floors[f].level}F  ${ROM.floors[f].name}`;
function depthLayout() {
  const edges = stairEdges(), rows = [];
  for (let f = 0; f < FLOORS; f++) (rows[floorLevel(f)] = rows[floorLevel(f)] || []).push(f);
  const nb = /* @__PURE__ */ new Map();
  for (const [a, b] of edges) {
    (nb.get(a) || nb.set(a, []).get(a)).push(b);
    (nb.get(b) || nb.set(b, []).get(b)).push(a);
  }
  const col = {};
  rows.forEach((r) => r.forEach((f, i) => {
    col[f] = i - (r.length - 1) / 2;
  }));
  for (let pass = 0; pass < 8; pass++) {
    for (const r of rows) {
      const key = (f) => {
        const ns = nb.get(f) || [];
        return ns.length ? ns.reduce((s, g) => s + col[g], 0) / ns.length : col[f];
      };
      r.sort((p, q) => key(p) - key(q));
      r.forEach((f, i) => {
        col[f] = i - (r.length - 1) / 2;
      });
    }
  }
  return { rows, col, edges };
}

// src/core/game.js
var VIEW_W = 32;
var VIEW_H = 36;
var ROOM_W = 32;
var ROOM_H = 20;
var WORLD = 124;
var DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var SAVE_KEY = "dm_remake_save_v1";
var VARIANT_CHARS = [13, 14, 15, 16, 35, 36, 37, 38];
var SPEED = 1;
var CAPTURE = 0.5;
var EPS = 1e-6;
var FOOD_MONSTERS = /* @__PURE__ */ new Set([4, 11, 2, 7, 14, 15, 19, 20, 23, 25, 26, 28, 29, 30, 31]);
var snapStep = (d, S) => Math.abs(d) <= 1 + 1e-6 ? d : Math.sign(d) * S;
var lightCells = (lv) => Math.max(5, 7 - 0.5 * Math.floor((Math.max(1, lv) - 1) / 2));
function classify(ch, town) {
  if (ch >= 256) ch = VARIANT_CHARS[ch - 256 & 7];
  if (town) {
    if (ch >= 37) return 0;
    if (ch >= 33) return 3;
    if (ch >= 21) return 0;
    if (ch >= 5) return 1;
    if (ch >= 1) return 2;
    return 0;
  }
  if (ch >= 35) return 0;
  if (ch >= 31) return 2;
  if (ch >= 21) return 0;
  if (ch >= 17) return 3;
  if (ch >= 9) return 2;
  if (ch >= 1) return 1;
  return 0;
}
var MEMBER_NAMES = ["AOKI", "OURAN", "SHION", "HONGFA"];
var OLD_NAMES = ["LEON", "ROBIN", "MARIA", "MERLIN"];
function loadSave(storage) {
  try {
    const s = storage && storage.getItem(SAVE_KEY);
    if (s) {
      const d = JSON.parse(s);
      for (const m of d.members) {
        while (m.items.length < INV_SIZE) m.items.push(0);
        if (m.food === void 0) m.food = m.maxhp;
        if (OLD_NAMES.includes(m.name)) m.name = MEMBER_NAMES[m.cls];
        const fixed = Math.min(255, hpForLevel(m.cls, m.level));
        if (m.maxhp < fixed) {
          m.hp += fixed - m.maxhp;
          m.food += fixed - m.maxhp;
          m.maxhp = fixed;
        }
      }
      return d;
    }
  } catch (e) {
  }
  return null;
}
function newSave(rng = new FastRNG(Date.now() & 65535)) {
  return {
    v: 1,
    members: [
      newMember(rng, CLASS.FIGHTER, MEMBER_NAMES[CLASS.FIGHTER]),
      newMember(rng, CLASS.THIEF, MEMBER_NAMES[CLASS.THIEF]),
      newMember(rng, CLASS.CLERIC, MEMBER_NAMES[CLASS.CLERIC]),
      newMember(rng, CLASS.MAGICIAN, MEMBER_NAMES[CLASS.MAGICIAN])
    ],
    lastParty: [0, 1, 2],
    shared: { keys: 0, amulets: 0 }
  };
}
function migrateShared(save) {
  if (save.shared) return save;
  const sh = { keys: 0, amulets: 0 };
  for (const m of save.members) {
    sh.keys |= m.keys || 0;
    m.keys = 0;
    m.items = m.items.map((id) => {
      if (id >= 46 && id <= 51) {
        sh.amulets |= 1 << id - 46;
        return 0;
      }
      return id;
    });
  }
  save.shared = sh;
  return save;
}
var Location = class {
  constructor(kind, key) {
    this.kind = kind;
    this.key = key;
    this.monsters = [];
    this.freeze = 0;
    this.ground = [];
    this.chests = [];
    this.view = { x: 0, y: 0 };
  }
};
var MapLoc = class extends Location {
  constructor(fl) {
    super("map", "map");
    this.fl = fl;
    this.town = fl.level === 0;
    this.w = WORLD;
    this.h = WORLD;
    this.meta = this.town ? ROM.metaTown : ROM.metaDun;
    this.entryIdx = /* @__PURE__ */ new Map();
    for (const [x, y, t, d] of fl.entries) if (t >= 5 && t <= 7) this.entryIdx.set(y * 32 + x, d);
  }
  tile(cx, cy) {
    return this.fl.map[cy * 32 + cx];
  }
  setTile(cx, cy, v) {
    this.fl.map[cy * 32 + cx] = v;
    this.ver = (this.ver || 0) + 1;
  }
  // ver: AI grid caches
  char(x, y) {
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return 1;
    const cx = x >> 2, cy = y >> 2, t = this.tile(cx, cy);
    const tt = t < (this.town ? 13 : 17) ? t : 0;
    const ch = this.meta[tt * 16 + (y & 3) * 4 + (x & 3)];
    if (!this.town && t >= 5 && t <= 7) {
      const vi = VARIANT_CHARS.indexOf(ch);
      if (vi >= 0) return 256 + (this.entryIdx.get(cy * 32 + cx) ?? 0) * 8 + vi;
    }
    return ch;
  }
};
function charKind(loc, x, y) {
  return classify(loc.char(x, y), loc.town);
}
var floorCache = /* @__PURE__ */ new Map();
function floorLoc(game, f) {
  if (game.floor && game.floor.f === f) return game.mapLoc;
  if (f === 29) return null;
  if (!floorCache.has(f)) floorCache.set(f, new MapLoc({ f, ...generateFloor(f, 1) }));
  return floorCache.get(f);
}
var RoomLoc = class extends Location {
  constructor(key, town, doorCell) {
    super("room", key);
    this.town = town;
    this.w = ROOM_W;
    this.h = ROOM_H;
    this.doorCell = doorCell;
    this.buf = new Uint16Array(ROOM_W * ROOM_H);
  }
  char(x, y) {
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return 1;
    return this.buf[y * ROOM_W + x];
  }
};
var Game = class {
  constructor(save, opts = {}) {
    this.save = migrateShared(save || newSave());
    this.storage = opts.storage || null;
    this.viewW = VIEW_W;
    this.viewH = VIEW_H;
    this.automap = opts.automap || loadAutomap(this.storage) || this.save.automap || newAutomap();
    this.save.automap = this.automap;
    if (!this.save.fixShared24) {
      for (const o of this.automap.found || []) {
        if (o.id >= 52 && o.id <= 58) this.save.shared.keys |= 1 << o.id - 52;
        else if (o.id >= 46 && o.id <= 51) this.save.shared.amulets |= 1 << o.id - 46;
      }
      this.save.fixShared24 = true;
    }
    this.rng = new FastRNG(1234);
    this.events = [];
    this.mode = "inn";
    this.actors = [];
    this.pause = 0;
    this.tickCount = 0;
    this.control = { solo: -1, vec: null };
    this.lastSpell = null;
    this.cmds = [];
  }
  get members() {
    return this.save.members;
  }
  get shared() {
    return this.save.shared;
  }
  sharedKeys() {
    return this.save.shared.keys;
  }
  hasAmulet(id) {
    return (this.save.shared.amulets & 1 << id - 46) !== 0;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  msg(text) {
    this.emit("msg", { text });
  }
  sound(id) {
    this.emit("sound", { id });
  }
  persist() {
    try {
      this.storage && this.storage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (e) {
    }
  }
  // ======================================================== inn
  /** remake: the inn restores HP/MP for free; gold buys FOOD (max = MAX HP) */
  innRest() {
    for (const m of this.members) {
      m.hp = m.maxhp;
      m.mp = isCaster(m) ? m.maxhp : 0;
      if (m.food > m.maxhp) m.food = m.maxhp;
    }
  }
  buyFood(mi) {
    const m = this.members[mi];
    const need = m.maxhp - m.food;
    if (need <= 0) return "full";
    const n = Math.min(need, Math.floor(m.gold / FOOD_PRICE));
    if (n <= 0) return "nogold";
    m.gold -= n * FOOD_PRICE;
    m.food += n;
    this.persist();
    return n;
  }
  /** called when the party comes back to the inn: level ups, ending */
  arriveInn() {
    const report = [];
    this.auto = null;
    this.homeRun = null;
    for (const m of this.members) {
      const lv = levelFromExp(m.cls, m.exp);
      if (lv > m.level) {
        let gain = 0;
        for (let i = m.level; i < lv; i++) gain += HP_UP[m.cls];
        m.maxhp = Math.min(255, m.maxhp + gain);
        m.hp = Math.min(255, m.hp + gain);
        report.push({ name: m.name, from: m.level, to: lv, gain });
        m.level = lv;
      }
      if (!m.dm && m.items.includes(DM_RING)) {
        m.dm = true;
        report.push({ name: m.name, ending: true });
      }
    }
    this.innRest();
    this.mode = "inn";
    this.actors = [];
    this.floor = null;
    this.persist();
    this.persistMap();
    return report;
  }
  // ======================================================== departure
  depart(party) {
    this.save.lastParty = party.slice(0, 3);
    this.backup = JSON.parse(JSON.stringify(this.members));
    this.sharedBackup = { ...this.shared };
    this.actors = party.slice(0, 3).map((mi, i) => {
      const m = this.members[mi];
      return {
        mi,
        i,
        loc: null,
        x: 0,
        y: 0,
        dir: 2,
        anim: 0,
        state: "pending",
        timer: 0,
        gank: 0,
        eq: evalEquip(m, 0),
        proj: null,
        bump: null,
        via: null
      };
    });
    this.control.solo = 0;
    this.mode = "play";
    this.persist();
    this.loadFloor(0, null, true);
  }
  member(a) {
    return this.members[a.mi];
  }
  /** a MapLoc for floor f (the live one for the current floor) */
  locOf(f) {
    return floorLoc(this, f);
  }
  living() {
    return this.actors.filter((a) => a.state !== "dead" && a.state !== "home");
  }
  // ======================================================== floors
  loadFloor(f, arrival, fromInn = false) {
    const fl = generateFloor(f, this.rng.word());
    this.floor = { f, ...fl, killsLeft: fl.level, visited: /* @__PURE__ */ new Set(), rooms: /* @__PURE__ */ new Map(), attempts: /* @__PURE__ */ new Map(), opened: false };
    this.mapLoc = new MapLoc(this.floor);
    let ax, ay;
    if (fromInn) {
      ax = 16;
      ay = 18;
    } else {
      [ax, ay] = arrival;
    }
    this.floor.arrival = [ax, ay];
    this.floor.openArrival = !this.warping;
    for (const a of this.living()) {
      a.state = "pending";
      a.loc = this.mapLoc;
      a.x = ax * 4 + 1;
      a.y = ay * 4 + 2;
      a.timer = this.homeRun ? 2 + a.i * 4 : 6 + a.i * 8;
      a.proj = null;
      a.bump = null;
      a.via = null;
    }
    this.warping = false;
    this.centerView(this.mapLoc, ax * 4 + 1, ay * 4 + 2);
    this.pause = this.homeRun ? 4 : 30;
    this.auto = null;
    this.mapArrive(f);
    this.emit("floor", { f, name: fl.name, level: fl.level, fromInn, rush: !!this.homeRun });
  }
  /**
   * remake: vision limits on dungeon floors (not the town, not inside rooms)
   *  - no priest with the controlled character: only a 7x7-cell window (B1F-B4F) / 6x6 (B5F and deeper) is lit
   *  - no wizard: you cannot see past walls (fog + monsters as grey silhouettes; drawn by the scene)
   */
  updateVision() {
    const lead = this.focusActor();
    if (!lead || lead.state !== "active" || !this.floor || this.floor.f === 0 || lead.loc !== this.mapLoc) {
      this.vision = null;
      return;
    }
    const here = this.actors.filter((a) => a.state === "active" && a.loc === lead.loc).map((a) => this.member(a).cls);
    const dark = !here.includes(CLASS.CLERIC), fog = !here.includes(CLASS.MAGICIAN);
    this.vision = dark || fog ? { dark, fog, half: lightCells(this.floor.level) * 2 } : null;
  }
  /** recompute a character's equipment (and put the items in use first) */
  reEquip(a) {
    a.eq = evalEquip(this.member(a), a.gank);
    return a.eq;
  }
  /** change the visible map area (screen orientation) and re-centre on the controlled character */
  setView(w, h) {
    this.viewW = w;
    this.viewH = h;
    const f = this.focusActor();
    if (this.mapLoc) {
      if (f && f.loc === this.mapLoc) this.centerView(this.mapLoc, f.x, f.y);
      else {
        const v = this.mapLoc.view;
        v.x = Math.min(v.x, WORLD - w);
        v.y = Math.min(v.y, WORLD - h);
      }
    }
  }
  centerView(loc, x, y) {
    if (loc.kind === "room") {
      loc.view.x = 0;
      loc.view.y = 0;
      return;
    }
    loc.view.x = Math.round(Math.max(0, Math.min(WORLD - this.viewW, x - this.viewW / 2 + 1)));
    loc.view.y = Math.round(Math.max(0, Math.min(WORLD - this.viewH, y - this.viewH / 2 + 1)));
  }
  // ======================================================== control
  focusActor() {
    if (this.control.solo >= 0) {
      const a = this.actors[this.control.solo];
      if (a && a.state === "active") return a;
      if (!a || a.state === "dead" || a.state === "home") this.control.solo = -1;
    }
    return this.actors.find((a) => a.state === "active") || this.actors.find((a) => a.state === "pending") || null;
  }
  /** remake: tap a character to control it; the others follow it automatically */
  setSolo(i) {
    const a = this.actors[i];
    if (!a || a.state !== "active" || this.control.solo === i) return;
    this.control.solo = i;
    this.msg(`${this.member(a).name} \u3092 \u305D\u3046\u3055`);
  }
  /** everybody who shares the controlled character's place (menus: spells, bow, items) */
  controlled() {
    const f = this.focusActor();
    if (!f) return [];
    return this.actors.filter((a) => a.state === "active" && a.loc === f.loc);
  }
  command(c) {
    this.cmds.push(c);
  }
  // ======================================================== geometry helpers (float positions, 1 unit = 1 character)
  /** what the 2x2 footprint at (x,y) touches: walls, a closed door cell, a chest */
  probe(loc, x, y, w = 2, h = 2) {
    const r = { wall: false, door: null, chest: null };
    const x0 = Math.floor(x + EPS), x1 = Math.ceil(x + w - EPS) - 1, y0 = Math.floor(y + EPS), y1 = Math.ceil(y + h - EPS) - 1;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = classify(loc.char(cx, cy), loc.town);
      if (k === 0) continue;
      r.wall = true;
      if (k === 2 && loc.kind === "map" && !r.door) r.door = [cx >> 2, cy >> 2];
    }
    for (const ch of loc.chests) if (overlap(x, y, w, h, ch.x, ch.y, 2, 2)) {
      r.chest = ch;
      r.wall = true;
    }
    return r;
  }
  isFree(loc, x, y, self = null) {
    if (x < 0 || y < 0 || x > loc.w - 2 || y > loc.h - 2) return false;
    return !this.probe(loc, x, y).wall && !this.monsterAt(loc, x, y, 2, 2);
  }
  monsterAt(loc, x, y, w = 2, h = 2, except = null) {
    for (const m of loc.monsters) if (m && m !== except && overlap(x, y, w, h, m.x, m.y, m.w, m.h)) return m;
    return null;
  }
  actorAt(loc, x, y, except) {
    for (const a of this.actors) if (a !== except && a.state === "active" && a.loc === loc && overlap(x, y, 2, 2, a.x, a.y, 2, 2)) return a;
    return null;
  }
  centerCell(a) {
    return [Math.floor((a.x + 1) / 4), Math.floor((a.y + 1) / 4)];
  }
  // ======================================================== tick
  tick(input) {
    this.tickCount++;
    for (const a of this.actors) {
      a.px = a.x;
      a.py = a.y;
    }
    for (const loc of this.activeLocations()) for (const m of loc.monsters) if (m) {
      m.px = m.x;
      m.py = m.y;
    }
    if (this.mode !== "play") return;
    if (this.pause > 0) {
      this.pause--;
      return;
    }
    if (input) {
      let v = input.vec || null;
      if (!v && input.dir >= 0) v = { x: DIRV[input.dir][0], y: DIRV[input.dir][1] };
      this.control.vec = v;
    }
    for (const c of this.cmds.splice(0)) this.runCommand(c);
    if (this.mode !== "play") return;
    this.updateArrivals();
    this.movePlayers();
    this.mapUpdate();
    const locs = this.activeLocations();
    for (const loc of locs) this.monsterAI(loc);
    this.moveProjectiles();
    for (const loc of locs) this.monsterAttacks(loc);
    this.regen();
    this.checkDeaths();
    this.updateViews();
    this.updateVision();
    this.checkTransitions();
  }
  activeLocations() {
    const s = /* @__PURE__ */ new Set();
    for (const a of this.actors) if (a.state === "active" && a.loc) s.add(a.loc);
    return [...s];
  }
  // ---------------------------------------------------- arrivals (members appear one after another)
  updateArrivals() {
    for (const a of this.actors) {
      if (a.state !== "pending" || !a.loc) continue;
      if (--a.timer > 0) continue;
      if (this.monsterAt(a.loc, a.x, a.y)) {
        a.timer = 4;
        continue;
      }
      a.state = "active";
      a.dir = 2;
      this.sound(4);
      if (this.floor && this.floor.openArrival && a.loc === this.mapLoc) {
        const [cx, cy] = this.centerCell(a), t = this.mapLoc.tile(cx, cy);
        if (t === 11 || t === 13 || this.mapLoc.town && t === 2) {
          this.mapLoc.setTile(cx, cy, t + 1);
          this.emit("tile", { cx, cy });
        }
        this.floor.openArrival = false;
      }
    }
  }
  // ---------------------------------------------------- players: free 360-degree movement
  movePlayers() {
    for (const a of this.actors) if (a.meleeCool > 0) a.meleeCool--;
    const v = this.control.vec, lead = this.focusActor();
    if (v && (this.auto || this.homeRun)) this.cancelAutopilot();
    if (v && lead && lead.state === "active") this.stepActor(lead, v);
    else if (this.auto) this.autoStep(lead);
    else if (this.homeRun) this.homeContinue(lead);
    this.runFollowers();
    for (const a of this.actors) if (a.bump && a.bump.cool > 0) a.bump.cool--;
  }
  /** remake: melee pace. original = a blow every turn (15/s) for both sides; options.combat = turns per blow */
  combatEvery() {
    return this.save.options && this.save.options.combat || 2;
  }
  melee(a, mon) {
    if (a.meleeCool > 0) return;
    a.meleeCool = this.combatEvery() - 1;
    this.playerAttack(a, mon, null);
  }
  /**
   * One tick of free movement.
   *  - moves until it touches a wall (no stopping short)
   *  - pressing into a wall turns 100% of the speed along the wall (towards the side the input leans to)
   *  - an opening (gap / aligned door) beside us is preferred: we snap onto its lane and slip in
   */
  stepActor(a, v) {
    const s0 = [a.x, a.y];
    this.stepActor_(a, v);
    if (a.x !== s0[0] || a.y !== s0[1]) a.prevStart = s0;
  }
  /** would moving `ax` by d put us back where we started the previous move? (prevents A-B-A zig-zag) */
  reverses(a, ax, d) {
    const p = a.prevStart;
    if (!p) return false;
    const x = ax === "x" ? a.x + d : a.x, y = ax === "y" ? a.y + d : a.y;
    return Math.abs(x - p[0]) < 1e-6 && Math.abs(y - p[1]) < 1e-6;
  }
  stepActor_(a, v) {
    const loc = a.loc;
    const len = Math.hypot(v.x, v.y) || 1;
    let ux = v.x / len, uy = v.y / len;
    if (Math.abs(ux) < 1e-4) ux = 0;
    if (Math.abs(uy) < 1e-4) uy = 0;
    a.dir = Math.abs(ux) > Math.abs(uy) ? ux > 0 ? 1 : 3 : uy > 0 ? 2 : 0;
    a.step = (a.step || 0) + 1;
    if ((a.step & 1) === 0) a.anim ^= 1;
    const S = SPEED * CLASS_SPEED[this.member(a).cls];
    const domX = Math.abs(ux) >= Math.abs(uy);
    const mon = this.monsterAt(loc, a.x + ux * S, a.y + uy * S) || this.monsterAt(loc, domX ? a.x + Math.sign(ux) * S : a.x, domX ? a.y : a.y + Math.sign(uy) * S);
    if (mon) {
      this.melee(a, mon);
      return;
    }
    if (this.isFree(loc, a.x + ux * S, a.y + uy * S)) {
      this.place(a, a.x + ux * S, a.y + uy * S);
      this.afterMove(a);
      return;
    }
    const bx = ux !== 0 && !this.isFree(loc, a.x + ux * S, a.y);
    const by = uy !== 0 && !this.isFree(loc, a.x, a.y + uy * S);
    const comp = (ax) => ax === "x" ? ux : uy;
    let nAx;
    if (bx !== by) nAx = bx ? "x" : "y";
    else if (bx && by) nAx = domX ? "x" : "y";
    else {
      const order = [a.press, domX ? "x" : "y", domX ? "y" : "x"].filter((ax) => ax && Math.abs(comp(ax)) >= CAPTURE);
      nAx = order.find((ax) => this.openingAhead(a, ax, Math.sign(comp(ax)), Math.abs(comp(ax)) >= 0.5)) || (domX ? "x" : "y");
      if (this.moveAxis(a, nAx, Math.sign(comp(nAx)) * S)) {
        a.press = nAx;
        this.afterMove(a);
      }
      return;
    }
    a.press = nAx;
    const tAx = nAx === "x" ? "y" : "x";
    const n = comp(nAx), t = comp(tAx), sn = Math.sign(n);
    let moved = this.moveAxis(a, nAx, n * S);
    for (const [ax, c] of bx && by ? [[nAx, n], [tAx, t]] : [[nAx, n]]) {
      if (Math.abs(c) < 0.5) continue;
      const s_ = Math.sign(c), fx = ax === "x" ? a.x + s_ : a.x, fy = ax === "y" ? a.y + s_ : a.y;
      const front = this.probe(loc, fx, fy);
      if (front.chest) {
        if (moved) this.afterMove(a);
        this.bump(a, front.chest, true);
        return;
      }
      if (front.door && this.doorAligned(fx, fy, front.door, ax === "x")) {
        if (moved) this.afterMove(a);
        this.bump(a, front.door, false);
        return;
      }
    }
    if (Math.abs(n) >= CAPTURE) {
      const dir = Math.abs(t) < CAPTURE ? 0 : Math.sign(t);
      const back = dir === 0 ? 2 : Math.abs(t) > Math.abs(n) ? 0 : 2;
      const lane = this.findOpening(a, nAx, sn, back, dir === 0 ? 2 : Math.max(1, S), dir, Math.abs(n) >= 0.5, S);
      if (lane !== null) {
        const cur = a[tAx], d = lane - cur;
        const step = Math.abs(d) < 1e-6 ? 0 : snapStep(d, S);
        if (step === 0) {
          if (this.moveAxis(a, nAx, sn * S)) moved = true;
        } else if (this.moveAxis(a, tAx, step)) moved = true;
        if (moved) this.afterMove(a);
        return;
      }
    }
    if (t !== 0 && this.moveAxis(a, tAx, Math.sign(t) * S)) moved = true;
    else {
      for (const [na, comp_] of [[nAx, n], [tAx, t]]) {
        if (Math.abs(comp_) < CAPTURE) continue;
        const ta = na === "x" ? "y" : "x";
        const lane = this.findOpening(a, na, Math.sign(comp_), 1, 1, 0, Math.abs(comp_) >= 0.5, S);
        if (lane === null || Math.abs(lane - a[ta]) < 1e-6) continue;
        if (this.moveAxis(a, ta, snapStep(lane - a[ta], S))) {
          moved = true;
          a.press = na;
          break;
        }
      }
    }
    if (moved) this.afterMove(a);
  }
  /**
   * nearest whole-char lane along the wall from which there is a real opening along the normal.
   * dir: the side the input leans to (0 = none); back/fwd: how far we may look against/with it.
   * a lane that would send us straight back to where the previous move started is skipped (no zig-zag).
   */
  findOpening(a, nAx, sn, back, fwd, dir, doors = true, S = SPEED) {
    const loc = a.loc, tAx = nAx === "x" ? "y" : "x", cur = a[tAx], nPos = a[nAx];
    const pos = (tv, nv) => nAx === "x" ? [nv, tv] : [tv, nv];
    const cands = [];
    const R = Math.ceil(Math.max(back, fwd)) + 1;
    for (let c = Math.floor(cur) - R; c <= Math.ceil(cur) + R; c++) {
      const d = c - cur, along = dir ? d * dir : Math.abs(d);
      if (dir ? along > fwd + 1e-6 || along < -back - 1e-6 : along > fwd + 1e-6) continue;
      cands.push(c);
    }
    cands.sort((p, q) => Math.abs(p - cur) - Math.abs(q - cur));
    for (const c of cands) {
      if (!this.openingAt(loc, ...pos(c, nPos), nAx, sn, doors)) continue;
      const d = c - cur;
      if (Math.abs(d) > 1e-6 && this.reverses(a, tAx, snapStep(d, S))) continue;
      let clear = true;
      for (let k = 1; k <= 4 && clear; k++) {
        const m = cur + d * k / 4;
        if (!this.isFree(loc, ...pos(m, nPos))) clear = false;
      }
      if (clear) return c;
    }
    return null;
  }
  /**
   * is there a real way through from (x,y) one step along `ax`? a door right ahead, or 2 free steps (or free + door).
   * 1-char niches (the pockets beside doors) do not count; they only cause zig-zagging.
   */
  openingAt(loc, x, y, ax, s, doors) {
    const at = (k) => ax === "x" ? [x + s * k, y] : [x, y + s * k];
    const isDoor = (px, py) => {
      if (!doors) return false;
      const pr = this.probe(loc, px, py);
      return pr.door && !pr.chest && this.doorAligned(px, py, pr.door, ax === "x");
    };
    const [x1, y1] = at(1), [x2, y2] = at(2);
    if (isDoor(x1, y1)) return true;
    return this.isFree(loc, x1, y1) && (this.isFree(loc, x2, y2) || isDoor(x2, y2));
  }
  openingAhead(a, ax, s, doors) {
    return this.openingAt(a.loc, a.x, a.y, ax, s, doors);
  }
  /** move along one axis by d; if blocked, advance to the touching (whole-char) position instead */
  moveAxis(a, ax, d) {
    if (!d) return false;
    const loc = a.loc, at = (v) => ax === "x" ? [v, a.y] : [a.x, v];
    const cur = a[ax], to = cur + d;
    if (this.isFree(loc, ...at(to))) {
      this.place(a, ...at(to));
      return true;
    }
    const c = d > 0 ? Math.floor(to + 1e-6) : Math.ceil(to - 1e-6);
    if ((d > 0 ? c > cur + 1e-6 : c < cur - 1e-6) && this.isFree(loc, ...at(c))) {
      this.place(a, ...at(c));
      return true;
    }
    return false;
  }
  place(a, x, y) {
    const r = (v) => Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v;
    a.x = r(x);
    a.y = r(y);
  }
  doorAligned(x, y, cell, horiz) {
    const c = horiz ? cell[1] * 4 + 1 : cell[0] * 4 + 1;
    return Math.abs((horiz ? y : x) - c) < 0.01;
  }
  afterMove(a) {
    a.bump = null;
    this.pickup(a);
  }
  /** teammates may overlap (free movement) but drift apart gently */
  separate() {
    const act = this.actors.filter((a) => a.state === "active");
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
      const p = act[i], q = act[j];
      if (p.loc !== q.loc) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      if (Math.abs(dx) >= 1.2 || Math.abs(dy) >= 1.2) continue;
      const d = Math.hypot(dx, dy) || 1, ux = dx ? dx / d : (j & 1 ? 1 : -1) * 0.7, uy = dy / d;
      const k = 0.12;
      if (this.isFree(q.loc, q.x + ux * k, q.y + uy * k)) {
        q.x += ux * k;
        q.y += uy * k;
      }
      if (this.isFree(p.loc, p.x - ux * k, p.y - uy * k)) {
        p.x -= ux * k;
        p.y -= uy * k;
      }
    }
  }
  // ---------------------------------------------------- bump to open (improved: chance grows on each try)
  bump(a, target, isChest) {
    const loc = a.loc, m = this.member(a);
    let key;
    if (isChest) key = `${loc.key}:c${target.x},${target.y}`;
    else {
      key = `d${target[0]},${target[1]}`;
      const t = loc.tile(target[0], target[1]);
      if (!loc.town && (t === 5 || t === 6)) {
        const idx = loc.entryIdx.get(target[1] * 32 + target[0]) ?? 0;
        if (!(this.sharedKeys() & 1 << idx)) {
          if (!a.bump || a.bump.key !== key) {
            this.msg("\u304B\u304E\u304C \u304B\u304B\u3063\u3066\u3044\u308B");
            this.sound(1);
          }
          a.bump = { key, cool: 99, k: 0 };
          return;
        }
      }
    }
    if (!a.bump || a.bump.key !== key) a.bump = { key, k: this.floor.attempts.get(key) || 0, cool: 0 };
    if (a.bump.cool > 0) return;
    a.bump.cool = 2;
    this.sound(2);
    const lv = this.floor.level;
    const p0 = 1 / ((lv + 1) * (m.cls === CLASS.THIEF ? 1 : 4));
    const p = Math.min(1, p0 * (1 + a.bump.k));
    const kx = isChest ? target.x : target[0] * 4 + 1, ky = isChest ? target.y : target[1] * 4 + 1;
    if (Math.random() < p) {
      this.floor.attempts.delete(key);
      a.bump = null;
      if (isChest) this.openChest(a, target);
      else this.openDoor(loc, target[0], target[1]);
    } else {
      a.bump.k++;
      this.floor.attempts.set(key, a.bump.k);
      this.emit("knock", { loc: loc.key, x: kx, y: ky, progress: Math.min(1, p0 * (1 + a.bump.k)) });
    }
  }
  openDoor(loc, cx, cy) {
    const t = loc.tile(cx, cy);
    let v;
    if (loc.town || t >= 11) v = t + 1;
    else {
      v = t + 4;
      if (v < 9) v += 3;
    }
    loc.setTile(cx, cy, v);
    this.sound(5);
    this.emit("tile", { cx, cy });
  }
  openChest(a, chest) {
    const loc = a.loc;
    loc.chests.splice(loc.chests.indexOf(chest), 1);
    const r = this.rng.word() & 8191;
    let acc = r, id = 255;
    for (let i = 0; i < 45; i++) {
      const [w, minLv] = ROM.chestW[i];
      acc -= w;
      if (acc < 0) {
        if (this.floor.level >= minLv && this.floor.killsLeft === 0) id = i + 1;
        break;
      }
    }
    const p2 = this.rollPlus2();
    if (p2) id = p2;
    let food = false;
    if (id === 255 && this.rng.chance(8)) food = true;
    loc.ground.push({ id, x: chest.x, y: chest.y, food });
    this.sound(5);
    this.msg(food ? "\u305F\u304B\u3089\u3070\u3053\u306E \u306A\u304B\u306B FOOD\u304C \u3042\u3063\u305F" : id === 255 ? "\u305F\u304B\u3089\u3070\u3053\u306E \u306A\u304B\u306B \u304A\u304B\u306D\u304C \u3042\u3063\u305F" : "\u305F\u304B\u3089\u3070\u3053\u3092 \u3042\u3051\u305F!");
    if (id === 255 && this.floor.killsLeft > 0) this.msg(`\u3042\u3068 ${this.floor.killsLeft}\u305F\u3044 \u305F\u304A\u3059\u3068\u2026`);
  }
  /** one draw for all eligible "+2" items: each one wins with probability 1/PLUS2_CHANCE */
  rollPlus2() {
    if (this.floor.killsLeft !== 0) return 0;
    const ok = [];
    for (let k = 0; k < PLUS2_BASE.length; k++) if (this.floor.level >= plus2MinLv(PLUS2_FIRST + k)) ok.push(PLUS2_FIRST + k);
    if (!ok.length) return 0;
    const x = ((this.rng.word() & 65535) * 65536 + (this.rng.word() & 65535)) % PLUS2_CHANCE;
    return x < ok.length ? ok[x] : 0;
  }
  pickup(a) {
    const loc = a.loc, m = this.member(a);
    const auto = a !== this.focusActor();
    for (const g of loc.ground.slice()) {
      if (!overlap(a.x, a.y, 2, 2, g.x, g.y, 2, 2)) continue;
      const shared = ITEM_KIND(g.id) === "key" || ITEM_KIND(g.id) === "amulet";
      if (auto && !shared && (g.id !== 255 || g.food)) continue;
      if (g.id === 255) {
        const n = g.amount ?? this.rng.dice(5, (this.floor.level + 1) * 2);
        if (g.food) {
          const got = Math.min(n, m.maxhp - m.food);
          if (got <= 0) {
            if (!a.fullMsg) {
              this.msg("FOOD\u306F \u3082\u3046 \u3082\u3066\u306A\u3044");
              a.fullMsg = true;
            }
            continue;
          }
          m.food += got;
          this.msg(`${m.name} \u306F FOOD\u3092 ${got} \u3066\u306B\u3044\u308C\u305F`);
        } else {
          m.gold = Math.min(8388607, m.gold + n);
          this.msg(`${m.name} \u306F ${n} GOLD \u3092 \u3066\u306B\u3044\u308C\u305F`);
        }
      } else if (shared) {
        if (ITEM_KIND(g.id) === "key") this.shared.keys |= 1 << g.id - 52;
        else this.shared.amulets |= 1 << g.id - 46;
        this.msg(`${itemName(g.id)} \u3092 \u3066\u306B\u3044\u308C\u305F`);
      } else {
        const slot = m.items.indexOf(0);
        if (slot < 0) {
          if (!a.fullMsg) {
            this.msg("\u3082\u3061\u3082\u306E\u304C \u3044\u3063\u3071\u3044\u3060");
            a.fullMsg = true;
          }
          continue;
        }
        m.items[slot] = g.id;
        a.eq = evalEquip(m, a.gank);
        this.msg(`${m.name} \u306F ${itemName(g.id)} \u3092 \u3066\u306B\u3044\u308C\u305F`);
      }
      a.fullMsg = false;
      if (g.reward) this.mapFound(g.reward, g.id);
      loc.ground.splice(loc.ground.indexOf(g), 1);
      this.sound(8);
      this.emit("party");
    }
  }
  // ---------------------------------------------------- combat ($440C / $44ED)
  playerAttack(a, mon, dieOverride, opts = {}) {
    const m = this.member(a);
    const def = MONSTERS[mon.type];
    let target = 10 + def.ac - 2 * m.level - (a.eq.flags[1] ? 4 : 0);
    if (opts.easy) target -= EASY_HIT;
    if (mon.stun > 0) target -= EASY_HIT;
    if (target < 0) target = 0;
    mon.fight = this.tickCount;
    a.fightAt = this.tickCount;
    const roll = this.rng.dice(1, 20);
    if (roll < target) {
      this.sound(11);
      return;
    }
    this.sound(12);
    let dice = (m.hp >> 5) + 1;
    if (a.eq.flags[2]) dice *= 2;
    const die = dieOverride ?? a.eq.weaponDie;
    const dmg = this.rng.dice(dice, die);
    mon.hp -= dmg;
    this.emit("hit", { loc: mon.loc.key, x: mon.x + mon.w / 2, y: mon.y, dmg, foe: true });
    if (mon.hp <= 0) this.killMonster(a, mon);
  }
  killMonster(a, mon) {
    const loc = mon.loc, m = this.member(a);
    loc.monsters[loc.monsters.indexOf(mon)] = null;
    if (this.floor.killsLeft > 0) this.floor.killsLeft--;
    const def = MONSTERS[mon.type];
    if (m.level - 1 < def.lvl + 1) {
      const e = this.rng.dice((def.lvl >> 1) + 1, 4);
      m.exp = Math.min(65535, m.exp + e);
    }
    this.emit("kill", { loc: loc.key, x: mon.x, y: mon.y, w: mon.w, h: mon.h });
    let food = FOOD_MONSTERS.has(mon.type) && this.rng.chance(4);
    if (loc.kind === "room" && loc.monsters.every((x) => !x) && this.roomCleared(loc, mon)) food = false;
    if (food) {
      const n = Math.max(1, def.lvl);
      if (loc.kind === "room") loc.ground.push({ id: 255, food: true, amount: n, x: mon.x + (mon.w - 2 >> 1), y: mon.y + (mon.h - 2 >> 1) });
      else {
        const got = Math.min(n, m.maxhp - m.food);
        if (got > 0) {
          m.food += got;
          this.msg(`${m.name} \u306F FOOD\u3092 ${got} \u3066\u306B\u3044\u308C\u305F`);
          this.emit("party");
        } else this.msg(`${m.name} \u306F FOOD\u3092 \u3082\u3061\u304D\u308C\u306A\u3044`);
      }
    }
  }
  roomCleared(loc, lastMon) {
    const [cx, cy] = loc.doorCell;
    const i = ROM.reward.findIndex(([f, x, y]) => f === this.floor.f && x === cx && y === cy);
    if (i < 0 || loc.rewarded) return false;
    loc.rewarded = true;
    let id = 59 - (14 - i);
    if (id === 45) id = DM_RING;
    loc.ground.push({ id, x: lastMon.x, y: lastMon.y, reward: { f: this.floor.f, cx, cy } });
    this.sound(5);
    this.msg("\u306A\u306B\u304B\u304C \u3042\u3089\u308F\u308C\u305F!");
    return true;
  }
  monsterAttacks(loc) {
    if (loc.freeze > 0) return;
    for (const mon of loc.monsters) {
      if (!mon || mon.stun > 0) continue;
      if (mon.atkCool > 0) {
        mon.atkCool--;
        continue;
      }
      const def = MONSTERS[mon.type];
      for (const a of this.actors) {
        if (a.state !== "active" || a.loc !== loc) continue;
        const side = touchSide(mon, a);
        if (side < 0) continue;
        if (def.flag !== 255 && def.flag + 1 >= 3 && (mon.dir & 3) !== side) continue;
        this.monsterHits(mon, a);
        mon.atkCool = this.combatEvery() - 1;
        break;
      }
    }
  }
  monsterHits(mon, a) {
    const m = this.member(a), def = MONSTERS[mon.type];
    mon.fight = mon.hitAlly = this.tickCount;
    a.fightAt = this.tickCount;
    let target = 14 + a.eq.armor - def.lvl;
    if (target < 0) target = 0;
    if (target > 20) target = 20;
    if (this.rng.dice(1, 20) < target) {
      this.sound(11);
      return;
    }
    this.sound(12);
    const k = (def.lvl >> 1) + 1;
    const dmg = k <= 2 ? this.rng.dice(k, 2) : this.rng.dice(2, k);
    m.hp = Math.max(0, m.hp - dmg);
    this.emit("hit", { loc: a.loc.key, x: a.x + 1, y: a.y, dmg, foe: false });
    this.emit("party");
  }
  // ---------------------------------------------------- monsters
  monsterAI(loc) {
    for (const mon of loc.monsters) if (mon && mon.stun > 0) mon.stun--;
    if (loc.freeze > 0) {
      if (this.rng.word() & 1) loc.freeze--;
      return;
    }
    for (const mon of loc.monsters) {
      if (!mon || mon.stun > 0) continue;
      const def = MONSTERS[mon.type];
      if (def.flag === 255) {
        mon.anim ^= 1;
        continue;
      }
      if (def.flag & 1) {
        mon.mv = (mon.mv || 0) + CHASE_SPEED;
        if (mon.mv < 1) continue;
        mon.mv -= 1;
      }
      let want = -1;
      if (loc.kind === "map") {
        const v = loc.view;
        if (mon.x + mon.w < v.x - 4 || mon.x > v.x + this.viewW + 4 || mon.y + mon.h < v.y - 4 || mon.y > v.y + this.viewH + 4) {
          if (mon.x + mon.w < v.x - 16 || mon.x > v.x + this.viewW + 16 || mon.y + mon.h < v.y - 16 || mon.y > v.y + this.viewH + 16) {
            loc.monsters[loc.monsters.indexOf(mon)] = null;
            continue;
          }
        }
      }
      if (def.flag & 1) {
        let best = null, bd = 1e9;
        for (const a of this.actors) if (a.state === "active" && a.loc === loc) {
          const d2 = (mon.x - a.x) ** 2 + (mon.y - a.y) ** 2;
          if (d2 < bd) {
            bd = d2;
            best = a;
          }
        }
        if (best) {
          const dx = best.x - mon.x, dy = best.y - mon.y;
          if (dx >= 0 && dx < mon.w - 1) want = dy > 0 ? 2 : 0;
          else if (dy >= 0 && dy < mon.h - 1) want = dx > 0 ? 1 : 3;
        }
      } else {
        const r = this.rng.byte() & 7;
        if (r < 4) {
          mon.dir = r;
          mon.anim ^= 1;
          continue;
        }
      }
      if (want >= 0 && !this.monsterBlocked(loc, mon, want) && (mon.dir & 3) !== want) {
        mon.dir = want;
        mon.anim ^= 1;
        continue;
      }
      const d = mon.dir & 3;
      if (this.monsterBlocked(loc, mon, d)) {
        mon.dir = d + 1 & 3;
        mon.anim ^= 1;
        continue;
      }
      mon.x += DIRV[d][0];
      mon.y += DIRV[d][1];
      mon.anim ^= 1;
    }
  }
  monsterBlocked(loc, mon, d) {
    const nx = mon.x + DIRV[d][0], ny = mon.y + DIRV[d][1];
    if (nx < 0 || ny < 0 || nx + mon.w > loc.w || ny + mon.h > loc.h) return true;
    for (let j = 0; j < mon.h; j++) for (let i = 0; i < mon.w; i++) if (loc.char(nx + i, ny + j) !== 0) return true;
    for (const c of loc.chests) if (overlap(nx, ny, mon.w, mon.h, c.x, c.y, 2, 2)) return true;
    if (this.monsterAt(loc, nx, ny, mon.w, mon.h, mon)) return true;
    for (const a of this.actors) if (a.state === "active" && a.loc === loc && overlap(nx, ny, mon.w, mon.h, a.x, a.y, 2, 2)) return true;
    return false;
  }
  /** monster type selection ($AE82) */
  pickType(inRoom) {
    const { a, l, h } = this.rng.next();
    let t;
    if ((a << 2 & 255) === 0) t = (l & 15) + 5;
    else {
      let b = 3, x = h;
      for (; b > 0; b--) {
        const b1 = x & 128;
        x = x << 1 & 255;
        if (b1) {
          const b2 = x & 128;
          x = x << 1 & 255;
          if (b2) break;
        } else x = x << 1 & 255;
      }
      t = Math.max(0, 3 * this.floor.level + 1 - b);
      if (t >= 34) t = 33;
    }
    if (!inRoom && t > 0) t--;
    return Math.min(t, 31);
  }
  spawnMonster(loc, type, x, y) {
    const def = MONSTERS[type];
    const sz = { 4: [2, 2], 9: [3, 3], 12: [3, 4] }[def.size] || [4, 4];
    const mon = { type, x, y, w: sz[0], h: sz[1], hp: this.rng.dice(def.lvl, 4), dir: 2, anim: 0, loc };
    return mon;
  }
  /** spawn along a newly revealed edge ($8018). side: 0 top,1 right,2 bottom,3 left */
  spawnEdge(loc, side) {
    const v = loc.view;
    const vcx = v.x >> 2, vcy = v.y >> 2;
    for (let s = 0; s < 8; s++) {
      if (loc.monsters[s]) continue;
      const type = this.pickType(false);
      const cells = [];
      if (side === 0 || side === 2) {
        const cy = side === 0 ? vcy - 1 : vcy + (this.viewH >> 2) + 1;
        if (cy < 0 || cy > 30) continue;
        for (let i = 0; i < this.viewW >> 2; i++) cells.push([vcx + i, cy]);
      } else {
        const cx = side === 3 ? vcx - 1 : vcx + (this.viewW >> 2) + 1;
        if (cx < 0 || cx > 30) continue;
        for (let i = 0; i < this.viewH >> 2; i++) cells.push([cx, vcy + i]);
      }
      for (const [cx, cy] of cells) {
        if (cx < 0 || cx > 30 || cy < 0 || cy > 30 || loc.tile(cx, cy) !== 0) continue;
        if ((this.rng.byte() & 63) !== 0) continue;
        const x = cx * 4, y = cy * 4;
        if (loc.monsters.some((m) => m && Math.abs(m.x - x) < 4 && Math.abs(m.y - y) < 4)) break;
        const mon = this.spawnMonster(loc, type, x, y);
        if (this.monsterBlocked(loc, { ...mon, x: x - DIRV[0][0], y }, 2) && false) break;
        loc.monsters[s] = mon;
        break;
      }
    }
  }
  // ---------------------------------------------------- projectiles (auto-aim, any angle)
  shoot(a, die, color, ptype, target = null, fx = null) {
    if (a.proj) return false;
    a.fightAt = this.tickCount;
    const loc = a.loc;
    let best = target, bd = target ? -1 : 1e9;
    if (!target) {
      for (const m of loc.monsters) if (m) {
        const d = (m.x + m.w / 2 - a.x - 1) ** 2 + (m.y + m.h / 2 - a.y - 1) ** 2;
        if (d < bd) {
          bd = d;
          best = m;
        }
      }
    }
    let vx, vy;
    if (best) {
      const dx = best.x + best.w / 2 - a.x - 1, dy = best.y + best.h / 2 - a.y - 1, l = Math.hypot(dx, dy) || 1;
      vx = dx / l;
      vy = dy / l;
      a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0;
    } else {
      [vx, vy] = DIRV[a.dir];
    }
    const speed = fx && fx.speed || 1;
    a.proj = {
      x: a.x,
      y: a.y,
      vx,
      vy,
      die,
      color,
      ptype,
      loc,
      speed,
      life: fx && fx.ghost ? 400 : Math.ceil(60 / speed),
      pierce: !!(fx && fx.pierce),
      ghost: !!(fx && fx.ghost),
      easy: !!(fx && fx.easy),
      wide: !!(fx && (fx.wide || fx.easy)),
      stun: !!(fx && fx.stun),
      hit: []
    };
    return true;
  }
  moveProjectiles() {
    for (const a of this.actors) {
      const p = a.proj;
      if (!p) continue;
      if (a.state !== "active" || p.loc !== a.loc || --p.life <= 0) {
        a.proj = null;
        continue;
      }
      let done = false;
      for (let s = 0; s < 2 * p.speed && !done; s++) {
        p.x += p.vx * 0.5;
        p.y += p.vy * 0.5;
        const ix = Math.round(p.x), iy = Math.round(p.y);
        let bx = p.x + 0.2, by = p.y + 0.2, bw = 1.6, bh = 1.6;
        if (p.wide) {
          if (Math.abs(p.vx) >= Math.abs(p.vy)) {
            by -= 0.8;
            bh = 3.2;
          } else {
            bx -= 0.8;
            bw = 3.2;
          }
        }
        for (const mon of p.loc.monsters) {
          if (!mon || p.hit.includes(mon) || !overlap(bx, by, bw, bh, mon.x, mon.y, mon.w, mon.h)) continue;
          p.hit.push(mon);
          if (p.stun) mon.stun = STUN_TICKS;
          this.playerAttack(a, mon, p.die, { easy: p.easy });
          if (!p.pierce) {
            done = true;
            break;
          }
        }
        if (done) break;
        if (ix < 0 || iy < 0 || ix > p.loc.w - 2 || iy > p.loc.h - 2) done = true;
        else if (p.ghost) {
          if (p.loc.kind === "map") {
            const v = p.loc.view;
            if (p.x + 2 < v.x || p.y + 2 < v.y || p.x > v.x + this.viewW || p.y > v.y + this.viewH) done = true;
          }
        } else if (this.probe(p.loc, p.x + 0.3, p.y + 0.3, 1.4, 1.4).wall) done = true;
      }
      if (done) a.proj = null;
    }
  }
  // ---------------------------------------------------- regen (HP/MP always; x4 with the ring)
  /**
   * remake: natural recovery (per character)
   *  - resting = has not moved for 2 s and no blows / shots / spells for 2 s
   *  - HP from FOOD: only while resting, (level / 2) points per second, 1 FOOD each
   *  - HP ring: always at the original speed (1/16 per turn), x4 while resting; no FOOD needed; adds to the above
   *  - MP: always 1 point per 2 s; while resting (level / 2) per second. MP ring: original 1/32 per turn, x4 resting
   */
  regen() {
    const SEC = 15, REST = 2 * SEC;
    for (const a of this.actors) {
      if (a.state !== "active") {
        a.still = 0;
        continue;
      }
      const m = this.member(a);
      const moved = a.px !== void 0 && (a.x !== a.px || a.y !== a.py);
      a.still = moved ? 0 : (a.still || 0) + 1;
      const resting = a.still >= REST && this.tickCount - (a.fightAt ?? -1e9) >= REST;
      const lv = m.level / 2 / SEC;
      let changed = false;
      if (m.hp < m.maxhp) {
        if (resting && m.food > 0) {
          a.hpAcc = (a.hpAcc || 0) + lv;
          while (a.hpAcc >= 1 - 1e-9 && m.hp < m.maxhp && m.food > 0) {
            a.hpAcc--;
            m.hp++;
            m.food--;
            changed = true;
          }
        }
        if (a.eq.flags[3]) {
          a.ringAcc = (a.ringAcc || 0) + (resting ? 4 : 1) / 16;
          while (a.ringAcc >= 1 - 1e-9 && m.hp < m.maxhp) {
            a.ringAcc--;
            m.hp++;
            changed = true;
          }
        }
      } else {
        a.hpAcc = 0;
        a.ringAcc = 0;
      }
      if (isCaster(m) && m.mp < m.maxhp) {
        a.mpAcc = (a.mpAcc || 0) + (resting ? lv : 1 / (2 * SEC));
        if (a.eq.flags[4]) a.mpAcc += (resting ? 4 : 1) / 32;
        while (a.mpAcc >= 1 - 1e-9 && m.mp < m.maxhp) {
          a.mpAcc--;
          m.mp++;
          changed = true;
        }
      } else a.mpAcc = 0;
      if (changed) this.emit("party");
      if (m.food === 0 && m.hp < m.maxhp && resting && !a.hungry) {
        a.hungry = true;
        this.msg(`${m.name} \u306E FOOD\u304C \u306A\u304F\u306A\u3063\u305F`);
      }
      if (m.food > 0) a.hungry = false;
    }
  }
  // ---------------------------------------------------- death: restore from inn backup, HP 1
  checkDeaths() {
    for (const a of this.actors) {
      if (a.state === "dead" || a.state === "home") continue;
      const m = this.member(a);
      if (m.hp > 0) continue;
      if (a.state === "active" && this.autoPotion(a)) continue;
      const b = this.backup[a.mi];
      Object.assign(m, JSON.parse(JSON.stringify(b)));
      m.hp = 1;
      a.state = "dead";
      a.proj = null;
      this.sound(13);
      this.msg(`${m.name} \u306F \u3061\u304B\u3089\u3064\u304D\u305F\u2026 \u3084\u3069\u3084\u306B \u3082\u3069\u3055\u308C\u308B`);
      this.emit("party");
      if (this.control.solo === a.i) this.control.solo = -1;
    }
  }
  // ---------------------------------------------------- view follow + edge spawning
  updateViews() {
    const f = this.focusActor();
    if (!f || f.state !== "active" || f.loc.kind !== "map") return;
    const loc = f.loc, v = loc.view;
    const VW = this.viewW, VH = this.viewH, mx = Math.round(VW * 0.34), my = Math.round(VH * 0.36);
    let nx = v.x, ny = v.y;
    if (f.x - v.x < mx) nx = f.x - mx;
    else if (f.x + 2 - v.x > VW - mx) nx = f.x + 2 - VW + mx;
    if (f.y - v.y < my) ny = f.y - my;
    else if (f.y + 2 - v.y > VH - my) ny = f.y + 2 - VH + my;
    nx = Math.round(Math.max(0, Math.min(WORLD - VW, nx)));
    ny = Math.round(Math.max(0, Math.min(WORLD - VH, ny)));
    const ocx = v.x >> 2, ocy = v.y >> 2;
    v.x = nx;
    v.y = ny;
    if (ny >> 2 < ocy) this.spawnEdge(loc, 0);
    else if (ny >> 2 > ocy) this.spawnEdge(loc, 2);
    if (nx >> 2 < ocx) this.spawnEdge(loc, 3);
    else if (nx >> 2 > ocx) this.spawnEdge(loc, 1);
  }
  // ======================================================== ACT button
  runCommand(c) {
    const f = this.focusActor();
    if (c.type === "act") return this.act(f);
    if (c.type === "spell") return this.castSpell(this.actors[c.actor], c.index);
    if (c.type === "bow") return this.fireBow(this.actors[c.actor]);
    if (c.type === "repeat") {
      if (!this.lastSpell) {
        this.msg("\u307E\u3060 \u3058\u3085\u3082\u3093\u3092 \u3064\u304B\u3063\u3066\u3044\u306A\u3044");
        this.sound(1);
        return;
      }
      const a = this.actors.find((o) => o.mi === this.lastSpell.mi);
      if (!a || a.state !== "active") {
        this.msg("\u305D\u306E \u306A\u304B\u307E\u306F \u3044\u307E \u3064\u304B\u3048\u306A\u3044");
        this.sound(1);
        return;
      }
      return this.castSpell(a, this.lastSpell.idx);
    }
    if (c.type === "use") return this.useItem(this.actors[c.actor], c.slot);
    if (c.type === "drop") return this.dropItem(this.actors[c.actor], c.slot);
    if (c.type === "buy") return this.buy(this.actors[c.actor], c.index);
    if (c.type === "quit") return this.homeAll(true);
    if (c.type === "amulet") return this.useAmulet(c.id);
    if (c.type === "home") return this.startHomeRun();
  }
  act(a) {
    if (!a || a.state !== "active") return;
    const loc = a.loc;
    if (loc.kind === "room") {
      if (a.y >= ROOM_H - 3.5 && a.x >= 13.5 && a.x <= 16.5) return this.leaveRoom(a);
      this.msg("\u3067\u3050\u3061\u306F \u3057\u305F\u306E \u3068\u3073\u3089\u3060");
      return;
    }
    const [cx, cy] = this.centerCell(a), t = loc.tile(cx, cy);
    if (loc.town) {
      if (t === 3) return this.goHome(a);
      if (t === 5) {
        this.emit("shop", { actor: a.i });
        return;
      }
      if (t === 7 || t === 9) return this.enterRoom(a, cx, cy);
      if (t >= 12) return this.enterStairs(a, cx, cy);
    } else {
      if (t === 12 || t === 14) return this.enterStairs(a, cx, cy);
      if (t === 16) return this.enterRoom(a, cx, cy);
    }
    this.sound(1);
  }
  gatherWith(a) {
    return this.actors.filter((o) => o === a || (o.state === "active" || o.state === "pending") && o.loc === a.loc);
  }
  enterStairs(a, cx, cy) {
    this.sound(3);
    for (const o of this.gatherWith(a)) {
      o.state = "gone";
      o.via = { cx, cy, order: this.tickCount };
      o.proj = null;
    }
    this.tryTravel();
  }
  tryTravel() {
    const live = this.living();
    if (live.some((o) => o.state === "active")) {
      this.msg("\u306A\u304B\u307E\u304C \u305D\u308D\u3046\u306E\u3092 \u307E\u3063\u3066\u3044\u308B");
      this.emit("wait");
      return;
    }
    const gone = live.filter((o) => o.state === "gone" && o.via).sort((p, q) => p.via.order - q.via.order);
    if (!gone.length) return;
    const { cx, cy } = gone[0].via;
    const cur = this.floor.f;
    const ent = this.floor.entries.find(([x, y, t]) => x === cx && y === cy && (t === 11 || t === 13));
    if (!ent) return;
    const dest = ent[3];
    const back = ROM.floors[dest].entries.find(([x, y, t, d]) => (t === 11 || t === 13) && d === cur);
    this.mapStairs(cur, cx, cy, dest, back ? back[0] : void 0, back ? back[1] : void 0);
    this.loadFloor(dest, back ? [back[0], back[1]] : [ent[0], ent[1]]);
  }
  enterRoom(a, cx, cy) {
    const key = `r${cx},${cy}`;
    let room = this.floor.rooms.get(key);
    const fresh = !room || !this.actors.some((o) => o.state === "active" && o.loc === room);
    this.mapRoomEntered(cx, cy);
    if (fresh) {
      room = this.buildRoom(key, cx, cy);
      this.floor.rooms.set(key, room);
    }
    this.sound(3);
    const group = this.gatherWith(a);
    group.forEach((o, k) => {
      o.loc = room;
      o.state = "pending";
      o.x = 15;
      o.y = 18;
      o.timer = 4 + k * 8;
      o.proj = null;
    });
    this.emit("loc");
  }
  leaveRoom(a) {
    const room = a.loc, [cx, cy] = room.doorCell;
    this.sound(3);
    const group = this.gatherWith(a);
    group.forEach((o, k) => {
      o.loc = this.mapLoc;
      o.state = "pending";
      o.x = cx * 4 + 1;
      o.y = cy * 4 + 2;
      o.timer = 2 + k * 8;
      o.proj = null;
    });
    this.centerView(this.mapLoc, cx * 4 + 1, cy * 4 + 2);
    this.emit("loc");
  }
  buildRoom(key, cx, cy) {
    const town = this.mapLoc.town;
    const room = new RoomLoc(key, town, [cx, cy]);
    const B = room.buf, W3 = ROOM_W;
    for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < W3; x++) B[y * W3 + x] = town ? 9 : y & 1 ? 3 + (x & 1) : 1 + (x & 1);
    if (!town) {
      B[18 * W3 + 14] = 7;
      B[18 * W3 + 17] = 7;
      B[19 * W3 + 14] = 7;
      B[19 * W3 + 17] = 7;
    }
    B[18 * W3 + 15] = B[18 * W3 + 16] = B[19 * W3 + 15] = B[19 * W3 + 16] = 0;
    for (let y = 2; y < 18; y++) for (let x = 2; x < 30; x++) B[y * W3 + x] = 0;
    const blk = (x, y) => {
      const c = town ? [9, 9, 9, 9] : [1, 2, 3, 4];
      B[y * W3 + x] = c[0];
      B[y * W3 + x + 1] = c[1];
      B[(y + 1) * W3 + x] = c[2];
      B[(y + 1) * W3 + x + 1] = c[3];
    };
    const bits = cx + cy;
    if (bits & 1) for (let i = 0; i < 6; i++) blk(5 + 2 * i, 9);
    if (bits & 2) for (let i = 0; i < 6; i++) blk(15 + 2 * i, 9);
    if (bits & 4) for (let i = 0; i < 3; i++) blk(15, 5 + 2 * i);
    if (bits & 8) for (let i = 0; i < 3; i++) blk(15, 9 + 2 * i);
    const L = this.floor.level;
    let n = this.rng.dice(1, Math.max(0, 7 - (L + 1 >> 1)) + 1);
    if ((this.rng.byte() << 2 & 255) === 0) n = 8;
    for (let s = 0; s < n; s++) {
      const type = this.pickType(true);
      const x = this.rng.byte() % 27 + 2, y = this.rng.byte() % 15 + 2;
      const mon = this.spawnMonster(room, type, x, y);
      let free = true;
      for (let j = 0; j < mon.h && free; j++) for (let i = 0; i < mon.w; i++) if (room.char(x + i, y + j) !== 0) {
        free = false;
        break;
      }
      if (free && !this.monsterAt(room, x, y, mon.w, mon.h)) room.monsters[s] = mon;
    }
    if (!this.floor.visited.has(key)) {
      this.floor.visited.add(key);
      const k = this.rng.dice(1, (L + 1) * 4);
      for (let i = 0; i < k; i++) {
        const p = this.rng.word() % 320, x = p % 32, y = p / 32 | 0;
        if (x > 30) continue;
        let free = true;
        for (let j = 0; j < 2; j++) for (let q = 0; q < 2; q++) if (room.char(x + q, y + j) !== 0) free = false;
        if (free && !room.chests.some((c) => overlap(x, y, 2, 2, c.x, c.y, 2, 2)) && !this.monsterAt(room, x, y)) room.chests.push({ x, y });
      }
    }
    return room;
  }
  goHome(a) {
    this.sound(3);
    for (const o of this.gatherWith(a)) {
      o.state = "home";
      o.proj = null;
    }
    if (this.actors.every((o) => o.state === "home" || o.state === "dead")) this.emit("inn");
    else this.msg("\u306A\u304B\u307E\u304C \u3082\u3069\u308B\u306E\u3092 \u307E\u3063\u3066\u3044\u308B");
  }
  homeAll(quit = false) {
    for (const o of this.actors) if (o.state !== "dead") o.state = "home";
    this.emit("inn", { quit });
  }
  // ---------------------------------------------------- spells / bow / items
  castSpell(a, idx, opts = {}) {
    if (!a || a.state !== "active") return;
    const m = this.member(a), list = SPELLS[m.cls];
    if (!list || idx < 1 || idx > spellsKnown(m.cls, m.level)) return;
    const sp = list[idx];
    if (m.mp < idx) {
      this.msg("MP\u304C \u305F\u308A\u306A\u3044");
      this.sound(1);
      return;
    }
    if (sp.kind === "shot" && a.proj) return;
    m.mp -= idx;
    this.emit("party");
    a.fightAt = this.tickCount;
    if (!opts.auto) {
      this.lastSpell = { mi: a.mi, idx };
      a.lastAtk = idx;
    }
    this.sound(10);
    const loc = a.loc;
    if (sp.kind === "shot") this.shoot(a, sp.die, sp.color, sp.ptype, opts.target || null, sp);
    else if (sp.kind === "guard") {
      if (!a.gank) {
        a.gank = m.level;
        a.eq = evalEquip(m, a.gank);
        this.msg("\u307E\u3082\u308A\u306E \u3061\u304B\u3089\u304C \u307F\u3092\u3064\u3064\u3080");
      }
    } else if (sp.kind === "heal") {
      for (const o of this.actors) if (o.state === "active" && o.loc === loc) {
        const om = this.member(o);
        om.hp = Math.min(om.maxhp, om.hp + this.rng.dice(1, m.level));
      }
      this.emit("party");
    } else if (sp.kind === "freeze") {
      const q = Math.floor(m.level * 4 / (this.floor.level + 1)) + 1;
      loc.freeze = Math.min(255, loc.freeze + 8 * this.rng.dice(1, q));
      this.msg("MONSTER\u306E \u3046\u3054\u304D\u304C \u3068\u307E\u3063\u305F");
    } else if (sp.kind === "home") this.homeAll();
  }
  fireBow(a) {
    if (!a || a.state !== "active" || !a.eq.bow) return;
    if (this.shoot(a, a.eq.bow, 8, 0)) this.sound(9);
  }
  /** v0.20: warp with one of the party's amulets (they never break) */
  useAmulet(id) {
    if (!this.hasAmulet(id) || !this.living().some((o) => o.state === "active")) {
      this.sound(1);
      return false;
    }
    const [f, x, y] = ROM.warp[id - 46];
    this.sound(3);
    this.msg(`${itemName(id)} \u3092 \u3064\u304B\u3063\u305F`);
    this.warping = true;
    for (const o of this.living()) {
      o.state = "gone";
      o.proj = null;
    }
    this.loadFloor(f, [x, y]);
    return true;
  }
  useItem(a, slot) {
    if (!a || a.state !== "active") return;
    const m = this.member(a), id = m.items[slot];
    const k = ITEM_KIND(id);
    if (k === "amulet") {
      const [f, x, y] = ROM.warp[id - 46];
      this.sound(3);
      this.warping = true;
      for (const o of this.living()) {
        o.state = "gone";
        o.proj = null;
      }
      this.loadFloor(f, [x, y]);
      return;
    }
    if (k !== "potion") {
      this.sound(1);
      this.msg("\u3064\u304B\u3048\u306A\u3044");
      return;
    }
    if (!canUse(id, m.cls)) {
      this.sound(6);
      m.items[slot] = 0;
      a.eq = evalEquip(m, a.gank);
      this.emit("party");
      this.msg("\u3053\u3046\u304B\u304C \u306A\u304B\u3063\u305F");
      return;
    }
    m.items[slot] = 0;
    this.sound(7);
    const v = itemValue(id);
    const heal = (n) => {
      m.hp = Math.min(m.maxhp, m.hp + n);
    };
    const mana = (n) => {
      m.mp = Math.min(m.maxhp, m.mp + n);
    };
    if (v === 0) heal(this.rng.dice(1, 20));
    else if (v === 2) heal(this.rng.dice(1, 60));
    else if (v === 4) heal(this.rng.dice(1, 255));
    else if (v === 6) mana(this.rng.dice(1, 20));
    else if (v === 8) mana(this.rng.dice(1, 60));
    else if (v === 10) mana(this.rng.dice(1, 255));
    else if (v === 12) {
      const g = this.rng.dice(1, 10);
      m.maxhp = Math.min(255, m.maxhp + g);
      m.hp = Math.min(255, m.hp + g);
    }
    a.eq = evalEquip(m, a.gank);
    this.emit("party");
  }
  dropItem(a, slot) {
    if (!a) return;
    const m = this.member(a), id = m.items[slot];
    if (!id) return;
    m.items[slot] = 0;
    if (a.loc && a.loc.kind === "room") a.loc.ground.push({ id, x: a.x, y: a.y + 2 < ROOM_H - 2 ? a.y + 2 : a.y - 2 });
    a.eq = evalEquip(m, a.gank);
    this.sound(6);
    this.emit("party");
  }
  buy(a, index) {
    const m = this.member(a), it = SHOP[index];
    if (!it) return "none";
    if (m.gold < it.price) return "gold";
    const slot = m.items.indexOf(0);
    if (slot < 0) return "full";
    m.gold -= it.price;
    m.items[slot] = it.id;
    a.eq = evalEquip(m, a.gank);
    this.sound(8);
    this.emit("party");
    return "ok";
  }
  // ---------------------------------------------------- transitions
  checkTransitions() {
    const live = this.living();
    if (!live.length) {
      const wiped = this.actors.length > 0 && this.actors.every((o) => o.state === "dead");
      if (wiped && this.sharedBackup) Object.assign(this.shared, this.sharedBackup);
      this.emit("inn");
      this.mode = "returning";
      return;
    }
    if (live.every((o) => o.state === "gone") && live.some((o) => o.via)) this.tryTravel();
  }
};
installAI(Game);
installAutomap(Game);
function overlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1;
}
function touchSide(mon, a) {
  const gx = Math.max(mon.x - (a.x + 2), a.x - (mon.x + mon.w));
  const gy = Math.max(mon.y - (a.y + 2), a.y - (mon.y + mon.h));
  if (gx > 0.6 || gy > 0.6 || Math.min(gx, gy) > -0.3) return -1;
  if (gy >= gx) return a.y < mon.y ? 0 : 2;
  return a.x > mon.x ? 1 : 3;
}

// src/scene/text.js
import Phaser from "phaser";
var KANA = "\u3042\u3044\u3046\u3048\u304A\u304B\u304D\u304F\u3051\u3053\u3055\u3057\u3059\u305B\u305D\u305F\u3061\u3064\u3066\u3068\u306A\u306B\u306C\u306D\u306E\u306F\u3072\u3075\u3078\u307B\u307E\u307F\u3080\u3081\u3082\u3084\u3086\u3088\u3089\u308A\u308B\u308C\u308D\u308F\u3093";
var SMALL = { "\u3092": 6, "\u3041": 7, "\u3043": 8, "\u3045": 9, "\u3047": 10, "\u3049": 11, "\u3083": 12, "\u3085": 13, "\u3087": 14, "\u3063": 15, "\u309B": 62, "\u309C": 63 };
var DAKU = "\u304C\u304E\u3050\u3052\u3054\u3056\u3058\u305A\u305C\u305E\u3060\u3062\u3065\u3067\u3069\u3070\u3073\u3076\u3079\u307C";
var DAKU_BASE = "\u304B\u304D\u304F\u3051\u3053\u3055\u3057\u3059\u305B\u305D\u305F\u3061\u3064\u3066\u3068\u306F\u3072\u3075\u3078\u307B";
var HANDAKU = "\u3071\u3074\u3077\u307A\u307D";
var HANDAKU_BASE = "\u306F\u3072\u3075\u3078\u307B";
function codeChar(c) {
  if (c >= 192 && c <= 255) return String.fromCharCode(c - 160);
  if (c >= 17 && c <= 61) return KANA[c - 17];
  for (const k in SMALL) if (SMALL[k] === c) return k;
  return String.fromCharCode(57344 + c);
}
function registerFont(scene, key = "dmfont", image = "dm_fontimg") {
  let chars = "";
  for (let c = 0; c < 256; c++) chars += codeChar(c);
  const cfg = { image, width: 8, height: 8, chars, charsPerRow: 16, spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 } };
  scene.cache.bitmapFont.add(key, Phaser.GameObjects.RetroFont.Parse(scene, cfg));
  return key;
}
function toFont(s) {
  let out = "";
  for (const ch of String(s)) {
    let i;
    if ((i = DAKU.indexOf(ch)) >= 0) out += DAKU_BASE[i] + "\u309B";
    else if ((i = HANDAKU.indexOf(ch)) >= 0) out += HANDAKU_BASE[i] + "\u309C";
    else if (ch >= "a" && ch <= "z") out += ch.toUpperCase();
    else if (ch === "!" || ch === "?" || ch === "\u2026") out += ch === "\u2026" ? "..." : ch;
    else out += ch;
  }
  return out;
}

// src/scene/mapview.js
import Phaser2 from "phaser";
var W = 540;
var MSX = [0, 0, 2213954, 6216824, 5527021, 8222460, 13914701, 4385781, 16536916, 16742776, 13943124, 15126144, 2207803, 13196218, 13421772, 16777215];
var KEY_RGB = ROM.keyColors.map((c) => MSX[c >> 4]);
var MEMBER_RGB = [7311336, 15781968, 12096752, 15749224];
var C = {
  floor: 1977416,
  wall: 10132136,
  door: 12615744,
  stairs: 16764992,
  entrance: 16744496,
  warp: 12607712,
  shop: 4243711
};
var hex = (n) => "#" + n.toString(16).padStart(6, "0");
var BIG = { x: 14, y: 128, s: 4 };
var CELL = 4 * BIG.s;
function charColor(loc, x, y) {
  const k = charKind(loc, x, y), t = loc.tile(x >> 2, y >> 2);
  if (!loc.town && t === 7) return k === 0 ? C.warp : C.wall;
  if (k === 0) return C.floor;
  if (k === 1) return C.wall;
  if (loc.town) {
    if (t === 11 || t === 12) return C.stairs;
    if (t === 2 || t === 3 || t === 4 || t === 5) return C.shop;
    if (t >= 6 && t <= 9) return C.entrance;
    return C.wall;
  }
  if (t >= 11 && t <= 14) return C.stairs;
  if (t === 15 || t === 16) return C.entrance;
  if (t === 5 || t === 6) return KEY_RGB[loc.entryIdx.get((y >> 2) * 32 + (x >> 2)) ?? 0];
  return C.door;
}
var MapView = {
  // ------------------------------------------------------------ canvas helpers
  /** draw the explored part of floor f into a canvas texture (s px per character) */
  paintFloor(key, f, s) {
    const g = this.game_, loc = f >= 0 ? floorLoc(g, f) : null;
    let tex = this.textures.exists(key) ? this.textures.get(key) : null;
    if (!tex) {
      tex = this.textures.createCanvas(key, 128 * s, 124 * s);
      tex.setFilter(Phaser2.Textures.FilterMode.NEAREST);
    }
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 128 * s, 124 * s);
    if (!loc) {
      tex.refresh();
      return tex;
    }
    for (let cy = 0; cy < 31; cy++) for (let cx = 0; cx < 32; cx++) {
      if (!g.isSeen(f, cx, cy)) continue;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const x = cx * 4 + i, y = cy * 4 + j;
        ctx.fillStyle = hex(charColor(loc, x, y));
        ctx.fillRect(x * s, y * s, s, s);
      }
    }
    tex.refresh();
    return tex;
  },
  // ------------------------------------------------------------ minimap
  /** top-left of the map view; moves to the top-right while the controlled character is in the upper-left quarter */
  miniPos() {
    const v = this.L.view, w = 128 * (this.miniS || 1);
    return { x: this.miniRight ? v.x + v.w - w - 4 : v.x + 4, y: v.y + 4 };
  },
  buildMinimap() {
    const MINI = this.miniPos();
    this.miniBg = this.ui(this.add.rectangle(MINI.x - 2, MINI.y - 2, 132, 128, 0, 0.35).setOrigin(0));
    this.paintFloor("dm_minimap", -1, 1);
    this.miniImg = this.ui(this.add.image(MINI.x, MINI.y, "dm_minimap").setOrigin(0).setAlpha(0.75));
    this.miniDots = this.ui(this.add.graphics());
    const z = this.ui(this.add.zone(MINI.x - 2, MINI.y - 2, 132, 128).setOrigin(0).setInteractive());
    z.on("pointerdown", () => {
      if (this.game_.mode === "play" && !this.overlay) this.openMap(this.game_.floor.f);
    });
    this.miniZone = z;
    this.miniState = { f: -2, dirty: -1 };
    this.setMinimapVisible(false);
  },
  setMinimapVisible(v) {
    for (const o of [this.miniBg, this.miniImg, this.miniDots, this.miniZone]) o.setVisible(v);
    if (this.miniZone.input) this.miniZone.input.enabled = v;
  },
  updateMinimap() {
    const g = this.game_;
    const show = g.mode === "play" && !!g.floor && !this.overlay;
    this.setMinimapVisible(show);
    if (!show) return;
    const f = g.floor.f;
    const lead = g.focusActor(), mv = g.mapLoc.view;
    const right = !!(lead && lead.loc === g.mapLoc && lead.x + 1 - mv.x < g.viewW / 2 && lead.y + 1 - mv.y < g.viewH / 2);
    const ms = lead && lead.loc && lead.loc.kind === "room" ? 0.5 : 1;
    if (right !== !!this.miniRight || ms !== (this.miniS || 1)) {
      this.miniRight = right;
      this.miniS = ms;
      const P = this.miniPos();
      this.miniBg.setPosition(P.x - 2, P.y - 2).setSize(128 * ms + 4, 124 * ms + 4);
      this.miniImg.setPosition(P.x, P.y).setScale(ms);
      this.miniZone.setPosition(P.x - 2, P.y - 2).setSize(128 * ms + 4, 124 * ms + 4);
      if (this.miniZone.input) this.miniZone.input.hitArea.setSize(128 * ms + 4, 124 * ms + 4);
      this.miniKey = null;
    }
    if (this.miniState.f !== f || this.miniState.dirty !== g.mapDirty) {
      this.paintFloor("dm_minimap", f, 1);
      this.miniState = { f, dirty: g.mapDirty };
    }
    const d = this.miniDots;
    const v = g.mapLoc.view, MINI = this.miniPos();
    const blink = !!g.auto && performance.now() % 600 < 380;
    const key = `${MINI.x},${this.miniS},${v.x},${v.y},${blink},` + g.actors.map((a) => `${a.state}${a.loc === g.mapLoc ? "m" : a.loc && a.loc.kind}${Math.round(a.x)},${Math.round(a.y)}`).join(";");
    if (key === this.miniKey) return;
    this.miniKey = key;
    d.clear();
    const k = this.miniS || 1;
    if (k === 1) d.lineStyle(1, 16777215, 0.6).strokeRect(MINI.x + v.x, MINI.y + v.y, g.viewW, g.viewH);
    for (const a of g.actors) {
      if (a.state !== "active" && a.state !== "pending") continue;
      let x, y;
      if (a.loc === g.mapLoc) {
        x = a.x + 1;
        y = a.y + 1;
      } else if (a.loc && a.loc.kind === "room") {
        x = a.loc.doorCell[0] * 4 + 2;
        y = a.loc.doorCell[1] * 4 + 2;
      } else continue;
      d.fillStyle(MEMBER_RGB[g.members[a.mi].cls], 1).fillRect(MINI.x + x * k - 1.5, MINI.y + y * k - 1.5, 3, 3);
    }
    if (g.auto && performance.now() % 600 < 380) d.lineStyle(2, 16777024, 1).strokeRect(MINI.x + g.auto.tx * k - 2, MINI.y + g.auto.ty * k - 2, 6, 6);
  },
  // ------------------------------------------------------------ full floor map
  openMap(f) {
    const g = this.game_;
    this.mapFloor = f;
    this.openOverlay("map", (c) => {
      const F = this.frame(), land = F.land, RX = 744;
      BIG.y = land ? 22 : 128;
      c.add(this.add.rectangle(0, 0, F.W, F.H, 329228, 0.96).setOrigin(0));
      this.mapTabs(c, "map");
      const visited = g.automap.floors.includes(f);
      const name = ROM.floors[f].name;
      this.ot(c, land ? RX : W / 2, land ? 72 : 104, visited ? bTitle(f) : `${bLabel(f)}  ????`, 2, 16777088, 0.5);
      c.add(this.add.rectangle(BIG.x - 2, BIG.y - 2, 516, 500, 0).setOrigin(0).setStrokeStyle(2, 5592439));
      if (!visited || f === 29 && g.floor && g.floor.f !== 29) {
        this.ot(c, BIG.x + 256, BIG.y + 230, f === 29 && visited ? "\u3053\u306E\u304B\u3044\u306F \u304F\u308B\u305F\u3073\u306B \u304B\u308F\u308B" : "\u307E\u3060 \u3044\u3063\u305F\u3053\u3068\u304C\u306A\u3044", 2, 11184810, 0.5);
      } else {
        if (this.bigKey && this.textures.exists(this.bigKey)) this.textures.remove(this.bigKey);
        this.bigKey = "dm_bigmap" + (this.bigN = (this.bigN || 0) + 1);
        this.paintFloor(this.bigKey, f, BIG.s);
        c.add(this.add.image(BIG.x, BIG.y, this.bigKey).setOrigin(0));
        this.mapMarks(c, f);
        const lead = g.focusActor();
        if (g.mode === "play" && g.floor && g.floor.f === f && lead && lead.loc === g.mapLoc) {
          const note = land ? this.ot(c, RX, 100, "\u3044\u304D\u3055\u304D\u3092 \u305F\u3063\u3077\u3067 \u3058\u3069\u3046 \u3044\u3069\u3046", 2, 8965375, 0.5) : this.ot(c, W / 2, BIG.y + 504, "\u3044\u304D\u3055\u304D\u3092 \u305F\u3063\u3077\u3067 \u3058\u3069\u3046 \u3044\u3069\u3046", 2, 8965375, 0.5);
          const z = this.add.zone(BIG.x, BIG.y, 512, 496).setOrigin(0).setInteractive();
          c.add(z);
          let down = null;
          z.on("pointerdown", (p) => {
            down = { x: p.x, y: p.y };
          });
          z.on("pointerup", (p) => {
            if (!down || Math.abs(p.x - down.x) + Math.abs(p.y - down.y) > 12) return;
            const lp = this.logical(p);
            const cx = Math.floor((lp.x - BIG.x) / CELL), cy = Math.floor((lp.y - BIG.y) / CELL);
            if (cx >= 0 && cx < 32 && cy >= 0 && cy < 31 && g.isSeen(f, cx, cy) && g.autopilotTo(cx, cy)) {
              this.closeOverlay();
              this.handleEvents();
              this.se(1);
            } else {
              note.setText(toFont("\u305D\u3053\u306B\u306F \u3044\u3051\u307E\u305B\u3093")).setTint(16744576);
              this.se(1);
            }
          });
        }
      }
      this.mapLegend(c, land ? 548 : 24, land ? 126 : 650, land ? 200 : 260);
      this.mapShared(c, land, "map");
    }, { alpha: 1, land: true, rebuild: () => this.openMap(f) });
  },
  /**
   * v0.20: the party's keys and amulets (shared), amulets usable by tapping them, and the INN button (run back home).
   * portrait: a strip at the bottom / landscape: under the legend on the right.
   */
  mapShared(c, land, from) {
    const g = this.game_, sh = g.shared, play = g.mode === "play" && !!g.floor;
    const x0 = land ? 548 : 24, y0 = land ? 336 : 852, ix = land ? 652 : 128, step = land ? 32 : 36;
    const gr = this.add.graphics();
    c.add(gr);
    this.ot(c, x0, y0 + 8, "KEY", 2, 14540253);
    for (let k = 0; k < 7; k++) {
      const x = ix + k * step;
      if (sh.keys & 1 << k) c.add(this.add.sprite(x, y0, "dm_items", 52 + k).setOrigin(0).setScale(1.75));
      else gr.lineStyle(1, 4473941, 1).strokeRect(x + 4, y0 + 4, 20, 20);
    }
    this.ot(c, x0, y0 + 50, "AMULET", 2, 14540253);
    this.amuletHits = [];
    for (let k = 0; k < 6; k++) {
      const x = ix + k * step, y = y0 + 42, id = 46 + k;
      if (!g.hasAmulet(id)) {
        gr.lineStyle(1, 4473941, 1).strokeRect(x + 4, y + 4, 20, 20);
        continue;
      }
      const hit = this.add.rectangle(x - 3, y - 3, step - 2, 34, 3153992).setOrigin(0).setStrokeStyle(1, C.warp);
      c.add(hit);
      c.add(this.add.sprite(x, y, "dm_items", id).setOrigin(0).setScale(1.75));
      if (play) {
        hit.setInteractive();
        hit.on("pointerdown", () => this.askWarp(id, from));
      }
      this.amuletHits.push({ id, x: x - 3, y: y - 3, w: step - 2, h: 34 });
    }
    if (play) {
      this.ot(c, x0, y0 + 88, "AMULET\u3092 \u305F\u3063\u3077\u3067 WARP", 1, 10062011);
      const [bx, by, bw, bh] = land ? [744, 470, 220, 54] : [458, 890, 140, 70];
      this.innBtn = this.ob(c, bx, by, bw, bh, "INN\u3078", () => this.startHome(), 2121792);
    }
  },
  /** INN button: run back to the inn (or say why not) */
  startHome() {
    const g = this.game_, r = g.canGoHome();
    if (r !== "ok") {
      this.se(1);
      const txt = { room: "\u3078\u3084\u3092 \u3067\u3066\u304B\u3089 \u306B\u3057\u3088\u3046", noway: "\u304B\u3048\u308A\u307F\u3061\u304C \u308F\u304B\u3089\u306A\u3044" }[r] || "\u3044\u307E\u306F \u3067\u304D\u306A\u3044";
      const F = this.frame(), y = F.land ? 500 : 820;
      if (this.overlay) {
        const t = this.ot(this.overlay.c, F.land ? 744 : W / 2, y, txt, 2, 16744576, 0.5);
        this.later(1500, () => t.destroy());
      }
      return;
    }
    this.closeOverlay();
    g.command({ type: "home" });
    this.se(1);
  },
  /** confirm before warping with a shared amulet */
  askWarp(id, from) {
    const g = this.game_, [wf] = ROM.warp[id - 46], back = () => from === "tree" ? this.openTree() : this.openMap(this.mapFloor ?? g.floor.f);
    this.openOverlay("warp", (c) => {
      const F = this.frame(), x0 = F.W / 2 - 230, y0 = F.H / 2 - 120;
      c.add(this.box(x0, y0, 460, 240));
      c.add(this.add.sprite(F.W / 2 - 16, y0 + 22, "dm_items", id).setOrigin(0).setScale(2));
      const COL = ["GREEN", "BLUE", "CYAN", "RED", "YELLOW", "PURPLE"];
      this.ot(c, F.W / 2, y0 + 64, `${COL[id - 46]} AMULET \u3067`, 2, 16777215, 0.5);
      this.ot(c, F.W / 2, y0 + 96, `${bTitle(wf)} \u3078 WARP?`, 2, 16777088, 0.5);
      this.ob(c, F.W / 2 - 110, y0 + 180, 180, 56, "\u306F\u3044", () => {
        this.closeOverlay();
        g.command({ type: "amulet", id });
      });
      this.ob(c, F.W / 2 + 110, y0 + 180, 180, 56, "\u3044\u3044\u3048", back);
    }, { land: true, rebuild: () => this.askWarp(id, from) });
  },
  mapTabs(c, cur) {
    const land = this.frame().land;
    const T = land ? [[636, 32, 170, 44], [816, 32, 170, 44], [930, 32, 48, 44]] : [[150, 60, 200, 48], [360, 60, 200, 48], [500, 60, 56, 48]];
    this.ob(c, ...T[0], "MAP", () => {
      if (cur !== "map") this.openMap(this.mapFloor ?? this.game_.floor.f);
    }, cur === "map" ? 4210816 : 2105392);
    this.ob(c, ...T[1], "TREE", () => {
      if (cur !== "tree") this.openTree();
    }, cur === "tree" ? 4210816 : 2105392);
    this.ob(c, ...T[2], "X", () => this.closeOverlay(), 6299680);
  },
  mapMarks(c, f) {
    const g = this.game_, am = g.automap, gr = this.add.graphics();
    c.add(gr);
    this.mapFloor = f;
    const cur = g.floor && g.floor.f === f;
    const at = (cx, cy) => [BIG.x + cx * CELL, BIG.y + cy * CELL];
    const ever = am.rooms[f] || [];
    for (const i of ever) {
      const cx = i % 32, cy = i / 32 | 0, [x, y] = at(cx, cy);
      const now = cur && g.floor.visited.has(`r${cx},${cy}`);
      gr.lineStyle(now ? 3 : 2, now ? 16777024 : 4251744, 1);
      gr.beginPath();
      gr.moveTo(x + 3, y + 8);
      gr.lineTo(x + 7, y + 12);
      gr.lineTo(x + 14, y + 3);
      gr.strokePath();
    }
    for (const o of am.found) if (o.f === f) {
      const [x, y] = at(o.cx, o.cy);
      c.add(this.add.sprite(x, y - CELL, "dm_items", o.id).setOrigin(0));
    }
    for (const k of am.rewardRooms || []) {
      const [rf, rx, ry] = k.split(",").map(Number);
      if (rf !== f || am.found.some((o) => o.f === rf && o.cx === rx && o.cy === ry)) continue;
      const [x, y] = at(rx, ry);
      c.add(this.add.rectangle(x + CELL / 2, y - CELL / 2, 14, 14, 0, 0.85).setStrokeStyle(1, 16764992));
      c.add(this.add.bitmapText(x + CELL / 2, y - CELL / 2 - 4, this.font, "?").setOrigin(0.5, 0).setTint(16764992));
    }
    for (const o of am.found) if (o.id >= 46 && o.id <= 51) {
      const [wf, wx, wy] = ROM.warp[o.id - 46];
      if (wf !== f) continue;
      const [x, y] = at(wx, wy);
      gr.lineStyle(2, C.warp, 1).strokeCircle(x + CELL / 2, y + CELL / 2, CELL * 0.75);
      c.add(this.add.sprite(x + CELL, y - CELL / 2, "dm_items", o.id).setOrigin(0).setScale(0.75));
    }
    for (const k in am.stairs) {
      const [sf, cx, cy] = k.split(",").map(Number);
      if (sf !== f || !g.isSeen(f, cx, cy)) continue;
      const [x, y] = at(cx, cy);
      const d = am.stairs[k], t = this.add.bitmapText(x + CELL / 2, y + CELL + 1, this.font, toFont(`B${floorLevel(d)} ${shortName(d)}`)).setOrigin(0.5, 0).setTint(16764992);
      c.add(this.add.rectangle(t.x, t.y + 4, t.width + 4, 10, 0, 0.8));
      c.add(t);
    }
    if (cur) for (const a of g.actors) {
      if (a.state !== "active" && a.state !== "pending") continue;
      let x, y;
      if (a.loc === g.mapLoc) {
        x = a.x + 1;
        y = a.y + 1;
      } else if (a.loc && a.loc.kind === "room") {
        x = a.loc.doorCell[0] * 4 + 2;
        y = a.loc.doorCell[1] * 4 + 2;
      } else continue;
      gr.fillStyle(0, 1).fillCircle(BIG.x + x * BIG.s, BIG.y + y * BIG.s, 6);
      gr.fillStyle(MEMBER_RGB[g.members[a.mi].cls], 1).fillCircle(BIG.x + x * BIG.s, BIG.y + y * BIG.s, 4.5);
    }
  },
  mapLegend(c, x0 = 24, y0 = 650, colW = 260) {
    const gr = this.add.graphics();
    c.add(gr);
    const sw = (x, y2, col) => gr.fillStyle(col, 1).fillRect(x, y2 + 2, 12, 12);
    const items = [[C.stairs, "\u304B\u3044\u3060\u3093"], [C.entrance, "\u3078\u3084\u306E \u3044\u308A\u3050\u3061"], [C.door, "\u3068\u3073\u3089"], [C.warp, "\u307E\u307B\u3046\u3058\u3093"]];
    items.forEach(([col, s], i) => {
      const x = x0 + i % 2 * colW, y2 = y0 + 12 + (i / 2 | 0) * 26;
      sw(x, y2, col);
      this.ot(c, x + 20, y2 + 2, s, 2, 14540253);
    });
    let y = y0 + 70;
    const check = (x, w, col) => {
      gr.lineStyle(w, col).beginPath();
      gr.moveTo(x + 3, y + 8);
      gr.lineTo(x + 7, y + 12);
      gr.lineTo(x + 14, y + 3);
      gr.strokePath();
    };
    check(x0, 2, 4251744);
    this.ot(c, x0 + 20, y + 2, "\u306F\u3044\u3063\u305F \u3078\u3084", 2, 14540253);
    check(x0 + colW, 3, 16777024);
    this.ot(c, x0 + colW + 17, y + 2, "\u3053\u3093\u304B\u3044 \u306F\u3044\u3063\u305F", 2, 14540253);
    y += 26;
    ROM.keyColors.forEach((_, i) => gr.fillStyle(KEY_RGB[i], 1).fillRect(x0 + i * 16, y + 2, 12, 12));
    this.ot(c, x0 + 7 * 16 + 8, y + 2, "\u304B\u304E\u306E \u3068\u3073\u3089(\u3044\u308D)", 2, 14540253);
    y += 26;
    this.ot(c, x0, y + 2, "B1 UMQI: \u304B\u3044\u3060\u3093\u306E \u3044\u304D\u3055\u304D", 2, 14540253);
    y += 26;
    this.ot(c, x0, y + 2, "?: \u306A\u306B\u304B\u304C \u3042\u308B \u3078\u3084", 2, 14540253);
    y += 26;
    this.ot(c, x0, y + 2, "\u3066\u306B\u3044\u308C\u305F \u3082\u306E \u306F \u3078\u3084\u306E \u3046\u3048\u306B \u3067\u308B", 2, 14540253);
  },
  // ------------------------------------------------------------ dungeon tree (by depth: TOWN, B1F .. B10F)
  openTree() {
    const g = this.game_, am = g.automap, D = this.treeD || (this.treeD = depthLayout());
    this.openOverlay("tree", (c) => {
      const F = this.frame(), FW = F.W, FH = F.H, land = F.land, top = land ? 64 : 120;
      const BW = land ? 78 : 100, BH = 44;
      const nodeXY = (f) => {
        const lv = floorLevel(f), k = D.col[f];
        if (land) return [10 + lv * 86, top + (FH - top) / 2 - BH / 2 + k * 92 - 8];
        return [FW / 2 - BW / 2 + k * 106, top + 6 + lv * 76];
      };
      c.add(this.add.rectangle(0, 0, FW, FH, 329228, 0.96).setOrigin(0));
      const gr = this.add.graphics();
      c.add(gr);
      const mid = (f) => {
        const [x, y] = nodeXY(f);
        return [x + BW / 2, y + BH / 2];
      };
      for (const [a, b] of D.edges) {
        const known = am.links.includes(`${a}-${b}`), [ax, ay] = mid(a), [bx, by] = mid(b);
        gr.lineStyle(known ? 3 : 1, known ? 16777215 : 5592422, 1).lineBetween(ax, ay, bx, by);
      }
      for (const k of am.links) if (k.includes(">")) {
        const [a, b] = k.split(">").map(Number), [x0, y0] = mid(a), [x1, y1] = mid(b);
        const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 12));
        gr.lineStyle(2, C.warp, 1);
        for (let i = 0; i < n; i += 2) gr.lineBetween(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, x0 + (x1 - x0) * (i + 1) / n, y0 + (y1 - y0) * (i + 1) / n);
      }
      const hits = [];
      for (let f = 0; f < 32; f++) {
        const [x, y] = nodeXY(f), vis = am.floors.includes(f), here = g.floor && g.floor.f === f;
        gr.fillStyle(vis ? 1714784 : 2105376, 1).fillRoundedRect(x, y, BW, BH, 6);
        gr.lineStyle(here ? 3 : 2, here ? 16777024 : vis ? 8947916 : 4473924, 1).strokeRoundedRect(x, y, BW, BH, 6);
        this.ot(c, x + BW / 2, y + 5, bLabel(f), 2, vis ? 16777215 : 8947848, 0.5);
        this.ot(c, x + BW / 2, y + 24, vis ? shortName(f) : "????", 2, vis ? 16777088 : 6710886, 0.5);
        let ix = x;
        for (const o of am.found) if (o.f === f) {
          c.add(this.add.sprite(ix, y + BH + 2, "dm_items", o.id).setOrigin(0));
          ix += 16;
        }
        for (const k of am.rewardRooms || []) {
          const [rf, rx, ry] = k.split(",").map(Number);
          if (rf !== f || am.found.some((o) => o.f === rf && o.cx === rx && o.cy === ry)) continue;
          c.add(this.add.bitmapText(ix + 4, y + BH + 4, this.font, "?").setTint(16764992));
          ix += 12;
        }
        for (const [ex, ey, t, d] of ROM.floors[f].entries) if ((t === 5 || t === 6) && f !== 29 && g.isSeen(f, ex, ey)) {
          gr.fillStyle(KEY_RGB[d] ?? 16777215, 1).fillRect(ix + 2, y + BH + 4, 12, 12);
          gr.fillStyle(0, 1).fillRect(ix + 7, y + BH + 7, 2, 6);
          ix += 16;
        }
        hits.push({ f, x, y, vis });
      }
      const badges = [];
      for (let id = 46; id <= 51; id++) if (g.hasAmulet(id)) {
        const [wf] = ROM.warp[id - 46], [x, y] = nodeXY(wf), n = badges.filter((b) => b.f === wf).length;
        const bx = x + BW - 18 - n * 22, by = y - 14;
        c.add(this.add.circle(bx + 10, by + 10, 13, 3153992).setStrokeStyle(2, C.warp));
        c.add(this.add.sprite(bx + 2, by + 2, "dm_items", id).setOrigin(0));
        badges.push({ id, f: wf, x: bx - 4, y: by - 4, w: 28, h: 28 });
      }
      this.treeBadges = badges;
      this.treeHits = hits.map((h) => ({ ...h, w: BW, h: BH }));
      this.mapTabs(c, "tree");
      if (land) this.ot(c, 20, 24, "\u305F\u3063\u3077\u3067 \u3061\u305A", 2, 11184810);
      else this.ot(c, W / 2, 96, "\u305F\u3063\u3077\u3067 \u305D\u306E \u304B\u3044\u306E \u3061\u305A", 2, 11184810, 0.5);
      const zone = this.add.zone(0, top, FW, FH - top).setOrigin(0).setInteractive();
      c.add(zone);
      zone.on("pointerup", (p) => {
        const lp = this.logical(p);
        const b = g.mode === "play" && g.floor && badges.find((n) => lp.x >= n.x && lp.x <= n.x + n.w && lp.y >= n.y && lp.y <= n.y + n.h);
        if (b) {
          this.askWarp(b.id, "tree");
          return;
        }
        const h = hits.find((n) => lp.x >= n.x && lp.x <= n.x + BW && lp.y >= n.y && lp.y <= n.y + BH);
        if (h) this.openMap(h.f);
      });
      if (g.mode === "play" && g.floor) {
        const [bx, by, bw, bh] = land ? [300, 32, 150, 44] : [92, 912, 150, 52];
        this.innBtn = this.ob(c, bx, by, bw, bh, "INN\u3078", () => this.startHome(), 2121792);
      }
    }, { alpha: 1, land: true, rebuild: () => this.openTree() });
  }
};
function installMapView(SceneClass) {
  Object.assign(SceneClass.prototype, MapView);
}

// src/scene/menus_land.js
var LW = 960;
var LH = 540;
var MEMBER_COLOR = [7311336, 15781968, 12096752, 15749224];
var MenusLand = {
  // ------------------------------------------------------------ items: 3 columns x 4 rows, stats on the left
  openItemsLand(cur, party) {
    const g = this.game_;
    this.openOverlay("item", (c) => {
      c.add(this.box(8, 8, LW - 16, LH - 16));
      party.forEach((a, k) => {
        this.ob(c, 160, 40 + k * 52, 260, 44, g.members[a.mi].name, () => this.openItems(a.i), a === cur ? 4210816 : 2105392);
      });
      const m = g.members[cur.mi], eq = cur.eq;
      let y = 182;
      const line = (s, col = 16777215) => {
        this.ot(c, 30, y, s, 2, col);
        y += 26;
      };
      line(`${CLASS_NAMES[m.cls]}  LV${m.level}`, 12632319);
      line(title(m), 12632319);
      line(`AC ${9 - eq.armor}  POWER ${eq.weaponDie}`);
      if (eq.bow) line(`BOW ${eq.bow}`);
      line(`GOLD ${m.gold}`);
      line(`EXP ${m.exp * 10}`);
      line(`FOOD ${m.food}/${m.maxhp}`, 16765056);
      this.ot(c, 30, y + 4, "KEY", 2);
      for (let k = 0; k < 7; k++) if (g.sharedKeys() & 1 << k) c.add(this.add.sprite(86 + k * 30, y, "dm_items", 52 + k).setOrigin(0).setScale(1.5));
      const sel = this.itemSel && this.itemSel.a === cur.i ? this.itemSel.s : -1;
      m.items.forEach((id2, s) => {
        const x = 312 + s % 3 * 206, yy = 26 + (s / 3 | 0) * 68;
        const r = this.add.rectangle(x, yy, 200, 62, s === sel ? 2633824 : 1052704).setOrigin(0).setStrokeStyle(2, s === sel ? 16777062 : 6710920).setInteractive();
        r.on("pointerdown", () => {
          this.itemSel = { a: cur.i, s };
          this.openItems(cur.i);
        });
        c.add(r);
        if (!id2) {
          this.ot(c, x + 14, yy + 22, "-", 2, 6710886);
          return;
        }
        c.add(this.add.sprite(x + 5, yy + 19, "dm_items", id2).setOrigin(0).setScale(1.5));
        const ok = canUse(id2, m.cls) || ITEM_KIND(id2) === "amulet";
        const nm = itemNameLines(id2);
        this.ot(c, x + 34, yy + 14, nm[0], 2, ok ? 16777215 : 8947848);
        if (nm[1]) this.ot(c, x + 34, yy + 36, nm[1], 2, ok ? 16777215 : 8947848);
        if (s < (cur.eq.inUse || 0)) this.ot(c, x + 194, yy + 4, "IN USE", 1, 6356864, 1);
      });
      const id = sel >= 0 ? m.items[sel] : 0;
      c.add(this.add.rectangle(312, 304, 612, 110, 0).setOrigin(0).setStrokeStyle(2, 8947848));
      if (id) {
        const ok = canUse(id, m.cls) || ITEM_KIND(id) === "amulet";
        this.ot(c, 328, 322, itemName(id), 2, ok ? 16777215 : 8947848);
        this.ot(c, 328, 350, itemInfo(id) || (ok ? "" : "\u3064\u304B\u3048\u306A\u3044"), 2, 11184810);
        const k = ITEM_KIND(id);
        if (k === "potion" || k === "amulet") this.ob(c, 760, 392, 100, 34, "USE", () => {
          this.itemSel = null;
          this.closeOverlay();
          g.command({ type: "use", actor: cur.i, slot: sel });
        }, 2109552);
        this.ob(c, 866, 392, 100, 34, "DROP", () => {
          this.itemSel = null;
          g.command({ type: "drop", actor: cur.i, slot: sel });
          g.tick(null);
          this.handleEvents();
          this.openItems(cur.i);
        }, 5251104);
      } else this.ot(c, 618, 350, "ITEM\u3092 \u305F\u3063\u3077", 2, 8947848, 0.5);
      this.ob(c, 618, 474, 220, 52, "\u3068\u3058\u308B", () => this.closeOverlay());
    }, { land: true, rebuild: () => this.openItems(cur.i) });
  },
  // ------------------------------------------------------------ spells: casters side by side
  openSpellsLand(cs) {
    const g = this.game_;
    this.openOverlay("spell", (c) => {
      c.add(this.box(40, 24, LW - 80, LH - 48));
      cs.forEach((a, k) => {
        const m = g.members[a.mi], list = SPELLS[m.cls], n = spellsKnown(m.cls, m.level), x0 = 70 + k * 420;
        this.ot(c, x0, 52, `${m.name}  MP ${m.mp}`, 2, MEMBER_COLOR[m.cls]);
        for (let i = 1; i <= n; i++) {
          const col = (i - 1) % 2, row = (i - 1) / 2 | 0;
          this.ob(c, x0 + 95 + col * 200, 112 + row * 60, 186, 48, `${list[i].name} ${i}`, () => {
            this.closeOverlay();
            g.command({ type: "spell", actor: a.i, index: i });
          }, m.mp >= i ? 2109552 : 3153952);
        }
      });
      this.ob(c, LW / 2, 452, 220, 52, "\u3084\u3081\u308B", () => this.closeOverlay());
    }, { land: true, rebuild: () => this.openSpells() });
  },
  // ------------------------------------------------------------ shop: 17 wares in 2 columns
  openShopLand(actorIdx) {
    const g = this.game_, a = g.actors[actorIdx], m = g.members[a.mi];
    this.openOverlay("shop", (c) => {
      c.add(this.box(10, 8, LW - 20, LH - 16));
      this.ot(c, LW / 2, 24, `WEAPON SHOP   ${m.name}  GOLD ${m.gold}`, 2, 16777062, 0.5);
      this.shopMsg = this.ot(c, LW / 2, 50, "", 2, 16777215, 0.5);
      SHOP.forEach((it, i) => {
        const x0 = 24 + i % 2 * 462, y = 76 + (i / 2 | 0) * 42;
        const ok = canUse(it.id, m.cls);
        const r = this.add.rectangle(x0 + 225, y + 16, 446, 38, 1052704).setStrokeStyle(1, 5592439).setInteractive();
        c.add(r);
        c.add(this.add.sprite(x0 + 10, y + 2, "dm_items", it.id).setOrigin(0).setScale(2));
        this.ot(c, x0 + 54, y + 8, itemName(it.id), 2, ok ? 16777215 : 7829367);
        this.ot(c, x0 + 438, y + 8, `${it.price}`, 2, m.gold >= it.price ? 16777062 : 10048853, 1);
        r.on("pointerdown", () => {
          const res = g.buy(a, i);
          this.handleEvents();
          const txt = { ok: "\u307E\u3044\u3069 \u3042\u308A\u304C\u3068\u3046", gold: "\u304A\u304B\u306D\u304C \u305F\u308A\u306A\u3044", full: "\u3082\u3061\u3082\u306E\u304C \u3044\u3063\u3071\u3044\u3060" }[res];
          this.se(res === "ok" ? 8 : 1);
          this.openShop(actorIdx);
          this.shopMsg.setText(toFont(txt || ""));
        });
      });
      this.ob(c, LW / 2, 496, 200, 40, "\u3067\u308B", () => this.closeOverlay());
    }, { land: true, rebuild: () => this.openShop(actorIdx) });
  },
  // ------------------------------------------------------------ quit
  askQuitLand() {
    const g = this.game_;
    this.openOverlay("quit", (c) => {
      const x0 = LW / 2 - 230, y0 = LH / 2 - 110;
      c.add(this.box(x0, y0, 460, 220));
      this.ot(c, LW / 2, y0 + 30, "\u3084\u3069\u3084\u306B \u3082\u3069\u3063\u3066 \u304A\u308F\u308B?", 2, 16777215, 0.5);
      this.ot(c, LW / 2, y0 + 62, "(\u3082\u3061\u3082\u306E\u3068 \u3051\u3044\u3051\u3093\u306F \u306E\u3053\u308B)", 2, 11184810, 0.5);
      this.ob(c, LW / 2 - 110, y0 + 150, 180, 56, "\u306F\u3044", () => {
        this.closeOverlay();
        g.command({ type: "quit" });
      });
      this.ob(c, LW / 2 + 110, y0 + 150, 180, 56, "\u3044\u3044\u3048", () => this.closeOverlay());
    }, { land: true, rebuild: () => this.askQuit() });
  }
};
function installMenusLand(SceneClass) {
  Object.assign(SceneClass.prototype, MenusLand);
}

// src/scene/MiniGameScene.js
var W2 = 540;
var H = 960;
var LAYOUTS = {
  portrait: {
    land: false,
    LW: 540,
    LH: 960,
    chars: [32, 36],
    view: { x: 14, y: 40, w: 512, h: 576 },
    status: (i) => ({ x: 8 + i * 176, y: 622, w: 172, h: 96 }),
    msg: { x: 16, y: 736 },
    ctrlBg: { x: 0, y: 764, w: 540, h: 196 },
    pad: { cx: 110, cy: 865, r: 92 },
    padZone: { x: 0, y: 764, w: 230, h: 196 },
    act: { x: 296, y: 862, r: 72 },
    // v0.23: top to bottom STATUS, SPELL, REPEAT (1.5x tall), BOW (1.5x tall)
    btn: { x: 462, w: 140, list: [{ y: 785, h: 34 }, { y: 823, h: 34 }, { y: 870, h: 51 }, { y: 925, h: 51 }] }
  },
  land: {
    land: true,
    LW: 960,
    LH: 540,
    chars: [28, 28],
    view: { x: 222, y: 44, w: 448, h: 448 },
    status: (i) => ({ x: 676, y: 44 + i * 124, w: 168, h: 118 }),
    msg: { x: 226, y: 504 },
    ctrlBg: null,
    pad: { cx: 112, cy: 335, r: 92 },
    padZone: { x: 0, y: 40, w: 218, h: 500 },
    // the up arrow (cy - 65) sits at mid-height (270)
    act: { x: 902, y: 450, r: 56 },
    btn: { x: 902, w: 108, list: [{ y: 66, h: 44 }, { y: 116, h: 44 }, { y: 177, h: 66 }, { y: 249, h: 66 }] }
  }
};
var PAD_FREE_DEG = 20;
var FLOAT_FOLLOW = 70;
var FLOAT_RING = 70;
var ROOM_OX = 2e3;
var PAL = [0, 0, 2213954, 6216824, 5527021, 8222460, 13914701, 4385781, 16536916, 16742776, 13943124, 15126144, 2207803, 13196218, 13421772, 16777215];
var MEMBER_COLOR2 = [7311336, 15781968, 12096752, 15749224];
var CLASS_SPR = ["fighter", "cleric", "thief", "magician"];
var DIR_KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
var MiniGameScene = class extends Phaser3.Scene {
  constructor() {
    super("MiniGameScene");
  }
  // ① data from the main game
  init(data) {
    this.returnScene = data && data.returnScene || "AdventureScene";
    this.assetBase = data && data.assetBase || "assets/dm/";
    this.initData = data || {};
  }
  // ② assets
  preload() {
    const b = this.assetBase;
    const img = (k, f) => this.load.image(k, b + "img/" + f);
    const sheet = (k, f, w, h) => this.load.spritesheet(k, b + "img/" + f, { frameWidth: w, frameHeight: h });
    img("dm_chars_dun", "chars_dun.png");
    img("dm_chars_town", "chars_town.png");
    img("dm_fontimg", "font.png");
    img("dm_brick", "brick.png");
    sheet("dm_items", "items.png", 16, 16);
    sheet("dm_chest", "chest.png", 16, 16);
    sheet("dm_proj", "proj.png", 16, 16);
    img("dm_ilyuck", "ilyuck.png");
    for (const c of CLASS_SPR) {
      sheet("dm_char_" + c, `char_${c}.png`, 16, 16);
      sheet("dm_charbig_" + c, `char_${c}_big.png`, 64, 64);
    }
    MONSTERS.forEach((m, i) => {
      const [w, h] = monSize(m);
      sheet(`dm_mon${i}`, `mon_${String(i).padStart(2, "0")}.png`, w * 8, h * 8);
    });
    for (let i = 1; i <= 13; i++) this.load.audio(`dm_se${i}`, b + `snd/se${String(i).padStart(2, "0")}.mp3`);
    this.load.audio("dm_se_inn", b + "snd/se_inn.mp3");
    for (const k of ["title", "floor", "dungeon", "ending"]) this.load.audio(`dm_bgm_${k}`, b + `snd/bgm_${k}.mp3`);
  }
  // ③ build the screen
  create() {
    for (const k of this.textures.getTextureKeys()) if (k.startsWith("dm_")) this.textures.get(k).setFilter(k.startsWith("dm_charbig_") ? Phaser3.Textures.FilterMode.LINEAR : Phaser3.Textures.FilterMode.NEAREST);
    this.font = registerFont(this);
    this.input.addPointer(2);
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    this.game_ = new Game(loadSave(storage) || newSave(), { storage });
    this.cameras.main.setBackgroundColor("#000000");
    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    this.worldCam = this.cameras.add(0, 0, 10, 10).setZoom(2).setRoundPixels(true);
    this.worldCam.setBackgroundColor("#000000");
    this.uiCam = this.cameras.add(0, 0, W2, H);
    this.cameras.main.ignore([this.worldLayer, this.uiLayer]);
    this.worldCam.ignore(this.uiLayer);
    this.uiCam.ignore(this.worldLayer);
    this.sprites = { actors: [], mons: /* @__PURE__ */ new Map(), chests: [], ground: [], proj: [], marks: [] };
    this.popups = [];
    this.acc = 0;
    this.heldDir = -1;
    this.keyDir = -1;
    this.displayedLoc = null;
    this.overlay = null;
    this.hud = [];
    const loop = this.game.loop;
    if (loop && loop.setFPSLimit) {
      this.fpsPrev = loop.fpsLimit || 0;
      this.fpsNow = -1;
      this.events.once("shutdown", () => {
        if (this.fpsNow !== this.fpsPrev) loop.setFPSLimit(this.fpsPrev);
      });
    }
    this.setupPointer();
    this.applyLayout();
    this.setupKeyboard();
    this.game_.innRest();
    this.showInn([]);
  }
  // ===================================================================== helpers
  t(x, y, s, size = 2, color = 16777215, origin = 0) {
    const o = this.add.bitmapText(x, y, this.font, toFont(s)).setScale(size).setTint(color).setOrigin(origin, 0);
    return this.ui(o);
  }
  box(x, y, w, h, color = 16777215, fill = 0, alpha = 1) {
    const g = this.add.graphics();
    g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(3, color, 1).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 6);
    return this.ui(g);
  }
  ui(o) {
    this.uiLayer.add(o);
    if (this.hudBuilding) this.hud.push(o);
    return o;
  }
  world(o) {
    this.worldLayer.add(o);
    return o;
  }
  /** wall-clock timer (the scene clock follows Phaser's delta, which browsers may throttle) */
  later(ms, fn) {
    (this.timers = this.timers || []).push({ at: performance.now() + ms, fn });
  }
  runTimers() {
    if (!this.timers || !this.timers.length) return;
    const now = performance.now(), due = this.timers.filter((t) => t.at <= now);
    this.timers = this.timers.filter((t) => t.at > now);
    for (const t of due) t.fn();
  }
  se(id) {
    if (this.sound.get) this.sound.play(`dm_se${id}`, { volume: 0.6 });
  }
  bgm(key, loop = true) {
    if (this.bgmKey === key) return;
    if (this.music) this.music.stop();
    this.bgmKey = key;
    if (!key) {
      this.music = null;
      return;
    }
    this.music = this.sound.add(`dm_bgm_${key}`, { loop, volume: 0.45 });
    this.music.play();
    if (key === "floor") this.music.once("complete", () => {
      this.bgmKey = null;
      this.bgm("dungeon");
    });
  }
  // ===================================================================== HUD
  // ===================================================================== layout (portrait / landscape)
  isLand() {
    const o = this.game_.save.options;
    return !!(o && o.orient === "land");
  }
  /** (re)build the play HUD for the current orientation */
  applyLayout() {
    for (const o of this.hud) o.destroy();
    this.hud = [];
    this.L = this.isLand() ? LAYOUTS.land : LAYOUTS.portrait;
    this.game_.setView(...this.L.chars);
    this.applyCameras();
    this.hudBuilding = true;
    this.buildHud();
    this.buildMinimap();
    this.buildControls();
    this.hudBuilding = false;
    this.padPointer = null;
    this.heldVec = null;
    this.heldDir = -1;
    this.snapCam = true;
    if (this.overlay) {
      if (this.overlay.rebuild) this.overlay.rebuild();
      else this.setHudVisible(false, true);
    }
  }
  /** cameras for the layout. landscape: rotate both cameras by 90 degrees (logical (x,y) -> canvas (540 - y, x)) */
  applyCameras(portraitOverride = false) {
    const land = this.L.land && !portraitOverride, v = this.L.view;
    const rot = land ? Math.PI / 2 : 0;
    if (land) this.worldCam.setViewport(W2 - v.y - v.h, v.x, v.h, v.w);
    else {
      const pv = LAYOUTS.portrait.view;
      this.worldCam.setViewport(this.L.land ? pv.x : v.x, this.L.land ? pv.y : v.y, this.L.land ? pv.w : v.w, this.L.land ? pv.h : v.h);
    }
    this.worldCam.setRotation(rot);
    this.uiCam.setViewport(0, 0, W2, H).setRotation(rot);
    if (land) this.uiCam.centerOn(this.L.LW / 2, this.L.LH / 2);
    else this.uiCam.centerOn(W2 / 2, H / 2);
    this.snapCam = true;
  }
  /** menus stay portrait: while one is open in landscape, hide the HUD and show the canvas unrotated */
  /**
   * landscape only: hide/show the play HUD and the map while a full-screen overlay is up.
   * menus that have no landscape version yet are shown portrait (portrait = true).
   */
  setHudVisible(v, portrait = !v) {
    if (!this.L.land) return;
    for (const o of this.hud) if (o.setVisible) o.setVisible(v);
    this.worldCam.setVisible(v);
    this.applyCameras(portrait);
  }
  /** the logical screen an overlay is laid out in */
  frame() {
    const land = !!(this.overlay ? this.overlay.land : this.L.land);
    return land ? { W: this.L.LW, H: this.L.LH, land } : { W: W2, H, land: false };
  }
  toggleTurn() {
    const sv = this.game_.save;
    sv.options = sv.options || {};
    sv.options.orient = this.isLand() ? "portrait" : "land";
    this.game_.persist();
    this.se(1);
    this.applyLayout();
  }
  /** pointer position in logical (layout) coordinates */
  logical(p) {
    const pt = this.uiCam.getWorldPoint(p.x, p.y);
    return { x: pt.x, y: pt.y };
  }
  // ===================================================================== HUD
  buildHud() {
    const L = this.L, v = L.view, LW2 = L.LW;
    this.ui(this.add.rectangle(0, 0, LW2, v.y - 2, 1052696).setOrigin(0));
    this.floorText = this.t(12, 12, this.floorText ? this.floorText.text : "", 2);
    const close = this.ui(this.add.rectangle(LW2 - 26, 19, 40, 30, 4198416).setStrokeStyle(2, 16777215).setInteractive());
    this.t(LW2 - 26, 11, "X", 2, 16777215, 0.5);
    close.on("pointerdown", () => this.askQuit());
    const turn = this.ui(this.add.rectangle(LW2 - 96, 19, 84, 30, 2113600).setStrokeStyle(2, 16777215).setInteractive());
    this.t(LW2 - 96, 11, "TURN", 2, 16777215, 0.5);
    turn.on("pointerdown", () => {
      if (!this.overlay) this.toggleTurn();
    });
    const cont = this.ui(this.add.rectangle(LW2 - 186, 19, 84, 30, 4206624).setStrokeStyle(2, 16777215).setInteractive());
    this.t(LW2 - 186, 11, "CONT", 2, 16777215, 0.5);
    cont.on("pointerdown", () => {
      if (!this.overlay) this.togglePad();
    });
    const fr = this.add.graphics();
    fr.lineStyle(2, 5527021).strokeRect(v.x - 2, v.y - 2, v.w + 4, v.h + 4);
    this.ui(fr);
    this.statusBoxes = [];
    for (let i = 0; i < 3; i++) {
      const { x, y, w, h } = L.status(i), dy = L.land ? 26 : 21, y0 = y + (L.land ? 10 : 8);
      const g = this.add.graphics();
      this.ui(g);
      const name = this.t(x + 10, y0, "", 2);
      const hp = this.t(x + 10, y0 + dy, "", 2);
      const mp = this.t(x + 10, y0 + dy * 2, "", 2);
      const food = this.t(x + 10, y0 + dy * 3, "", 2, 15126144);
      const tag = this.t(x + w - 8, L.land ? y0 + 3 : y0 + dy * 2, "", L.land ? 1.5 : 2, 16777062, 1);
      const zone = this.ui(this.add.zone(x, y, w, h).setOrigin(0).setInteractive());
      zone.on("pointerdown", () => this.tapMember(i));
      this.statusBoxes.push({ g, name, hp, mp, food, tag, x, y, w, h });
    }
    const prev = this.msgText ? this.msgText.text : "";
    this.msgText = this.t(L.msg.x, L.msg.y, "", 2, 16777215);
    this.msgText.setText(prev);
    this.msgQueue = this.msgQueue || [];
    this.msgTimer = this.msgTimer || 0;
    this.radar = this.add.graphics();
    this.ui(this.radar);
    if (!this.knockBar) {
      this.knockBar = this.add.graphics();
      this.world(this.knockBar);
    }
  }
  buildControls() {
    const L = this.L;
    if (L.ctrlBg) this.ui(this.add.rectangle(L.ctrlBg.x, L.ctrlBg.y, L.ctrlBg.w, L.ctrlBg.h, 789524).setOrigin(0));
    const { cx, cy } = L.pad;
    this.pad = { cx, cy, r: 92 };
    const g = this.add.graphics();
    this.ui(g);
    this.padGfx = g;
    g.fillStyle(2236986).fillCircle(cx, cy, 92);
    g.fillStyle(3816026);
    g.fillRect(cx - 26, cy - 84, 52, 168);
    g.fillRect(cx - 84, cy - 26, 168, 52);
    g.fillStyle(16777215, 0.8);
    g.fillTriangle(cx, cy - 76, cx - 14, cy - 54, cx + 14, cy - 54);
    g.fillTriangle(cx, cy + 76, cx - 14, cy + 54, cx + 14, cy + 54);
    g.fillTriangle(cx - 76, cy, cx - 54, cy - 14, cx - 54, cy + 14);
    g.fillTriangle(cx + 76, cy, cx + 54, cy - 14, cx + 54, cy + 14);
    this.padHi = this.add.graphics();
    this.ui(this.padHi);
    g.setVisible(!this.isFloat());
    const pz = L.padZone;
    const padZone = this.ui(this.add.zone(pz.x, pz.y, pz.w, pz.h).setOrigin(0).setInteractive());
    padZone.on("pointerdown", (p) => {
      this.padPointer = p.id;
      this.padSnap = null;
      this.padFree = false;
      if (this.isFloat()) {
        const lp = this.logical(p);
        this.pad.cx = lp.x;
        this.pad.cy = lp.y;
      }
      this.updatePad(p);
    });
    this.drawPadHi();
    const b = L.btn;
    this.button(L.act.x, L.act.y, L.act.r, "ACT", () => this.game_.command({ type: "act" }), 8400928, true);
    const [bs, bp, br, bb] = b.list;
    this.button(b.x, bs.y, 0, "STATUS", () => this.openItems(), 6311968, false, b.w, bs.h);
    this.button(b.x, bp.y, 0, "SPELL", () => this.openSpells(), 2109552, false, b.w, bp.h);
    this.repeatBtn = this.button(b.x, br.y, 0, "REPEAT", () => this.game_.command({ type: "repeat" }), 4202592, false, b.w, br.h);
    this.button(b.x, bb.y, 0, "BOW", () => this.fireBows(), 2121792, false, b.w, bb.h);
  }
  /** pointer listeners that live for the whole scene (pad drag/release, autopilot cancel) */
  setupPointer() {
    this.input.on("pointermove", (p) => {
      if (p.id === this.padPointer) this.updatePad(p);
    });
    const release = (p) => {
      if (p.id !== this.padPointer) return;
      this.padPointer = null;
      this.heldDir = -1;
      this.heldVec = null;
      this.padSnap = null;
      this.padFree = false;
      if (this.pad) {
        this.pad.cx = this.L.pad.cx;
        this.pad.cy = this.L.pad.cy;
      }
      this.drawPadHi();
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("pointerdown", () => {
      const g = this.game_, justOpened = this.overlay && performance.now() - this.overlayAt < 80;
      if ((g.auto || g.homeRun) && (!this.overlay || justOpened)) {
        g.cancelAutopilot();
        this.handleEvents();
      }
    });
  }
  button(x, y, r, label, cb, color, round = false, bw = 140, bh = 42) {
    let o;
    if (round) o = this.add.circle(x, y, r, color).setStrokeStyle(3, 16777215);
    else o = this.add.rectangle(x, y, bw, bh, color).setStrokeStyle(3, 16777215);
    this.ui(o).setInteractive();
    o.on("pointerdown", () => {
      o.setAlpha(0.6);
      cb();
    });
    o.on("pointerup", () => o.setAlpha(1));
    o.on("pointerout", () => o.setAlpha(1));
    o.label = this.t(x, y - 8, label, 2, 16777215, 0.5);
    return o;
  }
  updatePad(p) {
    const lp = this.logical(p);
    let dx = lp.x - this.pad.cx, dy = lp.y - this.pad.cy, d = Math.hypot(dx, dy);
    this.padFinger = lp;
    if (this.isFloat() && d > FLOAT_FOLLOW) {
      this.pad.cx = lp.x - dx / d * FLOAT_FOLLOW;
      this.pad.cy = lp.y - dy / d * FLOAT_FOLLOW;
      dx = lp.x - this.pad.cx;
      dy = lp.y - this.pad.cy;
      d = FLOAT_FOLLOW;
    }
    if (d < 12) {
      this.heldVec = null;
      this.heldDir = -1;
      this.padSnap = null;
      this.padFree = false;
      this.drawPadHi();
      return;
    }
    const ang = Math.atan2(dy, dx);
    if (!this.padFree) {
      if (this.padSnap === null || this.padSnap === void 0) this.padSnap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      let diff = Math.abs(ang - this.padSnap);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff > PAD_FREE_DEG * Math.PI / 180) this.padFree = true;
    }
    const a = this.padFree ? ang : this.padSnap;
    this.heldVec = { x: Math.round(Math.cos(a) * 1e6) / 1e6, y: Math.round(Math.sin(a) * 1e6) / 1e6 };
    this.heldDir = 0;
    this.drawPadHi();
  }
  isFloat() {
    const o = this.game_.save.options;
    return !!(o && o.pad === "float");
  }
  togglePad() {
    const sv = this.game_.save;
    sv.options = sv.options || {};
    sv.options.pad = this.isFloat() ? "fixed" : "float";
    this.game_.persist();
    this.se(1);
    this.padGfx.setVisible(!this.isFloat());
    this.pad.cx = this.L.pad.cx;
    this.pad.cy = this.L.pad.cy;
    this.say(this.isFloat() ? "CONT: \u3055\u308F\u3063\u305F \u3068\u3053\u308D\u304C \u307E\u3093\u306A\u304B" : "CONT: \u3053\u3066\u3044\u306E \u3058\u3085\u3046\u3058");
    this.drawPadHi();
  }
  drawPadHi() {
    const g = this.padHi;
    g.clear();
    if (this.isFloat()) {
      if (this.padPointer === null || this.padPointer === void 0) {
        g.lineStyle(3, 16777215, 0.18).strokeCircle(this.L.pad.cx, this.L.pad.cy, FLOAT_RING);
        g.fillStyle(16777215, 0.12).fillCircle(this.L.pad.cx, this.L.pad.cy, 26);
        return;
      }
      const { cx: cx2, cy: cy2 } = this.pad, f = this.padFinger || { x: cx2, y: cy2 };
      let kx = f.x - cx2, ky = f.y - cy2;
      const kd = Math.hypot(kx, ky);
      if (kd > FLOAT_RING) {
        kx *= FLOAT_RING / kd;
        ky *= FLOAT_RING / kd;
      }
      g.fillStyle(2236986, 0.55).fillCircle(cx2, cy2, FLOAT_RING).lineStyle(3, 16777215, 0.45).strokeCircle(cx2, cy2, FLOAT_RING);
      g.fillStyle(16777215, 0.55).fillCircle(cx2 + kx, cy2 + ky, 28);
      return;
    }
    if (!this.heldVec || this.heldDir < 0) return;
    const { cx, cy } = this.pad;
    g.fillStyle(16777215, 0.3).fillCircle(cx + this.heldVec.x * 50, cy + this.heldVec.y * 50, 30);
  }
  setupKeyboard() {
    const held = /* @__PURE__ */ new Set();
    this.input.keyboard.on("keydown", (e) => {
      if (e.code in DIR_KEYS) {
        held.add(e.code);
        this.keyVec = keyVector(held);
      }
      if (e.code === "Space" || e.code === "Enter") {
        if (this.overlay && this.overlay.onKey) this.overlay.onKey();
        else if (!this.overlay) this.game_.command({ type: "act" });
      }
    });
    this.input.keyboard.on("keyup", (e) => {
      held.delete(e.code);
      this.keyVec = keyVector(held);
    });
  }
  // ===================================================================== main loop
  update(time, delta) {
    const g = this.game_;
    const now = performance.now();
    delta = this.lastNow ? now - this.lastNow : delta;
    this.lastNow = now;
    this.acc += Math.min(delta, 500);
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      const vec = this.overlay ? null : this.heldVec || this.keyVec || null;
      g.tick({ vec });
      this.handleEvents();
    }
    if (this.overlay && this.overlay.kind === "title" && g.pause <= 0) this.endFloorTitle(false);
    this.capFps(g.mode === "play" && !this.overlay ? 62 : 31);
    if (g.mode === "play") this.render(delta);
    this.updateMinimap();
    this.animateInn();
    this.runTimers();
    this.updateMsg(delta);
  }
  /**
   * frame-rate cap. 62 / 31 instead of 60 / 30: Phaser's limiter skips a frame when the display's frame time is a hair
   * under the limit, so a 60 Hz screen capped at exactly 60 would stutter; 62 gives a steady 60 on 60 and 120 Hz screens.
   */
  capFps(n) {
    const loop = this.game.loop;
    if (this.fpsNow === void 0 || this.fpsNow === n || !loop || !loop.setFPSLimit) return;
    this.fpsNow = n;
    loop.setFPSLimit(n);
  }
  handleEvents() {
    const g = this.game_;
    for (const e of g.events.splice(0)) {
      switch (e.type) {
        case "sound":
          this.se(e.id);
          break;
        case "msg":
          this.say(e.text);
          break;
        case "floor":
          this.onFloor(e);
          break;
        case "tile":
          this.redrawCell(e.cx, e.cy);
          break;
        case "hit":
          this.popup(e);
          break;
        case "knock":
          this.knock = { ...e, t: 300 };
          break;
        case "shop":
          this.openShop(e.actor);
          break;
        case "inn":
          this.backToInn(e.quit);
          break;
        case "loc":
          this.displayedLoc = null;
          break;
        default:
          break;
      }
    }
  }
  say(text) {
    this.msgQueue.push(text);
    if (this.msgQueue.length > 3) this.msgQueue.shift();
  }
  updateMsg(delta) {
    this.msgTimer -= delta;
    if (this.msgTimer <= 0 && this.msgQueue.length) {
      this.msgText.setText(toFont(this.msgQueue.shift()));
      this.msgTimer = 1800;
    } else if (this.msgTimer <= -2500) this.msgText.setText("");
  }
  // ===================================================================== world rendering
  onFloor(e) {
    if (this.overlay && this.overlay.kind === "inn") this.closeOverlay();
    this.buildMap();
    this.floorText.setText(toFont(e.f === 0 ? "CITY OF GHOST" : `B${e.level}F ${e.name}`));
    this.displayedLoc = null;
    if (e.rush) {
      this.bgmKey = null;
      this.bgm("dungeon");
      this.say(e.f === 0 ? "CITY OF GHOST" : `B${e.level}F ${e.name}`);
      return;
    }
    this.showFloorTitle(e);
  }
  /**
   * floor title scene (original $AEF5/$AF80): brick screen, title window, the floor jingle.
   * the original keeps it up while the maze is built, which always takes 10.9 s; tap to skip.
   */
  showFloorTitle(e) {
    const g = this.game_;
    const lines = e.f === 0 ? ["CITY OF GHOST"] : ["DUNGEON", `B${e.level}F`, e.name];
    const LW2 = this.L.LW, LH2 = this.L.LH, cy = LH2 * 0.34;
    this.openOverlay("title", (c) => {
      c.add(this.add.tileSprite(0, 0, LW2, LH2, "dm_brick").setOrigin(0).setTileScale(2));
      const bh = 40 + lines.length * 36;
      c.add(this.box(LW2 / 2 - 210, cy - bh / 2, 420, bh, 16777215, 0));
      lines.forEach((l, i) => this.ot(c, LW2 / 2, cy - bh / 2 + 24 + i * 36, l, 3, 16777215, 0.5));
      c.add(this.add.rectangle(LW2 / 2, LH2 * 0.8, 360, 40, 0, 0.7));
      this.ot(c, LW2 / 2, LH2 * 0.8 - 8, "\u305F\u3063\u3077\u3067 \u3059\u3059\u3080", 2, 11184810, 0.5);
      const z = this.add.zone(0, 0, LW2, LH2).setOrigin(0).setInteractive();
      c.add(z);
      z.on("pointerdown", () => this.endFloorTitle(true));
    }, { alpha: 1 });
    this.overlay.onKey = () => this.endFloorTitle(true);
    g.pause = Math.max(g.pause, Math.round(10.92 * 15));
    this.bgmKey = null;
    this.bgm("floor", false);
  }
  endFloorTitle(skipped) {
    if (!this.overlay || this.overlay.kind !== "title") return;
    this.closeOverlay();
    const g = this.game_;
    if (skipped) {
      g.pause = 0;
      this.bgm("dungeon");
    }
  }
  buildMap() {
    const loc = this.game_.mapLoc;
    if (this.mapLayer) {
      this.mapLayer.destroy();
      this.mapTilemap.destroy();
    }
    const data = [];
    for (let y = 0; y < loc.h; y++) {
      const row = [];
      for (let x = 0; x < loc.w; x++) row.push(loc.char(x, y));
      data.push(row);
    }
    this.mapTilemap = this.make.tilemap({ data, tileWidth: 8, tileHeight: 8 });
    const ts = this.mapTilemap.addTilesetImage(loc.town ? "dm_chars_town" : "dm_chars_dun", void 0, 8, 8, 0, 0);
    this.mapLayer = this.mapTilemap.createLayer(0, ts, 0, 0).setDepth(-10);
    this.mapLayer.setCullPadding(2, 2);
    this.world(this.mapLayer);
    this.worldLayer.sendToBack(this.mapLayer);
  }
  buildRoomMap(room) {
    if (this.roomLayer) {
      this.roomLayer.destroy();
      this.roomTilemap.destroy();
      this.roomLayer = null;
    }
    const data = [];
    for (let y = 0; y < ROOM_H; y++) {
      const row = [];
      for (let x = 0; x < ROOM_W; x++) row.push(room.char(x, y));
      data.push(row);
    }
    this.roomTilemap = this.make.tilemap({ data, tileWidth: 8, tileHeight: 8 });
    const ts = this.roomTilemap.addTilesetImage(room.town ? "dm_chars_town" : "dm_chars_dun", void 0, 8, 8, 0, 0);
    this.roomLayer = this.roomTilemap.createLayer(0, ts, ROOM_OX, 0).setDepth(-10);
    this.world(this.roomLayer);
    this.worldLayer.sendToBack(this.roomLayer);
  }
  redrawCell(cx, cy) {
    const loc = this.game_.mapLoc;
    if (!this.mapLayer) return;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) this.mapLayer.putTileAt(loc.char(cx * 4 + i, cy * 4 + j), cx * 4 + i, cy * 4 + j);
  }
  render(delta) {
    const g = this.game_;
    const focus = g.focusActor();
    const loc = focus ? focus.loc : g.mapLoc;
    if (!loc) return;
    if (loc !== this.displayedLoc) {
      this.displayedLoc = loc;
      if (loc.kind === "room") this.buildRoomMap(loc);
      if (this.mapLayer) this.mapLayer.setVisible(loc.kind === "map");
      if (this.roomLayer) this.roomLayer.setVisible(loc.kind === "room");
      this.snapCam = true;
    }
    const ox = loc.kind === "room" ? ROOM_OX : 0;
    let tx, ty;
    if (loc.kind === "room") {
      tx = ox + ROOM_W * 4;
      ty = ROOM_H * 4;
    } else {
      tx = loc.view.x * 8 + g.viewW * 4;
      ty = loc.view.y * 8 + g.viewH * 4;
    }
    const cam = this.worldCam;
    cam.setZoom(this.L.land && loc.kind === "room" ? 1.75 : 2);
    if (this.snapCam) {
      cam.centerOn(tx, ty);
      this.snapCam = false;
    } else {
      const cx = cam.midPoint.x, cy = cam.midPoint.y, k = Math.min(1, delta / 90);
      cam.centerOn(cx + (tx - cx) * k, cy + (ty - cy) * k);
    }
    g.actors.forEach((a, i) => {
      let s = this.sprites.actors[i];
      const m = g.members[a.mi];
      if (!s) {
        s = this.world(this.add.sprite(0, 0, "dm_char_" + CLASS_SPR[m.cls]).setOrigin(0));
        s.setInteractive();
        s.on("pointerdown", () => this.tapMember(i));
        this.sprites.actors[i] = s;
      }
      const vis = a.state === "active" && a.loc === loc;
      s.setVisible(vis);
      if (!vis) return;
      s.setFrame(a.anim * 4 + (a.dir < 0 ? 2 : a.dir));
      this.interpTo(s, ox, a);
      s.setAlpha(1);
    });
    this.drawHpBars(g, delta);
    this.drawAutoTarget(g, loc);
    this.drawVision(g, loc);
    const seen = /* @__PURE__ */ new Set();
    for (const mon of loc.monsters) {
      if (!mon) continue;
      seen.add(mon);
      let s = this.sprites.mons.get(mon);
      if (!s) {
        s = this.world(this.add.sprite(ox + mon.x * 8, mon.y * 8, `dm_mon${mon.type}`).setOrigin(0));
        this.sprites.mons.set(mon, s);
      }
      const def = MONSTERS[mon.type];
      const dirn = def.flag !== 255 && def.flag & 2;
      s.setFrame(dirn ? mon.anim * 4 + (mon.dir & 3) : mon.anim);
      this.interpTo(s, ox, mon);
      s.setAlpha(loc.freeze > 0 ? 0.6 : 1);
      const hidden = loc.kind === "map" && this.fogAt(mon.x + mon.w / 2, mon.y + mon.h / 2);
      const look = hidden ? "sil" : mon.stun > 0 && performance.now() % 160 < 80 ? "stun" : "n";
      if (look !== s.look) {
        s.look = look;
        s.silhouette = hidden;
        if (look === "sil") s.setTint(5263448).setTintMode(Phaser3.TintModes.FILL);
        else if (look === "stun") s.setTint(10537215).setTintMode(Phaser3.TintModes.FILL);
        else s.setTint(16777215).setTintMode(Phaser3.TintModes.MULTIPLY);
      }
    }
    for (const [mon, s] of this.sprites.mons) if (!seen.has(mon)) {
      s.destroy();
      this.sprites.mons.delete(mon);
    }
    this.syncList("chests", loc.chests, (c) => this.add.sprite(0, 0, "dm_chest", loc.town ? 1 : 0).setOrigin(0), (s, c) => s.setPosition(ox + c.x * 8, c.y * 8));
    const gframe = (gi) => gi.food ? FOOD_ID : gi.id === 255 ? 0 : gi.id;
    this.syncList("ground", loc.ground, (gi) => this.add.sprite(0, 0, "dm_items", gframe(gi)).setOrigin(0), (s, gi) => {
      s.setFrame(gframe(gi));
      s.setPosition(ox + gi.x * 8, gi.y * 8);
    });
    const projs = g.actors.map((a) => a.proj).filter((p) => p && p.loc === loc);
    this.syncList("proj", projs, (p) => this.add.sprite(0, 0, "dm_proj", 0).setOrigin(0.5), (s, p) => {
      const ily = p.ptype === "ily";
      if (ily) {
        if (s.texture.key !== "dm_ilyuck") s.setTexture("dm_ilyuck").clearTint();
      } else {
        if (s.texture.key !== "dm_proj") s.setTexture("dm_proj");
        s.setFrame(p.ptype * 4).setTint(PAL[p.color]);
      }
      s.setPosition(ox + p.x * 8 + 8, p.y * 8 + 8);
      s.setRotation(Math.atan2(p.vy, p.vx) + (ily ? Math.PI : Math.PI / 2));
    });
    const kn = this.knock && (this.knock.t -= delta) > 0 && this.knock.loc === loc.key;
    if (kn || this.knockDrawn) this.knockBar.clear();
    this.knockDrawn = kn;
    if (kn) {
      const k = this.knock;
      this.knockBar.fillStyle(0, 0.8).fillRect(ox + k.x * 8 - 2, k.y * 8 - 7, 20, 5);
      this.knockBar.fillStyle(16764992, 1).fillRect(ox + k.x * 8 - 1, k.y * 8 - 6, 18 * k.progress, 3);
    }
    this.markers(loc);
    this.updatePopups(delta);
    this.updateStatus();
    this.drawRadar(loc);
    const ls = g.lastSpell, lbl = ls ? SPELLS[g.members[ls.mi].cls][ls.idx].name : "REPEAT";
    if (this.repeatBtn.label.text !== toFont(lbl)) this.repeatBtn.label.setText(toFont(lbl));
  }
  // ---- vision limits (see Game.updateVision)
  /**
   * line-of-sight fog (no wizard), v0.19. Works on map squares (4x4 characters, one corridor width):
   *  - a floor square is "seen" when a line from the leader reaches any of its floor characters (several sample points);
   *  - the 3x3 squares around the leader are fully lit (walls in their full 4-character thickness);
   *  - elsewhere only the wall surface facing a seen floor square shows: 1 character thick, dimmed ("faintly seen");
   *  - everything else is black. Result per character: 2 lit, 1 dim, 0 black.
   * Recomputed when the leader moves or the view changes (and at least twice a second for doors / monsters).
   */
  updateFog(g, loc) {
    const V = g.vision, L = g.focusActor();
    if (!V || !V.fog || !L || L.loc !== loc) {
      this.fog = null;
      return;
    }
    const v = loc.view, key = `${L.x},${L.y},${v.x},${v.y},${g.viewW},${g.viewH},${g.tickCount / 8 | 0}`;
    if (this.fog && this.fog.key === key) return;
    const sx0 = (v.x >> 2) - 1, sy0 = (v.y >> 2) - 1, sw = Math.ceil(g.viewW / 4) + 3, sh = Math.ceil(g.viewH / 4) + 3;
    const x0 = sx0 * 4, y0 = sy0 * 4, w = sw * 4, h = sh * 4;
    const floorCh = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) floorCh[j * w + i] = charKind(loc, x0 + i, y0 + j) === 0 ? 1 : 0;
    const isFloor = (x, y) => {
      const i = x - x0, j = y - y0;
      return i >= 0 && j >= 0 && i < w && j < h ? floorCh[j * w + i] === 1 : charKind(loc, x, y) === 0;
    };
    const ox = L.x + 1, oy = L.y + 1;
    const ray = (tx, ty) => {
      const n = Math.ceil(Math.hypot(tx - ox, ty - oy) / 0.3);
      for (let k = 1; k < n; k++) if (!isFloor(Math.floor(ox + (tx - ox) * k / n), Math.floor(oy + (ty - oy) * k / n))) return false;
      return true;
    };
    const seen = new Uint8Array(sw * sh), lcx = (ox >> 2) - sx0, lcy = (oy >> 2) - sy0;
    const S = [0.5, 2, 3.5];
    for (let sj = 0; sj < sh; sj++) for (let si = 0; si < sw; si++) {
      const bx = x0 + si * 4, by = y0 + sj * 4;
      let any = false;
      for (const py of S) for (const px of S) {
        if (any) break;
        const cx = Math.floor(bx + px), cy = Math.floor(by + py);
        if (isFloor(cx, cy) && ray(bx + px, by + py)) any = true;
      }
      if (any) seen[sj * sw + si] = 1;
    }
    const lv = new Uint8Array(w * h);
    for (let sj = 0; sj < sh; sj++) for (let si = 0; si < sw; si++) if (seen[sj * sw + si]) {
      for (let j = sj * 4; j < sj * 4 + 4; j++) for (let i = si * 4; i < si * 4 + 4; i++) if (floorCh[j * w + i]) lv[j * w + i] = 2;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (floorCh[j * w + i] || lv[j * w + i]) continue;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= w || jj >= h || !floorCh[jj * w + ii]) continue;
        if (seen[(jj >> 2) * sw + (ii >> 2)]) lv[j * w + i] = 1;
      }
    }
    for (let sj = lcy - 1; sj <= lcy + 1; sj++) for (let si = lcx - 1; si <= lcx + 1; si++) {
      if (si < 0 || sj < 0 || si >= sw || sj >= sh) continue;
      for (let j = sj * 4; j < sj * 4 + 4; j++) for (let i = si * 4; i < si * 4 + 4; i++) lv[j * w + i] = 2;
    }
    this.fog = { key, x0, y0, w, h, lv };
  }
  /** true when the character at (x, y) is not visibly lit (monsters there are drawn as silhouettes) */
  fogAt(x, y) {
    const F = this.fog;
    if (!F) return false;
    const i = Math.floor(x) - F.x0, j = Math.floor(y) - F.y0;
    if (i < 0 || j < 0 || i >= F.w || j >= F.h) return true;
    return F.lv[j * F.w + i] !== 2;
  }
  /** v0.22: the fog is painted into a small canvas (1 px per character) only when it changes, and shown scaled x8 */
  drawFog() {
    const F = this.fog;
    if (!F) {
      if (this.fogImg) this.fogImg.setVisible(false);
      return;
    }
    if (!this.fogTex || this.fogTex.width !== F.w || this.fogTex.height !== F.h) {
      if (this.fogImg) {
        this.fogImg.destroy();
        this.fogImg = null;
      }
      if (this.fogTex) this.textures.remove(this.fogTex);
      this.fogN = (this.fogN || 0) + 1;
      this.fogTex = this.textures.createCanvas("dm_fog" + this.fogN, F.w, F.h);
      this.fogTex.setFilter(Phaser3.Textures.FilterMode.NEAREST);
      this.fogImg = this.world(this.add.image(0, 0, this.fogTex.key).setOrigin(0).setScale(8).setDepth(-5));
      this.fogDrawn = null;
    }
    this.fogImg.setVisible(true).setPosition(F.x0 * 8, F.y0 * 8);
    if (this.fogDrawn === F) return;
    const P = this.fogDrawn;
    this.fogDrawn = F;
    if (P && P.w === F.w && P.h === F.h && P.x0 === F.x0 && P.y0 === F.y0 && P.lv.every((v, i) => v === F.lv[i])) return;
    const ctx = this.fogTex.getContext(), img = ctx.createImageData(F.w, F.h), d = img.data;
    for (let i = 0; i < F.lv.length; i++) d[i * 4 + 3] = F.lv[i] === 0 ? 255 : F.lv[i] === 1 ? 128 : 0;
    ctx.putImageData(img, 0, 0);
    this.fogTex.refresh();
    this.fogTex.setFilter(Phaser3.Textures.FilterMode.NEAREST);
  }
  drawVision(g, loc) {
    if (!this.darkGfx) this.darkGfx = this.world(this.add.graphics()).setDepth(80);
    const V = g.vision, L = g.focusActor();
    if (loc.kind !== "map" || !V || !L) {
      this.fog = null;
      this.drawFog();
      if (this.darkKey) {
        this.darkGfx.clear();
        this.darkKey = null;
      }
      return;
    }
    this.updateFog(g, loc);
    this.drawFog();
    if (!V.dark) {
      if (this.darkKey) {
        this.darkGfx.clear();
        this.darkKey = null;
      }
    } else {
      const ls = this.sprites.actors[g.actors.indexOf(L)], cx = (ls ? ls.x : L.x * 8) + 8, cy = (ls ? ls.y : L.y * 8) + 8, h = V.half * 8, BIG2 = 4e3;
      const key = `${Math.round(cx)},${Math.round(cy)},${h}`;
      if (key === this.darkKey) return;
      this.darkKey = key;
      this.darkGfx.clear();
      const gr = this.darkGfx.fillStyle(0, 1);
      gr.fillRect(cx - BIG2, cy - BIG2, BIG2 * 2, BIG2 - h);
      gr.fillRect(cx - BIG2, cy + h, BIG2 * 2, BIG2 - h);
      gr.fillRect(cx - BIG2, cy - h, BIG2 - h, h * 2);
      gr.fillRect(cx + h, cy - h, BIG2 - h, h * 2);
    }
  }
  /** autopilot: the destination blinks on the map */
  drawAutoTarget(g, loc) {
    if (!this.autoMark) this.autoMark = this.world(this.add.graphics()).setDepth(60);
    const gr = this.autoMark, A = g.auto;
    const on = !!A && A.loc === loc && performance.now() % 600 <= 380, key = on ? `${A.tx},${A.ty}` : "";
    if (key === this.autoKey) return;
    this.autoKey = key;
    gr.clear();
    if (!on) return;
    gr.lineStyle(2, 16777024, 1).strokeRect(A.tx * 8 - 2, A.ty * 8 - 2, 20, 20);
    gr.lineStyle(1, 16777024, 1).lineBetween(A.tx * 8 + 8, A.ty * 8 - 6, A.tx * 8 + 8, A.ty * 8 + 22).lineBetween(A.tx * 8 - 6, A.ty * 8 + 8, A.tx * 8 + 22, A.ty * 8 + 8);
  }
  /** remake: a green HP gauge under a character for 3 s after its HP changes; the lost part turns red */
  drawHpBars(g, delta) {
    if (!this.hpBars) this.hpBars = this.world(this.add.graphics()).setDepth(50);
    const gr = this.hpBars;
    const any = g.actors.some((a) => a.hpShow > 0 || a.hpKey !== void 0 && a.hpKey !== g.members[a.mi].hp + "/" + g.members[a.mi].maxhp);
    if (!any && !this.hpDrawn) return;
    this.hpDrawn = any;
    gr.clear();
    g.actors.forEach((a, i) => {
      const m = g.members[a.mi], key = m.hp + "/" + m.maxhp, ratio = Math.max(0, Math.min(1, m.hp / m.maxhp));
      if (a.hpKey !== void 0 && a.hpKey !== key) a.hpShow = 3e3;
      if (a.hpKey === void 0) a.hpDisp = ratio;
      a.hpKey = key;
      a.hpDisp += (ratio - a.hpDisp) * Math.min(1, delta / 250);
      if (a.hpShow > 0) a.hpShow -= delta;
      const s = this.sprites.actors[i];
      if (!s || !s.visible || !(a.hpShow > 0)) return;
      const al = Math.min(1, a.hpShow / 400);
      gr.fillStyle(0, 0.85 * al).fillRect(s.x - 1, s.y + 16, 18, 4);
      gr.fillStyle(14166056, al).fillRect(s.x, s.y + 17, 16, 2);
      gr.fillStyle(3727432, al).fillRect(s.x, s.y + 17, 16 * a.hpDisp, 2);
    });
  }
  /** draw an object between its previous and current turn position (no lag beyond one turn, no drift) */
  interpTo(s, ox, o) {
    const k = Math.max(0, Math.min(1, this.acc / TICK_MS));
    let x = o.x, y = o.y;
    if (o.px !== void 0 && Math.abs(o.px - o.x) + Math.abs(o.py - o.y) < 3) {
      x = o.px + (o.x - o.px) * k;
      y = o.py + (o.y - o.py) * k;
    }
    s.setPosition(ox + x * 8, y * 8);
  }
  syncList(name, items, make, upd) {
    const arr = this.sprites[name];
    while (arr.length < items.length) arr.push(this.world(make(items[arr.length])));
    while (arr.length > items.length) arr.pop().destroy();
    items.forEach((it, i) => upd(arr[i], it));
  }
  markers(loc) {
    const g = this.game_, list = [];
    if (loc.kind === "map") {
      for (const a of g.actors) if (a.state === "active" && a.loc && a.loc.kind === "room") list.push({ a, cell: a.loc.doorCell });
    }
    this.syncList("marks", list, () => this.add.sprite(0, 0, "dm_char_" + CLASS_SPR[g.members[list[0].a.mi].cls], 2).setOrigin(0), (s, it) => {
      s.setTexture("dm_char_" + CLASS_SPR[g.members[it.a.mi].cls], 2);
      s.setPosition(it.cell[0] * 32 + 8, it.cell[1] * 32 - 4);
      s.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(this.time.now / 250)));
    });
  }
  popup(e) {
    const loc = this.displayedLoc;
    if (!loc || e.loc !== loc.key) return;
    const ox = loc.kind === "room" ? ROOM_OX : 0;
    const o = this.world(this.add.bitmapText(ox + e.x * 8, e.y * 8 - 4, this.font, String(e.dmg)).setOrigin(0.5).setTint(e.foe ? 16777056 : 16736352));
    this.popups.push({ o, t: 600 });
  }
  updatePopups(delta) {
    for (const p of this.popups) {
      p.t -= delta;
      p.o.y -= delta * 0.02;
      p.o.setAlpha(Math.max(0, p.t / 600));
    }
    this.popups = this.popups.filter((p) => {
      if (p.t <= 0) {
        p.o.destroy();
        return false;
      }
      return true;
    });
  }
  drawRadar(loc) {
    const g = this.game_, r = this.radar;
    if (this.radarDrawn) {
      r.clear();
      this.radarDrawn = false;
    }
    if (loc.kind !== "map") return;
    const cam = this.worldCam.worldView;
    g.actors.forEach((a) => {
      if (a.state !== "active") return;
      let wx, wy;
      if (a.loc === loc) {
        wx = a.x * 8 + 8;
        wy = a.y * 8 + 8;
        if (cam.contains(wx, wy)) return;
      } else if (a.loc.kind === "room") {
        wx = a.loc.doorCell[0] * 32 + 16;
        wy = a.loc.doorCell[1] * 32 + 16;
        if (cam.contains(wx, wy)) return;
      } else return;
      const cx = cam.centerX, cy = cam.centerY, ang = Math.atan2(wy - cy, wx - cx);
      const V = this.L.view, sx = V.x + V.w / 2, sy = V.y + V.h / 2;
      const k = Math.min((V.w / 2 - 18) / Math.abs(Math.cos(ang) || 1e-6), (V.h / 2 - 18) / Math.abs(Math.sin(ang) || 1e-6));
      const px = sx + Math.cos(ang) * k, py = sy + Math.sin(ang) * k;
      const col = MEMBER_COLOR2[g.members[a.mi].cls];
      r.fillStyle(col, 0.9).lineStyle(2, 16777215, 1);
      const p1 = [px + Math.cos(ang) * 14, py + Math.sin(ang) * 14], p2 = [px + Math.cos(ang + 2.5) * 12, py + Math.sin(ang + 2.5) * 12], p3 = [px + Math.cos(ang - 2.5) * 12, py + Math.sin(ang - 2.5) * 12];
      r.fillTriangle(...p1, ...p2, ...p3).strokeTriangle(...p1, ...p2, ...p3);
      this.radarDrawn = true;
    });
  }
  updateStatus() {
    const g = this.game_;
    this.statusBoxes.forEach((b, i) => {
      const a = g.actors[i];
      if (!a) {
        if (b.key === "") return;
        b.key = "";
        b.g.clear();
        b.name.setText("");
        b.hp.setText("");
        b.mp.setText("");
        b.food.setText("");
        b.tag.setText("");
        return;
      }
      const m = g.members[a.mi];
      const col = MEMBER_COLOR2[m.cls];
      const solo = g.focusActor() === a;
      const dim = a.state === "dead" || a.state === "home";
      const key = `${a.mi},${m.hp},${m.maxhp},${m.mp},${m.level},${m.food},${a.state},${solo},${a.loc && a.loc.kind},${b.w},${b.h},${b.x},${b.y}`;
      if (key === b.key) return;
      b.key = key;
      b.g.clear();
      b.g.fillStyle(solo ? 2105408 : 0).fillRoundedRect(b.x, b.y, b.w, b.h, 8);
      b.g.lineStyle(3, dim ? 5592405 : col).strokeRoundedRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 6);
      if (solo) b.g.lineStyle(2, 16777062).strokeRoundedRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, 4);
      b.name.setText(toFont(m.name)).setTint(dim ? 7829367 : 16777215);
      b.hp.setText(toFont(`HP ${m.hp}/${m.maxhp}`)).setTint(m.hp * 4 < m.maxhp ? 16736352 : 16777215);
      b.mp.setText(toFont(isCaster(m) ? `MP ${m.mp}` : `LV ${m.level}`));
      b.food.setText(toFont(`FOOD ${m.food}`)).setTint(m.food === 0 ? 16736352 : 15126144);
      const tag = a.state === "dead" ? "DEAD" : a.state === "home" ? "INN" : a.state === "gone" ? "WAIT" : solo ? "LEAD" : a.loc && a.loc.kind === "room" ? "ROOM" : "";
      b.tag.setText(toFont(tag));
    });
  }
  tapMember(i) {
    if (this.game_.mode !== "play" || this.overlay) return;
    this.game_.setSolo(i);
    this.handleEvents();
    this.snapCam = true;
  }
  // ===================================================================== overlays
  /**
   * opts.land: the overlay has a landscape layout (built in this.frame() coordinates).
   * opts.rebuild: how to rebuild it when TURN is pressed while it is open.
   */
  openOverlay(kind, build, opts = {}) {
    this.closeOverlay();
    const land = this.L.land && (kind === "title" || !!opts.land);
    if (kind !== "title" && !land) this.setHudVisible(false, true);
    this.overlayAt = performance.now();
    const c = this.add.container(0, 0);
    this.ui(c);
    this.overlay = { kind, c, land, rebuild: opts.rebuild || null };
    const F = this.frame();
    const blocker = this.add.rectangle(0, 0, F.W, F.H, 0, opts.alpha ?? 0.55).setOrigin(0).setInteractive();
    c.add(blocker);
    build(c);
    return this.overlay;
  }
  closeOverlay() {
    if (!this.overlay) return;
    this.overlay.c.destroy();
    this.overlay = null;
    this.setHudVisible(true);
  }
  ob(c, x, y, w, h, label, cb, color = 3158096, size = 2) {
    const r = this.add.rectangle(x, y, w, h, color).setStrokeStyle(2, 16777215).setInteractive();
    r.isButton = true;
    r.cb = cb;
    r.on("pointerdown", cb);
    const t = this.add.bitmapText(x, y - 4 * size, this.font, toFont(label)).setScale(size).setOrigin(0.5, 0);
    c.add([r, t]);
    return r;
  }
  ot(c, x, y, s, size = 2, color = 16777215, origin = 0) {
    const o = this.add.bitmapText(x, y, this.font, toFont(s)).setScale(size).setTint(color).setOrigin(origin, 0);
    c.add(o);
    return o;
  }
  // ---- inn: party select, healing, level-up report
  showInn(report) {
    const g = this.game_;
    this.bgm("title");
    this.floorText.setText(toFont("INN"));
    if (this.mapLayer) this.mapLayer.setVisible(false);
    if (this.roomLayer) this.roomLayer.setVisible(false);
    if (!this.selected) this.selected = new Set(g.save.lastParty || [0, 1, 2]);
    const land = this.L.land, FW = land ? this.L.LW : W2, FH = land ? this.L.LH : H;
    const P = land ? {
      title: [FW / 2 - 120, 6, 240, 48, 18],
      hint: [FW / 2, 70, 620, 26, 62],
      card: (i) => ({ x: 20 + i % 2 * 470, y: 84 + (i >> 1) * 132, w: 450, h: 124 }),
      spr: [6, 18, 1.35],
      tx: 104,
      rows: [6, 28, 50, 76, 102],
      foodBtn: [72, 40, 116, 28],
      ok: [14, 6],
      lvl: (m) => `LV${m.level} ${title(m)}`,
      leave: [150, 378, 240, 56],
      back: [390, 378, 200, 56],
      combat: [730, 378, 360, 56],
      msgBox: [FW / 2, 470, FW, 100],
      hintY: 438,
      msgY: 474,
      turn: [FW - 70, 30, 110, 40],
      backTop: [70, 30, 110, 40]
    } : {
      title: [150, 30, 240, 56, 46],
      hint: [W2 / 2, 104, 520, 30, 96],
      card: (i) => ({ x: 15, y: 126 + i * 146, w: 510, h: 136 }),
      spr: [7, 16, 1.6],
      tx: 115,
      rows: [14, 40, 62, 86, 110],
      foodBtn: [79, 42, 108, 28],
      ok: [25, 12],
      lvl: (m) => `LEVEL ${m.level}  ${title(m)}`,
      leave: [150, 742, 250, 64],
      back: [400, 742, 230, 64],
      combat: [W2 / 2, 914, 380, 52],
      msgBox: [W2 / 2, 830, 540, 100],
      hintY: 790,
      msgY: 830,
      turn: [W2 - 62, 58, 100, 40],
      backTop: [62, 58, 100, 40]
    };
    const build = (c) => {
      const bg = this.add.tileSprite(0, 0, FW, FH, "dm_brick").setOrigin(0).setTileScale(2);
      c.add(bg);
      c.add(this.box(P.title[0], P.title[1], P.title[2], P.title[3]));
      this.ot(c, FW / 2, P.title[4], "INN", 3, 16777215, 0.5);
      c.add(this.add.rectangle(P.hint[0], P.hint[1], P.hint[2], P.hint[3], 0, 0.85));
      this.ot(c, FW / 2, P.hint[4], "\u3057\u3085\u3063\u3071\u3064\u3059\u308B \u306A\u304B\u307E\u3092 3\u306B\u3093 \u3048\u3089\u3076", 2, 16777215, 0.5);
      this.ob(c, ...P.turn, "TURN", () => this.toggleTurn(), 2113600);
      this.ob(c, ...P.backTop, "\u3082\u3069\u308B", () => this.finish(), 3158096, 2);
      g.members.forEach((m, i) => {
        const k = P.card(i), sel = this.selected.has(i), x = k.x, y = k.y;
        const card = this.add.rectangle(x + k.w / 2, y + k.h / 2, k.w, k.h, sel ? 1714768 : 0).setStrokeStyle(3, sel ? 16777062 : 8947848).setInteractive();
        card.on("pointerdown", () => {
          if (this.selected.has(i)) this.selected.delete(i);
          else if (this.selected.size < 3) this.selected.add(i);
          this.showInn([]);
        });
        c.add(card);
        const st = this.innAnim[i] || (this.innAnim[i] = { dir: 2, anim: 0, step: 0, turn: 0 });
        this.innSprites[i] = this.add.sprite(x + P.spr[0], y + P.spr[1], "dm_charbig_" + CLASS_SPR[m.cls], st.anim * 4 + st.dir).setScale(P.spr[2]).setOrigin(0);
        c.add(this.innSprites[i]);
        const tx = x + P.tx, R = P.rows;
        this.ot(c, tx, y + R[0], `${m.name}  ${CLASS_NAMES[m.cls]}`, 2);
        this.ot(c, tx, y + R[1], P.lvl(m), 2, 12632319);
        this.ot(c, tx, y + R[2], land ? `HP ${m.hp}  GOLD ${m.gold}` : `HP ${m.hp}   GOLD ${m.gold}`, 2);
        const fc = m.food >= m.maxhp ? 8454016 : m.food < m.maxhp / 4 ? 16744576 : 16777215;
        this.ot(c, tx, y + R[3], `FOOD ${m.food}/${m.maxhp}`, 2, fc);
        const nx = m.level >= 9 ? "-" : expForLevel(m.cls, m.level + 1) * 10;
        this.ot(c, tx, y + R[4], land ? `EXP ${m.exp * 10}/${nx}` : `EXP ${m.exp * 10} / ${nx}`, 2, 11184810);
        const fb = P.foodBtn;
        if (m.food < m.maxhp) this.ob(c, x + k.w - fb[0], y + k.h - fb[1], fb[2], fb[3], "FOOD", () => {
          const r = g.buyFood(i);
          this.se(r === "nogold" || r === "full" ? 1 : 8);
          this.showInn([]);
          if (r === "nogold") this.toast("\u3075\u3049\u3075\u3049\u3075\u3049 \u3057\u3063\u304B\u308A\u3068 \u304B\u305B\u304E\u306A\u3055\u308C");
          else this.toast(`${m.name} FOOD +${r}`);
        }, 3166256);
        if (sel) this.ot(c, x + k.w - P.ok[0], y + P.ok[1], "OK", 2, 16777062, 1);
      });
      this.ob(c, ...P.leave, "LEAVE", () => this.innLeave(), 8400928, 3);
      this.ob(c, ...P.back, "\u3082\u3069\u308B", () => this.finish(), 3158096, 2);
      c.add(this.add.rectangle(...P.msgBox, 0, 0.85));
      this.ot(c, FW / 2, P.hintY, `\u305F\u3063\u3077\u3067 \u3048\u3089\u3076  FOOD\u306F ${FOOD_PRICE}GOLD\u3067 1\u3053`, 2, 11184810, 0.5);
      this.innMsg = this.ot(c, FW / 2, P.msgY, this.innMsgText || "", 2, 16777062, 0.5);
      const sv = g.save, cur = sv.options && sv.options.combat || 2, lbl = { 1: "\u3082\u3068", 2: "1/2", 4: "1/4" }[cur];
      this.ob(c, ...P.combat, `\u305B\u3093\u3068\u3046\u306E \u306F\u3084\u3055  ${lbl}`, () => {
        sv.options = sv.options || {};
        sv.options.combat = { 1: 2, 2: 4, 4: 1 }[cur];
        g.persist();
        this.se(1);
        this.showInn([]);
      }, 4206624);
    };
    this.innMsgText = "";
    this.innAnim = this.innAnim || [];
    this.innSprites = [];
    this.openOverlay("inn", build, { alpha: 1, land: true, rebuild: () => this.showInn([]) });
    this.overlay.onKey = () => {
    };
    if (report.length) this.showReport(report);
  }
  /** inn: everybody marks time and now and then turns to look somewhere else (original inn scene) */
  animateInn() {
    if (!this.overlay || this.overlay.kind !== "inn" || !this.innSprites) return;
    const now = performance.now();
    this.innSprites.forEach((spr, i) => {
      const st = this.innAnim[i];
      if (!spr || !st || !spr.active) return;
      if (now >= st.step) {
        st.anim ^= 1;
        st.step = now + 230;
      }
      if (now >= st.turn) {
        const d = st.dir + 1 + Math.floor(Math.random() * 3) & 3;
        st.dir = d;
        st.turn = now + 700 + Math.random() * 1800;
      }
      spr.setFrame(st.anim * 4 + st.dir);
    });
  }
  innLeave() {
    const g = this.game_;
    if (!this.selected.size) {
      this.toast("\u306A\u304B\u307E\u3092 \u3048\u3089\u3093\u3067\u304F\u3060\u3055\u3044");
      return;
    }
    const party = [...this.selected].sort((a, b) => a - b);
    if (this.departing) return;
    this.departing = true;
    this.toast("\u304D\u304B\u3093\u306E \u3058\u3085\u3082\u3093\u3092 \u304B\u3051\u3066 \u3057\u3093\u305C\u3088\u3046");
    this.bgm(null);
    this.later(500, () => this.sound.play("dm_se_inn", { volume: 0.6 }));
    this.later(1900, () => {
      this.departing = false;
      this.closeOverlay();
      g.depart(party);
      this.handleEvents();
    });
  }
  toast(s) {
    if (this.innMsg && this.innMsg.active) {
      this.innMsgText = s;
      this.innMsg.setText(toFont(s));
    } else this.say(s);
  }
  showReport(report) {
    const lines = [];
    let ending = false;
    for (const r of report) {
      if (r.ending) {
        ending = true;
        continue;
      }
      lines.push(`${r.name} LEVEL ${r.from} \u2192 ${r.to}  HP +${r.gain}`.replace("\u2192", "-"));
    }
    if (ending) return this.showEnding(report.find((r) => r.ending).name, lines);
    if (!lines.length) return;
    const c = this.overlay.c, F = this.frame();
    const pnl = this.add.container(0, 0);
    c.add(pnl);
    pnl.isPopup = true;
    const h = 80 + lines.length * 30, y0 = F.land ? (F.H - h) / 2 : 300;
    pnl.add(this.box(F.W / 2 - 250, y0, 500, h));
    this.ot(pnl, F.W / 2, y0 + 18, "\u3075\u3049 \u3075\u3049 \u3075\u3049", 2, 16777215, 0.5);
    lines.forEach((l, i) => this.ot(pnl, F.W / 2, y0 + 50 + i * 30, l, 2, 16777062, 0.5));
    const z = this.add.zone(0, 0, F.W, F.H).setOrigin(0).setInteractive();
    pnl.add(z);
    z.on("pointerdown", () => pnl.destroy());
    this.se(10);
  }
  showEnding(name, lines) {
    this.bgm("ending");
    this.openOverlay("ending", (c) => {
      const F = this.frame(), y0 = F.land ? 16 : 240, oy = F.land ? 470 : 660;
      c.add(this.box(F.W / 2 - 250, y0, 500, F.land ? 420 : 360));
      const txt = ["\u304A\u3081\u3067\u3068\u3046", `${name} \u3053\u305D`, "\u307E\u3053\u3068\u306E DUNGEON", "MASTER \u3068\u3057\u3066", "\u305F\u305F\u3048 \u3064\u305F\u3048\u3089\u308C\u308B", "\u3067\u3057\u3087\u3046", ...lines];
      txt.forEach((l, i) => this.ot(c, F.W / 2, y0 + 30 + i * 34, l, 3 - (i > 5 ? 1 : 0), i < 6 ? 16777215 : 16777062, 0.5));
      this.ob(c, F.W / 2, oy, 200, 56, "OK", () => {
        this.showInn([]);
      }, 3158096);
    }, { alpha: 0.85, land: true, rebuild: () => this.showEnding(name, lines) });
  }
  backToInn(quit) {
    const g = this.game_;
    if (g.mode === "inn") return;
    this.cameras.main.flash(200, 0, 0, 0);
    const report = g.arriveInn();
    this.clearWorldSprites();
    if (quit) {
      this.finish();
      return;
    }
    this.showInn(report);
  }
  clearWorldSprites() {
    for (const k of ["actors", "chests", "ground", "proj", "marks"]) {
      for (const s of this.sprites[k]) s && s.destroy();
      this.sprites[k] = [];
    }
    for (const s of this.sprites.mons.values()) s.destroy();
    this.sprites.mons.clear();
    this.displayedLoc = null;
  }
  // ---- spells
  casters() {
    const g = this.game_, f = g.focusActor();
    return g.controlled().filter((a) => isCaster(g.members[a.mi])).concat(f && !g.controlled().includes(f) ? [] : []);
  }
  openSpells() {
    const g = this.game_;
    if (g.mode !== "play") return;
    const cs = g.controlled().filter((a) => isCaster(g.members[a.mi]) && spellsKnown(g.members[a.mi].cls, g.members[a.mi].level) > 0);
    if (!cs.length) {
      this.say("\u3058\u3085\u3082\u3093\u3092 \u3064\u304B\u3048\u308B \u306A\u304B\u307E\u304C \u3044\u306A\u3044");
      this.se(1);
      return;
    }
    if (this.L.land) return this.openSpellsLand(cs);
    this.openOverlay("spell", (c) => {
      let y = 120;
      c.add(this.box(20, 90, 500, 70 + cs.length * 210));
      for (const a of cs) {
        const m = g.members[a.mi], list = SPELLS[m.cls], n = spellsKnown(m.cls, m.level);
        this.ot(c, 50, y, `${m.name}  MP ${m.mp}`, 2, MEMBER_COLOR2[m.cls]);
        y += 34;
        for (let i = 1; i <= n; i++) {
          const col = (i - 1) % 2, row = (i - 1) / 2 | 0;
          this.ob(c, 150 + col * 240, y + row * 56 + 22, 220, 48, `${list[i].name} ${i}`, () => {
            this.closeOverlay();
            g.command({ type: "spell", actor: a.i, index: i });
          }, m.mp >= i ? 2109552 : 3153952);
        }
        y += Math.ceil(n / 2) * 56 + 30;
      }
      this.ob(c, W2 / 2, y + 30, 200, 50, "\u3084\u3081\u308B", () => this.closeOverlay());
    });
  }
  fireBows() {
    const g = this.game_;
    if (g.mode !== "play") return;
    const archers = g.controlled().filter((a) => a.eq.bow > 0);
    if (!archers.length) {
      this.say("\u3086\u307F\u3092 \u3082\u3063\u3066\u3044\u308B \u306A\u304B\u307E\u304C \u3044\u306A\u3044");
      this.se(1);
      return;
    }
    for (const a of archers) g.command({ type: "bow", actor: a.i });
  }
  // ---- items (USE / DROP / DATA)
  openItems(tab) {
    const g = this.game_;
    if (g.mode !== "play") return;
    const party = g.actors.filter((a) => a.state === "active");
    if (!party.length) return;
    const focus = g.focusActor();
    const cur = tab !== void 0 ? g.actors[tab] : focus || party[0];
    if (this.L.land) return this.openItemsLand(cur, party);
    this.openOverlay("item", (c) => {
      c.add(this.box(14, 60, 512, 820));
      party.forEach((a, k) => {
        const m2 = g.members[a.mi];
        this.ob(c, 100 + k * 170, 104, 160, 48, m2.name, () => this.openItems(a.i), a === cur ? 4210816 : 2105392);
      });
      const m = g.members[cur.mi], eq = cur.eq;
      this.ot(c, 40, 150, `${CLASS_NAMES[m.cls]}  LV${m.level}  ${title(m)}`, 2, 12632319);
      this.ot(c, 40, 178, `AC ${9 - eq.armor}   POWER ${eq.weaponDie}${eq.bow ? "  BOW " + eq.bow : ""}`, 2);
      this.ot(c, 40, 206, `GOLD ${m.gold}   EXP ${m.exp * 10}`, 2);
      this.ot(c, 40, 236, "KEY", 2);
      for (let k = 0; k < 7; k++) if (g.sharedKeys() & 1 << k) c.add(this.add.sprite(110 + k * 40, 228, "dm_items", 52 + k).setOrigin(0).setScale(2));
      this.ot(c, 40, 262, `FOOD ${m.food}/${m.maxhp}`, 2, 16765056);
      const sel = this.itemSel && this.itemSel.a === cur.i ? this.itemSel.s : -1;
      m.items.forEach((id2, s) => {
        const col = s % 2, row = s / 2 | 0;
        const x = 22 + col * 250, y = 292 + row * 70;
        const r = this.add.rectangle(x, y, 246, 64, s === sel ? 2633824 : 1052704).setOrigin(0).setStrokeStyle(2, s === sel ? 16777062 : 6710920).setInteractive();
        r.on("pointerdown", () => {
          this.itemSel = { a: cur.i, s };
          this.openItems(cur.i);
        });
        c.add(r);
        if (!id2) {
          this.ot(c, x + 16, y + 24, "-", 2, 6710886);
          return;
        }
        c.add(this.add.sprite(x + 8, y + 8, "dm_items", id2).setOrigin(0).setScale(3));
        const ok = canUse(id2, m.cls) || ITEM_KIND(id2) === "amulet";
        const nm = itemNameLines(id2);
        this.ot(c, x + 64, y + 14, nm[0], 2, ok ? 16777215 : 8947848);
        if (nm[1]) this.ot(c, x + 64, y + 36, nm[1], 2, ok ? 16777215 : 8947848);
        if (s < (cur.eq.inUse || 0)) this.ot(c, x + 240, y + 4, "IN USE", 1, 6356864, 1);
      });
      const id = sel >= 0 ? m.items[sel] : 0;
      c.add(this.add.rectangle(W2 / 2, 744, 496, 64, 0).setStrokeStyle(2, 8947848));
      if (id) {
        const ok = canUse(id, m.cls) || ITEM_KIND(id) === "amulet";
        this.ot(c, 36, 722, itemName(id), 2, ok ? 16777215 : 8947848);
        this.ot(c, 36, 748, itemInfo(id) || (ok ? "" : "\u3064\u304B\u3048\u306A\u3044"), 2, 11184810);
        const k = ITEM_KIND(id);
        if (k === "potion" || k === "amulet") this.ob(c, 352, 744, 90, 48, "USE", () => {
          this.itemSel = null;
          this.closeOverlay();
          g.command({ type: "use", actor: cur.i, slot: sel });
        }, 2109552);
        this.ob(c, 452, 744, 90, 48, "DROP", () => {
          this.itemSel = null;
          g.command({ type: "drop", actor: cur.i, slot: sel });
          g.tick(null);
          this.handleEvents();
          this.openItems(cur.i);
        }, 5251104);
      } else this.ot(c, W2 / 2, 736, "ITEM\u3092 \u305F\u3063\u3077", 2, 8947848, 0.5);
      this.ob(c, W2 / 2, 830, 200, 50, "\u3068\u3058\u308B", () => this.closeOverlay());
    });
  }
  // ---- shop
  openShop(actorIdx) {
    const g = this.game_, a = g.actors[actorIdx];
    if (!a) return;
    const m = g.members[a.mi];
    if (this.L.land) return this.openShopLand(actorIdx);
    this.openOverlay("shop", (c) => {
      c.add(this.box(14, 50, 512, 860));
      this.ot(c, W2 / 2, 70, `WEAPON SHOP   ${m.name}  GOLD ${m.gold}`, 2, 16777062, 0.5);
      this.shopMsg = this.ot(c, W2 / 2, 96, "", 2, 16777215, 0.5);
      SHOP.forEach((it, i) => {
        const y = 124 + i * 42;
        const ok = canUse(it.id, m.cls);
        const r = this.add.rectangle(W2 / 2, y + 16, 490, 38, 1052704).setStrokeStyle(1, 5592439).setInteractive();
        c.add(r);
        c.add(this.add.sprite(36, y + 2, "dm_items", it.id).setOrigin(0).setScale(2));
        this.ot(c, 80, y + 8, itemName(it.id), 2, ok ? 16777215 : 7829367);
        this.ot(c, 500, y + 8, `${it.price}`, 2, m.gold >= it.price ? 16777062 : 10048853, 1);
        r.on("pointerdown", () => {
          const res = g.buy(a, i);
          this.handleEvents();
          const txt = { ok: "\u307E\u3044\u3069 \u3042\u308A\u304C\u3068\u3046", gold: "\u304A\u304B\u306D\u304C \u305F\u308A\u306A\u3044", full: "\u3082\u3061\u3082\u306E\u304C \u3044\u3063\u3071\u3044\u3060" }[res];
          this.se(res === "ok" ? 8 : 1);
          this.openShop(actorIdx);
          this.shopMsg.setText(toFont(txt || ""));
        });
      });
      this.ob(c, W2 / 2, 870, 200, 50, "\u3067\u308B", () => this.closeOverlay());
    });
  }
  // ---- quit
  askQuit() {
    const g = this.game_;
    if (g.mode !== "play") {
      this.finish();
      return;
    }
    if (this.L.land) return this.askQuitLand();
    this.openOverlay("quit", (c) => {
      c.add(this.box(40, 330, 460, 220));
      this.ot(c, W2 / 2, 360, "\u3084\u3069\u3084\u306B \u3082\u3069\u3063\u3066 \u304A\u308F\u308B?", 2, 16777215, 0.5);
      this.ot(c, W2 / 2, 392, "(\u3082\u3061\u3082\u306E\u3068 \u3051\u3044\u3051\u3093\u306F \u306E\u3053\u308B)", 2, 11184810, 0.5);
      this.ob(c, 160, 480, 180, 56, "\u306F\u3044", () => {
        this.closeOverlay();
        g.command({ type: "quit" });
      });
      this.ob(c, 380, 480, 180, 56, "\u3044\u3044\u3048", () => this.closeOverlay());
    });
  }
  // ⑤ back to the main game
  finish() {
    const g = this.game_;
    const score = g.members.reduce((s, m) => s + m.exp * 10, 0);
    this._finishGame(score);
  }
  _finishGame(score) {
    if (this.music) this.music.stop();
    this.game_.persist();
    this.scene.start(this.returnScene, { miniGameScore: score, dungeonMaster: this.game_.save });
  }
};
function keyVector(held) {
  let x = 0, y = 0;
  for (const c of held) {
    const d = DIR_KEYS[c];
    if (d === 0) y -= 1;
    if (d === 2) y += 1;
    if (d === 1) x += 1;
    if (d === 3) x -= 1;
  }
  if (!x && !y) return null;
  const l = Math.hypot(x, y);
  return { x: x / l, y: y / l };
}
function monSize(m) {
  return { 4: [2, 2], 9: [3, 3], 12: [3, 4] }[m.size] || [4, 4];
}
installMapView(MiniGameScene);
installMenusLand(MiniGameScene);
export {
  MEMBER_COLOR2 as MEMBER_COLOR,
  PAL,
  MiniGameScene as default
};
