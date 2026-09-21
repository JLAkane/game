import { BattleEngine } from '../../core/battle/BattleEngine.ts';
import { BattleUnit, SkillConfig, SkillCategory } from '../../core/types.ts';

export class BattleView {
  private container: HTMLElement;
  private engine: BattleEngine;
  private skillsMap: Map<string, SkillConfig>;
  private currentMode: 'EARLY' | 'LATE' = 'EARLY';
  private selectedSkillId: string | null = null;
  private selectedTargetId: string | null = null;
  private isActionInProgress: boolean = false;

  constructor(container: HTMLElement, engine: BattleEngine, skills: SkillConfig[]) {
    this.container = container;
    this.engine = engine;
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
  }

  public render(mode?: 'EARLY' | 'LATE'): void {
    if (mode) this.currentMode = mode;
    this.initScenario(this.currentMode);
    this.updateDOM();
  }

  private initScenario(mode: 'EARLY' | 'LATE'): void {
    if (mode === 'EARLY') {
      const charUnit: BattleUnit = {
        id: 'player_char',
        name: '主角 (冒险者)',
        type: 'CHARACTER',
        avatar: '🧙‍♂️',
        level: 5,
        currentHp: 450,
        maxHp: 450,
        currentMp: 100,
        maxMp: 100,
        atk: 70,
        def: 25,
        spd: 105,
        critRate: 0.15,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: ['skill_char_slash', 'skill_char_cleave', 'skill_basic_strike'],
        buffs: [],
        isDead: false
      };

      const petUnit: BattleUnit = {
        id: 'pet_early_1',
        name: '火尾蜥 (幼体)',
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
        critRate: 0.05,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: ['skill_ember_spit', 'skill_basic_strike'],
        buffs: [],
        isDead: false
      };

      const enemies: BattleUnit[] = [
        {
          id: 'mob_slime_1',
          name: '荒野史莱姆 A',
          type: 'MONSTER',
          avatar: '🟢',
          level: 3,
          currentHp: 220,
          maxHp: 220,
          currentMp: 0,
          maxMp: 0,
          atk: 18,
          def: 10,
          spd: 60,
          critRate: 0,
          critDmg: 1.5,
          actionDistance: 10000,
          skills: ['skill_monster_bite', 'skill_basic_strike'],
          buffs: [],
          isDead: false
        },
        {
          id: 'mob_slime_2',
          name: '荒野史莱姆 B',
          type: 'MONSTER',
          avatar: '🟢',
          level: 3,
          currentHp: 220,
          maxHp: 220,
          currentMp: 0,
          maxMp: 0,
          atk: 18,
          def: 10,
          spd: 60,
          critRate: 0,
          critDmg: 1.5,
          actionDistance: 10000,
          skills: ['skill_monster_bite', 'skill_basic_strike'],
          buffs: [],
          isDead: false
        }
      ];

      this.engine.initBattle([charUnit, petUnit], enemies);
    } else {
      // 后期场景：角色化身战术指挥官，携带 T3 狱火炎龙与 T2 熔岩巨兽挑战深渊领主
      const charUnit: BattleUnit = {
        id: 'player_char',
        name: '主角 (战术指挥官)',
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
        skills: ['skill_char_slash', 'skill_char_vulnerability', 'skill_char_overload', 'skill_char_extra_turn', 'skill_basic_strike'],
        buffs: [],
        isDead: false
      };

      const dragonUnit: BattleUnit = {
        id: 'pet_dragon',
        name: '狱火炎龙 (T3 史诗)',
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

      const turtleUnit: BattleUnit = {
        id: 'pet_behemoth',
        name: '熔岩巨兽 (T2 稀有)',
        type: 'PET',
        avatar: '🌋',
        level: 32,
        currentHp: 3100,
        maxHp: 3100,
        currentMp: 100,
        maxMp: 100,
        atk: 320,
        def: 280,
        spd: 85,
        critRate: 0.2,
        critDmg: 1.6,
        actionDistance: 10000,
        skills: ['skill_magma_slam', 'skill_rock_armor', 'skill_basic_strike'],
        buffs: [],
        isDead: false
      };

      const boss: BattleUnit = {
        id: 'mob_titan_boss',
        name: '灭世泰坦领主',
        type: 'MONSTER',
        avatar: '👹',
        level: 40,
        currentHp: 50000,
        maxHp: 50000,
        currentMp: 0,
        maxMp: 0,
        atk: 320,
        def: 350,
        spd: 85,
        critRate: 0.15,
        critDmg: 1.8,
        actionDistance: 10000,
        skills: ['skill_monster_bite', 'skill_basic_strike'],
        buffs: [],
        isDead: false
      };

      this.engine.initBattle([charUnit, dragonUnit, turtleUnit], [boss]);
    }

    this.syncTargetForCurrentSkill();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 播放单位动作动画
   */
  private async playUnitAnimation(unitId: string, animClass: string): Promise<void> {
    const el = this.container.querySelector(`[data-unit-id="${unitId}"]`) as HTMLElement;
    if (!el) return;
    el.classList.remove('anim-dash-right', 'anim-dash-left', 'anim-cast', 'anim-command', 'anim-hit');
    void el.offsetWidth;
    el.classList.add(animClass);
    await this.sleep(300);
    el.classList.remove(animClass);
  }

  /**
   * 暴击全屏微震
   */
  private triggerScreenShake(): void {
    const area = this.container.querySelector('#battle-stage-area') as HTMLElement;
    if (!area) return;
    area.classList.remove('anim-screen-shake');
    void area.offsetWidth;
    area.classList.add('anim-screen-shake');
    setTimeout(() => area.classList.remove('anim-screen-shake'), 250);
  }

  /**
   * 动态生成浮空伤害/回复飘字
   */
  private spawnFloatingText(
    targetId: string, 
    text: string, 
    type: 'DAMAGE' | 'CRIT' | 'HEAL' | 'COMMAND'
  ): void {
    const el = this.container.querySelector(`[data-unit-id="${targetId}"]`) as HTMLElement;
    if (!el) return;

    const floatEl = document.createElement('div');
    floatEl.className = 'floating-text-item';

    if (type === 'CRIT') {
      floatEl.className += ' text-lg sm:text-2xl text-amber-300 font-extrabold tracking-wider filter drop-shadow(0 0 10px rgba(245,158,11,0.8))';
    } else if (type === 'DAMAGE') {
      floatEl.className += ' text-sm sm:text-base text-rose-400 font-bold';
    } else if (type === 'HEAL') {
      floatEl.className += ' text-sm sm:text-base text-emerald-300 font-bold';
    } else if (type === 'COMMAND') {
      floatEl.className += ' text-xs sm:text-sm text-purple-300 font-bold bg-purple-950/90 px-2 py-0.5 rounded border border-purple-600 shadow-md';
    }

    floatEl.innerText = text;
    floatEl.style.top = '-5px';
    floatEl.style.left = '50%';
    el.appendChild(floatEl);

    setTimeout(() => {
      floatEl.remove();
    }, 850);
  }

  private canAffordSkill(unit: BattleUnit, skill: SkillConfig): boolean {
    if (skill.costMp && unit.currentMp < skill.costMp) return false;
    if (skill.costTp && unit.currentMp < skill.costTp) return false;
    return true;
  }

  private syncTargetForCurrentSkill(): void {
    const active = this.engine.activeUnit;
    if (!active || active.isDead) {
      this.selectedSkillId = null;
      this.selectedTargetId = null;
      return;
    }

    let validSkill: SkillConfig | undefined;
    if (this.selectedSkillId && active.skills.includes(this.selectedSkillId)) {
      const s = this.skillsMap.get(this.selectedSkillId);
      if (s && this.canAffordSkill(active, s) && this.engine.getValidTargets(active, s).length > 0) {
        validSkill = s;
      }
    }

    if (!validSkill) {
      for (const sId of active.skills) {
        const s = this.skillsMap.get(sId);
        if (s && this.canAffordSkill(active, s) && this.engine.getValidTargets(active, s).length > 0) {
          validSkill = s;
          break;
        }
      }
    }

    if (!validSkill) {
      validSkill = this.skillsMap.get('skill_basic_strike');
    }

    this.selectedSkillId = validSkill?.id || null;
    if (!validSkill) {
      this.selectedTargetId = null;
      return;
    }

    const validTargets = this.engine.getValidTargets(active, validSkill);
    if (!this.selectedTargetId || !validTargets.some(t => t.id === this.selectedTargetId)) {
      this.selectedTargetId = validTargets[0]?.id || null;
    }
  }

  private getCategoryBadge(category: SkillCategory): { label: string; bg: string; text: string; border: string; icon: string } {
    switch (category) {
      case 'DAMAGE':
        return { label: '攻击伤害', bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800', icon: '💥' };
      case 'HEAL':
        return { label: '生命恢复', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-800', icon: '💚' };
      case 'BUFF':
        return { label: '增益强化', bg: 'bg-sky-950/60', text: 'text-sky-300', border: 'border-sky-800', icon: '🛡️' };
      case 'DEBUFF':
        return { label: '弱化减益', bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-800', icon: '☣️' };
      case 'COMMAND':
        return { label: '战术指挥', bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-800', icon: '👑' };
    }
  }

  private updateDOM(): void {
    const active = this.engine.activeUnit;
    const isPlayerTurn = active ? this.engine.isPlayerSide(active) : false;
    const currentSkill = this.selectedSkillId ? this.skillsMap.get(this.selectedSkillId) : undefined;
    const validTargets = (active && currentSkill) ? this.engine.getValidTargets(active, currentSkill) : [];
    const isAoeSkill = currentSkill?.targetType === 'ALL_ENEMIES' || currentSkill?.targetType === 'ALL_ALLIES';
    const canAffordCurrent = active && currentSkill ? this.canAffordSkill(active, currentSkill) : false;
    const hasValidTarget = isAoeSkill || (this.selectedTargetId && validTargets.some(t => t.id === this.selectedTargetId));
    const isReadyToExecute = isPlayerTurn && !this.engine.checkBattleOver() && canAffordCurrent && hasValidTarget && !this.isActionInProgress;

    this.container.innerHTML = `
      <div class="space-y-4">
        <!-- 模式切换与核心对比提示 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">场景演练</span>
            <div class="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button id="btn-mode-early" class="px-3 py-1 text-xs rounded font-medium transition-all ${this.currentMode === 'EARLY' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}">
                🌱 前期开荒 (角色输出 85%+)
              </button>
              <button id="btn-mode-late" class="px-3 py-1 text-xs rounded font-medium transition-all ${this.currentMode === 'LATE' ? 'bg-purple-600 text-white font-bold glow-command' : 'text-slate-400 hover:text-white'}">
                🔥 后期核爆 (宠物输出 95%+)
              </button>
            </div>
          </div>
          <div class="text-xs text-slate-400">
            ${this.currentMode === 'EARLY' 
              ? '💡 <span class="text-amber-300 font-semibold">前期手感</span>：主角手持大剑一招重劈秒杀小怪，幼体宠物只能补刀打微量伤害。' 
              : '💡 <span class="text-purple-300 font-semibold">后期体验</span>：主角打上【弱点标记】与【战术超载】，神宠狱火炎龙一击打出数万级毁灭伤害！'}
          </div>
        </div>

        <!-- 战场双方面板 (支持 Screen Shake 震动) -->
        <div id="battle-stage-area" class="grid grid-cols-1 md:grid-cols-2 gap-4 transition-transform">
          <!-- 我方战阵 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                  🛡️ 冒险者小队 (${this.engine.playerTeam.filter(u => !u.isDead).length}/${this.engine.playerTeam.length})
                </span>
                <span class="text-xs text-slate-400">当前轮次：第 ${this.engine.turnCount} 回合</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.playerTeam.map(unit => {
                  const isSelectable = validTargets.some(t => t.id === unit.id);
                  return this.renderUnitCard(unit, active?.id === unit.id, isSelectable, isAoeSkill && isSelectable);
                }).join('')}
              </div>
            </div>
          </div>

          <!-- 敌方战阵 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  ⚔️ 敌对目标 (${this.engine.enemyTeam.filter(u => !u.isDead).length}/${this.engine.enemyTeam.length})
                </span>
                <span class="text-xs text-slate-400">打击感动效增强中</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.enemyTeam.map(unit => {
                  const isSelectable = validTargets.some(t => t.id === unit.id);
                  return this.renderUnitCard(unit, active?.id === unit.id, isSelectable, isAoeSkill && isSelectable);
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- 底部行动操作区 + 战斗日志 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- 技能释放控制面板 -->
          <div class="lg:col-span-2 bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded ${isPlayerTurn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">
                    ${this.isActionInProgress ? '⚡ 行动交锋中...' : (isPlayerTurn ? '👉 等待玩家下发指令' : (this.engine.checkBattleOver() ? '🏁 战斗已结束' : '⏳ 敌方行动中'))}
                  </span>
                  <span class="text-sm font-bold text-white">当前出手：${active?.name || '战斗结束'}</span>
                </div>
                <div class="flex items-center gap-2">
                  ${active?.type === 'CHARACTER' ? '<span class="text-xs text-purple-400 font-medium">👑 战术指挥官</span>' : ''}
                  <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                    能量: ${active?.currentMp ?? 0}/${active?.maxMp ?? 0}
                  </span>
                </div>
              </div>

              <!-- 技能按钮列表 -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                ${(active?.skills || []).map(skillId => {
                  const skill = this.skillsMap.get(skillId);
                  if (!skill) return '';
                  const isSelected = this.selectedSkillId === skillId;
                  const canAfford = active ? this.canAffordSkill(active, skill) : true;
                  const targets = active ? this.engine.getValidTargets(active, skill) : [];
                  const hasTargets = targets.length > 0;
                  const badge = this.getCategoryBadge(skill.category);

                  let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                  if (!canAfford) {
                    borderClass = 'border-rose-900/40 bg-slate-950/40 opacity-50';
                  } else if (isSelected) {
                    borderClass = 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/50 shadow-md';
                  }

                  return `
                    <button 
                      class="skill-btn text-left p-2.5 rounded-lg border transition-all ${borderClass}"
                      data-skill-id="${skill.id}"
                    >
                      <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold ${canAfford ? 'text-slate-100' : 'text-slate-400'}">${skill.name}</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded border font-semibold ${badge.bg} ${badge.text} ${badge.border}">
                            ${badge.icon} ${badge.label}
                          </span>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${canAfford ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
                          ${!canAfford ? '⚠️ 能量不足' : (skill.costTp ? `TP: ${skill.costTp}` : (skill.costMp ? `MP: ${skill.costMp}` : '免费回能'))}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${skill.desc}</p>
                      ${!hasTargets ? '<div class="text-[10px] text-amber-500 font-bold mt-1">⚠️ 场上无存活合法目标</div>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- 执行按钮与目标状态 -->
            <div class="flex items-center justify-between pt-2 border-t border-game-border">
              <div class="text-xs text-slate-400 flex items-center gap-1.5">
                <span>当前目标：</span>
                ${isAoeSkill ? `
                  <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800">
                    🎯 ${currentSkill?.targetType === 'ALL_ENEMIES' ? '全体敌方目标' : '全体我方成员'}
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                    ${this.engine.findUnitById(this.selectedTargetId || '')?.name || '未选择目标'}
                  </span>
                `}
              </div>
              <div class="flex gap-2">
                <button id="btn-reset-battle" class="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
                  🔄 重置战局
                </button>
                <button 
                  id="btn-execute-action" 
                  class="px-5 py-1.5 text-xs rounded-lg font-bold transition-all shadow-lg ${
                    isReadyToExecute
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }"
                  ${!isReadyToExecute ? 'disabled' : ''}
                >
                  ${this.isActionInProgress ? '⚡ 交锋中...' : (!canAffordCurrent ? '⚠️ 能量不足，请普攻回蓝' : (!hasValidTarget ? '⚠️ 请选择有效目标' : `⚡ 下发指令并推进 (T${this.engine.turnCount})`))}
                </button>
              </div>
            </div>
          </div>

          <!-- 实时战斗日志 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col h-[280px]">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">📜 战术播报日志</span>
              <span class="text-[10px] text-slate-500">实时交锋记录</span>
            </div>
            <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono">
              ${this.engine.logs.map(log => {
                let colorClass = 'text-slate-400';
                if (log.type === 'DAMAGE') colorClass = log.isCrit ? 'text-amber-300 font-bold' : 'text-slate-200';
                if (log.type === 'COMMAND') colorClass = 'text-purple-300 font-semibold';
                if (log.type === 'BUFF') colorClass = 'text-emerald-400';
                if (log.type === 'HEAL') colorClass = 'text-green-300 font-bold';
                if (log.type === 'DEATH') colorClass = 'text-rose-400 font-bold';
                return `
                  <div class="p-1.5 rounded bg-slate-950/50 border border-slate-900 ${colorClass}">
                    <span class="text-slate-600">[T${log.turn}]</span>
                    <span class="text-slate-300 font-semibold">${log.sourceName}</span>:
                    ${log.message}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderUnitCard(
    unit: BattleUnit, 
    isActive: boolean, 
    isSelectableTarget: boolean, 
    isAoeTarget: boolean
  ): string {
    const hpPercent = Math.max(0, Math.min(100, Math.round((unit.currentHp / unit.maxHp) * 100)));
    const mpPercent = Math.max(0, Math.min(100, Math.round((unit.currentMp / unit.maxMp) * 100)));
    const isSelectedTarget = this.selectedTargetId === unit.id && !isAoeTarget;
    const isDead = unit.isDead;

    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
    if (isDead) {
      borderClass = 'opacity-30 grayscale border-slate-900 bg-slate-950 cursor-not-allowed';
    } else if (isActive) {
      borderClass = 'border-amber-500 bg-amber-950/20 shadow-md ring-1 ring-amber-500/50';
    } else if (isAoeTarget) {
      borderClass = 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/40 glow-command';
    } else if (isSelectedTarget) {
      borderClass = 'border-rose-500 bg-rose-950/40 ring-1 ring-rose-500 shadow-md';
    } else if (!isSelectableTarget) {
      borderClass = 'opacity-40 border-slate-800/60 bg-slate-950/40 cursor-not-allowed';
    }

    return `
      <div 
        class="unit-card relative overflow-visible p-3 rounded-lg border transition-all ${borderClass}"
        data-unit-id="${unit.id}"
        data-selectable="${isSelectableTarget && !isDead}"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">${unit.avatar}</span>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white">${unit.name}</span>
                <span class="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Lv.${unit.level}</span>
                ${isDead ? '<span class="text-[10px] text-rose-500 font-bold">阵亡</span>' : ''}
              </div>
              <div class="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                <span>攻 ${unit.atk}</span>
                <span>防 ${unit.def}</span>
                <span>速 ${unit.spd}</span>
              </div>
            </div>
          </div>

          <!-- 目标指示与 Buff 状态徽章 -->
          <div class="flex flex-col items-end gap-1">
            ${isSelectableTarget && !isDead && !isAoeTarget && isSelectedTarget ? `
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                🎯 当前选中
              </span>
            ` : ''}
            ${isAoeTarget ? `
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                🎯 群体受击
              </span>
            ` : ''}
            ${!isSelectableTarget && !isDead ? `
              <span class="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-500">
                不可选
              </span>
            ` : ''}
            <div class="flex flex-wrap gap-1 max-w-[120px] justify-end">
              ${unit.buffs.map(b => `
                <span class="text-[9px] px-1 rounded bg-purple-900/80 text-purple-200 border border-purple-700">
                  ${b.name}(${b.remainingTurns})
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 生命条 -->
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
          <div 
            class="h-full transition-all duration-300 ${this.engine.isPlayerSide(unit) ? 'bg-emerald-500' : 'bg-rose-500'}" 
            style="width: ${hpPercent}%"
          ></div>
        </div>
        <!-- 能量条 -->
        <div class="w-full bg-slate-900 h-1 rounded-full overflow-hidden mb-1">
          <div 
            class="h-full transition-all duration-300 bg-sky-500" 
            style="width: ${mpPercent}%"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400">
          <span>HP ${unit.currentHp}/${unit.maxHp}</span>
          <span class="text-sky-300">MP ${unit.currentMp}/${unit.maxMp}</span>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // 场景切换
    this.container.querySelector('#btn-mode-early')?.addEventListener('click', () => {
      this.render('EARLY');
    });
    this.container.querySelector('#btn-mode-late')?.addEventListener('click', () => {
      this.render('LATE');
    });

    // 技能选择
    this.container.querySelectorAll('.skill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isActionInProgress) return;
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (skillId) {
          this.selectedSkillId = skillId;
          const active = this.engine.activeUnit;
          const skill = this.skillsMap.get(skillId);
          if (active && skill) {
            const validTargets = this.engine.getValidTargets(active, skill);
            if (!this.selectedTargetId || !validTargets.some(t => t.id === this.selectedTargetId)) {
              this.selectedTargetId = validTargets[0]?.id || null;
            }
          }
          this.updateDOM();
        }
      });
    });

    // 目标点击选择
    this.container.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (this.isActionInProgress) return;
        const el = e.currentTarget as HTMLElement;
        const isSelectable = el.dataset.selectable === 'true';
        const unitId = el.dataset.unitId;
        if (isSelectable && unitId) {
          this.selectedTargetId = unitId;
          this.updateDOM();
        }
      });
    });

    // 重置战局
    this.container.querySelector('#btn-reset-battle')?.addEventListener('click', () => {
      this.initScenario(this.currentMode);
      this.updateDOM();
    });

    // 执行行动指令（带动态动作、浮空飘字与时序控制）
    this.container.querySelector('#btn-execute-action')?.addEventListener('click', async () => {
      const active = this.engine.activeUnit;
      if (!active || !this.selectedSkillId || this.isActionInProgress) return;

      const skill = this.skillsMap.get(this.selectedSkillId);
      if (!skill || !this.canAffordSkill(active, skill)) return;

      const targetId = this.selectedTargetId || active.id;
      const isPlayer = this.engine.isPlayerSide(active);

      this.isActionInProgress = true;
      this.updateDOM();

      // 1. 播放攻击者动画
      let attackAnim = isPlayer ? 'anim-dash-right' : 'anim-dash-left';
      if (skill.category === 'COMMAND') attackAnim = 'anim-command';
      else if (skill.targetType === 'ALL_ENEMIES' || skill.category === 'BUFF' || skill.category === 'HEAL') attackAnim = 'anim-cast';

      await this.playUnitAnimation(active.id, attackAnim);

      // 2. 逻辑执行
      this.engine.executeAction(active.id, this.selectedSkillId, targetId);

      // 3. 命中反馈与飘字
      const latestLog = this.engine.logs[0];
      if (latestLog) {
        if (latestLog.type === 'DAMAGE' && latestLog.damage !== undefined) {
          if (latestLog.isCrit) {
            this.triggerScreenShake();
            this.spawnFloatingText(targetId, `💥 -${latestLog.damage}!`, 'CRIT');
          } else {
            this.spawnFloatingText(targetId, `-${latestLog.damage}`, 'DAMAGE');
          }
          await this.playUnitAnimation(targetId, 'anim-hit');
        } else if (latestLog.type === 'HEAL') {
          this.spawnFloatingText(targetId, `💚 回复`, 'HEAL');
        } else if (latestLog.type === 'COMMAND') {
          this.spawnFloatingText(targetId, `✨ ${skill.name}`, 'COMMAND');
        }
      }

      this.updateDOM();

      // 4. 连续推进敌方 AI 回合（带生动动作与攻击时序）
      while (this.engine.activeUnit && !this.engine.isPlayerSide(this.engine.activeUnit) && !this.engine.checkBattleOver()) {
        await this.sleep(350);
        const enemy = this.engine.activeUnit;
        const enemySkillId = enemy.skills.find(sId => {
          const s = this.skillsMap.get(sId);
          return s && (!s.costMp || enemy.currentMp >= s.costMp);
        }) || 'skill_basic_strike';
        const enemySkill = this.skillsMap.get(enemySkillId) || this.skillsMap.get('skill_basic_strike')!;
        const enemyTargets = this.engine.getValidTargets(enemy, enemySkill);
        if (enemyTargets.length === 0) {
          enemy.actionDistance = 10000;
          this.engine.advanceToNextTurn();
          continue;
        }
        const enemyTarget = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];

        // 敌方突进动作
        await this.playUnitAnimation(enemy.id, 'anim-dash-left');
        this.engine.executeAction(enemy.id, enemySkill.id, enemyTarget.id);

        const enemyLog = this.engine.logs[0];
        if (enemyLog && enemyLog.type === 'DAMAGE' && enemyLog.damage !== undefined) {
          this.spawnFloatingText(enemyTarget.id, `-${enemyLog.damage}`, enemyLog.isCrit ? 'CRIT' : 'DAMAGE');
          await this.playUnitAnimation(enemyTarget.id, 'anim-hit');
        }

        this.updateDOM();
      }

      // 5. 解锁并完成轮次同步
      this.isActionInProgress = false;
      this.syncTargetForCurrentSkill();
      this.updateDOM();
    });
  }
}
