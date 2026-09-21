import { BattleUnit, SkillConfig, BattleLogEntry, ClassPassive } from '../types.ts';
import { DamageCalculator } from './DamageCalculator.ts';

export type BattleStatus = 'READY' | 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';

export class BattleEngine {
  public playerTeam: BattleUnit[] = [];
  public enemyTeam: BattleUnit[] = [];
  public activeUnit: BattleUnit | null = null;
  public logs: BattleLogEntry[] = [];
  public turnCount: number = 0;
  public status: BattleStatus = 'READY';
  public skillsMap: Map<string, SkillConfig> = new Map();
  public activePassive?: ClassPassive;

  constructor(skills: SkillConfig[]) {
    skills.forEach(s => this.skillsMap.set(s.id, s));
  }

  public initBattle(playerTeam: BattleUnit[], enemyTeam: BattleUnit[], activePassive?: ClassPassive): void {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.logs = [];
    this.turnCount = 0;
    this.status = 'IN_PROGRESS';
    this.activePassive = activePassive;

    // 初始化行动距离，并强制确保基础普攻永远位于第 1 个技能槽位 (index 0)
    [...this.playerTeam, ...this.enemyTeam].forEach(unit => {
      unit.actionDistance = 10000;
      unit.buffs = [];
      unit.shield = unit.shield || 0;
      unit.isDead = false;

      const basicIdx = unit.skills.indexOf('skill_basic_strike');
      if (basicIdx > -1) {
        unit.skills.splice(basicIdx, 1);
      }
      unit.skills.unshift('skill_basic_strike');
    });

    // 职业常驻被动光环生效（主角在场即常驻生效，即使阵亡也始终生效）
    if (this.activePassive) {
      if (this.activePassive.type === 'PET_MAX_HP') {
        this.playerTeam.filter(u => u.type === 'PET').forEach(p => {
          p.maxHp = Math.round(p.maxHp * (1 + this.activePassive!.value));
          p.currentHp = p.maxHp;
        });
        this.addLog('系统', `🛡️【${this.activePassive.name}】光环生效：全队宠物最大生命值提升 ${Math.round(this.activePassive.value * 100)}%！`, 'INFO');
      } else if (this.activePassive.type === 'PET_CRIT_RATE') {
        this.playerTeam.filter(u => u.type === 'PET').forEach(p => {
          p.critRate = Math.min(1.0, p.critRate + this.activePassive!.value);
        });
        this.addLog('系统', `👑【${this.activePassive.name}】光环生效：全队宠物暴击率提升 ${Math.round(this.activePassive.value * 100)}%！`, 'INFO');
      } else if (this.activePassive.type === 'TEAM_SPD') {
        this.playerTeam.forEach(u => {
          u.spd = Math.round(u.spd * (1 + this.activePassive!.value));
        });
        this.addLog('系统', `🏹【${this.activePassive.name}】光环生效：全队速度提升 ${Math.round(this.activePassive.value * 100)}%！`, 'INFO');
      } else if (this.activePassive.type === 'PET_MP_COST_REDUCTION') {
        this.addLog('系统', `🔮【${this.activePassive.name}】光环生效：全队宠物技能 MP 消耗降低 ${Math.round(this.activePassive.value * 100)}%！`, 'INFO');
      }
    }

    this.addLog('系统', '战斗开始！', 'INFO');
    this.advanceToNextTurn();

    // 如果先手是敌方，自动执行敌方行动直至玩家回合
    this.runAiTurns();
  }

  /**
   * 计算技能实际消耗（受魔力溢流光环等加成）
   */
  public getSkillCostMp(actor: BattleUnit, skill: SkillConfig): number {
    let cost = skill.costMp || skill.costTp || 0;
    if (actor.type === 'PET' && this.activePassive?.type === 'PET_MP_COST_REDUCTION') {
      cost = Math.max(0, Math.round(cost * (1 - this.activePassive.value)));
    }
    return cost;
  }

  /**
   * CTB 算法：推进时间轴，推选出下一个出手的单位
   */
  public advanceToNextTurn(): BattleUnit | null {
    if (this.checkBattleOver()) return null;

    const aliveUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => !u.isDead);
    if (aliveUnits.length === 0) return null;

