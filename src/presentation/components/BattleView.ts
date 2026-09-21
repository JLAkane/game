import { BattleEngine } from '../../core/battle/BattleEngine.ts';
import { BattleUnit, SkillConfig } from '../../core/types.ts';

export class BattleView {
  private container: HTMLElement;
  private engine: BattleEngine;
  private skillsMap: Map<string, SkillConfig>;
  private currentMode: 'EARLY' | 'LATE' = 'EARLY';
  private selectedSkillId: string | null = null;
  private selectedTargetId: string | null = null;

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
        skills: ['skill_char_slash', 'skill_char_cleave'],
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
        skills: ['skill_ember_spit'],
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
          skills: [],
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
          skills: [],
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
        atk: 120, // 角色自身数值平缓
        def: 160,
        spd: 110,
        critRate: 0.1,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: ['skill_char_slash', 'skill_char_vulnerability', 'skill_char_overload', 'skill_char_extra_turn'],
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
        atk: 780, // 多代提纯的极品大爹
        def: 320,
        spd: 120,
        critRate: 0.35,
        critDmg: 2.0,
        actionDistance: 10000,
        skills: ['skill_apocalypse_flame', 'skill_flame_burst'],
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
        skills: ['skill_magma_slam', 'skill_rock_armor'],
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
        skills: [],
        buffs: [],
        isDead: false
      };

      this.engine.initBattle([charUnit, dragonUnit, turtleUnit], [boss]);
    }

    this.selectedSkillId = this.engine.activeUnit?.skills[0] || null;
    this.selectedTargetId = this.engine.enemyTeam[0]?.id || null;
  }

  private updateDOM(): void {
    const active = this.engine.activeUnit;
    const isPlayerTurn = active ? this.engine.isPlayerSide(active) : false;

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

        <!-- 战场双方面板 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 我方战阵 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                  🛡️ 冒险者小队 (${this.engine.playerTeam.filter(u => !u.isDead).length}/${this.engine.playerTeam.length})
                </span>
                <span class="text-xs text-slate-400">行动条推演中</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.playerTeam.map(unit => this.renderUnitCard(unit, active?.id === unit.id)).join('')}
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
                <span class="text-xs text-slate-400">点击卡片可锁定目标</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.enemyTeam.map(unit => this.renderUnitCard(unit, active?.id === unit.id, true)).join('')}
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
                  <span class="text-xs font-bold px-2 py-0.5 rounded ${isPlayerTurn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">
                    ${isPlayerTurn ? '👉 等待玩家指令' : '⏳ 敌方行动计算中'}
                  </span>
                  <span class="text-sm font-bold text-white">当前出手：${active?.name || '无'}</span>
                </div>
                ${active?.type === 'CHARACTER' ? '<span class="text-xs text-purple-400 font-medium">👑 主角可释放战术指挥指令</span>' : ''}
              </div>

              <!-- 技能按钮列表 -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                ${(active?.skills || []).map(skillId => {
                  const skill = this.skillsMap.get(skillId);
                  if (!skill) return '';
                  const isSelected = this.selectedSkillId === skillId;
                  const isCommand = skill.type === 'COMMAND';
                  return `
                    <button 
                      class="skill-btn text-left p-2.5 rounded-lg border transition-all ${
                        isSelected 
                          ? (isCommand ? 'border-purple-500 bg-purple-950/50 glow-command' : 'border-amber-500 bg-amber-950/40') 
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }"
                      data-skill-id="${skill.id}"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold ${isCommand ? 'text-purple-300' : 'text-slate-200'}">
                          ${isCommand ? '✨ ' : '⚔️ '}${skill.name}
                        </span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          ${skill.costTp ? `TP: ${skill.costTp}` : (skill.costMp ? `MP: ${skill.costMp}` : '免费')}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${skill.desc}</p>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- 执行按钮 -->
            <div class="flex items-center justify-between pt-2 border-t border-game-border">
              <div class="text-xs text-slate-400">
                当前目标：<span class="text-amber-400 font-bold">${this.engine.findUnitById(this.selectedTargetId || '')?.name || '未选择'}</span>
              </div>
              <div class="flex gap-2">
                <button id="btn-reset-battle" class="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
                  🔄 重置战局
                </button>
                <button 
                  id="btn-execute-action" 
                  class="px-5 py-1.5 text-xs rounded-lg font-bold transition-all shadow-lg ${
                    isPlayerTurn && !this.engine.checkBattleOver()
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }"
                  ${!isPlayerTurn || this.engine.checkBattleOver() ? 'disabled' : ''}
                >
                  ⚡ 执行当前指令
                </button>
              </div>
            </div>
          </div>

          <!-- 实时战斗日志 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col h-[280px]">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">📜 战术播报日志</span>
              <span class="text-[10px] text-slate-500">最新记录在上</span>
            </div>
            <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono">
              ${this.engine.logs.map(log => {
                let colorClass = 'text-slate-400';
                if (log.type === 'DAMAGE') colorClass = log.isCrit ? 'text-amber-300 font-bold' : 'text-slate-200';
                if (log.type === 'COMMAND') colorClass = 'text-purple-300 font-semibold';
                if (log.type === 'BUFF') colorClass = 'text-emerald-400';
                if (log.type === 'DEATH') colorClass = 'text-rose-400 font-bold';
                return `
                  <div class="p-1 rounded bg-slate-950/40 border border-slate-900 ${colorClass}">
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

  private renderUnitCard(unit: BattleUnit, isActive: boolean, isTargetCandidate: boolean = false): string {
    const hpPercent = Math.max(0, Math.min(100, Math.round((unit.currentHp / unit.maxHp) * 100)));
    const isSelectedTarget = this.selectedTargetId === unit.id;
    const isDead = unit.isDead;

    return `
      <div 
        class="unit-card p-3 rounded-lg border transition-all cursor-pointer ${
          isDead ? 'opacity-40 grayscale border-slate-900 bg-slate-950' : 
          (isActive ? 'border-amber-500 bg-amber-950/20 shadow-md ring-1 ring-amber-500/50' : 
          (isSelectedTarget ? 'border-rose-500 bg-rose-950/30' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'))
        }"
        data-unit-id="${unit.id}"
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

          <!-- Buff 状态徽章 -->
          <div class="flex flex-wrap gap-1 max-w-[120px] justify-end">
            ${unit.buffs.map(b => `
              <span class="text-[9px] px-1 rounded bg-purple-900/80 text-purple-200 border border-purple-700">
                ${b.name}(${b.remainingTurns})
              </span>
            `).join('')}
          </div>
        </div>

        <!-- 生命条 -->
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-300 ${isTargetCandidate ? 'bg-rose-500' : 'bg-emerald-500'}" 
            style="width: ${hpPercent}%"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>HP ${unit.currentHp}/${unit.maxHp}</span>
          <span>${hpPercent}%</span>
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
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (skillId) {
          this.selectedSkillId = skillId;
          this.updateDOM();
        }
      });
    });

    // 目标选择
    this.container.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const unitId = (e.currentTarget as HTMLElement).dataset.unitId;
        if (unitId) {
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

    // 执行行动指令
    this.container.querySelector('#btn-execute-action')?.addEventListener('click', () => {
      const active = this.engine.activeUnit;
      if (!active || !this.selectedSkillId) return;

      const skill = this.skillsMap.get(this.selectedSkillId);
      if (!skill) return;

      let targetId = this.selectedTargetId;
      // 智能默认目标
      if (!targetId || this.engine.findUnitById(targetId)?.isDead) {
        if (skill.targetType === 'SINGLE_ENEMY') {
          targetId = this.engine.enemyTeam.find(u => !u.isDead)?.id || '';
        } else if (skill.targetType === 'ALLY_PET') {
          targetId = this.engine.playerTeam.find(u => !u.isDead && u.type === 'PET')?.id || '';
        } else {
          targetId = active.id;
        }
      }

      this.engine.executeAction(active.id, this.selectedSkillId, targetId);
      
      // 行动完毕后，若轮到敌人，自动推进一步 AI
      if (this.engine.activeUnit && !this.engine.isPlayerSide(this.engine.activeUnit) && !this.engine.checkBattleOver()) {
        const enemy = this.engine.activeUnit;
        const playerTarget = this.engine.playerTeam.find(u => !u.isDead);
        if (playerTarget) {
          // 敌方普通攻击
          const enemyDamage = Math.max(10, Math.round(enemy.atk * 1.2 - playerTarget.def * 0.5));
          playerTarget.currentHp = Math.max(0, playerTarget.currentHp - enemyDamage);
          this.engine.logs.unshift({
            turn: this.engine.turnCount,
            sourceName: enemy.name,
            actionName: '攻击',
            targetName: playerTarget.name,
            damage: enemyDamage,
            message: `[${enemy.name}] 反扑攻击 [${playerTarget.name}] 造成 ${enemyDamage} 伤害！`,
            type: 'DAMAGE'
          });
          if (playerTarget.currentHp <= 0) {
            playerTarget.isDead = true;
          }
          this.engine.advanceToNextTurn();
        }
      }

      // 重设当前选中技能与目标
      if (this.engine.activeUnit) {
        this.selectedSkillId = this.engine.activeUnit.skills[0] || null;
      }
      this.selectedTargetId = this.engine.enemyTeam.find(u => !u.isDead)?.id || null;

      this.updateDOM();
    });
  }
}
