import { describe, it, expect } from 'vitest';
import { ClassManager } from '../src/core/classes/ClassManager.ts';
import { BattleEngine } from '../src/core/battle/BattleEngine.ts';
import { BattleUnit, CharacterClassConfig, SkillConfig } from '../src/core/types.ts';
import classesData from '../src/data/classes.json';
import skillsData from '../src/data/skills.json';

describe('Protagonist Class System & Passives', () => {
  const classes = classesData as CharacterClassConfig[];
  const skills = skillsData as SkillConfig[];

  it('技能槽装配规则：固定 1 基础普攻 + 最多 3 个自由配置自定义技能 (合计 4 个)', () => {
    const manager = new ClassManager(classes);
    manager.characterLevel = 35; // 满级，所有技能解锁

    // 默认已装配 4 个技能 (普攻 + 3 个推荐技能)
    let equipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    expect(equipped.length).toBe(4);
    expect(equipped[0]).toBe('skill_basic_strike');

    // 卸下一个技能
    manager.unequipSkill('TACTICAL_COMMANDER', 1);
    equipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    expect(equipped.length).toBe(3);
    expect(equipped[0]).toBe('skill_basic_strike');

    // 装备新技能
    const success = manager.equipSkill('TACTICAL_COMMANDER', 1, 'skill_tc_berserk');
    expect(success).toBe(true);
    equipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    expect(equipped.length).toBe(4);
    expect(equipped).toContain('skill_tc_berserk');

    // 未达解锁等级的技能不能装备
    manager.characterLevel = 10;
    const failEquip = manager.equipSkill('TACTICAL_COMMANDER', 1, 'skill_tc_berserk'); // berserk 需 Lv.30
    expect(failEquip).toBe(false);
  });

  it('转职消耗机制：消耗 500 金币且等级需达到 Lv.10', () => {
    const manager = new ClassManager(classes);
    manager.gold = 1000;
    manager.characterLevel = 15;
    manager.activeClassId = 'TACTICAL_COMMANDER';

    // 成功切换为铁壁领主
    const res = manager.switchClass('IRON_VANGUARD');
    expect(res.success).toBe(true);
    expect(manager.activeClassId).toBe('IRON_VANGUARD');
    expect(manager.gold).toBe(500);

    // 再次切换但金币不足 (需 500，还剩 500，再切一次剩 0)
    manager.switchClass('PSIONIC_CONDUCTOR');
    expect(manager.gold).toBe(0);

    // 第三次切换金币不足报错
    const failRes = manager.switchClass('SHADOW_PACKMASTER');
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain('金币不足');
  });

  it('四大职业常驻被动光环测试：铁壁领主提升宠物生命，巡林客提升速度，指挥官提升暴击', () => {
    const manager = new ClassManager(classes);

    // 1. 铁壁领主：忠诚铁卫 (+20% 宠物最大生命)
    manager.switchClass('IRON_VANGUARD');
    const ironEngine = new BattleEngine(skills);
    const pet1: BattleUnit = {
      id: 'pet_test',
      name: '测试宠物',
      type: 'PET',
      avatar: '🦎',
      level: 10,
      currentHp: 1000,
      maxHp: 1000,
      currentMp: 100,
      maxMp: 100,
      atk: 100,
      def: 50,
      spd: 100,
      critRate: 0.1,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_basic_strike'],
      buffs: [],
      isDead: false
    };
    const charUnit = manager.createCharacterBattleUnit('LATE_GAME');
    ironEngine.initBattle([charUnit, pet1], [], manager.activeClass.passive);
    expect(pet1.maxHp).toBe(1200); // 1000 * 1.2

    // 2. 战术指挥官：协同直觉 (+15% 宠物暴击)
    manager.gold = 1000;
    manager.switchClass('TACTICAL_COMMANDER');
    const tcEngine = new BattleEngine(skills);
    const pet2: BattleUnit = { ...pet1, critRate: 0.1, maxHp: 1000, currentHp: 1000 };
    tcEngine.initBattle([manager.createCharacterBattleUnit('LATE_GAME'), pet2], [], manager.activeClass.passive);
    expect(pet2.critRate).toBeCloseTo(0.25, 2);

    // 3. 敏捷巡林客：敏捷光环 (+20% 全队速度)
    manager.switchClass('SHADOW_PACKMASTER');
    const spEngine = new BattleEngine(skills);
    const pet3: BattleUnit = { ...pet1, spd: 100 };
    const char3 = manager.createCharacterBattleUnit('LATE_GAME');
    const baseCharSpd = char3.spd;
    spEngine.initBattle([char3, pet3], [], manager.activeClass.passive);
    expect(pet3.spd).toBe(120);
    expect(char3.spd).toBe(Math.round(baseCharSpd * 1.2));
  });

  it('护盾吸收机制：护盾优先承受全额伤害，超额部分才扣生命，且不提高防御值', () => {
    const engine = new BattleEngine(skills);
    const defender: BattleUnit = {
      id: 'defender',
      name: '防御者',
      type: 'PET',
      avatar: '🛡️',
      level: 10,
      currentHp: 500,
      maxHp: 500,
      currentMp: 100,
      maxMp: 100,
      atk: 50,
      def: 50,
      spd: 80,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_basic_strike'],
      buffs: [],
      shield: 200, // 初始 200 护盾
      isDead: false
    };

    const attacker: BattleUnit = {
      id: 'attacker',
      name: '攻击者',
      type: 'MONSTER',
      avatar: '🐺',
      level: 10,
      currentHp: 500,
      maxHp: 500,
      currentMp: 100,
      maxMp: 100,
      atk: 100,
      def: 50,
      spd: 100,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_basic_strike'],
      buffs: [],
      isDead: false
    };

    engine.initBattle([defender], [attacker]);
    // 强制攻击者造成伤害
    engine.executeAction(attacker.id, 'skill_basic_strike', defender.id);

    // 护盾应当被抵扣，而 HP 没有受到完整伤害
    expect(defender.shield).toBeLessThan(200);
    expect(defender.currentHp).toBe(500); // 普攻伤害低于 200 盾，HP 完全未掉！
    expect(defender.def).toBe(50); // 防御属性未被更改
  });

  it('普通攻击槽位铁则：所有参战单位（角色、宠物、怪物）的第 1 个技能槽位必为普通攻击 (index 0)', () => {
    const engine = new BattleEngine(skills);
    const unitA: BattleUnit = {
      id: 'unit_a',
      name: '乱序单位 A',
      type: 'PET',
      avatar: '🐉',
      level: 10,
      currentHp: 1000,
      maxHp: 1000,
      currentMp: 100,
      maxMp: 100,
      atk: 100,
      def: 50,
      spd: 100,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_tc_slash', 'skill_tc_overload', 'skill_basic_strike'], // 普攻排在末尾
      buffs: [],
      isDead: false
    };

    const unitB: BattleUnit = {
      id: 'unit_b',
      name: '无普攻单位 B',
      type: 'MONSTER',
      avatar: '🐺',
      level: 10,
      currentHp: 500,
      maxHp: 500,
      currentMp: 0,
      maxMp: 0,
      atk: 50,
      def: 50,
      spd: 100,
      critRate: 0,
      critDmg: 1.5,
      actionDistance: 10000,
      skills: ['skill_monster_bite'], // 未配置普攻
      buffs: [],
      isDead: false
    };

    engine.initBattle([unitA], [unitB]);

    expect(unitA.skills[0]).toBe('skill_basic_strike');
    expect(unitB.skills[0]).toBe('skill_basic_strike');
  });
});
