import { PetConfig, PetInstance, SpecialRecipeConfig, SkillConfig, PetTier } from '../types.ts';

export interface FusionPreview {
  targetConfig: PetConfig;
  targetTier: PetTier;
  isSpecialRecipe: boolean;
  recipeDesc: string;
  candidateSkills: SkillConfig[];
  mutationRate: number;
}

export interface FusionResult {
  child: PetInstance;
  isMutation: boolean;
  mutationTrait?: string;
  inheritedSkillIds: string[];
  recipeDesc: string;
}

const MUTATION_TRAITS = [
  '【狂怒嗜血：击杀敌人后回复15%最大生命】',
  '【不灭意志：濒死时抵挡一次致命伤害并锁血1点】',
  '【疾风突刺：开局第一回合行动速度提高50%】',
  '【天雷共鸣：暴击伤害额外追加30%真实伤害】'
];

export class BreedingEngine {
  private petConfigs: Map<string, PetConfig> = new Map();
  private skillsMap: Map<string, SkillConfig> = new Map();
  private specialRecipes: SpecialRecipeConfig[] = [];

  constructor(
    petConfigs: PetConfig[],
    skills: SkillConfig[],
    recipes: { specialRecipes: SpecialRecipeConfig[] }
  ) {
    petConfigs.forEach(p => this.petConfigs.set(p.id, p));
    skills.forEach(s => this.skillsMap.set(s.id, s));
    this.specialRecipes = recipes.specialRecipes;
  }

  /**
   * 预览合成结果（明牌博弈，展示候选技能池与产出品种）
   */
  public previewFusion(parentA: PetInstance, parentB: PetInstance): FusionPreview {
    const special = this.findSpecialRecipe(parentA.configId, parentB.configId);
    let targetConfig: PetConfig;
    let isSpecial = false;
    let recipeDesc = '';
    let targetTier: PetTier = Math.max(parentA.tier, parentB.tier) as PetTier;

    if (special) {
      targetConfig = this.petConfigs.get(special.childId)!;
      isSpecial = true;
      recipeDesc = special.desc;
      targetTier = special.tier;
    } else {
      // 通用规则：同阶合成 80% 几率升阶
      if (parentA.tier === parentB.tier && parentA.tier < 4) {
        targetTier = (parentA.tier + 1) as PetTier;
      }
      // 默认在目标阶级中匹配一种同种族或父方种族的宠物
      targetConfig = this.findFallbackChild(parentA, parentB, targetTier);
      recipeDesc = `通用基因合成：${parentA.name} (T${parentA.tier}) + ${parentB.name} (T${parentB.tier}) 产出 T${targetTier} 宠物`;
    }

    // 候选技能池
    const candidateSkills = this.getCandidateSkills(parentA, parentB);

    return {
      targetConfig,
      targetTier,
      isSpecialRecipe: isSpecial,
      recipeDesc,
      candidateSkills,
      mutationRate: 0.05 // 5%
    };
  }

