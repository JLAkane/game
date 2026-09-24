import { PetConfig, PetInstance, SpecialRecipeConfig, SkillConfig, PetTier, RaceType, GrowthRate } from '../types.ts';
import { rollFusedGrowth, round1 } from '../pet/PetGrowthEngine.ts';

export interface FusionOutcomePossibility {
  targetConfig: PetConfig;
  targetTier: PetTier;
  probability: number; // 0 ~ 1, e.g. 0.35 = 35%
  isAdvancement: boolean; // 是否属于品质进阶 (Tier + 1)
  isSpecialRecipe: boolean;
  recipeDesc: string;
}

export interface FusionPreview {
  outcomes: FusionOutcomePossibility[];
  candidateSkills: SkillConfig[];
  mutationRate: number;
  guaranteedMinGrowth: GrowthRate;
  // 兼顾原有只读单一对象的调用
  targetConfig: PetConfig;
  targetTier: PetTier;
  isSpecialRecipe: boolean;
  recipeDesc: string;
}

export interface FusionResult {
  child: PetInstance;
  isMutation: boolean;
  mutationTrait?: string;
  inheritedSkillIds: string[];
  recipeDesc: string;
  pickedOutcome: FusionOutcomePossibility;
}

const MUTATION_TRAITS = [
  '【狂怒嗜血：击杀敌人后回复15%最大生命】',
  '【不灭意志：濒死时抵挡一次致命伤害并锁血1点】',
  '【疾风突刺：开局第一回合行动速度提高50%】',
  '【天雷共鸣：暴击伤害额外追加30%真实伤害】'
];

export interface RaceMatrixEntry {
  raceA: string;
  raceB: string;
  resultRace: string;
}

export class BreedingEngine {
  private petConfigs: Map<string, PetConfig> = new Map();
  private skillsMap: Map<string, SkillConfig> = new Map();
  private specialRecipes: SpecialRecipeConfig[] = [];
  private genericRaceMatrix: RaceMatrixEntry[] = [];

  constructor(
    petConfigs: PetConfig[],
    skills: SkillConfig[],
    recipes: { 
      specialRecipes: SpecialRecipeConfig[];
      genericRaceMatrix?: RaceMatrixEntry[];
    }
  ) {
    petConfigs.forEach(p => this.petConfigs.set(p.id, p));
    skills.forEach(s => this.skillsMap.set(s.id, s));
    this.specialRecipes = recipes.specialRecipes;
    this.genericRaceMatrix = recipes.genericRaceMatrix || [];
  }

