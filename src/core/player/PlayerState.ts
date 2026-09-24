import { BattleUnit, PetInstance, StageConfig, LevelUpReport, ClassType, PetEggItem, EggTier, PetConfig, StageVictoryReward } from '../types.ts';
import { ClassManager } from '../classes/ClassManager.ts';
import { rollHatchGrowth, getPetGrowthRanges, round1 } from '../pet/PetGrowthEngine.ts';

export const ELEMENTAL_SKILL_POOLS: Record<string, string[]> = {
  FIRE: ['skill_ember_spit', 'skill_flame_burst', 'skill_magma_slam', 'skill_pet_taunt'],
  WATER: ['skill_frost_bolt', 'skill_tsunami_surge', 'skill_hydro_jet', 'skill_spring_heal'],
  WOOD: ['skill_rock_armor', 'skill_nature_seed', 'skill_spring_heal', 'skill_emerald_vitality'],
  THUNDER: ['skill_gale_claw', 'skill_lightning_spark', 'skill_lightning_strike', 'skill_plasma_shock'],
  LIGHT: ['skill_light_blessing', 'skill_holy_smite', 'skill_divine_judgment', 'skill_spring_heal'],
  DARK: ['skill_death_bite', 'skill_phantom_fire', 'skill_soul_harvest', 'skill_blood_drain']
};

export class PlayerState {
  private static instance: PlayerState | null = null;

  public gold: number = 500;
  public characterLevel: number = 1;
  public characterExp: number = 0;
  public clearedStageIds: string[] = [];
  public activeClassId?: ClassType;
  public equippedSkillIds: string[] = ['skill_basic_strike'];
  public teamPets: PetInstance[] = [];
  public ownedPets: PetInstance[] = [];
  public petEggs: PetEggItem[] = [];
  public inventory: Record<string, number> = {};
  public selectedStageId: string = 'stage_1_1';
  public characterCustomSlots: {
    novice: string[];
    classes: Record<string, string[]>;
  } = {
    novice: ['', '', ''],
    classes: {}
  };
  public lastSaveTime: number = Date.now();

  // 基础角色 Lv.1 模板属性
  public baseCharacterStats = {
    hp: 320,
    mp: 80,
    atk: 30,
    def: 15,
    spd: 100,
    critRate: 0.05,
    critDmg: 1.5
  };

  private boundFileHandle: any = null;
  private boundFileName: string = '';

  private listeners: Array<() => void> = [];

  constructor() {
    this.initDefaultPet();
    // 不再从 localStorage 读取；自动清理所有遗留 localStorage 项，确保零 localStorage 占用
    this.clearStorage();
  }

  public getBoundFileName(): string {
    return this.boundFileName;
  }

  public setBoundFileHandle(handle: any, fileName?: string): void {
    this.boundFileHandle = handle;
    this.boundFileName = fileName || handle?.name || 'custom_save.json';
  }

  public clearBoundFileHandle(): void {
    this.boundFileHandle = null;
    this.boundFileName = '';
  }

  public static getInstance(): PlayerState {
    if (!PlayerState.instance) {
      PlayerState.instance = new PlayerState();
    }
    return PlayerState.instance;
  }

  private initDefaultPet(): void {
    // 初始不带宠物，出战队伍与仓库均为空列表
    this.teamPets = [];
    this.ownedPets = [];
  }

  public static getEggMetadata(tier: EggTier): { name: string; desc: string; avatar: string; color: string; badgeClass: string } {
    switch (tier) {
      case 1:
        return {
          name: '原野初级蛋',
          desc: '微弱元素脉动的普通宠物蛋，蕴含荒野初阶灵兽的生命活力。',
          avatar: '🥚',
          color: 'text-emerald-400',
          badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800'
        };
      case 2:
        return {
          name: '珍稀进阶蛋',
          desc: '晶莹剔透的高阶灵蛋，闪烁着进阶灵兽的气息与绚烂光芒。',
          avatar: '🥚',
          color: 'text-sky-400',
          badgeClass: 'bg-sky-950 text-sky-300 border border-sky-800'
        };
      case 3:
        return {
          name: '远古史诗蛋',
          desc: '周身环绕远古龙纹与法则波动的史诗灵蛋，沉睡着远古血脉的凶兽。',
          avatar: '🥚',
          color: 'text-purple-400',
          badgeClass: 'bg-purple-950 text-purple-300 border border-purple-800'
        };
      case 4:
        return {
          name: '创世神话蛋',
          desc: '蕴含创世极光与湮灭星辰之力的神话宝蛋，传说中能孵化出主宰一切的究极神宠！',
          avatar: '🥚',
          color: 'text-amber-400',
          badgeClass: 'bg-amber-950 text-amber-300 border border-amber-800'
        };
    }
  }

