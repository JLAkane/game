import { describe, it, expect, beforeEach } from 'vitest';
import { BreedingEngine } from '../src/core/breeding/BreedingEngine.ts';
import { PetInstance, PetConfig, SkillConfig, SpecialRecipeConfig } from '../src/core/types.ts';
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

  it('特殊配方精确命中：火尾蜥 + 岩壳龟 = 熔岩巨兽 (T2 稀有)', () => {
    const preview = engine.previewFusion(parentLizard, parentTurtle);
    expect(preview.isSpecialRecipe).toBe(true);
    expect(preview.targetConfig.id).toBe('pet_magma_behemoth');
    expect(preview.targetTier).toBe(2);

    const result = engine.executeFusion(parentLizard, parentTurtle);
    expect(result.child.configId).toBe('pet_magma_behemoth');
    expect(result.child.tier).toBe(2);
    expect(result.child.generation).toBe(2);
    // 子代自动具有专属固有技【熔岩重锤】
    expect(result.child.skills).toContain('skill_magma_slam');
  });

  it('基因稳定剂 100% 锁定指定核心神技遗传', () => {
    // 锁定母方的【烈焰暴击】(skill_flame_burst)
    const result = engine.executeFusion(parentLizard, parentTurtle, 'skill_flame_burst');
    expect(result.child.skills).toContain('skill_flame_burst');
    expect(result.inheritedSkillIds).toContain('skill_flame_burst');
  });

  it('资质继承合理浮动且随品阶提升获得阶级加成', () => {
    const result = engine.executeFusion(parentLizard, parentTurtle);
    // 父均值: hp=(12+20)/2 = 16, atk=(2.5+1.2)/2 = 1.85, def=(1.2+2.8)/2 = 2.0
    // T2 附带阶级加成与浮动
    expect(result.child.growth.hpGrowth).toBeGreaterThan(15);
    expect(result.child.growth.atkGrowth).toBeGreaterThan(1.8);
    expect(result.child.growth.defGrowth).toBeGreaterThan(1.9);
  });
});