  /**
   * 预览双宠融合结果（多概率产出池展示，保底均值资质与候选技能池）
   */
  public previewFusion(petA: PetInstance, petB: PetInstance): FusionPreview {
    const configA = this.petConfigs.get(petA.configId)!;
    const configB = this.petConfigs.get(petB.configId)!;
    const baseTier = Math.max(petA.tier, petB.tier) as PetTier;
    const resultRace = this.calculateResultRace(petA.race, petB.race) as RaceType;
    const special = this.findSpecialRecipe(petA.configId, petB.configId);

    // 1. 构建高阶突破产物 (进阶概率调至最低，不超过 10%)
    let advConfig: PetConfig;
    let advTier: PetTier;
    let isSpecial = false;
    let advDesc = '';
    const canAdvance = baseTier < 4;

    if (special) {
      advConfig = this.petConfigs.get(special.childId)!;
      advTier = special.tier;
      isSpecial = true;
      advDesc = `✨ 专属公式进阶：${special.desc}`;
    } else if (canAdvance) {
      advTier = (baseTier + 1) as PetTier;
      advConfig = this.findAdvancementPet(resultRace, advTier, petA, petB);
      advDesc = `⚡ 罕见品阶突破：跃升进阶【${advConfig.name}】`;
    } else {
      // 双方已是最高阶 T4，产出同阶稀有神兽
      advTier = 4;
      advConfig = this.findDifferentPetOfTier(4, [configA.id, configB.id], resultRace) || configA;
      advDesc = `🌟 创世神性觉醒：诞育稀有圣神【${advConfig.name}】`;
    }

    // 2. 构建多概率产出池 (至少 3 个以上产出可能性，进阶概率固定为 10% <= 10%)
    const outcomes: FusionOutcomePossibility[] = [];
    const advancementProb = 0.10; // 品质进阶概率调到最低，不超过 10%

    if (petA.configId !== petB.configId) {
      // 双亲不同种：A(35%), B(35%), C同阶衍生(20%), D高阶突破(10%)
      const configC = this.findDifferentPetOfTier(baseTier, [configA.id, configB.id], resultRace) || configA;

      outcomes.push({
        targetConfig: configA,
        targetTier: configA.tier,
        probability: 0.35,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `同源继承：延续形态【${configA.name}】`
      });

      outcomes.push({
        targetConfig: configB,
        targetTier: configB.tier,
        probability: 0.35,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `同源继承：延续形态【${configB.name}】`
      });

      outcomes.push({
        targetConfig: configC,
        targetTier: configC.tier,
        probability: 0.20,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `同阶衍生：种族基因变异【${configC.name}】`
      });

      outcomes.push({
        targetConfig: advConfig,
        targetTier: advTier,
        probability: advancementProb,
        isAdvancement: canAdvance,
        isSpecialRecipe: isSpecial,
        recipeDesc: advDesc
      });
    } else {
      // 双亲同种：A纯血(50%), C1同阶新物种(20%), C2同阶新物种(20%), D高阶突破(10%)
      const configC1 = this.findDifferentPetOfTier(baseTier, [configA.id], resultRace) || configA;
      const configC2 = this.findDifferentPetOfTier(baseTier, [configA.id, configC1.id], resultRace) || configC1;

      outcomes.push({
        targetConfig: configA,
        targetTier: configA.tier,
        probability: 0.50,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `纯血同族继承【${configA.name}】`
      });

      outcomes.push({
        targetConfig: configC1,
        targetTier: configC1.tier,
        probability: 0.20,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `同族隐性分支【${configC1.name}】`
      });

      outcomes.push({
        targetConfig: configC2,
        targetTier: configC2.tier,
        probability: 0.20,
        isAdvancement: false,
        isSpecialRecipe: false,
        recipeDesc: `同族同阶衍生【${configC2.name}】`
      });

      outcomes.push({
        targetConfig: advConfig,
        targetTier: advTier,
        probability: advancementProb,
        isAdvancement: canAdvance,
        isSpecialRecipe: isSpecial,
        recipeDesc: advDesc
      });
    }

    // 3. 计算双亲保底均值成长
    const guaranteedMinGrowth: GrowthRate = {
      hpGrowth: round1((petA.growth.hpGrowth + petB.growth.hpGrowth) / 2),
      atkGrowth: round1((petA.growth.atkGrowth + petB.growth.atkGrowth) / 2),
      defGrowth: round1((petA.growth.defGrowth + petB.growth.defGrowth) / 2),
      spdGrowth: round1((petA.growth.spdGrowth + petB.growth.spdGrowth) / 2)
    };

    // 候选技能池
    const candidateSkills = this.getCandidateSkills(petA, petB);

    // 代表产物 (若有特殊配方进阶展示特殊配方，否则展示概率最大的主产物)
    const primaryOutcome = isSpecial ? outcomes[outcomes.length - 1] : outcomes[0];

    return {
      outcomes,
      candidateSkills,
      mutationRate: 0.05, // 5%
      guaranteedMinGrowth,
      targetConfig: primaryOutcome.targetConfig,
      targetTier: primaryOutcome.targetTier,
      isSpecialRecipe: isSpecial,
      recipeDesc: primaryOutcome.recipeDesc
    };
  }