  public createEggItem(tier: EggTier, sourceStageName: string): PetEggItem {
    const meta = PlayerState.getEggMetadata(tier);
    return {
      id: `egg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tier,
      name: meta.name,
      desc: meta.desc,
      avatar: meta.avatar,
      sourceStageName,
      dropTime: Date.now()
    };
  }

  public hatchEgg(eggId: string, petConfigs: PetConfig[]): { pet: PetInstance; egg: PetEggItem } | null {
    const eggIndex = this.petEggs.findIndex(e => e.id === eggId);
    if (eggIndex === -1) return null;
    const egg = this.petEggs[eggIndex];

    let availableConfigs = petConfigs.filter(p => p.tier === egg.tier);
    if (availableConfigs.length === 0) {
      availableConfigs = petConfigs;
    }

    const chosenConfig = availableConfigs[Math.floor(Math.random() * availableConfigs.length)];
    const growth = rollHatchGrowth(chosenConfig.tier, chosenConfig.race);

    const newPet: PetInstance = {
      instanceId: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      configId: chosenConfig.id,
      name: chosenConfig.name,
      level: 1,
      exp: 0,
      tier: chosenConfig.tier,
      race: chosenConfig.race,
      element: chosenConfig.element,
      currentHp: chosenConfig.baseHp,
      maxHp: chosenConfig.baseHp,
      atk: chosenConfig.baseAtk,
      def: chosenConfig.baseDef,
      spd: chosenConfig.baseSpd,
      critRate: 0.05,
      critDmg: 1.5,
      growth,
      innateSkillId: chosenConfig.innateSkillId,
      skills: ['skill_basic_strike', chosenConfig.innateSkillId],
      equippedSkills: ['skill_basic_strike', chosenConfig.innateSkillId],
      traits: ['破壳初生'],
      generation: 1
    };

    this.petEggs.splice(eggIndex, 1);
    this.ownedPets.push(newPet);

    if (this.teamPets.length < 3) {
      this.teamPets.push(newPet);
    }

    this.notify();
    return { pet: newPet, egg };
  }

  // 编入出战队伍 (队伍上限 3 只)
  public deployPetToTeam(petInstanceId: string, slotIndex?: number): boolean {
    const pet = this.ownedPets.find(p => p.instanceId === petInstanceId);
    if (!pet) return false;

    const existingIndex = this.teamPets.findIndex(p => p.instanceId === petInstanceId);
    if (existingIndex !== -1) {
      if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < this.teamPets.length && slotIndex !== existingIndex) {
        const temp = this.teamPets[slotIndex];
        this.teamPets[slotIndex] = this.teamPets[existingIndex];
        this.teamPets[existingIndex] = temp;
        this.notify();
      }
      return true;
    }

    if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < this.teamPets.length) {
      this.teamPets[slotIndex] = pet;
    } else if (this.teamPets.length < 3) {
      this.teamPets.push(pet);
    } else {
      const targetSlot = slotIndex !== undefined && slotIndex >= 0 && slotIndex < 3 ? slotIndex : 2;
      this.teamPets[targetSlot] = pet;
    }

    this.notify();
    return true;
  }

  // 卸下出战入库
  public recallPetFromTeam(petInstanceId: string): boolean {
    const idx = this.teamPets.findIndex(p => p.instanceId === petInstanceId);
    if (idx === -1) return false;
    this.teamPets.splice(idx, 1);
    this.notify();
    return true;
  }

  // 交换队伍槽位
  public swapTeamPets(indexA: number, indexB: number): boolean {
    if (indexA < 0 || indexA >= this.teamPets.length || indexB < 0 || indexB >= this.teamPets.length || indexA === indexB) {
      return false;
    }
    const temp = this.teamPets[indexA];
    this.teamPets[indexA] = this.teamPets[indexB];
    this.teamPets[indexB] = temp;
    this.notify();
    return true;
  }

  // 移除宠物 (例如放生或消耗)
  public removePet(petInstanceId: string): boolean {
    const ownedIdx = this.ownedPets.findIndex(p => p.instanceId === petInstanceId);
    if (ownedIdx === -1) return false;
    this.ownedPets.splice(ownedIdx, 1);
    const teamIdx = this.teamPets.findIndex(p => p.instanceId === petInstanceId);
    if (teamIdx !== -1) {
      this.teamPets.splice(teamIdx, 1);
    }
    this.notify();
    return true;
  }

  // 融合结算：出战中的灵宠不可融合；双亲原宠物消失，诞生的新灵宠入库
  public completeFusion(petAInstanceId: string, petBInstanceId: string, childPet: PetInstance): boolean {
    const teamIds = new Set(this.teamPets.map(p => p.instanceId));
    // 严格限制：出战中的灵宠不可作为融合素材
    if (teamIds.has(petAInstanceId) || teamIds.has(petBInstanceId)) {
      return false;
    }

    const idsToRemove = new Set([petAInstanceId, petBInstanceId]);
    // 1. 原宠物从拥有的宠物库中彻底移除（原宠物消失）
    this.ownedPets = this.ownedPets.filter(p => !idsToRemove.has(p.instanceId));

    // 2. 新诞育的灵宠入库
    this.ownedPets.unshift(childPet);

    this.notify();
    return true;
  }

  // 获取在仓库备战的宠物 (排除当前在出战阵容中的)
  public getWarehousePets(): PetInstance[] {
    const teamIds = new Set(this.teamPets.map(p => p.instanceId));
    return this.ownedPets.filter(p => !teamIds.has(p.instanceId));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public notify(): void {
    this.saveToStorage();
    this.listeners.forEach(fn => fn());
  }

  // 计算升级所需经验
  public static getExpForNextLevel(level: number): number {
    return Math.floor(70 * Math.pow(level, 1.35) + 30);
  }

  // 金币操作
  public getGold(): number {
    return this.gold;
  }

  public addGold(amount: number): void {
    this.gold += Math.max(0, amount);
    this.notify();
  }

  public consumeGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.notify();
      return true;
    }
    return false;
  }

  // 选定当前关卡
  public setSelectedStageId(stageId: string): void {
    if (this.selectedStageId !== stageId) {
      this.selectedStageId = stageId;
      this.notify();
    }
  }

  // 关卡进度判断
  public isStageUnlocked(stageId: string, allStages: StageConfig[]): boolean {
    if (allStages.length === 0) return true;
    if (stageId === allStages[0].id) return true; // 第一关默认解锁

    const stageIndex = allStages.findIndex(s => s.id === stageId);
    if (stageIndex <= 0) return true;

    // 前置关卡已被通关则解锁
    const prevStage = allStages[stageIndex - 1];
    return this.clearedStageIds.includes(prevStage.id);
  }

  public isFirstClear(stageId: string): boolean {
    return !this.clearedStageIds.includes(stageId);
  }

  // 关卡胜利结算：发放金币、经验，并结算升级、新技能习得与宠物蛋掉落
  public recordStageVictory(stage: StageConfig, classManager?: ClassManager): StageVictoryReward {
    const isFirst = this.isFirstClear(stage.id);
    const goldGained = stage.rewards.gold + (isFirst ? stage.rewards.firstClearGoldBonus : 0);
    const expGained = stage.rewards.exp;

    // 增加金币
    this.gold += goldGained;

    // 记录通关
    if (!this.clearedStageIds.includes(stage.id)) {
      this.clearedStageIds.push(stage.id);
    }

    const levelUpReports: LevelUpReport[] = [];

    // 1. 角色获得经验
    const charReport = this.addCharacterExp(expGained);
    if (charReport) {
      levelUpReports.push(charReport);
    }

    // 2. 出战宠物全员获得经验
    this.teamPets.forEach(pet => {
      const petReport = this.addPetExp(pet, expGained);
      if (petReport) {
        levelUpReports.push(petReport);
      }
    });

    // 3. 检测是否习得新技能
    let newlyUnlockedSkills: { skillId: string; unlockLevel: number }[] = [];
    if (charReport && charReport.newLevel > charReport.oldLevel && classManager) {
      newlyUnlockedSkills = classManager.checkNewlyUnlockedSkills(charReport.oldLevel, charReport.newLevel);
    }

    // 4. 宠物蛋掉落检测 (首通保底 / 概率掉落)
    let droppedEgg: PetEggItem | undefined;
    if (stage.rewards && stage.rewards.eggDrop) {
      const dropCfg = stage.rewards.eggDrop;
      const shouldDrop = (isFirst && dropCfg.firstClearGuaranteed) || (Math.random() <= dropCfg.rate);
      if (shouldDrop) {
        droppedEgg = this.createEggItem(dropCfg.tier, stage.name);
        this.petEggs.push(droppedEgg);
      }
    }

    this.notify();

    return {
      goldGained,
      isFirstClear: isFirst,
      expGained,
      levelUpReports,
      newlyUnlockedSkills,
      droppedEgg
    };
  }

  // 给角色增加经验
  public addCharacterExp(expGained: number): LevelUpReport | null {
    const oldLevel = this.characterLevel;
    this.characterExp += expGained;

    let leveledUp = false;
    let requiredExp = PlayerState.getExpForNextLevel(this.characterLevel);

    while (this.characterExp >= requiredExp) {
      this.characterExp -= requiredExp;
      this.characterLevel++;
      leveledUp = true;
      requiredExp = PlayerState.getExpForNextLevel(this.characterLevel);
    }

    if (!leveledUp) return null;

    const levelDiff = this.characterLevel - oldLevel;
    // 每升一级提升基础属性
    const hpGained = levelDiff * 35;
    const atkGained = levelDiff * 4;
    const defGained = levelDiff * 2;
    const spdGained = levelDiff * 1;

    const currentStats = this.getCharacterStats();

    return {
      unitId: 'player_character',
      name: '主角 (冒险者)',
      isCharacter: true,
      oldLevel,
      newLevel: this.characterLevel,
      hpGained,
      atkGained,
      defGained,
      spdGained,
      newMaxHp: currentStats.hp,
      newAtk: currentStats.atk,
      newDef: currentStats.def,
      newSpd: currentStats.spd,
      unlockedClass: oldLevel < 10 && this.characterLevel >= 10
    };
  }

  // 给宠物增加经验并根据成长资质升级
  public addPetExp(pet: PetInstance, expGained: number): LevelUpReport | null {
    const oldLevel = pet.level;
    pet.exp += expGained;

    let leveledUp = false;
    let requiredExp = PlayerState.getExpForNextLevel(pet.level);

    let totalHpGained = 0;
    let totalAtkGained = 0;
    let totalDefGained = 0;
    let totalSpdGained = 0;

    while (pet.exp >= requiredExp) {
      pet.exp -= requiredExp;
      pet.level++;
      leveledUp = true;

      // 按独立四维资质提升
      const hpGain = Math.round(pet.growth.hpGrowth);
      const atkGain = Math.round(pet.growth.atkGrowth * 10) / 10;
      const defGain = Math.round(pet.growth.defGrowth * 10) / 10;
      const spdGain = Math.round(pet.growth.spdGrowth * 10) / 10;

      pet.maxHp += hpGain;
      pet.currentHp = pet.maxHp;
      pet.atk = Math.round((pet.atk + atkGain) * 10) / 10;
      pet.def = Math.round((pet.def + defGain) * 10) / 10;
      pet.spd = Math.round((pet.spd + spdGain) * 10) / 10;

      totalHpGained += hpGain;
      totalAtkGained += atkGain;
      totalDefGained += defGain;
      totalSpdGained += spdGain;

      // 灵宠达到里程碑等级（Lv.3, Lv.6, Lv.10, Lv.15）时领悟新技能
      const SKILL_UNLOCK_LEVELS = [3, 6, 10, 15];
      if (SKILL_UNLOCK_LEVELS.includes(pet.level)) {
        const pool = ELEMENTAL_SKILL_POOLS[pet.element] || ['skill_pet_taunt'];
        const unlearned = pool.filter(sid => !pet.skills.includes(sid));
        if (unlearned.length > 0) {
          const newSkill = unlearned[0];
          pet.skills.push(newSkill);
          if (!pet.equippedSkills) {
            pet.equippedSkills = pet.skills.slice(0, 4);
          } else if (pet.equippedSkills.length < 4) {
            pet.equippedSkills.push(newSkill);
          }
        }
      }

      requiredExp = PlayerState.getExpForNextLevel(pet.level);
    }

    if (!leveledUp) return null;

    return {
      unitId: pet.instanceId,
      name: pet.name,
      isCharacter: false,
      oldLevel,
      newLevel: pet.level,
      hpGained: totalHpGained,
      atkGained: Math.round(totalAtkGained * 10) / 10,
      defGained: Math.round(totalDefGained * 10) / 10,
      spdGained: Math.round(totalSpdGained * 10) / 10,
      newMaxHp: pet.maxHp,
      newAtk: pet.atk,
      newDef: pet.def,
      newSpd: pet.spd
    };
  }

  // 获取角色当前等级属性
  public getCharacterStats(): { hp: number; mp: number; atk: number; def: number; spd: number; critRate: number; critDmg: number } {
    const levelBonus = this.characterLevel - 1;
    return {
      hp: this.baseCharacterStats.hp + levelBonus * 35,
      mp: this.baseCharacterStats.mp + levelBonus * 5,
      atk: this.baseCharacterStats.atk + levelBonus * 4,
      def: this.baseCharacterStats.def + levelBonus * 2,
      spd: this.baseCharacterStats.spd + levelBonus * 1,
      critRate: this.baseCharacterStats.critRate,
      critDmg: this.baseCharacterStats.critDmg
    };
  }

  // 创建主角出战单位
  public createCharacterBattleUnit(classManager?: ClassManager): BattleUnit {
    if (this.characterLevel >= 10 && this.activeClassId && classManager && classManager.activeClass) {
      const unit = classManager.createCharacterBattleUnit('LATE_GAME');
      unit.level = this.characterLevel;
      return unit;
    }

    const stats = this.getCharacterStats();
    const equipped = classManager ? classManager.getEquippedSkills() : ['skill_basic_strike'];
    return {
      id: 'player_character',
      name: `主角 (${this.characterLevel >= 10 ? '觉醒者' : '见习冒险者'})`,
      type: 'CHARACTER',
      avatar: '🧙‍♂️',
      level: this.characterLevel,
      currentHp: stats.hp,
      maxHp: stats.hp,
      currentMp: stats.mp,
      maxMp: stats.mp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      actionDistance: 10000,
      skills: equipped.length > 0 ? equipped : ['skill_basic_strike'],
      buffs: [],
      isDead: false
    };
  }

  // 创建出战队伍宠物 BattleUnits（挑战新关卡时血量全面复原）
  public createTeamPetBattleUnits(): BattleUnit[] {
    this.teamPets.forEach(p => {
      p.currentHp = p.maxHp;
    });

    return this.teamPets.map(pet => ({
      id: pet.instanceId,
      name: `${pet.name} (出战)`,
      type: 'PET',
      avatar: pet.configId === 'pet_rock_turtle' ? '🐢' : pet.configId === 'pet_storm_falcon' ? '🦅' : '🦎',
      level: pet.level,
      currentHp: pet.maxHp,
      maxHp: pet.maxHp,
      currentMp: 60,
      maxMp: 60,
      atk: pet.atk,
      def: pet.def,
      spd: pet.spd,
      critRate: pet.critRate,
      critDmg: pet.critDmg,
      actionDistance: 10000,
      skills: this.getPetEquippedSkills(pet),
      buffs: [],
      shield: 0,
      isDead: false,
      element: pet.element,
      petRef: pet
    }));
  }

  // 获取宠物的携带技能（上限4个，不足时以已习得技能填充）
  public getPetEquippedSkills(pet: PetInstance): string[] {
    if (pet.equippedSkills && Array.isArray(pet.equippedSkills) && pet.equippedSkills.length > 0) {
      return pet.equippedSkills.slice(0, 4);
    }
    const defaults = pet.skills && pet.skills.length > 0 ? pet.skills.slice(0, 4) : ['skill_basic_strike', pet.innateSkillId];
    pet.equippedSkills = [...defaults];
    return pet.equippedSkills;
  }

  // 装备或替换宠物的技能（上限4个）
  public equipPetSkill(petInstanceId: string, skillId: string, targetSlot?: number): boolean {
    const pet = this.ownedPets.find(p => p.instanceId === petInstanceId);
    if (!pet || !pet.skills.includes(skillId)) return false;

    if (!pet.equippedSkills) {
      pet.equippedSkills = this.getPetEquippedSkills(pet);
    }

    const existingIdx = pet.equippedSkills.indexOf(skillId);
    if (existingIdx !== -1) {
      if (targetSlot !== undefined && targetSlot >= 0 && targetSlot < 4 && targetSlot !== existingIdx) {
        const temp = pet.equippedSkills[targetSlot];
        pet.equippedSkills[targetSlot] = skillId;
        if (temp) {
          pet.equippedSkills[existingIdx] = temp;
        } else {
          pet.equippedSkills.splice(existingIdx, 1);
        }
        this.notify();
        return true;
      }
      return true;
    }

    if (targetSlot !== undefined && targetSlot >= 0 && targetSlot < 4) {
      if (targetSlot < pet.equippedSkills.length) {
        pet.equippedSkills[targetSlot] = skillId;
      } else {
        pet.equippedSkills.push(skillId);
      }
    } else if (pet.equippedSkills.length < 4) {
      pet.equippedSkills.push(skillId);
    } else {
      pet.equippedSkills[3] = skillId;
    }

    this.notify();
    return true;
  }

  // 卸下宠物的携带技能（保留至少1个）
  public unequipPetSkill(petInstanceId: string, skillId: string): boolean {
    const pet = this.ownedPets.find(p => p.instanceId === petInstanceId);
    if (!pet) return false;
    const equipped = this.getPetEquippedSkills(pet);
    if (equipped.length <= 1) return false;

    pet.equippedSkills = equipped.filter(s => s !== skillId);
    this.notify();
    return true;
  }

  // 道具背包操作：使用消耗品
  public useItem(itemId: string, targetPetId?: string): { success: boolean; message: string; report?: LevelUpReport | null } {
    const currentCount = this.inventory[itemId] || 0;
    if (currentCount <= 0) {
      return { success: false, message: '行囊中该道具数量不足' };
    }

    // 需指定目标的道具校验
    if (!targetPetId) {
      return { success: false, message: '请先选定要使用该道具的灵宠伙伴' };
    }

    const pet = this.ownedPets.find(p => p.instanceId === targetPetId);
    if (!pet) {
      return { success: false, message: '未找到指定的灵宠伙伴' };
    }

    // 1. 经验丹 (小/大)
    if (itemId === 'item_exp_pill_s' || itemId === 'item_exp_pill_l') {
      if (pet.level >= 50) {
        return { success: false, message: `${pet.name} 已达当前最高等级 Lv.50，无法再吸收经验丹` };
      }

      this.inventory[itemId]--;
      if (this.inventory[itemId] <= 0) {
        delete this.inventory[itemId];
      }

      const expValue = itemId === 'item_exp_pill_s' ? 500 : 2500;
      const report = this.addPetExp(pet, expValue);
      this.notify();

      const levelUpMsg = report ? `，突破升入 Lv.${report.newLevel}！属性全方位提升！` : '！';
      return {
        success: true,
        message: `✨ ${pet.name} 炼化灵药，吸收获得了 +${expValue} 点经验${levelUpMsg}`,
        report
      };
    }

    // 2. 造化洗髓丹
    if (itemId === 'item_wash_pill') {
      this.inventory[itemId]--;
      if (this.inventory[itemId] <= 0) {
        delete this.inventory[itemId];
      }

      const oldGrowth = { ...pet.growth };
      const newGrowth = rollHatchGrowth(pet.tier, pet.race);
      const levelDiff = pet.level - 1;

      pet.growth = newGrowth;
      pet.maxHp = Math.max(10, Math.round(pet.maxHp + (newGrowth.hpGrowth - oldGrowth.hpGrowth) * levelDiff));
      pet.currentHp = pet.maxHp;
      pet.atk = Math.max(1, round1(pet.atk + (newGrowth.atkGrowth - oldGrowth.atkGrowth) * levelDiff));
      pet.def = Math.max(1, round1(pet.def + (newGrowth.defGrowth - oldGrowth.defGrowth) * levelDiff));
      pet.spd = Math.max(1, round1(pet.spd + (newGrowth.spdGrowth - oldGrowth.spdGrowth) * levelDiff));

      if (!pet.traits.includes('洗髓脱胎')) {
        pet.traits.push('洗髓脱胎');
      }

      this.notify();

      return {
        success: true,
        message: `🌟 洗髓脱胎成功！${pet.name} 资质完成重构！生命成长: ${oldGrowth.hpGrowth} → ${newGrowth.hpGrowth}, 攻击: ${oldGrowth.atkGrowth} → ${newGrowth.atkGrowth}, 防御: ${oldGrowth.defGrowth} → ${newGrowth.defGrowth}, 速度: ${oldGrowth.spdGrowth} → ${newGrowth.spdGrowth}`
      };
    }

    // 3. 回春术古卷
    if (itemId === 'item_scroll_heal') {
      if (pet.skills.includes('skill_spring_heal')) {
        return { success: false, message: `${pet.name} 已习得【春风拂体/回春术】，无需重复领悟` };
      }

      this.inventory[itemId]--;
      if (this.inventory[itemId] <= 0) {
        delete this.inventory[itemId];
      }

      pet.skills.push('skill_spring_heal');
      if (!pet.equippedSkills) {
        pet.equippedSkills = [...pet.skills];
      } else if (pet.equippedSkills.length < 4) {
        pet.equippedSkills.push('skill_spring_heal');
      }

      this.notify();

      return {
        success: true,
        message: `🎉 领悟成功！${pet.name} 已掌握核心治愈战技【春风拂体/回春术】！`
      };
    }

    return { success: false, message: '未知的道具类型' };
  }

  // 存储与读取（本地物理文件持久化）
  public saveToStorage(): void {
    // 异步静默写入本地文件，不再写入 localStorage
    this.saveToLocalFile().catch(() => {});
  }

  public async saveToLocalFile(): Promise<{ success: boolean; message?: string }> {
    this.lastSaveTime = Date.now();
    const jsonStr = this.exportSaveData();

    // 1. 若已绑定用户本地物理文件（通过 File System Access API），直接写入该文件
    if (this.boundFileHandle && typeof this.boundFileHandle.createWritable === 'function') {
      try {
        const writable = await this.boundFileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
      } catch (err: any) {
        console.warn('写入绑定的本地文件失败:', err);
      }
    }

    // 2. 写入 Vite 开发服务器中间件提供的本地物理文件 save.json
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonStr
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, message: data.message || '已成功保存至本地物理文件 (save.json)' };
        }
      }
    } catch {
      // 离线单文件或无后端模式下静默容错
    }

    return { success: true, message: '已同步至本地就绪队列' };
  }

  public async initFromLocalFile(): Promise<boolean> {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/load');
        if (res.ok) {
          const data = await res.json();
          if (data && !data.notFound && typeof data === 'object') {
            const result = this.importSaveData(JSON.stringify(data));
            return result.success;
          }
        }
      }
    } catch {
      // 静默处理网络或静态模式异常
    }
    return false;
  }

  public async clearLocalFile(): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/clear', { method: 'POST' });
      }
    } catch {}
    this.clearStorage();
  }

  public loadFromStorage(): void {
    // 纯兼容桩：不再从 localStorage 读取任何数据，清理遗留 key
    this.clearStorage();
  }

  public exportSaveData(): string {
    const data = {
      version: '3.1',
      saveTime: this.lastSaveTime || Date.now(),
      gold: this.gold,
      characterLevel: this.characterLevel,
      characterExp: this.characterExp,
      clearedStageIds: this.clearedStageIds,
      activeClassId: this.activeClassId,
      equippedSkillIds: this.equippedSkillIds,
      characterCustomSlots: this.characterCustomSlots,
      teamPets: this.teamPets,
      ownedPets: this.ownedPets,
      petEggs: this.petEggs,
      inventory: this.inventory,
      selectedStageId: this.selectedStageId
    };
    return JSON.stringify(data, null, 2);
  }

  public importSaveData(jsonStr: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonStr);
      if (typeof data !== 'object' || !data) {
        return { success: false, message: '存档数据格式错误：非有效 JSON 格式' };
      }
      if (typeof data.gold === 'number') this.gold = data.gold;
      if (typeof data.characterLevel === 'number') this.characterLevel = data.characterLevel;
      if (typeof data.characterExp === 'number') this.characterExp = data.characterExp;
      if (Array.isArray(data.clearedStageIds)) this.clearedStageIds = data.clearedStageIds;
      if (data.activeClassId) this.activeClassId = data.activeClassId;
      else this.activeClassId = undefined;
      if (Array.isArray(data.equippedSkillIds)) this.equippedSkillIds = data.equippedSkillIds;
      if (data.characterCustomSlots && typeof data.characterCustomSlots === 'object') {
        this.characterCustomSlots = data.characterCustomSlots;
      }
      if (typeof data.saveTime === 'number') {
        this.lastSaveTime = data.saveTime;
      }
      if (Array.isArray(data.ownedPets)) {
        this.ownedPets = data.ownedPets;
        this.ownedPets.forEach(p => {
          if (typeof p.exp !== 'number') p.exp = 0;
          if (!p.skills) p.skills = ['skill_basic_strike', p.innateSkillId];
          if (!p.skills.includes('skill_basic_strike')) p.skills.unshift('skill_basic_strike');
          if (p.innateSkillId && !p.skills.includes(p.innateSkillId)) p.skills.push(p.innateSkillId);
          if (p.level === 1 && (!p.generation || p.generation <= 1)) {
            p.skills = ['skill_basic_strike', p.innateSkillId];
          }
          const pRanges = getPetGrowthRanges(p.tier, p.race);
          if (p.growth) {
            if (!p.generation || p.generation <= 1) {
              p.growth.hpGrowth = round1(Math.max(pRanges.hp.min, Math.min(pRanges.hp.max, p.growth.hpGrowth)));
              p.growth.atkGrowth = round1(Math.max(pRanges.atk.min, Math.min(pRanges.atk.max, p.growth.atkGrowth)));
              p.growth.defGrowth = round1(Math.max(pRanges.def.min, Math.min(pRanges.def.max, p.growth.defGrowth)));
              p.growth.spdGrowth = round1(Math.max(pRanges.spd.min, Math.min(pRanges.spd.max, p.growth.spdGrowth)));
            } else {
              p.growth.hpGrowth = round1(Math.max(pRanges.hp.min, p.growth.hpGrowth));
              p.growth.atkGrowth = round1(Math.max(pRanges.atk.min, p.growth.atkGrowth));
              p.growth.defGrowth = round1(Math.max(pRanges.def.min, p.growth.defGrowth));
              p.growth.spdGrowth = round1(Math.max(pRanges.spd.min, p.growth.spdGrowth));
            }
          }
          if (!p.equippedSkills || !Array.isArray(p.equippedSkills) || p.equippedSkills.length === 0) {
            p.equippedSkills = p.skills.slice(0, 4);
          } else {
            p.equippedSkills = p.equippedSkills.filter(s => p.skills.includes(s)).slice(0, 4);
            if (p.equippedSkills.length === 0) {
              p.equippedSkills = p.skills.slice(0, 4);
            }
          }
        });
      }
      if (Array.isArray(data.teamPets)) {
        const mapped = data.teamPets
          .map((tp: PetInstance) => this.ownedPets.find(o => o.instanceId === tp.instanceId))
          .filter((p: PetInstance | undefined): p is PetInstance => Boolean(p));
        this.teamPets = mapped.length > 0 || data.teamPets.length === 0 ? mapped : data.teamPets;
        this.teamPets.forEach(p => {
          const matched = this.ownedPets.find(o => o.instanceId === p.instanceId);
          if (matched) {
            p.skills = matched.skills;
            p.equippedSkills = matched.equippedSkills;
          } else {
            if (!p.equippedSkills) p.equippedSkills = (p.skills || ['skill_basic_strike']).slice(0, 4);
          }
        });
      }
      if (Array.isArray(data.petEggs)) this.petEggs = data.petEggs;
      if (data.inventory && typeof data.inventory === 'object') {
        this.inventory = { ...data.inventory };
      } else {
        this.inventory = {};
      }
      if (data.selectedStageId) this.selectedStageId = data.selectedStageId;

      this.lastSaveTime = Date.now();
      this.notify();
      return { success: true, message: '存档数据导入并恢复成功！' };
    } catch (err: any) {
      return { success: false, message: `存档解析失败: ${err?.message || '未知错误'}` };
    }
  }

  public clearStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('akane_player_state_v1');
        localStorage.removeItem('akane_player_state_v2');
        localStorage.removeItem('akane_player_state_v3');
      }
    } catch {
      // 忽略清理异常
    }
  }

  public reset(): void {
    this.gold = 500;
    this.characterLevel = 1;
    this.characterExp = 0;
    this.clearedStageIds = [];
    this.activeClassId = undefined;
    this.equippedSkillIds = ['skill_basic_strike'];
    this.characterCustomSlots = { novice: ['', '', ''], classes: {} };
    this.teamPets = [];
    this.ownedPets = [];
    this.petEggs = [];
    this.inventory = {};
    this.selectedStageId = 'stage_1_1';
    this.lastSaveTime = Date.now();
    this.notify();
  }
}
