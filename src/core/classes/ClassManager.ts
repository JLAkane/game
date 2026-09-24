import { CharacterClassConfig, ClassType, BattleUnit, ClassSkillUnlock } from '../types.ts';
import { PlayerState } from '../player/PlayerState.ts';

export const NOVICE_SKILLS_POOL: ClassSkillUnlock[] = [
  { skillId: 'skill_char_slash', unlockLevel: 2 },
  { skillId: 'skill_char_cleave', unlockLevel: 3 },
  { skillId: 'skill_novice_thrust', unlockLevel: 6 },
  { skillId: 'skill_novice_heavy_smash', unlockLevel: 8 }
];

export class ClassManager {
  private classes: Map<ClassType, CharacterClassConfig> = new Map();
  public activeClassId?: ClassType;
  private customLevel?: number;
  private customGold?: number;
  private playerState?: PlayerState;
  public static readonly BASIC_ATTACK_ID = 'skill_basic_strike';

  // 记录见习冒险家装备的 3 个自定义槽位
  private noviceCustomSlots: string[] = ['', '', ''];

  // 记录每个进阶职业装备的 3 个自定义技能
  private classCustomSlots: Map<ClassType, string[]> = new Map();

  public get isNovice(): boolean {
    if (this.playerState) {
      return this.playerState.characterLevel < 10 || !this.playerState.activeClassId;
    }
    return this.characterLevel < 10 || !this.activeClassId;
  }

  public get characterLevel(): number {
    if (this.customLevel !== undefined) return this.customLevel;
    if (this.playerState) return this.playerState.characterLevel;
    return 35; // 独立使用时默认 35 级供测试/演练
  }
  public set characterLevel(val: number) {
    this.customLevel = val;
  }

  public get gold(): number {
    if (this.customGold !== undefined) return this.customGold;
    if (this.playerState) return this.playerState.gold;
    return 2000; // 独立使用时默认 2000 金币供测试/演练
  }
  public set gold(val: number) {
    this.customGold = val;
  }

  constructor(configs: CharacterClassConfig[], playerState?: PlayerState) {
    this.playerState = playerState;
    if (this.playerState) {
      this.activeClassId = this.playerState.activeClassId;
    } else {
      this.activeClassId = 'TACTICAL_COMMANDER';
    }
    configs.forEach(c => {
      this.classes.set(c.id, c);
      this.classCustomSlots.set(c.id, [...(c.defaultEquipped || [])]);
    });
    this.loadCustomSlotsFromPlayerState();
  }

  public loadCustomSlotsFromPlayerState(): void {
    if (!this.playerState) return;
    this.activeClassId = this.playerState.activeClassId;
    const custom = this.playerState.characterCustomSlots;
    if (custom) {
      if (Array.isArray(custom.novice) && custom.novice.length === 3) {
        this.noviceCustomSlots = [...custom.novice];
      }
      if (custom.classes && typeof custom.classes === 'object') {
        for (const [cId, slots] of Object.entries(custom.classes)) {
          if (Array.isArray(slots)) {
            this.classCustomSlots.set(cId as ClassType, [...slots]);
          }
        }
      }
    }
  }

  public syncCustomSlotsToPlayerState(): void {
    if (!this.playerState) return;
    const classesObj: Record<string, string[]> = {};
    for (const [cId, slots] of this.classCustomSlots.entries()) {
      classesObj[cId] = slots;
    }
    this.playerState.characterCustomSlots = {
      novice: [...this.noviceCustomSlots],
      classes: classesObj
    };
    this.playerState.notify();
  }

  /**
   * 自选槽位开启门槛：
   * 槽位 1 (自选槽 0): Lv.2
   * 槽位 2 (自选槽 1): Lv.5
   * 槽位 3 (自选槽 2): Lv.10
   */
  public static getSlotUnlockLevel(slotIndex: number): number {
    if (slotIndex === 0) return 2;
    if (slotIndex === 1) return 5;
    if (slotIndex === 2) return 10;
    return 10;
  }

  public isSlotUnlocked(slotIndex: number): boolean {
    return this.characterLevel >= ClassManager.getSlotUnlockLevel(slotIndex);
  }

  public get activeClass(): CharacterClassConfig {
    if (this.activeClassId && this.classes.has(this.activeClassId)) {
      return this.classes.get(this.activeClassId)!;
    }
    return this.classes.get('TACTICAL_COMMANDER') || Array.from(this.classes.values())[0];
  }

