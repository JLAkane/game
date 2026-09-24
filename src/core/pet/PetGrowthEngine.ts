import { PetTier, RaceType, GrowthRate } from '../types.ts';

export interface GrowthRange {
  min: number;
  max: number;
}

export interface PetGrowthRanges {
  hp: GrowthRange;
  atk: GrowthRange;
  def: GrowthRange;
  spd: GrowthRange;
}

/**
 * 文档 06 模块 2.2：各品阶标准成长资质基准梯度
 */
export const TIER_BASE_GROWTH: Record<PetTier, {
  hp: [number, number];
  atk: [number, number];
  def: [number, number];
  spd: [number, number];
}> = {
  1: { hp: [10.0, 16.0], atk: [1.8, 3.2], def: [0.8, 1.8], spd: [0.6, 1.4] },
  2: { hp: [24.0, 36.0], atk: [4.5, 7.2], def: [2.5, 4.5], spd: [1.0, 2.0] },
  3: { hp: [50.0, 75.0], atk: [10.0, 16.0], def: [5.5, 9.5], spd: [1.6, 2.8] },
  4: { hp: [85.0, 130.0], atk: [18.0, 26.0], def: [10.0, 18.0], spd: [2.2, 3.8] }
};

/**
 * 文档 06 模块 3.2：五大种族四维成长倾向修正系数
 */
export const RACE_GROWTH_MODIFIERS: Record<RaceType, {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}> = {
  BEAST: { hp: 1.20, atk: 1.10, def: 1.00, spd: 0.95 },
  DRAGON: { hp: 1.10, atk: 1.35, def: 1.10, spd: 0.85 },
  ELEMENTAL: { hp: 0.75, atk: 1.25, def: 0.70, spd: 1.25 },
  UNDEAD: { hp: 1.30, atk: 0.90, def: 1.20, spd: 0.65 },
  MECHANIC: { hp: 1.00, atk: 1.05, def: 1.35, spd: 1.00 }
};

export function round1(num: number): number {
  return Math.round(num * 10) / 10;
}

/**
 * 计算指定品阶与种族的成长资质区间 [min, max]
 */
export function getPetGrowthRanges(tier: PetTier, race: RaceType): PetGrowthRanges {
  const base = TIER_BASE_GROWTH[tier] || TIER_BASE_GROWTH[1];
  const mod = RACE_GROWTH_MODIFIERS[race] || { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 };

  return {
    hp: { min: round1(base.hp[0] * mod.hp), max: round1(base.hp[1] * mod.hp) },
    atk: { min: round1(base.atk[0] * mod.atk), max: round1(base.atk[1] * mod.atk) },
    def: { min: round1(base.def[0] * mod.def), max: round1(base.def[1] * mod.def) },
    spd: { min: round1(base.spd[0] * mod.spd), max: round1(base.spd[1] * mod.spd) }
  };
}

/**
 * 宠物破壳孵化时随机成长资质 (符合该种族与品阶的固定成长区间)
 */
export function rollHatchGrowth(tier: PetTier, race: RaceType): GrowthRate {
  const ranges = getPetGrowthRanges(tier, race);
  return {
    hpGrowth: round1(ranges.hp.min + Math.random() * (ranges.hp.max - ranges.hp.min)),
    atkGrowth: round1(ranges.atk.min + Math.random() * (ranges.atk.max - ranges.atk.min)),
    defGrowth: round1(ranges.def.min + Math.random() * (ranges.def.max - ranges.def.min)),
    spdGrowth: round1(ranges.spd.min + Math.random() * (ranges.spd.max - ranges.spd.min))
  };
}

/**
 * 双宠融合重塑成长资质：
 * 去除双亲平均数保底限制，每次融合如同重新孵化，
 * 严格根据目标产物品阶与种族的成长区间 [min, max] 重新随机生成。
 */
export function rollFusedGrowth(
  targetTier: PetTier,
  targetRace: RaceType,
  _growthA?: GrowthRate,
  _growthB?: GrowthRate
): GrowthRate {
  return rollHatchGrowth(targetTier, targetRace);
}

/**
 * 资质极品度评级 (Doc 06 Section 2.3)
 */
export function getGrowthRating(value: number, range: GrowthRange): 'C' | 'B' | 'A' | 'S' | 'SS' {
  if (range.max <= range.min) return 'B';
  const pct = (value - range.min) / (range.max - range.min);
  if (pct >= 0.97) return 'SS';
  if (pct >= 0.85) return 'S';
  if (pct >= 0.50) return 'A';
  if (pct >= 0.10) return 'B';
  return 'C';
}
