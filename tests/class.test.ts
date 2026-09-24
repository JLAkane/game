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

  it('首次觉醒（4选1）转职完全免费（0金币），后续职业切换消耗500金币', () => {
    const manager = new ClassManager(classes);
    manager.activeClassId = undefined; // 初始未觉醒见习状态
    manager.gold = 0; // 0金币也能觉醒
    manager.characterLevel = 10;

    expect(manager.isNovice).toBe(true);

    // 首次觉醒转职：免费
    const res = manager.switchClass('SHADOW_PACKMASTER');
    expect(res.success).toBe(true);
    expect(res.message).toContain('恭喜完成【职业觉醒】');
    expect(manager.activeClassId).toBe('SHADOW_PACKMASTER');
    expect(manager.gold).toBe(0);
    expect(manager.isNovice).toBe(false);

    // 再次转职需要 500 金币，此时 0 金币应失败
    const failSwitch = manager.switchClass('IRON_VANGUARD');
    expect(failSwitch.success).toBe(false);
    expect(failSwitch.message).toContain('金币不足');

    // 充值 500 金币后切换成功
    manager.gold = 500;
    const okSwitch = manager.switchClass('IRON_VANGUARD');
    expect(okSwitch.success).toBe(true);
    expect(manager.activeClassId).toBe('IRON_VANGUARD');
    expect(manager.gold).toBe(0);
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

  it('已习得技能严格按当前角色等级过滤，不提前展示未习得的技能', () => {
    const manager = new ClassManager(classes);

    // Lv.1 见习阶段：已习得技能应为 0
    manager.characterLevel = 1;
    expect(manager.getUnlockedSkills('TACTICAL_COMMANDER')).toHaveLength(0);

    // Lv.10 阶段：仅习得 Lv.10 穿甲轰斩 1 个技能
    manager.characterLevel = 10;
    const lv10Skills = manager.getUnlockedSkills('TACTICAL_COMMANDER');
    expect(lv10Skills).toHaveLength(1);
    expect(lv10Skills[0].skillId).toBe('skill_tc_slash');

    // Lv.20 阶段：应习得 Lv.10, 12, 15, 20 共 4 个技能，不应包含 Lv.25 碎甲爆弹与 Lv.30 绝境狂暴
    manager.characterLevel = 20;
    const lv20Skills = manager.getUnlockedSkills('TACTICAL_COMMANDER');
    expect(lv20Skills).toHaveLength(4);
    expect(lv20Skills.map(s => s.skillId)).not.toContain('skill_tc_melt_armor');
    expect(lv20Skills.map(s => s.skillId)).not.toContain('skill_tc_berserk');
  });

  it('见习冒险家阶段出战栏仅携带1个基础普攻，且未达等级的技能（如极限超载）绝不载入出战栏', () => {
    const manager = new ClassManager(classes);

    // 1. 见习阶段 (Lv.1 ~ 9)
    manager.characterLevel = 1;
    expect(manager.isNovice).toBe(true);
    const noviceEquipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    expect(noviceEquipped).toEqual(['skill_basic_strike']);
    expect(manager.getRawCustomSlots('TACTICAL_COMMANDER')).toEqual(['', '', '']);

    // 2. 升至 Lv.10 并觉醒转职战术指挥官
    manager.characterLevel = 10;
    expect(manager.isNovice).toBe(false);
    const lv10Equipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    // 只有 Lv.10 破甲重击符合等级，Lv.15 弱点侦测与 Lv.20 极限超载指令被严格过滤
    expect(lv10Equipped).toEqual(['skill_basic_strike', 'skill_tc_slash']);
    expect(lv10Equipped).not.toContain('skill_tc_overload');

    // 3. 升至 Lv.20 后，极限超载才可进入出战栏
    manager.characterLevel = 20;
    const lv20Equipped = manager.getEquippedSkills('TACTICAL_COMMANDER');
    expect(lv20Equipped).toContain('skill_tc_overload');
  });

  it('3个自选槽位按 2、5、10 级梯次开放，且见习期可装备已习得伤害技能', () => {
    const manager = new ClassManager(classes);

    // 1. Lv.1：槽位 0/1/2 均锁定，仅有 1 个基础普攻
    manager.characterLevel = 1;
    expect(manager.isSlotUnlocked(0)).toBe(false);
    expect(manager.isSlotUnlocked(1)).toBe(false);
    expect(manager.isSlotUnlocked(2)).toBe(false);
    expect(manager.getUnlockedSkills()).toHaveLength(0);
    expect(manager.getEquippedSkills()).toEqual(['skill_basic_strike']);

    // 2. Lv.2：自选槽位 0 解锁 (Lv.2)，习得【重装轰斩】(Lv.2 伤害技)
    manager.characterLevel = 2;
    expect(manager.isSlotUnlocked(0)).toBe(true);
    expect(manager.isSlotUnlocked(1)).toBe(false);
    expect(manager.isSlotUnlocked(2)).toBe(false);
    const lv2Unlocked = manager.getUnlockedSkills();
    expect(lv2Unlocked).toHaveLength(1);
    expect(lv2Unlocked[0].skillId).toBe('skill_char_slash');

    // 装备【重装轰斩】到槽位 0
    const equipOk = manager.equipSkill('TACTICAL_COMMANDER', 0, 'skill_char_slash');
    expect(equipOk).toBe(true);
    expect(manager.getEquippedSkills()).toEqual(['skill_basic_strike', 'skill_char_slash']);

    // 未解锁的槽位 1 (需 Lv.5) 此时禁止装备
    const failEquipSlot1 = manager.equipSkill('TACTICAL_COMMANDER', 1, 'skill_char_slash');
    expect(failEquipSlot1).toBe(false);

    // 3. Lv.5：自选槽位 1 解锁 (Lv.5)，已习得【旋风横扫】(Lv.3 伤害技)
    manager.characterLevel = 5;
    expect(manager.isSlotUnlocked(1)).toBe(true);
    expect(manager.isSlotUnlocked(2)).toBe(false);
    const lv5Unlocked = manager.getUnlockedSkills();
    expect(lv5Unlocked.map(s => s.skillId)).toEqual(['skill_char_slash', 'skill_char_cleave']);

    // 装备【旋风横扫】到槽位 1
    manager.equipSkill('TACTICAL_COMMANDER', 1, 'skill_char_cleave');
    expect(manager.getEquippedSkills()).toEqual(['skill_basic_strike', 'skill_char_slash', 'skill_char_cleave']);

    // 4. Lv.8：习得【贯穿突刺】(Lv.6) 与【崩山重击】(Lv.8)
    manager.characterLevel = 8;
    const lv8Unlocked = manager.getUnlockedSkills();
    expect(lv8Unlocked).toHaveLength(4);
    expect(lv8Unlocked.map(s => s.skillId)).toContain('skill_novice_thrust');
    expect(lv8Unlocked.map(s => s.skillId)).toContain('skill_novice_heavy_smash');

    // 5. Lv.10：自选槽位 2 解锁 (Lv.10)
    manager.characterLevel = 10;
    expect(manager.isSlotUnlocked(2)).toBe(true);
  });

  it('checkNewlyUnlockedSkills 精准识别升级时跨越门槛习得的新技能', () => {
    const manager = new ClassManager(classes);

    // Lv.1 -> Lv.2：应精准捕获【重装轰斩】
    const newFrom1to2 = manager.checkNewlyUnlockedSkills(1, 2);
    expect(newFrom1to2).toHaveLength(1);
    expect(newFrom1to2[0].skillId).toBe('skill_char_slash');

    // Lv.2 -> Lv.2：未跨越，返回空
    expect(manager.checkNewlyUnlockedSkills(2, 2)).toHaveLength(0);

    // Lv.2 -> Lv.4：跨越 Lv.3，应捕获【旋风横扫】
    const newFrom2to4 = manager.checkNewlyUnlockedSkills(2, 4);
    expect(newFrom2to4).toHaveLength(1);
    expect(newFrom2to4[0].skillId).toBe('skill_char_cleave');

    // Lv.5 -> Lv.9：跨越 Lv.6 和 Lv.8，应同时捕获【贯穿突刺】与【崩山重击】
    const newFrom5to9 = manager.checkNewlyUnlockedSkills(5, 9);
    expect(newFrom5to9).toHaveLength(2);
    expect(newFrom5to9.map(s => s.skillId)).toEqual(['skill_novice_thrust', 'skill_novice_heavy_smash']);
  });
});

