import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerState } from '../src/core/player/PlayerState.ts';
import { ClassManager } from '../src/core/classes/ClassManager.ts';
import stagesData from '../src/data/stages.json';
import classesData from '../src/data/classes.json';
import petsData from '../src/data/pets.json';
import { StageConfig, CharacterClassConfig, PetConfig } from '../src/core/types.ts';

describe('Player Progression & Economy System (从 Lv.1 启程与金币经济)', () => {
  let playerState: PlayerState;
  const stages = stagesData as StageConfig[];
  const classes = classesData as CharacterClassConfig[];
  const pets = petsData as PetConfig[];

  beforeEach(() => {
    playerState = PlayerState.getInstance();
    playerState.reset();
  });

  describe('初始状态规范 (Level 1 Novice State)', () => {
    it('角色初始应为 Lv.1，经验为 0，初始金币为 500', () => {
      expect(playerState.characterLevel).toBe(1);
      expect(playerState.characterExp).toBe(0);
      expect(playerState.gold).toBe(500);
      expect(playerState.clearedStageIds).toHaveLength(0);
    });

    it('角色初始不带宠物，出战队伍与拥有灵宠库均为空', () => {
      expect(playerState.teamPets).toHaveLength(0);
      expect(playerState.ownedPets).toHaveLength(0);
    });
  });

  describe('经验值与等级升级模型 (EXP & Level Up)', () => {
    it('Lv.1 升 Lv.2 所需经验应为 100 点', () => {
      expect(PlayerState.getExpForNextLevel(1)).toBe(100);
    });

    it('角色获得未达升级的经验时不升级，经验累加', () => {
      const report = playerState.addCharacterExp(60);
      expect(report).toBeNull();
      expect(playerState.characterLevel).toBe(1);
      expect(playerState.characterExp).toBe(60);
    });

    it('角色经验达到阈值时升级并提升四维基础属性', () => {
      // 升入 Lv.2 (需要 100 经验，溢出 20 经验)
      const report = playerState.addCharacterExp(120);
      expect(report).not.toBeNull();
      expect(playerState.characterLevel).toBe(2);
      expect(playerState.characterExp).toBe(20);
      expect(report!.oldLevel).toBe(1);
      expect(report!.newLevel).toBe(2);
      expect(report!.hpGained).toBe(35);
      expect(report!.atkGained).toBe(4);
      expect(report!.defGained).toBe(2);
      expect(report!.spdGained).toBe(1);
    });

    it('当角色突破升入 Lv.10 时，应触发 unlockedClass 职业觉醒标记', () => {
      // 批量注入足够升到 Lv.10 的大额经验
      const report = playerState.addCharacterExp(8000);
      expect(report).not.toBeNull();
      expect(playerState.characterLevel).toBeGreaterThanOrEqual(10);
      expect(report!.unlockedClass).toBe(true);
    });

    it('出战宠物升级时，严格按自身成长资质 (GrowthRate) 提升属性', () => {
      const egg = playerState.createEggItem(1, '第 1-1 关');
      playerState.petEggs.push(egg);
      const hatchRes = playerState.hatchEgg(egg.id, pets)!;
      const pet = hatchRes.pet;
      const oldHp = pet.maxHp;
      const oldAtk = pet.atk;
      const oldDef = pet.def;
      const oldSpd = pet.spd;

      // 给宠物注入 120 EXP (足够 Lv.1 -> Lv.2)
      const petReport = playerState.addPetExp(pet, 120);
      expect(petReport).not.toBeNull();
      expect(pet.level).toBe(2);
      expect(pet.maxHp).toBe(oldHp + Math.round(pet.growth.hpGrowth));
      expect(pet.atk).toBeCloseTo(oldAtk + pet.growth.atkGrowth, 1);
      expect(pet.def).toBeCloseTo(oldDef + pet.growth.defGrowth, 1);
      expect(pet.spd).toBeCloseTo(oldSpd + pet.growth.spdGrowth, 1);
      expect(pet.currentHp).toBe(pet.maxHp);
    });
  });

  describe('金币经济系统 (Gold Economy)', () => {
    it('增加金币应正确增加余额并支持消费扣减', () => {
      playerState.addGold(300);
      expect(playerState.getGold()).toBe(800);

      const success = playerState.consumeGold(500);
      expect(success).toBe(true);
      expect(playerState.getGold()).toBe(300);
    });

    it('金币不足时扣除应返回 false 且不扣除余额', () => {
      const success = playerState.consumeGold(9999);
      expect(success).toBe(false);
      expect(playerState.getGold()).toBe(500);
    });
  });

  describe('关卡解锁链条与战利品结算 (Stage Progression & Rewards)', () => {
    it('第一关 1-1 默认解锁，后置关卡 1-2 初始应处于锁定状态', () => {
      expect(playerState.isStageUnlocked('stage_1_1', stages)).toBe(true);
      expect(playerState.isStageUnlocked('stage_1_2', stages)).toBe(false);
    });

    it('通关 1-1 首次应获得基础金币 + 首通额外礼包，并解锁 1-2', () => {
      const stage1 = stages.find(s => s.id === 'stage_1_1')!;
      expect(playerState.isFirstClear('stage_1_1')).toBe(true);

      const expectedGoldGain = stage1.rewards.gold + stage1.rewards.firstClearGoldBonus;
      const res = playerState.recordStageVictory(stage1);

      expect(res.goldGained).toBe(expectedGoldGain);
      expect(res.isFirstClear).toBe(true);
      expect(playerState.gold).toBe(500 + expectedGoldGain);
      expect(playerState.clearedStageIds).toContain('stage_1_1');

      // 1-2 此时应当自动解锁
      expect(playerState.isStageUnlocked('stage_1_2', stages)).toBe(true);
    });

    it('重复通关已通关关卡时，只发放基础金币，不再发放首通奖励', () => {
      const stage1 = stages.find(s => s.id === 'stage_1_1')!;
      // 首次通关
      playerState.recordStageVictory(stage1);
      const goldAfterFirst = playerState.gold;

      // 再次挑战通关
      const res2 = playerState.recordStageVictory(stage1);
      expect(res2.isFirstClear).toBe(false);
      expect(res2.goldGained).toBe(stage1.rewards.gold);
      expect(playerState.gold).toBe(goldAfterFirst + stage1.rewards.gold);
    });
  });

  describe('与角色转职职业系统的真实经济联动 (Class Synergy & Respec Cost)', () => {
    it('角色在 Lv.1 时无法转职四大职业 (受 Lv.10 门槛拦截)', () => {
      const classManager = new ClassManager(classes, playerState);
      // 当前角色 Lv.1
      const res = classManager.switchClass('IRON_VANGUARD');
      expect(res.success).toBe(false);
      expect(res.message).toContain('未达到转职门槛等级');
    });

    it('角色升入 Lv.10 首次觉醒转职免费（0金币），后续职业切换消耗 500 金币，金币不足时拦截', () => {
      const classManager = new ClassManager(classes, playerState);
      // 升到 Lv.10
      playerState.addCharacterExp(8000);
      expect(classManager.characterLevel).toBeGreaterThanOrEqual(10);

      // 当前拥有 500 金币，首次转职铁壁领主免费（扣 0 金币）
      const res = classManager.switchClass('IRON_VANGUARD');
      expect(res.success).toBe(true);
      expect(classManager.activeClassId).toBe('IRON_VANGUARD');
      expect(playerState.gold).toBe(500); // 首次免费

      // 再次转职战术指挥官，扣除 500 金币，此时金币变为 0
      const res2 = classManager.switchClass('TACTICAL_COMMANDER');
      expect(res2.success).toBe(true);
      expect(classManager.activeClassId).toBe('TACTICAL_COMMANDER');
      expect(playerState.gold).toBe(0);

      // 第三次转职灵能导师，金币为 0，应被拦截
      const resFail = classManager.switchClass('PSIONIC_CONDUCTOR');
      expect(resFail.success).toBe(false);
      expect(resFail.message).toContain('金币不足');
      expect(classManager.activeClassId).toBe('TACTICAL_COMMANDER');
    });
  });

  describe('全章节关卡架构与怪物数值平衡系统 (Expanded Stages & Balanced Monsters)', () => {
    it('关卡涵盖 4 大章节，包含 20 个独立关卡，推荐等级呈平滑阶梯上升', () => {
      expect(stages.length).toBe(20);
      const chapters = Array.from(new Set(stages.map(s => s.chapter)));
      expect(chapters).toEqual([1, 2, 3, 4]);

      // 验证推荐等级严格非递减
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].recommendedLevel).toBeGreaterThanOrEqual(stages[i - 1].recommendedLevel);
      }
    });

    it('所有怪物均配备合法元素属性与平衡的四维属性', () => {
      const validElements = ['FIRE', 'WATER', 'WOOD', 'THUNDER', 'LIGHT', 'DARK'];
      stages.forEach(stage => {
        expect(stage.enemies.length).toBeGreaterThan(0);
        stage.enemies.forEach(enemy => {
          expect(enemy.currentHp).toBeGreaterThan(0);
          expect(enemy.atk).toBeGreaterThan(0);
          expect(enemy.def).toBeGreaterThanOrEqual(0);
          expect(enemy.spd).toBeGreaterThan(0);
          expect(validElements).toContain(enemy.element);
          expect(enemy.skills.length).toBeGreaterThan(0);
        });
      });
    });

    it('关卡中怪物数量丰富提升：初入关卡为2只怪，后续关卡普遍拥有3~4只协同作战怪物', () => {
      expect(stages[0].enemies.length).toBe(2);
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].enemies.length).toBeGreaterThanOrEqual(3);
        expect(stages[i].enemies.length).toBeLessThanOrEqual(4);
      }
    });

    it('跨章节解锁链条测试：通关 1-5 解锁 2-1，通关 2-5 解锁 3-1，通关 3-5 解锁 4-1', () => {
      // 模拟通关前 5 关 (Chapter 1)
      for (let i = 0; i < 5; i++) {
        playerState.recordStageVictory(stages[i]);
      }
      // 此时 2-1 (stage_2_1) 应当已解锁
      expect(playerState.isStageUnlocked('stage_2_1', stages)).toBe(true);

      // 模拟通关第 2 章至 2-5
      for (let i = 5; i < 10; i++) {
        playerState.recordStageVictory(stages[i]);
      }
      // 此时 3-1 (stage_3_1) 应当已解锁
      expect(playerState.isStageUnlocked('stage_3_1', stages)).toBe(true);

      // 模拟通关第 3 章至 3-5
      for (let i = 10; i < 15; i++) {
        playerState.recordStageVictory(stages[i]);
      }
      // 此时 4-1 (stage_4_1) 应当已解锁
      expect(playerState.isStageUnlocked('stage_4_1', stages)).toBe(true);
    });
  });

  describe('宠物蛋掉落与孵化系统 (Pet Egg Drops & Hatching System)', () => {
    const pets = petsData as PetConfig[];

    it('所有 20 个关卡均配置有宠物蛋掉落，且关卡越往后掉落宠物蛋品质越高', () => {
      expect(stages).toHaveLength(20);
      stages.forEach(stage => {
        expect(stage.rewards.eggDrop).toBeDefined();
        expect(stage.rewards.eggDrop!.tier).toBeGreaterThanOrEqual(1);
        expect(stage.rewards.eggDrop!.tier).toBeLessThanOrEqual(4);
        expect(stage.rewards.eggDrop!.rate).toBeGreaterThan(0);
      });

      // 验证第1章普通关掉落 T1，第1章领主掉落 T2
      expect(stages.find(s => s.id === 'stage_1_1')!.rewards.eggDrop!.tier).toBe(1);
      expect(stages.find(s => s.id === 'stage_1_4')!.rewards.eggDrop!.tier).toBe(1);
      expect(stages.find(s => s.id === 'stage_1_5')!.rewards.eggDrop!.tier).toBe(2);

      // 验证第2章普通关掉落 T2，第2章领主掉落 T3
      expect(stages.find(s => s.id === 'stage_2_1')!.rewards.eggDrop!.tier).toBe(2);
      expect(stages.find(s => s.id === 'stage_2_4')!.rewards.eggDrop!.tier).toBe(2);
      expect(stages.find(s => s.id === 'stage_2_5')!.rewards.eggDrop!.tier).toBe(3);

      // 验证第3章普通关掉落 T3，终极领主 3-5 掉落 T4 创世神话蛋
      expect(stages.find(s => s.id === 'stage_3_1')!.rewards.eggDrop!.tier).toBe(3);
      expect(stages.find(s => s.id === 'stage_3_4')!.rewards.eggDrop!.tier).toBe(3);
      const stage3_5 = stages.find(s => s.id === 'stage_3_5')!;
      expect(stage3_5.rewards.eggDrop!.tier).toBe(4);
      expect(stage3_5.rewards.eggDrop!.rate).toBe(1.0);

      // 验证第4章创世神域关卡掉落高阶与神话蛋
      expect(stages.find(s => s.id === 'stage_4_1')!.rewards.eggDrop!.tier).toBe(3);
      const stage4_5 = stages.find(s => s.id === 'stage_4_5')!;
      expect(stage4_5.rewards.eggDrop!.tier).toBe(4);
      expect(stage4_5.rewards.eggDrop!.rate).toBe(1.0);
    });

    it('首通关卡必定 100% 掉落宠物蛋并收入玩家背包', () => {
      const stage1_1 = stages[0];
      const result = playerState.recordStageVictory(stage1_1);
      expect(result.droppedEgg).toBeDefined();
      expect(result.droppedEgg!.tier).toBe(1);
      expect(result.droppedEgg!.sourceStageName).toBe(stage1_1.name);
      expect(playerState.petEggs).toHaveLength(1);
      expect(playerState.petEggs[0].id).toBe(result.droppedEgg!.id);
    });

    it('宠物蛋破壳孵化：正确生成对应阶位的新生灵宠并编入队伍', () => {
      // 通关 1-5 获得 T2 珍稀进阶蛋
      const stage1_5 = stages.find(s => s.id === 'stage_1_5')!;
      const victory = playerState.recordStageVictory(stage1_5);
      const droppedEgg = victory.droppedEgg;
      expect(droppedEgg).toBeDefined();
      expect(droppedEgg!.tier).toBe(2);

      const eggCountBefore = playerState.petEggs.length;
      const teamCountBefore = playerState.teamPets.length;

      // 孵化该蛋
      const hatchResult = playerState.hatchEgg(droppedEgg!.id, pets);
      expect(hatchResult).not.toBeNull();
      expect(hatchResult!.egg.id).toBe(droppedEgg!.id);

      // 孵化后蛋被消耗
      expect(playerState.petEggs.length).toBe(eggCountBefore - 1);

      // 验证新宠物属性
      const newPet = hatchResult!.pet;
      expect(newPet.tier).toBe(2);
      expect(newPet.level).toBe(1);
      expect(newPet.currentHp).toBe(newPet.maxHp);
      expect(newPet.atk).toBeGreaterThan(0);
      expect(newPet.def).toBeGreaterThan(0);
      expect(newPet.spd).toBeGreaterThan(0);
      expect(newPet.skills).toContain('skill_basic_strike');
      expect(newPet.innateSkillId).toBeDefined();

      // 自动加入背包与队伍
      expect(playerState.ownedPets.some(p => p.instanceId === newPet.instanceId)).toBe(true);
      expect(playerState.teamPets.length).toBe(teamCountBefore + 1);
    });

    it('终极神话蛋 (Tier 4) 能够孵化出创世神级宠物', () => {
      const eggT4 = playerState.createEggItem(4, '3-5 灭世终焉神座 [领主]');
      playerState.petEggs.push(eggT4);

      const res = playerState.hatchEgg(eggT4.id, pets);
      expect(res).not.toBeNull();
      expect(res!.pet.tier).toBe(4);
      const tier4PetIds = pets.filter(p => p.tier === 4).map(p => p.id);
      expect(tier4PetIds).toContain(res!.pet.configId);
      expect(res!.pet.maxHp).toBeGreaterThan(1500);
      expect(res!.pet.atk).toBeGreaterThan(200);
    });
  });

  describe('出战阵容与仓库协同系统 (Team & Warehouse Pet Management)', () => {
    function prepareThreePets(): void {
      for (let i = 0; i < 3; i++) {
        const egg = playerState.createEggItem(1, `测试关卡 ${i + 1}`);
        playerState.petEggs.push(egg);
        playerState.hatchEgg(egg.id, pets);
      }
    }

    it('支持通过孵化灵蛋将灵宠自动加入出战队伍 (上限 3 只)', () => {
      prepareThreePets();
      expect(playerState.ownedPets.length).toBe(3);
      expect(playerState.teamPets.length).toBe(3);
    });

    it('出战灵宠可以卸下入库，支持降至 0 只 (独行侠冒险模式)', () => {
      prepareThreePets();
      expect(playerState.teamPets.length).toBe(3);
      playerState.recallPetFromTeam(playerState.teamPets[2].instanceId);
      playerState.recallPetFromTeam(playerState.teamPets[1].instanceId);
      const canRecallLast = playerState.recallPetFromTeam(playerState.teamPets[0].instanceId);
      expect(canRecallLast).toBe(true);
      expect(playerState.teamPets.length).toBe(0);
      expect(playerState.getWarehousePets().length).toBe(3);
    });

    it('多只出战宠物时可以卸下并正确归入仓库', () => {
      prepareThreePets();
      expect(playerState.teamPets.length).toBe(3);

      const petToRecall = playerState.teamPets[2];
      const recallOk = playerState.recallPetFromTeam(petToRecall.instanceId);
      expect(recallOk).toBe(true);
      expect(playerState.teamPets.length).toBe(2);

      const warehouse = playerState.getWarehousePets();
      expect(warehouse.some(p => p.instanceId === petToRecall.instanceId)).toBe(true);
    });

    it('支持从仓库派遣灵宠上阵出战', () => {
      prepareThreePets();
      const petToRecall = playerState.teamPets[2];
      playerState.recallPetFromTeam(petToRecall.instanceId);
      expect(playerState.teamPets.length).toBe(2);

      // 重新派遣上阵
      const deployOk = playerState.deployPetToTeam(petToRecall.instanceId);
      expect(deployOk).toBe(true);
      expect(playerState.teamPets.length).toBe(3);
      expect(playerState.teamPets[2].instanceId).toBe(petToRecall.instanceId);
    });

    it('支持出战队伍槽位互相交换', () => {
      prepareThreePets();
      const pet0 = playerState.teamPets[0].instanceId;
      const pet1 = playerState.teamPets[1].instanceId;

      playerState.swapTeamPets(0, 1);
      expect(playerState.teamPets[0].instanceId).toBe(pet1);
      expect(playerState.teamPets[1].instanceId).toBe(pet0);
    });
  });

  describe('灵宠经验升级体系与四战术技能装配 (Pet EXP & 4-Skill Slot Management)', () => {
    it('灵宠升级需要自己的经验值，并可明确算出离升级差多少经验', () => {
      playerState.petEggs.push(playerState.createEggItem(1, '第1关'));
      const res = playerState.hatchEgg(playerState.petEggs[0].id, pets);
      const pet = res!.pet;

      expect(pet.level).toBe(1);
      expect(pet.exp).toBe(0);

      const nextLevelExp = PlayerState.getExpForNextLevel(pet.level);
      expect(nextLevelExp).toBe(100);

      // 获得 45 经验
      playerState.addPetExp(pet, 45);
      expect(pet.level).toBe(1);
      expect(pet.exp).toBe(45);

      // 明确计算离下一级所差经验
      const remaining = Math.max(0, PlayerState.getExpForNextLevel(pet.level) - pet.exp);
      expect(remaining).toBe(55);

      // 再获得 60 经验（总计 105，触发升级至 Lv.2，余 5 经验）
      const report = playerState.addPetExp(pet, 60);
      expect(report).not.toBeNull();
      expect(pet.level).toBe(2);
      expect(pet.exp).toBe(5);

      const remainingLv2 = Math.max(0, PlayerState.getExpForNextLevel(pet.level) - pet.exp);
      expect(remainingLv2).toBe(PlayerState.getExpForNextLevel(2) - 5);
    });

    it('灵宠携带技能上限只能带4个，多余的在已习得技能池中', () => {
      playerState.petEggs.push(playerState.createEggItem(1, '第1关'));
      const res = playerState.hatchEgg(playerState.petEggs[0].id, pets);
      const pet = res!.pet;

      expect(pet.skills).toHaveLength(2);
      expect(pet.skills).toContain('skill_basic_strike');
      expect(pet.skills).toContain(pet.innateSkillId);

      const equipped = playerState.getPetEquippedSkills(pet);
      expect(equipped).toHaveLength(2);

      // 给宠物添加额外习得技能
      pet.skills.push('skill_flame_burst');
      pet.skills.push('skill_pet_taunt');
      pet.skills.push('skill_rock_armor');
      pet.skills.push('skill_spring_heal');

      // 装备第3个技能
      playerState.equipPetSkill(pet.instanceId, 'skill_flame_burst');
      expect(playerState.getPetEquippedSkills(pet)).toContain('skill_flame_burst');

      // 装备第4个技能
      playerState.equipPetSkill(pet.instanceId, 'skill_pet_taunt');
      expect(playerState.getPetEquippedSkills(pet)).toHaveLength(4);

      // 尝试装备第5个技能，应只替换第4槽位，绝不超出4个技能
      playerState.equipPetSkill(pet.instanceId, 'skill_rock_armor');
      const finalEquipped = playerState.getPetEquippedSkills(pet);
      expect(finalEquipped).toHaveLength(4);
      expect(finalEquipped).toContain('skill_rock_armor');

      // 卸下1个技能
      playerState.unequipPetSkill(pet.instanceId, 'skill_rock_armor');
      expect(playerState.getPetEquippedSkills(pet)).toHaveLength(3);
    });

    it('灵宠战力转换至战术编队时，只携带装备栏中的4个技能', () => {
      playerState.petEggs.push(playerState.createEggItem(1, '第1关'));
      const res = playerState.hatchEgg(playerState.petEggs[0].id, pets);
      const pet = res!.pet;
      playerState.deployPetToTeam(pet.instanceId);

      const battleUnits = playerState.createTeamPetBattleUnits();
      const petUnit = battleUnits.find(u => u.id === pet.instanceId);
      expect(petUnit).toBeDefined();
      expect(petUnit!.skills.length).toBeLessThanOrEqual(4);
    });
  });
});