  public getAllClasses(): CharacterClassConfig[] {
    return Array.from(this.classes.values());
  }

  /**
   * 获取当前配置的全部出战技能 (1 普攻 + 最多 3 自选)
   * 严格遵守槽位开放等级 (Lv.2, Lv.5, Lv.10) 与技能解锁等级
   */
  public getEquippedSkills(classId?: ClassType): string[] {
    if (this.isNovice) {
      const custom: string[] = [];
      for (let i = 0; i < 3; i++) {
        if (this.isSlotUnlocked(i) && this.noviceCustomSlots[i]) {
          const sid = this.noviceCustomSlots[i];
          const u = NOVICE_SKILLS_POOL.find(s => s.skillId === sid);
          if (u && this.characterLevel >= u.unlockLevel) {
            custom.push(sid);
          }
        }
      }
      return [ClassManager.BASIC_ATTACK_ID, ...custom];
    }

    const targetClassId = classId || this.activeClassId || 'TACTICAL_COMMANDER';
    const cls = this.classes.get(targetClassId);
    const custom = this.classCustomSlots.get(targetClassId) || [];
    const validCustom: string[] = [];
    for (let i = 0; i < 3; i++) {
      if (this.isSlotUnlocked(i) && custom[i]) {
        const sid = custom[i];
        const unlock = cls?.skillsPool.find(s => s.skillId === sid);
        if (unlock ? this.characterLevel >= unlock.unlockLevel : true) {
          validCustom.push(sid);
        }
      }
    }
    return [ClassManager.BASIC_ATTACK_ID, ...validCustom];
  }

  /**
   * 获取当前等级真正已经解锁并习得的技能（严格过滤掉未习得技能）
   * 见习冒险家阶段返回见习技能池中已达等级的伤害技能
   */
  public getUnlockedSkills(classId?: ClassType): ClassSkillUnlock[] {
    if (this.isNovice) {
      return NOVICE_SKILLS_POOL.filter(s => this.characterLevel >= s.unlockLevel);
    }
    const targetClassId = classId || this.activeClassId || 'TACTICAL_COMMANDER';
    const cls = this.classes.get(targetClassId);
    if (!cls) return [];
    return cls.skillsPool.filter(s => this.characterLevel >= s.unlockLevel);
  }

  /**
   * 获取当前职业原始 3 个自定义槽位（含空槽位）
   */
  public getRawCustomSlots(classId?: ClassType): string[] {
    if (this.isNovice) {
      const slots = [...this.noviceCustomSlots];
      for (let i = 0; i < 3; i++) {
        if (!this.isSlotUnlocked(i)) {
          slots[i] = '';
        } else if (slots[i]) {
          const u = NOVICE_SKILLS_POOL.find(s => s.skillId === slots[i]);
          if (!u || this.characterLevel < u.unlockLevel) {
            slots[i] = '';
          }
        }
      }
      while (slots.length < 3) slots.push('');
      return slots;
    }

    const targetClassId = classId || this.activeClassId || 'TACTICAL_COMMANDER';
    const cls = this.classes.get(targetClassId);
    const slots = [...(this.classCustomSlots.get(targetClassId) || [])];
    for (let i = 0; i < 3; i++) {
      if (!this.isSlotUnlocked(i)) {
        slots[i] = '';
      } else if (slots[i]) {
        const unlock = cls?.skillsPool.find(s => s.skillId === slots[i]);
        if (unlock && this.characterLevel < unlock.unlockLevel) {
          slots[i] = '';
        }
      }
    }
    while (slots.length < 3) slots.push('');
    return slots;
  }

