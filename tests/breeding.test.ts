import { describe, it, expect, beforeEach } from 'vitest';
import { BreedingEngine } from '../src/core/breeding/BreedingEngine.ts';
import { PetInstance, PetConfig, SkillConfig, SpecialRecipeConfig } from '../src/core/types.ts';
import { getPetGrowthRanges, rollHatchGrowth, rollFusedGrowth } from '../src/core/pet/PetGrowthEngine.ts';
import { PlayerState } from '../src/core/player/PlayerState.ts';
import petsData from '../src/data/pets.json';
import skillsData from '../src/data/skills.json';
import recipesData from '../src/data/recipes.json';

describe('BreedingEngine & Genetic Inheritance', () => {
  let engine: BreedingEngine;

  beforeEach(() => {
    engine = new BreedingEngine(
      petsData as PetConfig[],
      skillsData as SkillConfig[],
      recipesData as { specialRecipes: SpecialRecipeConfig[] }
    );
  });

  const parentLizard: PetInstance = {
    instanceId: 'lizard_1',
    configId: 'pet_fire_lizard',
    name: '火尾蜥 (母)',
    level: 10,
    exp: 0,
    tier: 1,
    race: 'BEAST',
    element: 'FIRE',
    currentHp: 200,
    maxHp: 200,
    atk: 40,
    def: 20,
    spd: 100,
    critRate: 0.1,
    critDmg: 1.5,
    growth: { hpGrowth: 12, atkGrowth: 2.5, defGrowth: 1.2, spdGrowth: 1.0 },
    innateSkillId: 'skill_ember_spit',
    skills: ['skill_ember_spit', 'skill_flame_burst'], // 带稀有技能【烈焰暴击】
    traits: [],
    generation: 1
  };

  const parentTurtle: PetInstance = {
    instanceId: 'turtle_1',
    configId: 'pet_rock_turtle',
    name: '岩壳龟 (父)',
    level: 10,
    exp: 0,
    tier: 1,
    race: 'BEAST',
    element: 'WOOD',
    currentHp: 350,
    maxHp: 350,
    atk: 25,
    def: 45,
    spd: 60,
    critRate: 0.05,
    critDmg: 1.5,
    growth: { hpGrowth: 20, atkGrowth: 1.2, defGrowth: 2.8, spdGrowth: 0.6 },
    innateSkillId: 'skill_rock_armor',
    skills: ['skill_rock_armor'],
    traits: [],
    generation: 1
  };

  it('多概率产出池：融合提供至少 3 个以上产出可能，且高阶进阶概率 ≤ 10%', () => {
    const preview = engine.previewFusion(parentLizard, parentTurtle);
    // 至少 3 个以上产出可能
    expect(preview.outcomes.length).toBeGreaterThanOrEqual(3);

    // 概率和必须严格等于 100% (1.0)
    const totalProb = preview.outcomes.reduce((acc, cur) => acc + cur.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 5);

    // 高阶品质进阶的概率调到最低，不得超过 10%
    const advancementOutcomes = preview.outcomes.filter(o => o.isAdvancement);
    if (advancementOutcomes.length > 0) {
      for (const adv of advancementOutcomes) {
        expect(adv.probability).toBeLessThanOrEqual(0.10);
      }
    }

    // 验证火尾蜥 + 岩壳龟的进阶产物包含特殊配方【熔岩巨兽】(T2 进阶血脉)
    const specialOutcome = preview.outcomes.find(o => o.targetConfig.id === 'pet_magma_behemoth');
    expect(specialOutcome).toBeDefined();
    expect(specialOutcome!.probability).toBeLessThanOrEqual(0.10);
    expect(specialOutcome!.targetTier).toBe(2);
  });

  it('成长重新孵化机制：去除双亲平均数保底，每次融合严格根据产物种族与品阶的成长区间随机生成', () => {
    // 运行多次模拟以保证融合产物的成长资质严格处于产物品阶与种族的成长区间内部
    for (let i = 0; i < 20; i++) {
      const result = engine.executeFusion(parentLizard, parentTurtle);
      const childRanges = getPetGrowthRanges(result.child.tier, result.child.race);

      expect(result.child.growth.hpGrowth).toBeGreaterThanOrEqual(childRanges.hp.min);
      expect(result.child.growth.hpGrowth).toBeLessThanOrEqual(childRanges.hp.max);
      expect(result.child.growth.atkGrowth).toBeGreaterThanOrEqual(childRanges.atk.min);
      expect(result.child.growth.atkGrowth).toBeLessThanOrEqual(childRanges.atk.max);
      expect(result.child.growth.defGrowth).toBeGreaterThanOrEqual(childRanges.def.min);
      expect(result.child.growth.defGrowth).toBeLessThanOrEqual(childRanges.def.max);
      expect(result.child.growth.spdGrowth).toBeGreaterThanOrEqual(childRanges.spd.min);
      expect(result.child.growth.spdGrowth).toBeLessThanOrEqual(childRanges.spd.max);
    }
  });

  it('验证融合后成长完全独立于双亲成长值，严格按种族区间随机', () => {
    const customPetA: PetInstance = {
      ...parentLizard,
      growth: { hpGrowth: 100, atkGrowth: 99, defGrowth: 99, spdGrowth: 99 }
    };
    const customPetB: PetInstance = {
      ...parentTurtle,
      growth: { hpGrowth: 100, atkGrowth: 99, defGrowth: 99, spdGrowth: 99 }
    };

    for (let i = 0; i < 15; i++) {
      const res = engine.executeFusion(customPetA, customPetB);
      const childRanges = getPetGrowthRanges(res.child.tier, res.child.race);
      // 融合产物攻击力成长不再继承双亲的 99，而是严格落在自身种族区间内
      expect(res.child.growth.atkGrowth).toBeLessThanOrEqual(childRanges.atk.max);
      expect(res.child.growth.atkGrowth).toBeGreaterThanOrEqual(childRanges.atk.min);
    }
  });

  it('基因稳定剂 100% 锁定指定核心神技遗传', () => {
    // 锁定灵宠 A 的【烈焰暴击】(skill_flame_burst)
    const result = engine.executeFusion(parentLizard, parentTurtle, 'skill_flame_burst');
    expect(result.child.skills).toContain('skill_flame_burst');
    expect(result.inheritedSkillIds).toContain('skill_flame_burst');
  });

  it('出战宠物不能融合保护与融合后原宠物彻底消失', () => {
    const state = PlayerState.getInstance();
    const petA: PetInstance = { ...parentLizard, instanceId: 'fusion_parent_a' };
    const petB: PetInstance = { ...parentTurtle, instanceId: 'fusion_parent_b' };
    state.ownedPets = [petA, petB];
    state.teamPets = [petA]; // petA 正在出战中

    const fusionRes = engine.executeFusion(petA, petB);
    // 1. 尝试融合出战中的宠物，应被严格拦截拒绝
    const fusionSuccessBlocked = state.completeFusion(petA.instanceId, petB.instanceId, fusionRes.child);
    expect(fusionSuccessBlocked).toBe(false);
    expect(state.ownedPets.length).toBe(2);

    // 2. 将 petA 从出战阵容卸下归仓后，再执行融合
    state.teamPets = [];
    const fusionSuccess = state.completeFusion(petA.instanceId, petB.instanceId, fusionRes.child);
    expect(fusionSuccess).toBe(true);

    // 验证原宠物 A 和 B 均已彻底消失
    expect(state.ownedPets.some(p => p.instanceId === 'fusion_parent_a')).toBe(false);
    expect(state.ownedPets.some(p => p.instanceId === 'fusion_parent_b')).toBe(false);

    // 验证新灵宠已成功入库
    expect(state.ownedPets.some(p => p.instanceId === fusionRes.child.instanceId)).toBe(true);
  });
});

