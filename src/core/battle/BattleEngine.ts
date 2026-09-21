import { BattleUnit, SkillConfig, BattleLogEntry } from '../types.ts';
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

  constructor(skills: SkillConfig[]) {
    skills.forEach(s => this.skillsMap.set(s.id, s));
  }

  public initBattle(playerTeam: BattleUnit[], enemyTeam: BattleUnit[]): void {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.logs = [];
    this.turnCount = 0;
    this.status = 'IN_PROGRESS';

    // 初始化行动距离
    [...this.playerTeam, ...this.enemyTeam].forEach(unit => {
      unit.actionDistance = 10000;
      unit.buffs = [];
      unit.isDead = false;
    });

    this.addLog('系统', '战斗开始！', 'INFO');
    this.advanceToNextTurn();
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

    // 消耗战术点/魔法
    if (skill.costTp && actor.currentMp < skill.costTp) return false;
    if (skill.costMp && actor.currentMp < skill.costMp) return false;
    actor.currentMp -= (skill.costTp || skill.costMp || 0);

    // 遍历技能效果结算
    skill.effects.forEach(effect => {
      switch (effect.type) {
        case 'DAMAGE': {
          const targets = skill.targetType === 'ALL_ENEMIES' 
            ? (this.isPlayerSide(actor) ? this.enemyTeam.filter(u => !u.isDead) : this.playerTeam.filter(u => !u.isDead))
            : [target!];

          targets.forEach(t => {
            const res = DamageCalculator.calculate(actor, t, skill, effect);
            t.currentHp = Math.max(0, t.currentHp - res.finalDamage);
            
            this.addLog(
              actor.name, 
              `施展【${skill.name}】对 [${t.name}] 造成 ${res.finalDamage} 点伤害${res.isCrit ? ' 💥暴击!' : ''}`,
              'DAMAGE',
              t.name,
              res.finalDamage,
              res.isCrit
            );

            // 检查反弹伤害
            if (res.reflectedDamage > 0 && !actor.isDead) {
              actor.currentHp = Math.max(0, actor.currentHp - res.reflectedDamage);
              this.addLog(t.name, `【荆棘反伤】对 [${actor.name}] 反震 ${res.reflectedDamage} 点伤害！`, 'DAMAGE');
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
          // 超载：扣除当前10%生命，赋予超强攻击加成与必暴
          const hpCost = Math.max(1, Math.round(target.currentHp * 0.1));
          target.currentHp = Math.max(1, target.currentHp - hpCost);
          
          const boostAtk = Math.round(target.atk * (effect.statPercent || 1.5));
          target.atk += boostAtk;

          target.buffs.push({
            id: `overload_${Date.now()}`,
            name: '战术超载',
            effect,
            remainingTurns: effect.turns || 1,
            sourceId: actor.id
          });

          this.addLog(
            actor.name, 
            `对 [${target.name}] 注射【战术超载】！扣除 ${hpCost} HP，攻击力暴增 +${boostAtk}，必定暴击！`,
            'COMMAND'
          );
          break;
        }

        case 'VULNERABILITY': {
          target.buffs.push({
            id: `vuln_${Date.now()}`,
            name: '弱点标记',
            effect,
            remainingTurns: effect.turns || 2,
            sourceId: actor.id
          });
          this.addLog(actor.name, `向 [${target.name}] 发射【弱点指示】！受到宠物的伤害提升 +150%！`, 'COMMAND');
          break;
        }

        case 'EXTRA_TURN': {
          // 战术再动：直接将宠物的行动距离置 0
          target.actionDistance = 0;
          this.addLog(actor.name, `发动【战术再动号令】！[${target.name}] 立即插队获得额外行动回合！`, 'COMMAND');
          break;
        }

        case 'THORNS_AURA': {
          const targets = skill.targetType === 'ALL_ALLIES' 
            ? (this.isPlayerSide(actor) ? this.playerTeam : this.enemyTeam).filter(u => !u.isDead)
            : [target!];

          targets.forEach(t => {
            t.buffs.push({
              id: `thorns_${Date.now()}`,
              name: '荆棘共鸣',
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
          });
          this.addLog(actor.name, `开启【荆棘共鸣指令】！全体获得 300% 伤害受击反弹！`, 'COMMAND');
          break;
        }

        case 'BUFF_STAT': {
          if (effect.statKey && effect.statPercent) {
            const addVal = Math.round(target[effect.statKey] * effect.statPercent);
            target[effect.statKey] += addVal;
            target.buffs.push({
              id: `buff_${Date.now()}`,
              name: skill.name,
              effect,
              remainingTurns: effect.turns || 2,
              sourceId: actor.id
            });
            this.addLog(actor.name, `释放【${skill.name}】，${target.name} 的 ${effect.statKey} 提升了 ${addVal} 点！`, 'BUFF');
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

  private tickBuffs(unit: BattleUnit): void {
    unit.buffs = unit.buffs.filter(b => {
      b.remainingTurns--;
      if (b.remainingTurns <= 0) {
        // Buff 移除时还原属性
        if (b.effect.type === 'OVERLOAD' && b.effect.statPercent) {
          const revertAtk = Math.round(unit.atk - (unit.atk / (1 + b.effect.statPercent)));
          unit.atk = Math.max(1, unit.atk - revertAtk);
        }
        if (b.effect.type === 'BUFF_STAT' && b.effect.statKey && b.effect.statPercent) {
          const revertVal = Math.round(unit[b.effect.statKey] - (unit[b.effect.statKey] / (1 + b.effect.statPercent)));
          unit[b.effect.statKey] = Math.max(1, unit[b.effect.statKey] - revertVal);
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
