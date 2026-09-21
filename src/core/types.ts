// 宠物养成与战斗系统核心类型定义

export type ElementType = 'FIRE' | 'WATER' | 'WOOD' | 'THUNDER' | 'LIGHT' | 'DARK';
export type RaceType = 'BEAST' | 'DRAGON' | 'ELEMENTAL' | 'UNDEAD' | 'MECHANIC';
export type PetTier = 1 | 2 | 3 | 4; // T1(普通), T2(稀有), T3(史诗), T4(传说)
export type EntityType = 'CHARACTER' | 'PET' | 'MONSTER';
export type ClassType = 'TACTICAL_COMMANDER' | 'IRON_VANGUARD' | 'PSIONIC_CONDUCTOR' | 'SHADOW_PACKMASTER';

export interface GrowthRate {
  hpGrowth: number;
  atkGrowth: number;
  defGrowth: number;
  spdGrowth: number;
}

export interface PetConfig {
  id: string;
  name: string;
  tier: PetTier;
  race: RaceType;
  element: ElementType;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  growth: GrowthRate;
  innateSkillId: string;
  avatar: string; // Emoji 或图标占位
  desc: string;
}

export interface PetInstance {
  instanceId: string;
  configId: string;
  name: string;
  level: number;
  exp: number;
  tier: PetTier;
  race: RaceType;
  element: ElementType;
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number; // 0~1
  critDmg: number;  // 基础 1.5 (150%)
  growth: GrowthRate;
  innateSkillId: string;
  skills: string[]; // 习得技能 ID 列表 (最多 6 个)
  traits: string[]; // 突变被动特性
  generation: number;
}

export type SkillType = 'ACTIVE' | 'PASSIVE' | 'COMMAND';
export type SkillCategory = 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'COMMAND';
export type TargetType = 'SELF' | 'SINGLE_ENEMY' | 'ALL_ENEMIES' | 'SINGLE_ALLY' | 'ALL_ALLIES' | 'ALLY_PET';

export type EffectType = 
  | 'DAMAGE' 
  | 'BUFF_STAT' 
  | 'VULNERABILITY' 
  | 'OVERLOAD' 
  | 'EXTRA_TURN' 
  | 'ADVANCE_TURN'
  | 'THORNS_AURA' 
  | 'COUNTER_ATTACK'
  | 'SHIELD'
  | 'DEF_REDUCTION'
  | 'DAMAGE_BOOST'
  | 'TAUNT'
  | 'HEAL'
  | 'RESTORE_ENERGY';

export interface SkillEffect {
  type: EffectType;
  scalingStat?: 'ATK' | 'DEF' | 'SPD';
  multiplier?: number;
  baseFlat?: number; // 前期固定基础值
  statKey?: 'atk' | 'def' | 'spd' | 'critRate' | 'critDmg';
  statPercent?: number; // 属性提升百分比，如 0.5 = +50%
  turns?: number;
  value?: number;
  hpCostPercent?: number; // 消耗当前生命值比例，如 0.15
}

export interface SkillConfig {
  id: string;
  name: string;
  desc: string;
  type: SkillType;
  category: SkillCategory;
  targetType: TargetType;
  costTp?: number; // 角色战术点
  costMp?: number; // 魔法值 / 能量
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  inheritRate: number; // 继承概率 0~1
  effects: SkillEffect[];
}

export interface SpecialRecipeConfig {
  parentA: string;
  parentB: string;
  childId: string;
  tier: PetTier;
  desc: string;
}

export interface GenericMatrixRule {
  raceA: RaceType;
  raceB: RaceType;
  resultRace: RaceType;
}

export interface ClassPassive {
  id: string;
  name: string;
  desc: string;
  type: 'PET_MAX_HP' | 'PET_CRIT_RATE' | 'PET_MP_COST_REDUCTION' | 'TEAM_SPD';
  value: number;
}

export interface ClassSkillUnlock {
  skillId: string;
  unlockLevel: number;
}

export interface CharacterClassConfig {
  id: ClassType;
  name: string;
  title: string;
  desc: string;
  recommendedPetBuild: string;
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  baseCritRate: number;
  minLevel: number;
  respecCost: number;
  passive: ClassPassive;
  skillsPool: ClassSkillUnlock[];
  defaultEquipped: string[];
}

export interface BuffInstance {
  id: string;
  name: string;
  effect: SkillEffect;
  remainingTurns: number;
  sourceId: string;
}

export interface BattleUnit {
  id: string;
  name: string;
  type: EntityType;
  avatar: string;
  level: number;
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  actionDistance: number; // CTB 剩余行动距离，初始 10000
  skills: string[];
  buffs: BuffInstance[];
  shield?: number; // 护盾值
  isDead: boolean;
  petRef?: PetInstance;
}

export interface BattleLogEntry {
  turn: number;
  sourceName: string;
  actionName: string;
  targetName?: string;
  damage?: number;
  isCrit?: boolean;
  message: string;
  type: 'INFO' | 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'COMMAND' | 'DEATH';
}