describe('Pet Species & Race Roster (宠物品种扩充与种族数量验证)', () => {
  const races = ['BEAST', 'DRAGON', 'ELEMENTAL', 'UNDEAD', 'MECHANIC'] as const;

  it('总宠物品种数量应达到 50 只以上 (实际为 55 只)', () => {
    expect(petsData.length).toBeGreaterThanOrEqual(50);
    expect(petsData.length).toBe(55);
  });

  it('五大种族 (灵兽、真龙、元素、亡灵、机械) 每个种族均至少拥有 10 只以上宠物', () => {
    const counts: Record<string, number> = {};
    for (const r of races) {
      counts[r] = 0;
    }

    for (const pet of petsData) {
      if (counts[pet.race] !== undefined) {
        counts[pet.race]++;
      }
    }

    for (const r of races) {
      expect(counts[r], `种族 ${r} 宠物品种数量不足 10 只 (实际: ${counts[r]})`).toBeGreaterThanOrEqual(10);
    }
  });

  it('每只宠物的固有技能 (innateSkillId) 必须在技能库中真实存在且配置合法', () => {
    const validSkillIds = new Set(skillsData.map((s: { id: string }) => s.id));
    for (const pet of petsData) {
      expect(validSkillIds.has(pet.innateSkillId), `宠物 ${pet.name} (${pet.id}) 的固有技能 ${pet.innateSkillId} 不存在`).toBe(true);
      expect(pet.baseHp).toBeGreaterThan(0);
      expect(pet.baseAtk).toBeGreaterThan(0);
      expect(pet.baseDef).toBeGreaterThan(0);
      expect(pet.baseSpd).toBeGreaterThan(0);
      expect([1, 2, 3, 4]).toContain(pet.tier);
    }
  });

  it('特殊合成配方 (recipesData) 中的父代与子代宠物 ID 必须在宠物库中合法存在', () => {
    const validPetIds = new Set(petsData.map((p: { id: string }) => p.id));
    for (const recipe of recipesData.specialRecipes) {
      expect(validPetIds.has(recipe.parentA), `配方中的 parentA [${recipe.parentA}] 不存在`).toBe(true);
      expect(validPetIds.has(recipe.parentB), `配方中的 parentB [${recipe.parentB}] 不存在`).toBe(true);
      expect(validPetIds.has(recipe.childId), `配方目标 childId [${recipe.childId}] 不存在`).toBe(true);
    }
  });
});

