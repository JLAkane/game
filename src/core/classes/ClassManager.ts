import { CharacterClassConfig, ClassType, BattleUnit } from '../types.ts';

export class ClassManager {
  private classes: Map<ClassType, CharacterClassConfig> = new Map();
  public activeClassId: ClassType = 'TACTICAL_COMMANDER';
  public characterLevel: number = 1;

  constructor(configs: CharacterClassConfig[]) {
    configs.forEach(c => this.classes.set(c.id, c));
  }

  public get activeClass(): CharacterClassConfig {
    return this.classes.get(this.activeClassId)!;
  }

  public getAllClasses(): CharacterClassConfig[] {
    return Array.from(this.classes.values());
  }

  public switchClass(classId: ClassType): boolean {
    if (this.classes.has(classId)) {
      this.activeClassId = classId;
      return true;
    }
    return false;
  }

  /**
   * 构建当前角色的战斗实体
   */
  public createCharacterBattleUnit(mode: 'EARLY_GAME' | 'LATE_GAME'): BattleUnit {
    const classConfig = this.activeClass;
    
    if (mode === 'EARLY_GAME') {
      // 前期：Lv.5 冒险者，高攻击力直伤，战术点充沛
      return {
        id: 'player_char',
        name: `主角 (${classConfig.name})`,
        type: 'CHARACTER',
        avatar: '🧙‍♂️',
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
        skills: classConfig.skills,
        buffs: [],
        isDead: false
      };
    } else {
      // 后期：Lv.35 战术指挥官，自身攻击成长平缓（纯工具人），但血厚、全套指挥大招
      return {
        id: 'player_char',
        name: `主角 (${classConfig.name})`,
        type: 'CHARACTER',
        avatar: '👑',
        level: 35,
        currentHp: 2800,
        maxHp: 2800,
        currentMp: 200,
        maxMp: 200,
        atk: 120, // 攻击成长明显滞后于宠物
        def: 180,
        spd: 110,
        critRate: 0.2,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: classConfig.skills,
        buffs: [],
        isDead: false
      };
    }
  }
}