  /**
   * 执行基因合成
   */
  public executeFusion(
    parentA: PetInstance,
    parentB: PetInstance,
    lockedSkillId?: string
  ): FusionResult {
    const preview = this.previewFusion(parentA, parentB);
    const targetConfig = preview.targetConfig;

    // 1. 资质遗传计算 (均值 + 随机微小浮动)
    const jitter = (Math.random() * 0.12 - 0.04); // -0.04 ~ +0.08
    const tierBonus = targetConfig.tier * 0.1;
    const growth = {
      hpGrowth: Math.round(((parentA.growth.hpGrowth + parentB.growth.hpGrowth) / 2) * (1 + jitter + tierBonus) * 10) / 10,
      atkGrowth: Math.round(((parentA.growth.atkGrowth + parentB.growth.atkGrowth) / 2) * (1 + jitter + tierBonus) * 10) / 10,
      defGrowth: Math.round(((parentA.growth.defGrowth + parentB.growth.defGrowth) / 2) * (1 + jitter + tierBonus) * 10) / 10,
      spdGrowth: Math.round(((parentA.growth.spdGrowth + parentB.growth.spdGrowth) / 2) * (1 + jitter + tierBonus) * 10) / 10
    };

    // 2. 技能继承抽取
    const inheritedSkillIds: string[] = [];
    if (lockedSkillId) {
      inheritedSkillIds.push(lockedSkillId);
    }

    const pool = this.getCandidateSkills(parentA, parentB).filter(s => s.id !== lockedSkillId);
    pool.forEach(skill => {
      if (inheritedSkillIds.length >= 4) return; // 继承槽位上限 4
      const rate = skill.rarity === 'EPIC' ? 0.35 : (skill.rarity === 'RARE' ? 0.50 : 0.70);
      if (Math.random() < rate) {
        inheritedSkillIds.push(skill.id);
      }
    });

    // 保底：若没有任何技能继承成功，保底随机抽 1 个
    if (inheritedSkillIds.length === 0 && pool.length > 0) {
      const fallback = pool[Math.floor(Math.random() * pool.length)];
      inheritedSkillIds.push(fallback.id);
    }

    // 3. 良性突变检测 (5% 概率)
    const isMutation = Math.random() < 0.05;
    let mutationTrait: string | undefined;
    const traits: string[] = [...(parentA.traits || [])];
    if (isMutation) {
      mutationTrait = MUTATION_TRAITS[Math.floor(Math.random() * MUTATION_TRAITS.length)];
      if (!traits.includes(mutationTrait)) {
        traits.push(mutationTrait);
      }
    }

    // 4. 组装新宠物实例
    const childGen = Math.max(parentA.generation, parentB.generation) + 1;
    const childSkills = [targetConfig.innateSkillId, ...inheritedSkillIds];

    const child: PetInstance = {
      instanceId: `pet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      configId: targetConfig.id,
      name: `${targetConfig.name} [${childGen}代]`,
      level: 1,
      exp: 0,
      tier: targetConfig.tier,
      race: targetConfig.race,
      element: targetConfig.element,
      currentHp: targetConfig.baseHp,
      maxHp: targetConfig.baseHp,
      atk: targetConfig.baseAtk,
      def: targetConfig.baseDef,
      spd: targetConfig.baseSpd,
      critRate: 0.1,
      critDmg: 1.5,
      growth,
      innateSkillId: targetConfig.innateSkillId,
      skills: childSkills,
      traits,
      generation: childGen
    };

    return {
      child,
      isMutation,
      mutationTrait,
      inheritedSkillIds,
      recipeDesc: preview.recipeDesc
    };
  }

  /**
   * 查找特殊配方
   */
  private findSpecialRecipe(parentAId: string, parentBId: string): SpecialRecipeConfig | undefined {
    return this.specialRecipes.find(r => 
      (r.parentA === parentAId && r.parentB === parentBId) ||
      (r.parentA === parentBId && r.parentB === parentAId)
    );
  }

  /**
   * 通用兜底后代查找
   */
  private findFallbackChild(parentA: PetInstance, parentB: PetInstance, targetTier: PetTier): PetConfig {
    const list = Array.from(this.petConfigs.values());
    // 优先寻找目标品阶的同种族怪
    const matched = list.find(p => p.tier === targetTier && (p.race === parentA.race || p.race === parentB.race));
    if (matched) return matched;
    // 其次寻找任意目标品阶怪
    const anyTier = list.find(p => p.tier === targetTier);
    if (anyTier) return anyTier;
    // 最后退回父方配置
    return this.petConfigs.get(parentA.configId)!;
  }

  /**
   * 获取父母候选技能列表（去重且排除专属固有技）
   */
  private getCandidateSkills(parentA: PetInstance, parentB: PetInstance): SkillConfig[] {
    const skillIds = new Set<string>();
    [...parentA.skills, ...parentB.skills].forEach(id => {
      // 固有技能不可遗传给其他物种
      if (id !== parentA.innateSkillId && id !== parentB.innateSkillId) {
        skillIds.add(id);
      }
    });

    const result: SkillConfig[] = [];
    skillIds.forEach(id => {
      const skill = this.skillsMap.get(id);
      if (skill && skill.inheritRate > 0) {
        result.push(skill);
      }
    });
    return result;
  }
}