describe('PetGrowthEngine (各阶与各种族成长区间、孵化随机、融合保底规则)', () => {
  it('正确依据品阶基准与种族修正生成成长区间 (如真龙系高攻、不死系高血、机械系高防)', () => {
    const dragonT1 = getPetGrowthRanges(1, 'DRAGON');
    const beastT1 = getPetGrowthRanges(1, 'BEAST');
    const undeadT1 = getPetGrowthRanges(1, 'UNDEAD');
    const mechanicT1 = getPetGrowthRanges(1, 'MECHANIC');

    // 真龙系 ATK 修正 (1.35) 显著高于野兽系 (1.10)
    expect(dragonT1.atk.max).toBeGreaterThan(beastT1.atk.max);

    // 不死系 HP 修正 (1.30) 显著高于元素系
    const elementalT1 = getPetGrowthRanges(1, 'ELEMENTAL');
    expect(undeadT1.hp.max).toBeGreaterThan(elementalT1.hp.max);

    // 机械系 DEF 修正 (1.35) 显著高于元素系 (0.70)
    expect(mechanicT1.def.max).toBeGreaterThan(elementalT1.def.max);
  });

  it('破壳孵化成长资质严格落在区间 [min, max] 内', () => {
    const rangeT2Dragon = getPetGrowthRanges(2, 'DRAGON');
    for (let i = 0; i < 50; i++) {
      const growth = rollHatchGrowth(2, 'DRAGON');
      expect(growth.hpGrowth).toBeGreaterThanOrEqual(rangeT2Dragon.hp.min);
      expect(growth.hpGrowth).toBeLessThanOrEqual(rangeT2Dragon.hp.max);
      expect(growth.atkGrowth).toBeGreaterThanOrEqual(rangeT2Dragon.atk.min);
      expect(growth.atkGrowth).toBeLessThanOrEqual(rangeT2Dragon.atk.max);
    }
  });

  it('双宠融合资质严格限制在目标种族的成长区间内，不再受双亲平均数影响', () => {
    const gA = { hpGrowth: 15, atkGrowth: 10, defGrowth: 5, spdGrowth: 1.0 };
    const gB = { hpGrowth: 25, atkGrowth: 30, defGrowth: 15, spdGrowth: 2.0 };
    const rangeT1Beast = getPetGrowthRanges(1, 'BEAST');

    for (let i = 0; i < 50; i++) {
      const fused = rollFusedGrowth(1, 'BEAST', gA, gB);
      expect(fused.atkGrowth).toBeGreaterThanOrEqual(rangeT1Beast.atk.min);
      expect(fused.atkGrowth).toBeLessThanOrEqual(rangeT1Beast.atk.max);
      expect(fused.hpGrowth).toBeGreaterThanOrEqual(rangeT1Beast.hp.min);
      expect(fused.hpGrowth).toBeLessThanOrEqual(rangeT1Beast.hp.max);
      expect(fused.defGrowth).toBeGreaterThanOrEqual(rangeT1Beast.def.min);
      expect(fused.defGrowth).toBeLessThanOrEqual(rangeT1Beast.def.max);
      expect(fused.spdGrowth).toBeGreaterThanOrEqual(rangeT1Beast.spd.min);
      expect(fused.spdGrowth).toBeLessThanOrEqual(rangeT1Beast.spd.max);
    }
  });
});