    // 找到所需时间最短的单位: time = actionDistance / spd
    let minTime = Infinity;
    aliveUnits.forEach(u => {
      const time = u.actionDistance / Math.max(1, u.spd);
      if (time < minTime) {
        minTime = time;
      }
    });

    // 所有人同时推进时间
    aliveUnits.forEach(u => {
      u.actionDistance = Math.max(0, u.actionDistance - minTime * u.spd);
    });

    // 找出剩余距离为 0 的单位行动
    const readyUnit = aliveUnits.find(u => u.actionDistance <= 0.001) || aliveUnits[0];
    this.activeUnit = readyUnit;
    this.turnCount++;

    // 回合开始时：存活单位自然回复 +10 MP/TP
    if (!readyUnit.isDead) {
      readyUnit.currentMp = Math.min(readyUnit.maxMp, readyUnit.currentMp + 10);
    }

    return readyUnit;
  }

  /**
   * 执行技能行动
   */
  public executeAction(actorId: string, skillId: string, targetId: string): boolean {
    const actor = this.findUnitById(actorId);
    if (!actor || actor.isDead) return false;

    const skill = this.skillsMap.get(skillId);
    if (!skill) return false;

    let target = this.findUnitById(targetId);
    // 容错：如果目标已死亡，自动重定向到敌方存活单位
    if (!target || target.isDead) {
      if (skill.targetType === 'SINGLE_ENEMY') {
        const opposingTeam = this.isPlayerSide(actor) ? this.enemyTeam : this.playerTeam;
        target = opposingTeam.find(u => !u.isDead);
      } else if (skill.targetType === 'ALLY_PET' || skill.targetType === 'SINGLE_ALLY') {
        const friendlyTeam = this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam;
        target = friendlyTeam.find(u => !u.isDead && (skill.targetType !== 'ALLY_PET' || u.type === 'PET'));
      }
    }
    if (!target) return false;

    // 消耗战术点/魔法 (计算被动减耗)
    const cost = this.getSkillCostMp(actor, skill);
    if (actor.currentMp < cost) return false;
    actor.currentMp -= cost;

    // 遍历技能效果结算
    skill.effects.forEach(effect => {
      switch (effect.type) {
        case 'DAMAGE': {
          const targets = skill.targetType === 'ALL_ENEMIES' 
            ? (this.isPlayerSide(actor) ? this.enemyTeam.filter(u => !u.isDead) : this.playerTeam.filter(u => !u.isDead))
            : [target!];

          targets.forEach(t => {
            const res = DamageCalculator.calculate(actor, t, skill, effect);
            
            // 护盾抵扣伤害：优先扣除护盾值
            let finalDmg = res.finalDamage;
            if (t.shield && t.shield > 0) {
              if (t.shield >= finalDmg) {
                t.shield -= finalDmg;
                finalDmg = 0;
              } else {
                finalDmg -= t.shield;
                t.shield = 0;
              }
            }
            t.currentHp = Math.max(0, t.currentHp - finalDmg);
            
            this.addLog(
              actor.name, 
              `施展【${skill.name}】对 [${t.name}] 造成 ${res.finalDamage} 点伤害${res.isCrit ? ' 💥暴击!' : ''}`,
              'DAMAGE',
              t.name,
              res.finalDamage,
              res.isCrit
            );

            // 检查反弹/反击伤害
            if (res.reflectedDamage > 0 && !actor.isDead) {
              let reflectDmg = res.reflectedDamage;
              if (actor.shield && actor.shield > 0) {
                if (actor.shield >= reflectDmg) {
                  actor.shield -= reflectDmg;
                  reflectDmg = 0;
                } else {
                  reflectDmg -= actor.shield;
                  actor.shield = 0;
                }
              }
              actor.currentHp = Math.max(0, actor.currentHp - reflectDmg);
              this.addLog(t.name, `【反击反震】对 [${actor.name}] 反震 ${res.reflectedDamage} 点伤害！`, 'DAMAGE');
              if (actor.currentHp <= 0) {
                actor.isDead = true;
                this.addLog('系统', `[${actor.name}] 倒下了！`, 'DEATH');
              }
            }

            if (t.currentHp <= 0) {
              t.isDead = true;
              this.addLog('系统', `[${t.name}] 阵亡！`, 'DEATH');
            }
          });
          break;
        }

        case 'OVERLOAD': {
          // 超载：扣除当前生命百分比，赋予超强攻击加成与必定暴击
          const hpPercent = effect.hpCostPercent || 0.15;
          const hpCost = Math.max(1, Math.round(target.currentHp * hpPercent));
          target.currentHp = Math.max(1, target.currentHp - hpCost);
          
          const boostAtk = Math.round(target.atk * (effect.statPercent || 1.0));
          target.atk += boostAtk;

          target.buffs.push({
            id: `overload_${Date.now()}_${Math.random()}`,
            name: '战术超载',
            effect,
            remainingTurns: effect.turns || 1,
            sourceId: actor.id
          });

          this.addLog(
            actor.name, 
            `对 [${target.name}] 注射【${skill.name}】！消耗 ${hpCost} HP(${Math.round(hpPercent * 100)}%)，攻击力暴增 +${boostAtk}，必定暴击！`,
            'COMMAND'
          );
          break;
        }

        case 'VULNERABILITY': {
          target.buffs.push({
            id: `vuln_${Date.now()}_${Math.random()}`,
            name: '弱点标记',
            effect,
            remainingTurns: effect.turns || 2,
            sourceId: actor.id
          });
          this.addLog(actor.name, `向 [${target.name}] 附加【弱点剖析标记】！受到的暴击伤害提升！`, 'COMMAND');
          break;
        }

        case 'SHIELD': {
          const targets = skill.targetType === 'ALL_ALLIES'
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];
          
          targets.forEach(t => {
            let statVal = actor.def;
            if (effect.scalingStat === 'ATK') statVal = actor.atk;
            const shieldAmount = Math.max(50, Math.round((effect.baseFlat || 0) + statVal * (effect.multiplier || 1.0)));
            t.shield = (t.shield || 0) + shieldAmount;
            t.buffs.push({
              id: `shield_${Date.now()}_${Math.random()}`,
              name: '圣盾护佑',
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
            this.addLog(actor.name, `施展【${skill.name}】为 [${t.name}] 施加了 ${shieldAmount} 点坚实护盾！`, 'BUFF', t.name);
          });
          break;
        }

        case 'DEF_REDUCTION': {
          const targets = skill.targetType === 'ALL_ENEMIES'
            ? (this.isPlayerSide(actor) ? this.enemyTeam : this.playerTeam).filter(u => !u.isDead)
            : [target!];
          targets.forEach(t => {
            t.buffs.push({
              id: `def_red_${Date.now()}_${Math.random()}`,
              name: `破防(-${Math.round((effect.value || 0.2) * 100)}%)`,
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
            this.addLog(actor.name, `施展【${skill.name}】使 [${t.name}] 防御力削减 ${Math.round((effect.value || 0.2) * 100)}%！`, 'DEBUFF', t.name);
          });
          break;
        }

        case 'DAMAGE_BOOST': {
          const targets = skill.targetType === 'ALL_ALLIES'
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];
          targets.forEach(t => {
            t.buffs.push({
              id: `dmg_boost_${Date.now()}_${Math.random()}`,
              name: `增伤(+${Math.round((effect.value || 0.2) * 100)}%)`,
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
          });
          this.addLog(actor.name, `奏响【${skill.name}】！全队伤害提升 ${Math.round((effect.value || 0.2) * 100)}%（不扣血）！`, 'COMMAND');
          break;
        }

        case 'COUNTER_ATTACK': {
          const targets = skill.targetType === 'ALL_ALLIES'
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];
          targets.forEach(t => {
            t.buffs.push({
              id: `counter_${Date.now()}_${Math.random()}`,
              name: `反击姿态`,
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
          });
          this.addLog(actor.name, `开启【${skill.name}】！受击时触发 ${Math.round((effect.value || 1.0) * 100)}% 反震伤害！`, 'COMMAND');
          break;
        }

        case 'TAUNT': {
          actor.buffs.push({
            id: `taunt_${Date.now()}`,
            name: '战意嘲讽',
            effect,
            remainingTurns: effect.turns || 2,
            sourceId: actor.id
          });
          this.addLog(actor.name, `发出咆哮震慑！开启【战意嘲讽】，强制敌方全体必须攻击自身！`, 'BUFF');
          break;
        }

        case 'EXTRA_TURN': {
          target.actionDistance = 0;
          this.addLog(actor.name, `下发【${skill.name}】！[${target.name}] 行动条立即满溢，立即行动！`, 'COMMAND');
          break;
        }

        case 'ADVANCE_TURN': {
          const targets = skill.targetType === 'ALL_ALLIES'
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];
          const ratio = effect.value || 0.5;
          targets.forEach(t => {
            t.actionDistance = Math.max(0, t.actionDistance - Math.round(10000 * ratio));
          });
          this.addLog(actor.name, `吹响【${skill.name}】！全队行动条向前跃迁 ${Math.round(ratio * 100)}%！`, 'COMMAND');
          break;
        }

        case 'THORNS_AURA': {
          const targets = skill.targetType === 'ALL_ALLIES' 
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];

          targets.forEach(t => {
            t.buffs.push({
              id: `thorns_${Date.now()}_${Math.random()}`,
              name: '荆棘共鸣',
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
          });
          this.addLog(actor.name, `开启【荆棘共鸣】！全体获得 300% 伤害受击反弹！`, 'COMMAND');
          break;
        }

        case 'BUFF_STAT': {
          if (effect.statKey && effect.statPercent) {
            const addVal = Math.round(target[effect.statKey] * effect.statPercent);
            target[effect.statKey] += addVal;
            target.buffs.push({
              id: `buff_${Date.now()}_${Math.random()}`,
              name: skill.name,
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
            this.addLog(actor.name, `施展【${skill.name}】，${target.name} 的 ${effect.statKey} 提升了 ${addVal} 点！`, 'BUFF');
          }
          break;
        }

        case 'HEAL': {
          const targets = skill.targetType === 'ALL_ALLIES' 
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];

          targets.forEach(t => {
            let statVal = actor.atk;
            if (effect.scalingStat === 'DEF') statVal = actor.def;
            const healAmount = Math.max(10, Math.round((effect.baseFlat || 0) + statVal * (effect.multiplier || 1.0)));
            t.currentHp = Math.min(t.maxHp, t.currentHp + healAmount);
            this.addLog(actor.name, `施展【${skill.name}】为 [${t.name}] 回复了 ${healAmount} 点生命！`, 'HEAL', t.name);
          });
          break;
        }

        case 'RESTORE_ENERGY': {
          const energyVal = effect.value || 25;
          if (skill.targetType === 'ALL_ALLIES') {
            const targets = (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead);
            targets.forEach(t => {
              t.currentMp = Math.min(t.maxMp, t.currentMp + energyVal);
            });
            this.addLog(actor.name, `释放【${skill.name}】为全队成员各回复了 ${energyVal} 点 MP！`, 'BUFF');
          } else {
            actor.currentMp = Math.min(actor.maxMp, actor.currentMp + energyVal);
            this.addLog(actor.name, `普通攻击命中目标，回复了 ${energyVal} 点 MP！`, 'BUFF');
          }
          break;
        }
      }
    });

    // 行动完毕，重置行动距离为 10000
    actor.actionDistance = 10000;

    // 结算自身回合结束的 Buff 衰减
    this.tickBuffs(actor);

    // 检查战斗胜负
    if (!this.checkBattleOver()) {
      this.advanceToNextTurn();
    }

    return true;
  }

  /**
   * 获取指定技能的所有合法可选目标
   */
  public getValidTargets(actor: BattleUnit, skill: SkillConfig): BattleUnit[] {
    const isPlayer = this.isPlayerSide(actor);
    const friendlyTeam = isPlayer ? this.playerTeam : this.enemyTeam;
    const opposingTeam = isPlayer ? this.enemyTeam : this.playerTeam;

    switch (skill.targetType) {
      case 'SELF':
        return [actor];
      case 'SINGLE_ALLY':
        return friendlyTeam.filter(u => !u.isDead);
      case 'ALLY_PET':
        return friendlyTeam.filter(u => !u.isDead && u.type === 'PET');
      case 'ALL_ALLIES':
        return friendlyTeam.filter(u => !u.isDead);
      case 'SINGLE_ENEMY':
        return opposingTeam.filter(u => !u.isDead);
      case 'ALL_ENEMIES':
        return opposingTeam.filter(u => !u.isDead);
      default:
        return opposingTeam.filter(u => !u.isDead);
    }
  }

  /**
   * 执行敌方 AI 单次行动
   */
  public executeEnemyAction(enemy: BattleUnit): boolean {
    if (enemy.isDead) return false;

    // 挑选可用且能量充足的技能，不足则降级为基础普攻
    let skillId = enemy.skills.find(sId => {
      const s = this.skillsMap.get(sId);
      if (!s) return false;
      if (s.costMp && enemy.currentMp < s.costMp) return false;
      return true;
    }) || 'skill_basic_strike';

    let skill = this.skillsMap.get(skillId) || this.skillsMap.get('skill_basic_strike');
    if (!skill) return false;

    const validTargets = this.getValidTargets(enemy, skill);
    if (validTargets.length === 0) {
      enemy.actionDistance = 10000;
      this.advanceToNextTurn();
      return true;
    }

    // AI 目标选择策略：优先攻击被嘲讽锁定的目标，否则随机攻击有效目标
    const tauntedTarget = validTargets.find(t => t.buffs.some(b => b.effect.type === 'TAUNT'));
    const target = tauntedTarget || validTargets[Math.floor(Math.random() * validTargets.length)];
    return this.executeAction(enemy.id, skill.id, target.id);
  }

  /**
   * 自动推进所有连贯的敌方回合，直至轮到玩家行动或战斗结束
   */
  public runAiTurns(): void {
    let safety = 0;
    while (this.activeUnit && !this.isPlayerSide(this.activeUnit) && !this.checkBattleOver() && safety < 30) {
      safety++;
      const currentEnemy = this.activeUnit;
      const success = this.executeEnemyAction(currentEnemy);
      if (!success) {
        currentEnemy.actionDistance = 10000;
        this.advanceToNextTurn();
      }
    }
  }

  private tickBuffs(unit: BattleUnit): void {
    unit.buffs = unit.buffs.filter(b => {
      b.remainingTurns--;
      if (b.remainingTurns <= 0) {
        // Buff 移除时还原属性与状态
        if (b.effect.type === 'OVERLOAD' && b.effect.statPercent) {
          const revertAtk = Math.round(unit.atk - (unit.atk / (1 + b.effect.statPercent)));
          unit.atk = Math.max(1, unit.atk - revertAtk);
        }
        if (b.effect.type === 'BUFF_STAT' && b.effect.statKey && b.effect.statPercent) {
          const revertVal = Math.round(unit[b.effect.statKey] - (unit[b.effect.statKey] / (1 + b.effect.statPercent)));
          unit[b.effect.statKey] = Math.max(1, unit[b.effect.statKey] - revertVal);
        }
        if (b.effect.type === 'SHIELD') {
          unit.shield = 0;
        }
        return false;
      }
      return true;
    });
  }

  public checkBattleOver(): boolean {
    const isPlayerAllDead = this.playerTeam.every(u => u.isDead);
    const isEnemyAllDead = this.enemyTeam.every(u => u.isDead);

    if (isEnemyAllDead) {
      this.status = 'VICTORY';
      this.addLog('系统', '🎉 战斗胜利！敌人全灭！', 'INFO');
      return true;
    }
    if (isPlayerAllDead) {
      this.status = 'DEFEAT';
      this.addLog('系统', '💀 队伍阵亡，战斗失败！', 'INFO');
      return true;
    }
    return false;
  }

  public findUnitById(id: string): BattleUnit | undefined {
    return [...this.playerTeam, ...this.enemyTeam].find(u => u.id === id);
  }

  public isPlayerSide(unit: BattleUnit): boolean {
    return this.playerTeam.some(u => u.id === unit.id);
  }

  private addLog(sourceName: string, message: string, type: BattleLogEntry['type'], targetName?: string, damage?: number, isCrit?: boolean): void {
    this.logs.unshift({
      turn: this.turnCount,
      sourceName,
      actionName: '',
      targetName,
      damage,
      isCrit,
      message,
      type
    });
  }
}
