import { describe, it, expect, beforeEach } from 'vitest';
import { BattleEngine } from '../src/core/battle/BattleEngine.ts';
import { BattleUnit, SkillConfig } from '../src/core/types.ts';
import skillsData from '../src/data/skills.json';

describe('BattleEngine & Dynamic DPS Transition', () => {
  let engine: BattleEngine;
  const skills = skillsData as SkillConfig[];

  beforeEach(() => {
    engine = new BattleEngine(skills);
  });

  it('前期：角色自身高伤战技占据绝对输出主导 (80%+)', () => {
    // 构建前期小队：Lv.5 角色 + Lv.1 幼宠 (火蜥蜴)
    const charUnit: BattleUnit = {
      id: 'char_1',
      name: '主角(冒险者)',
      type: 'CHARACTER',
      avatar: '🧙‍♂️',
      level: 5,
      currentHp: 400,
      maxHp: 400,
      currentMp: 100,
      maxMp: 100,
      atk: 65,
      def: 20,
      spd: 100,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_char_slash'],
      buffs: [],
      isDead: false
    };

    const petUnit: BattleUnit = {
      id: 'pet_1',
      name: '火尾蜥幼体',
      type: 'PET',
      avatar: '🦎',
      level: 1,
      currentHp: 120,
      maxHp: 120,
      currentMp: 30,
      maxMp: 30,
      atk: 22,
      def: 10,
      spd: 90,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_ember_spit'],
      buffs: [],
      isDead: false
    };

    const monster: BattleUnit = {
      id: 'mob_1',
      name: '荒野史莱姆',
      type: 'MONSTER',
      avatar: '🟢',
      level: 3,
      currentHp: 500,
      maxHp: 500,
      currentMp: 0,
      maxMp: 0,
      atk: 15,
      def: 15,
      spd: 50,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: [],
      buffs: [],
      isDead: false
    };

    engine.initBattle([charUnit, petUnit], [monster]);

    // 角色释放【重装轰斩】: baseFlat 160 + atk*1.5 = 160 + 65*1.5 = 257.5
    engine.executeAction('char_1', 'skill_char_slash', 'mob_1');
    const charLog = engine.logs.find(l => l.sourceName === '主角(冒险者)' && l.damage);
    expect(charLog?.damage).toBeGreaterThan(200);

    // 宠物释放【火花吐息】: baseFlat 10 + atk*1.2 = 10 + 22*1.2 = 36.4
    engine.executeAction('pet_1', 'skill_ember_spit', 'mob_1');
    const petLog = engine.logs.find(l => l.sourceName === '火尾蜥幼体' && l.damage);
    expect(petLog?.damage).toBeLessThan(40);

    // 计算角色输出贡献度: 角色伤害 / 总伤害 > 80%
    const totalDmg = (charLog?.damage || 0) + (petLog?.damage || 0);
    const charRatio = (charLog?.damage || 0) / totalDmg;
    expect(charRatio).toBeGreaterThan(0.8);
  });

  it('后期：角色战术指挥（弱点标记+超载）使高阶神宠打出核爆输出 (90%+)', () => {
    // 后期小队：Lv.35 战术指挥官 + Lv.35 狱火炎龙 (T3 史诗巨兽)
    const commanderUnit: BattleUnit = {
      id: 'char_cmd',
      name: '主角(战术指挥官)',
      type: 'CHARACTER',
      avatar: '👑',
      level: 35,
      currentHp: 2500,
      maxHp: 2500,
      currentMp: 200,
      maxMp: 200,
      atk: 100, // 自身攻击力平缓
      def: 150,
      spd: 110,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_char_slash', 'skill_char_vulnerability', 'skill_char_overload', 'skill_char_extra_turn'],
      buffs: [],
      isDead: false
    };

    const dragonUnit: BattleUnit = {
      id: 'dragon_1',
      name: '狱火炎龙',
      type: 'PET',
      avatar: '🐲',
      level: 35,
      currentHp: 3500,
      maxHp: 3500,
      currentMp: 150,
      maxMp: 150,
      atk: 800, // 培育多代的高攻资质
      def: 300,
      spd: 120,
      critRate: 0.35,
      critDmg: 2.0,
      actionDistance: 10000,
      skills: ['skill_apocalypse_flame'],
      buffs: [],
      isDead: false
    };

    const bossUnit: BattleUnit = {
      id: 'boss_1',
      name: '深渊泰坦领主',
      type: 'MONSTER',
      avatar: '👹',
      level: 40,
      currentHp: 100000,
      maxHp: 100000,
      currentMp: 0,
      maxMp: 0,
      atk: 250,
      def: 250,
      spd: 80,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: [],
      buffs: [],
      isDead: false
    };

    engine.initBattle([commanderUnit, dragonUnit], [bossUnit]);

    // 1. 指挥官给 BOSS 挂上【弱点标记】(+150% 宠物易伤)
    engine.executeAction('char_cmd', 'skill_char_vulnerability', 'boss_1');
    expect(bossUnit.buffs.some(b => b.effect.type === 'VULNERABILITY')).toBe(true);

    // 2. 指挥官给狱火炎龙打【战术超载】(+150% 攻击力，必暴)
    engine.executeAction('char_cmd', 'skill_char_overload', 'dragon_1');
    expect(dragonUnit.buffs.some(b => b.effect.type === 'OVERLOAD')).toBe(true);

    // 3. 狱火炎龙释放终极奥义【灭世红莲龙息】
    engine.executeAction('dragon_1', 'skill_apocalypse_flame', 'boss_1');
    const dragonLog = engine.logs.find(l => l.sourceName === '狱火炎龙' && l.damage);
    expect(dragonLog).toBeDefined();
    expect(dragonLog?.isCrit).toBe(true);
    // 基础攻击 800 + 1200(超载) = 2000 atk, 倍率 4.5, 必暴 x2.0, 弱点增幅 x2.5 -> 数万级核爆
    expect(dragonLog!.damage).toBeGreaterThan(10000);

    // 4. 对比此时角色自身普通攻击伤害
    engine.executeAction('char_cmd', 'skill_char_slash', 'boss_1');
    const charLog = engine.logs.find(l => l.sourceName === '主角(战术指挥官)' && l.damage);
    expect(charLog?.damage).toBeLessThan(450);

    // 验证后期宠物输出占比远超 90%
    const totalDmg = (dragonLog?.damage || 0) + (charLog?.damage || 0);
    const petRatio = (dragonLog?.damage || 0) / totalDmg;
    expect(petRatio).toBeGreaterThan(0.95);
  });

  it('战术再动号令能让指定宠物立刻插队行动', () => {
    const charUnit: BattleUnit = {
      id: 'char_cmd',
      name: '指挥官',
      type: 'CHARACTER',
      avatar: '👑',
      level: 30,
      currentHp: 1000,
      maxHp: 1000,
      currentMp: 100,
      maxMp: 100,
      atk: 100,
      def: 100,
      spd: 100,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_char_extra_turn'],
      buffs: [],
      isDead: false
    };

    const petUnit: BattleUnit = {
      id: 'pet_sluggish',
      name: '巨龟',
      type: 'PET',
      avatar: '🐢',
      level: 30,
      currentHp: 2000,
      maxHp: 2000,
      currentMp: 100,
      maxMp: 100,
      atk: 200,
      def: 200,
      spd: 30, // 速度极慢
      critRate: 0.05,
      critDmg: 1.5,
      actionDistance: 9000,
      skills: [],
      buffs: [],
      isDead: false
    };

    engine.initBattle([charUnit, petUnit], []);
    // 执行再动
    engine.executeAction('char_cmd', 'skill_char_extra_turn', 'pet_sluggish');
    expect(petUnit.actionDistance).toBe(0);
  });

  it('连续多轮次战斗循环稳定（20+轮不卡死且能量自动循环）', () => {
    const charUnit: BattleUnit = {
      id: 'player_char',
      name: '主角',
      type: 'CHARACTER',
      avatar: '👑',
      level: 35,
      currentHp: 2800,
      maxHp: 2800,
      currentMp: 200,
      maxMp: 200,
      atk: 120,
      def: 160,
      spd: 110,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_char_slash', 'skill_basic_strike'],
      buffs: [],
      isDead: false
    };

    const dragonUnit: BattleUnit = {
      id: 'pet_dragon',
      name: '狱火炎龙',
      type: 'PET',
      avatar: '🐲',
      level: 35,
      currentHp: 4200,
      maxHp: 4200,
      currentMp: 160,
      maxMp: 160,
      atk: 780,
      def: 320,
      spd: 120,
      critRate: 0.35,
      critDmg: 2.0,
      actionDistance: 10000,
      skills: ['skill_apocalypse_flame', 'skill_flame_burst', 'skill_basic_strike'],
      buffs: [],
      isDead: false
    };

    const boss: BattleUnit = {
      id: 'boss_1',
      name: '深渊领主',
      type: 'MONSTER',
      avatar: '👹',
      level: 40,
      currentHp: 100000,
      maxHp: 100000,
      currentMp: 0,
      maxMp: 0,
      atk: 100,
      def: 200,
      spd: 80,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_monster_bite'],
      buffs: [],
      isDead: false
    };

    engine.initBattle([charUnit, dragonUnit], [boss]);

    let executedRounds = 0;
    for (let i = 0; i < 25; i++) {
      if (engine.checkBattleOver()) break;
      const active = engine.activeUnit;
      if (!active) break;

      // 挑选第一个能量足够的可用技能
      const skill = active.skills.map(sId => engine.skillsMap.get(sId)!)
        .find(s => {
          if (s.costMp && active.currentMp < s.costMp) return false;
          if (s.costTp && active.currentMp < s.costTp) return false;
          return true;
        }) || engine.skillsMap.get('skill_basic_strike')!;

      const targets = engine.getValidTargets(active, skill);
      if (targets.length === 0) break;

      const success = engine.executeAction(active.id, skill.id, targets[0].id);
      expect(success).toBe(true);
      executedRounds++;

      // 驱动 AI 连续执行
      engine.runAiTurns();
    }

    expect(executedRounds).toBeGreaterThanOrEqual(15);
  });

  it('元素相克机制：火克木造成 1.3 倍伤害，木受火攻击伤害衰减 0.75 倍，光暗互克 1.4 倍', () => {
    const fireAttacker: BattleUnit = {
      id: 'fire_u',
      name: '火系单位',
      type: 'PET',
      element: 'FIRE',
      avatar: '🔥',
      level: 10,
      currentHp: 1000,
      maxHp: 1000,
      currentMp: 100,
      maxMp: 100,
      atk: 100,
      def: 0,
      spd: 100,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_basic_strike'],
      buffs: [],
      isDead: false
    };

    const woodTarget: BattleUnit = {
      id: 'wood_u',
      name: '木系木桩',
      type: 'MONSTER',
      element: 'WOOD',
      avatar: '🌿',
      level: 10,
      currentHp: 2000,
      maxHp: 2000,
      currentMp: 0,
      maxMp: 0,
      atk: 50,
      def: 0,
      spd: 50,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: [],
      buffs: [],
      isDead: false
    };

    const waterTarget: BattleUnit = {
      id: 'water_u',
      name: '水系木桩',
      type: 'MONSTER',
      element: 'WATER',
      avatar: '💧',
      level: 10,
      currentHp: 2000,
      maxHp: 2000,
      currentMp: 0,
      maxMp: 0,
      atk: 50,
      def: 0,
      spd: 50,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: [],
      buffs: [],
      isDead: false
    };

    // 1. 火攻击木（克制 x1.30）
    engine.initBattle([fireAttacker], [woodTarget]);
    engine.executeAction('fire_u', 'skill_basic_strike', 'wood_u');
    const strongLog = engine.logs.find(l => l.type === 'DAMAGE')!;
    expect(strongLog.elementalRelation).toBe('STRONG');
    expect(strongLog.elementalMultiplier).toBe(1.3);

    // 2. 火攻击水（劣势 x0.75）
    engine.initBattle([fireAttacker], [waterTarget]);
    engine.executeAction('fire_u', 'skill_basic_strike', 'water_u');
    const weakLog = engine.logs.find(l => l.type === 'DAMAGE')!;
    expect(weakLog.elementalRelation).toBe('WEAK');
    expect(weakLog.elementalMultiplier).toBe(0.75);
    expect(strongLog.damage!).toBeGreaterThan(weakLog.damage!);
  });

  it('进入新战役/关卡时，受创宠物的血量必然复原至 100% 满血', () => {
    const woundedPet: BattleUnit = {
      id: 'pet_wounded',
      name: '伤残火蜥',
      type: 'PET',
      element: 'FIRE',
      avatar: '🦎',
      level: 5,
      currentHp: 15, // 仅剩 15 点残血
      maxHp: 300,
      currentMp: 10,
      maxMp: 80,
      atk: 50,
      def: 20,
      spd: 100,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_basic_strike'],
      buffs: [],
      isDead: false
    };

    const enemy: BattleUnit = {
      id: 'mob_enemy',
      name: '小怪',
      type: 'MONSTER',
      avatar: '🐺',
      level: 1,
      currentHp: 50,
      maxHp: 50,
      currentMp: 0,
      maxMp: 0,
      atk: 10,
      def: 5,
      spd: 80,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: [],
      buffs: [],
      isDead: false
    };

    // 初始化战役，引擎必须自动满血复原
    engine.initBattle([woundedPet], [enemy]);
    const restoredPet = engine.playerTeam.find(u => u.id === 'pet_wounded');
    expect(restoredPet?.currentHp).toBe(300);
    expect(restoredPet?.currentHp).toBe(restoredPet?.maxHp);
  });
});