  /**
   * 执行双宠基因融合
   */
  public executeFusion(
    petA: PetInstance,
    petB: PetInstance,
    lockedSkillId?: string
  ): FusionResult {
    const preview = this.previewFusion(petA, petB);

    // 1. 依据设定概率掷骰决定最终产物
    const rand = Math.random();
    let accumulated = 0;
    let pickedOutcome = preview.outcomes[0];
    for (const outcome of preview.outcomes) {
      accumulated += outcome.probability;
      if (rand <= accumulated || outcome === preview.outcomes[preview.outcomes.length - 1]) {
        pickedOutcome = outcome;
        break;
      }
    }

    const targetConfig = pickedOutcome.targetConfig;

    // 2. 重新抽取成长资质：去除双亲平均数限制，每次融合如同重新孵化，严格根据产物种族与品阶区间随机
    const growth = rollFusedGrowth(
      targetConfig.tier,
      targetConfig.race,
      petA.growth,
      petB.growth
    );

    // 3. 技能继承抽取
    const inheritedSkillIds: string[] = [];
    if (lockedSkillId) {
      inheritedSkillIds.push(lockedSkillId);
    }

    const pool = this.getCandidateSkills(petA, petB).filter(s => s.id !== lockedSkillId);
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

    // 4. 良性突变检测 (5% 概率)
    const isMutation = Math.random() < 0.05;
    let mutationTrait: string | undefined;
    const traits: string[] = [...(petA.traits || [])];
    if (isMutation) {
      mutationTrait = MUTATION_TRAITS[Math.floor(Math.random() * MUTATION_TRAITS.length)];
      if (!traits.includes(mutationTrait)) {
        traits.push(mutationTrait);
      }
    }

    // 5. 组装新宠物实例
    const childGen = Math.max(petA.generation, petB.generation) + 1;
    const childSkills = [targetConfig.innateSkillId, ...inheritedSkillIds];
    if (!childSkills.includes('skill_basic_strike')) {
      childSkills.unshift('skill_basic_strike');
    }

    const child: PetInstance = {
      instanceId: `pet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      configId: targetConfig.id,
      name: targetConfig.name,
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
      equippedSkills: childSkills.slice(0, 4),
      traits,
      generation: childGen
    };

    return {
      child,
      isMutation,
      mutationTrait,
      inheritedSkillIds,
      recipeDesc: pickedOutcome.recipeDesc,
      pickedOutcome
    };
  }

  /**
   * 依据种族矩阵计算融合种族
   */
  public calculateResultRace(raceA: string, raceB: string): string {
    const match = this.genericRaceMatrix.find(m =>
      (m.raceA === raceA && m.raceB === raceB) ||
      (m.raceA === raceB && m.raceB === raceA)
    );
    return match ? match.resultRace : raceA;
  }

  /**
   * 查找特殊融合配方
   */
  public findSpecialRecipe(petAId: string, petBId: string): SpecialRecipeConfig | undefined {
    return this.specialRecipes.find(r => 
      (r.parentA === petAId && r.parentB === petBId) ||
      (r.parentA === petBId && r.parentB === petAId)
    );
  }

  /**
   * 查找同阶中除指定排除列表外的其他物种
   */
  private findDifferentPetOfTier(
    tier: PetTier,
    excludeIds: string[],
    preferredRace?: RaceType
  ): PetConfig | undefined {
    const list = Array.from(this.petConfigs.values());
    if (preferredRace) {
      const match = list.find(p => p.tier === tier && p.race === preferredRace && !excludeIds.includes(p.id));
      if (match) return match;
    }
    return list.find(p => p.tier === tier && !excludeIds.includes(p.id));
  }

  /**
   * 查找进阶突破目标物种
   */
  private findAdvancementPet(
    targetRace: RaceType,
    targetTier: PetTier,
    petA: PetInstance,
    petB: PetInstance
  ): PetConfig {
    const list = Array.from(this.petConfigs.values());
    const exact = list.find(p => p.tier === targetTier && p.race === targetRace);
    if (exact) return exact;

    const matchParentRace = list.find(p => p.tier === targetTier && (p.race === petA.race || p.race === petB.race));
    if (matchParentRace) return matchParentRace;

    const anyTier = list.find(p => p.tier === targetTier);
    if (anyTier) return anyTier;

    return this.petConfigs.get(petA.configId)!;
  }

  /**
   * 获取双宠候选技能列表（去重且排除专属固有技）
   */
  private getCandidateSkills(petA: PetInstance, petB: PetInstance): SkillConfig[] {
    const skillIds = new Set<string>();
    [...petA.skills, ...petB.skills].forEach(id => {
      if (id !== petA.innateSkillId && id !== petB.innateSkillId) {
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