  /**
   * 装备自定义技能到指定槽位 (slotIndex: 0, 1, 2)
   */
  public equipSkill(classId: ClassType | undefined, slotIndex: number, skillId: string): boolean {
    if (!this.isSlotUnlocked(slotIndex)) return false;

    if (this.isNovice) {
      const unlockInfo = NOVICE_SKILLS_POOL.find(s => s.skillId === skillId);
      if (!unlockInfo || this.characterLevel < unlockInfo.unlockLevel) {
        return false;
      }
      const existing = this.noviceCustomSlots.indexOf(skillId);
      if (existing !== -1 && existing !== slotIndex) {
        this.noviceCustomSlots[existing] = '';
      }
      this.noviceCustomSlots[slotIndex] = skillId;
      this.syncCustomSlotsToPlayerState();
      return true;
    }

    const targetClassId = classId || this.activeClassId;
    if (!targetClassId) return false;
    const cls = this.classes.get(targetClassId);
    if (!cls) return false;

    // 检查技能是否属于本职业且已达解锁等级
    const unlockInfo = cls.skillsPool.find(s => s.skillId === skillId);
    if (!unlockInfo || this.characterLevel < unlockInfo.unlockLevel) {
      return false;
    }

    const currentSlots = this.getRawCustomSlots(targetClassId);

    // 不能重复装备同一个技能，若已存在则移出原位置
    const existingIndex = currentSlots.indexOf(skillId);
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
      currentSlots[existingIndex] = '';
    }

    currentSlots[slotIndex] = skillId;
    this.classCustomSlots.set(targetClassId, currentSlots);
    this.syncCustomSlotsToPlayerState();
    return true;
  }

  /**
   * 卸下指定槽位的技能
   */
  public unequipSkill(classId: ClassType | undefined, slotIndex: number): boolean {
    if (slotIndex >= 0 && slotIndex < 3) {
      if (this.isNovice) {
        this.noviceCustomSlots[slotIndex] = '';
        this.syncCustomSlotsToPlayerState();
        return true;
      }
      const targetClassId = classId || this.activeClassId;
      if (!targetClassId) return false;
      const currentSlots = this.getRawCustomSlots(targetClassId);
      currentSlots[slotIndex] = '';
      this.classCustomSlots.set(targetClassId, currentSlots);
      this.syncCustomSlotsToPlayerState();
      return true;
    }
    return false;
  }

  /**
   * 检测某次等级提升过程中，新解锁并习得的所有技能
   */
  public checkNewlyUnlockedSkills(oldLevel: number, newLevel: number): ClassSkillUnlock[] {
    if (newLevel <= oldLevel) return [];
    const newly: ClassSkillUnlock[] = [];

    // 1. 见习技能池检测 (Lv.1 ~ Lv.9)
    NOVICE_SKILLS_POOL.forEach(s => {
      if (oldLevel < s.unlockLevel && s.unlockLevel <= newLevel) {
        newly.push(s);
      }
    });

    // 2. 若已转职，检测转职职业技能池
    if (!this.isNovice && this.activeClass) {
      this.activeClass.skillsPool.forEach(s => {
        if (oldLevel < s.unlockLevel && s.unlockLevel <= newLevel) {
          newly.push(s);
        }
      });
    }

    return newly;
  }

  /**
   * 职业进阶与转职切换 (需 Lv.10 以上)
   * 若玩家此前为见习冒险家（未选定任何进阶职业），首次觉醒转职完全免费（0 金币）；
   * 若此前已选定职业，后续重选变更职业才消耗 500 金币。
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

    // 首次觉醒转职（此前未选定任何职业）：完全免费（0 金币）；后续变更职业消耗 500 金币
    const isFirstAwakening = !this.activeClassId;
    const cost = isFirstAwakening ? 0 : target.respecCost;

    if (this.customGold !== undefined) {
      if (this.customGold < cost) {
        return { success: false, message: `金币不足！转职需要 ${cost} 金币，当前拥有 ${this.gold} 金币。` };
      }
      this.customGold -= cost;
    } else if (this.playerState) {
      if (cost > 0 && !this.playerState.consumeGold(cost)) {
        return { success: false, message: `金币不足！转职需要 ${cost} 金币，当前拥有 ${this.gold} 金币。` };
      }
      this.playerState.activeClassId = classId;
    } else {
      if (this.gold < cost) {
        return { success: false, message: `金币不足！转职需要 ${cost} 金币，当前拥有 ${this.gold} 金币。` };
      }
      this.customGold = this.gold - cost;
    }

    this.activeClassId = classId;
    if (this.playerState) {
      this.playerState.activeClassId = classId;
      this.playerState.notify();
    }
    return { 
      success: true, 
      message: isFirstAwakening
        ? `🎉 恭喜完成【职业觉醒】！您已正式成为【${target.name}】！`
        : `转职成功！已切换为【${target.name}】，消耗 ${cost} 金币，剩余 ${this.gold} 金币。` 
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
