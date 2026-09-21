import { CharacterClassConfig, ClassType, BattleUnit } from '../types.ts';

export class ClassManager {
  private classes: Map<ClassType, CharacterClassConfig> = new Map();
  public activeClassId: ClassType = 'TACTICAL_COMMANDER';
  public characterLevel: number = 35; // 默认 35 级，完全体验各职业终极技能
  public gold: number = 2000; // 初始充沛金币供测试转职
  public static readonly BASIC_ATTACK_ID = 'skill_basic_strike';

  // 记录每个职业装备的 3 个自定义技能（加上固定普攻刚好 4 个）
  private classCustomSlots: Map<ClassType, string[]> = new Map();

  constructor(configs: CharacterClassConfig[]) {
    configs.forEach(c => {
      this.classes.set(c.id, c);
      this.classCustomSlots.set(c.id, [...(c.defaultEquipped || [])]);
    });
  }

  public get activeClass(): CharacterClassConfig {
    return this.classes.get(this.activeClassId)!;
  }

  public getAllClasses(): CharacterClassConfig[] {
    return Array.from(this.classes.values());
  }

  /**
   * 获取某职业当前配置的全部出战技能 (1 普攻 + 最多 3 自选)
   */
  public getEquippedSkills(classId: ClassType = this.activeClassId): string[] {
    const custom = this.classCustomSlots.get(classId) || [];
    return [ClassManager.BASIC_ATTACK_ID, ...custom.filter(Boolean)];
  }

  /**
   * 获取当前职业原始 3 个自定义槽位（含空槽位）
   */
  public getRawCustomSlots(classId: ClassType = this.activeClassId): string[] {
    const slots = [...(this.classCustomSlots.get(classId) || [])];
    while (slots.length < 3) slots.push('');
    return slots;
  }

  /**
   * 装备自定义技能到指定槽位 (slotIndex: 0, 1, 2)
   */
  public equipSkill(classId: ClassType, slotIndex: number, skillId: string): boolean {
    const cls = this.classes.get(classId);
    if (!cls) return false;

    // 检查技能是否属于本职业且已达解锁等级
    const unlockInfo = cls.skillsPool.find(s => s.skillId === skillId);
    if (!unlockInfo || this.characterLevel < unlockInfo.unlockLevel) {
      return false;
    }

    const currentSlots = this.getRawCustomSlots(classId);

    // 不能重复装备同一个技能，若已存在则移出原位置
    const existingIndex = currentSlots.indexOf(skillId);
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
      currentSlots[existingIndex] = '';
    }

    currentSlots[slotIndex] = skillId;
    this.classCustomSlots.set(classId, currentSlots);
    return true;
  }

  /**
   * 卸下指定槽位的技能
   */
  public unequipSkill(classId: ClassType, slotIndex: number): boolean {
    const currentSlots = this.getRawCustomSlots(classId);
    if (slotIndex >= 0 && slotIndex < 3) {
      currentSlots[slotIndex] = '';
      this.classCustomSlots.set(classId, currentSlots);
      return true;
    }
    return false;
  }

  /**
   * 职业进阶与转职切换 (需 Lv.10 以上，消耗 500 金币)
   */
  public switchClass(classId: ClassType): { success: boolean; message: string } {
    const target = this.classes.get(classId);
    if (!target) {
      return { success: false, message: '无效的目标职业！' };
    }

    if (this.characterLevel < target.minLevel) {
      return { success: false, message: `角色未达到转职门槛等级 (需 Lv.${target.minLevel})！` };
    }

    if (this.activeClassId === classId) {
      return { success: true, message: `当前已激活【${target.name}】！` };
    }

    if (this.gold < target.respecCost) {
      return { success: false, message: `金币不足！转职需要 ${target.respecCost} 金币，当前拥有 ${this.gold} 金币。` };
    }

    this.gold -= target.respecCost;
    this.activeClassId = classId;
    return { 
      success: true, 
      message: `转职成功！已切换为【${target.name}】，消耗 ${target.respecCost} 金币，剩余 ${this.gold} 金币。` 
    };
  }

  /**
   * 构建当前角色的战斗实体（严格同步 4 个技能与职业专属面板）
   */
  public createCharacterBattleUnit(mode: 'EARLY_GAME' | 'LATE_GAME'): BattleUnit {
    const classConfig = this.activeClass;
    const equipped = this.getEquippedSkills(this.activeClassId);

    let avatar = '🧙‍♂️';
    if (this.activeClassId === 'TACTICAL_COMMANDER') avatar = '👑';
    if (this.activeClassId === 'IRON_VANGUARD') avatar = '🛡️';
    if (this.activeClassId === 'PSIONIC_CONDUCTOR') avatar = '🔮';
    if (this.activeClassId === 'SHADOW_PACKMASTER') avatar = '🏹';
    
    if (mode === 'EARLY_GAME') {
      // 前期：Lv.5 冒险者，高攻击力直伤，开荒测试
      return {
        id: 'player_char',
        name: `主角 (${classConfig.name})`,
        type: 'CHARACTER',
        avatar,
        level: 5,
        currentHp: 450,
        maxHp: 450,
        currentMp: 100,
        maxMp: 100,
        atk: 65,
        def: 30,
        spd: 100,
        critRate: 0.15,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: equipped,
        buffs: [],
        shield: 0,
        isDead: false
      };
    } else {
      // 后期：Lv.35 对应职业精确属性面板
      return {
        id: 'player_char',
        name: `主角 (${classConfig.name})`,
        type: 'CHARACTER',
        avatar,
        level: this.characterLevel,
        currentHp: classConfig.baseHp,
        maxHp: classConfig.baseHp,
        currentMp: classConfig.baseMp,
        maxMp: classConfig.baseMp,
        atk: classConfig.baseAtk,
        def: classConfig.baseDef,
        spd: classConfig.baseSpd,
        critRate: classConfig.baseCritRate,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: equipped,
        buffs: [],
        shield: 0,
        isDead: false
      };
    }
  }
}
