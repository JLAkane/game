import { BattleEngine } from '../../core/battle/BattleEngine.ts';
import { BattleUnit, SkillConfig, SkillCategory, StageConfig, ElementType, PetConfig, StageVictoryReward } from '../../core/types.ts';
import { DamageCalculator } from '../../core/battle/DamageCalculator.ts';
import { ClassManager } from '../../core/classes/ClassManager.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';
import { SkillUnlockModal } from './SkillUnlockModal.ts';
import { EggHatchModal } from './EggHatchModal.ts';
import petsData from '../../data/pets.json';

export class BattleView {
  private container: HTMLElement;
  private engine: BattleEngine;
  private skillsMap: Map<string, SkillConfig>;
  private classManager?: ClassManager;
  private playerState?: PlayerState;
  private stages?: StageConfig[];
  private onNavigateToStages?: () => void;
  private onNavigateToClasses?: () => void;
  private petConfigs: PetConfig[];

  private currentStage: StageConfig | null = null;
  private currentMode: 'EARLY' | 'LATE' = 'EARLY';
  private selectedSkillId: string | null = null;
  private selectedTargetId: string | null = null;
  private isActionInProgress: boolean = false;
  private isBattleStarting: boolean = false;
  private isSettled: boolean = false;
  private hasShownSkillUnlockModal: boolean = false;
  private victoryReward: StageVictoryReward | null = null;

  constructor(
    container: HTMLElement, 
    engine: BattleEngine, 
    skills: SkillConfig[], 
    classManager?: ClassManager,
    playerState?: PlayerState,
    stages?: StageConfig[],
    onNavigateToStages?: () => void,
    petConfigs?: PetConfig[],
    onNavigateToClasses?: () => void
  ) {
    this.container = container;
    this.engine = engine;
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
    this.classManager = classManager;
    this.playerState = playerState;
    this.stages = stages;
    this.onNavigateToStages = onNavigateToStages;
    this.petConfigs = petConfigs || (petsData as PetConfig[]);
    this.onNavigateToClasses = onNavigateToClasses;
  }

  public render(target?: StageConfig | 'EARLY' | 'LATE'): void {
    if (target) {
      if (typeof target === 'string') {
        this.currentStage = null;
        this.currentMode = target;
        this.initScenario(this.currentMode);
      } else {
        this.currentStage = target;
        this.initStageScenario(target);
      }
      this.startBattleSequence();
      return;
    }

    if (!this.engine.status || this.engine.checkBattleOver()) {
      if (this.currentStage) {
        this.initStageScenario(this.currentStage);
      } else {
        this.initScenario(this.currentMode);
      }
      this.startBattleSequence();
      return;
    }

    this.updateDOM();
  }

  public startStage(stage: StageConfig): void {
    this.currentStage = stage;
    this.initStageScenario(stage);
    this.startBattleSequence();
  }

  private async startBattleSequence(): Promise<void> {
    this.isBattleStarting = true;
    this.isActionInProgress = true;
    this.updateDOM();

    // 播放开场横幅冲击波动画 1100ms
    await this.sleep(1100);

    // 平滑淡出开场横幅
    const overlay = this.container.querySelector('#battle-start-overlay');
    if (overlay) {
      overlay.classList.add('opacity-0');
      await this.sleep(200);
    }
    this.isBattleStarting = false;
    this.updateDOM();

    // 如果敌方速度更快拥有先手回合，连续播放敌方攻击动画
    if (this.engine.activeUnit && !this.engine.isPlayerSide(this.engine.activeUnit) && !this.engine.checkBattleOver()) {
      await this.runEnemyTurnsSequence();
    }

    // 轮到玩家回合，解锁控制
    this.isActionInProgress = false;
    this.syncTargetForCurrentSkill();
    this.updateDOM();
  }

  private initStageScenario(stage: StageConfig): void {
    this.isSettled = false;
    this.victoryReward = null;
    this.hasShownSkillUnlockModal = false;
    this.isActionInProgress = false;

    const activeClass = this.classManager?.activeClass;
    const activePassive = activeClass?.passive;

    // 玩家方出战单位
    const charUnit: BattleUnit = this.playerState
      ? this.playerState.createCharacterBattleUnit(this.classManager)
      : {
          id: 'player_char',
          name: '主角 (冒险者)',
          type: 'CHARACTER',
          avatar: '🧙‍♂️',
          level: 1,
          currentHp: 320,
          maxHp: 320,
          currentMp: 80,
          maxMp: 80,
          atk: 30,
          def: 15,
          spd: 100,
          critRate: 0.05,
          critDmg: 1.5,
          actionDistance: 10000,
          skills: ['skill_basic_strike'],
          buffs: [],
          isDead: false
        };

    const petUnits: BattleUnit[] = this.playerState
      ? this.playerState.createTeamPetBattleUnits()
      : [];

    const playerTeam = [charUnit, ...petUnits];

    // 深拷贝敌方阵容，防止血量被战斗引擎就地破坏
    const enemyTeam: BattleUnit[] = JSON.parse(JSON.stringify(stage.enemies));

    this.engine.initBattle(playerTeam, enemyTeam, activePassive);
    this.engine.advanceToNextTurn();
    this.syncTargetForCurrentSkill();
  }

  private initScenario(mode: 'EARLY' | 'LATE'): void {
    this.isSettled = false;
    this.victoryReward = null;
    this.hasShownSkillUnlockModal = false;
    this.isActionInProgress = false;

    const activeClass = this.classManager?.activeClass;
    const activePassive = activeClass?.passive;

    if (mode === 'EARLY') {
      const charUnit: BattleUnit = this.classManager
        ? this.classManager.createCharacterBattleUnit('EARLY_GAME')
        : {
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
            skills: ['skill_basic_strike'],
            buffs: [],
            isDead: false
          };

      const petUnit: BattleUnit = {
        id: 'pet_early_1',
        name: '火尾蜥 (幼体)',
        type: 'PET',
        element: 'FIRE',
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
        skills: ['skill_basic_strike', 'skill_ember_spit'],
        buffs: [],
        isDead: false
      };

      const enemies: BattleUnit[] = [
        {
          id: 'mob_wolf_1',
          name: '狂暴野狼 A',
          type: 'MONSTER',
          element: 'WOOD',
          avatar: '🐺',
          level: 2,
          currentHp: 180,
          maxHp: 180,
          currentMp: 0,
          maxMp: 0,
          atk: 24,
          def: 12,
          spd: 95,
          critRate: 0.05,
          critDmg: 1.5,
          actionDistance: 10000,
          skills: ['skill_basic_strike', 'skill_monster_bite'],
          buffs: [],
          isDead: false
        },
        {
          id: 'mob_wolf_2',
          name: '狂暴野狼 B',
          type: 'MONSTER',
          element: 'WOOD',
          avatar: '🐺',
          level: 2,
          currentHp: 180,
          maxHp: 180,
          currentMp: 0,
          maxMp: 0,
          atk: 24,
          def: 12,
          spd: 90,
          critRate: 0.05,
          critDmg: 1.5,
          actionDistance: 10000,
          skills: ['skill_basic_strike', 'skill_monster_bite'],
          buffs: [],
          isDead: false
        }
      ];

      this.engine.initBattle([charUnit, petUnit], enemies, activePassive);
    } else {
      const charUnit: BattleUnit = this.classManager
        ? this.classManager.createCharacterBattleUnit('LATE_GAME')
        : {
            id: 'player_char',
            name: '主角 (战术指挥官)',
            type: 'CHARACTER',
            avatar: '👑',
            level: 35,
            currentHp: 2400,
            maxHp: 2400,
            currentMp: 180,
            maxMp: 180,
            atk: 165,
            def: 130,
            spd: 110,
            critRate: 0.20,
            critDmg: 1.5,
            actionDistance: 10000,
            skills: ['skill_basic_strike'],
            buffs: [],
            isDead: false
          };

      const petUnit: BattleUnit = {
        id: 'pet_late_dragon',
        name: '狱火炎龙 (史诗 T3)',
        type: 'PET',
        element: 'FIRE',
        avatar: '🐲',
        level: 35,
        currentHp: 3800,
        maxHp: 3800,
        currentMp: 80,
        maxMp: 80,
        atk: 480,
        def: 210,
        spd: 120,
        critRate: 0.25,
        critDmg: 1.8,
        actionDistance: 10000,
        skills: ['skill_basic_strike', 'skill_apocalypse_flame'],
        buffs: [],
        isDead: false
      };

      const bossUnit: BattleUnit = {
        id: 'boss_titan',
        name: '【领主】深渊泰坦魔像',
        type: 'MONSTER',
        element: 'DARK',
        avatar: '🗿',
        level: 38,
        currentHp: 22000,
        maxHp: 22000,
        currentMp: 100,
        maxMp: 100,
        atk: 320,
        def: 260,
        spd: 90,
        critRate: 0.15,
        critDmg: 1.5,
        actionDistance: 10000,
        skills: ['skill_basic_strike', 'skill_magma_slam'],
        buffs: [],
        isDead: false
      };

      this.engine.initBattle([charUnit, petUnit], [bossUnit], activePassive);
    }

    this.engine.advanceToNextTurn();
    this.syncTargetForCurrentSkill();
  }

  private canAffordSkill(unit: BattleUnit, skill: SkillConfig): boolean {
    const cost = this.engine.getSkillCostMp(unit, skill);
    return unit.currentMp >= cost;
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

  private getElementBadge(element?: ElementType): { label: string; bg: string; text: string; border: string; icon: string } | null {
    if (!element) return null;
    switch (element) {
      case 'FIRE':
        return { label: '火', bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-800', icon: '🔥' };
      case 'WATER':
        return { label: '水', bg: 'bg-sky-950/80', text: 'text-sky-400', border: 'border-sky-800', icon: '💧' };
      case 'WOOD':
        return { label: '木', bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800', icon: '🌿' };
      case 'THUNDER':
        return { label: '雷', bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-800', icon: '⚡' };
      case 'LIGHT':
        return { label: '光', bg: 'bg-yellow-950/80', text: 'text-yellow-300', border: 'border-yellow-700', icon: '☀️' };
      case 'DARK':
        return { label: '暗', bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-800', icon: '🌙' };
      default:
        return null;
    }
  }

  private updateDOM(): void {
    const isOver = this.engine.checkBattleOver();
    const active = this.engine.activeUnit;
    const isPlayerTurn = active ? this.engine.isPlayerSide(active) : false;
    const currentSkill = this.selectedSkillId ? this.skillsMap.get(this.selectedSkillId) : undefined;
    const validTargets = (active && currentSkill) ? this.engine.getValidTargets(active, currentSkill) : [];
    const isAoeSkill = currentSkill?.targetType === 'ALL_ENEMIES' || currentSkill?.targetType === 'ALL_ALLIES';
    const canAffordCurrent = active && currentSkill ? this.canAffordSkill(active, currentSkill) : false;
    const hasValidTarget = isAoeSkill || (this.selectedTargetId && validTargets.some(t => t.id === this.selectedTargetId));
    const isReadyToExecute = isPlayerTurn && !isOver && canAffordCurrent && hasValidTarget && !this.isActionInProgress && !this.isBattleStarting;

    const selectedTarget = (!isAoeSkill && this.selectedTargetId) ? this.engine.findUnitById(this.selectedTargetId) : undefined;
    let elementalTip = '';
    if (active?.element && selectedTarget?.element) {
      const elemRes = DamageCalculator.getElementalMultiplier(active.element, selectedTarget.element);
      if (elemRes.relation === 'STRONG') {
        elementalTip = `
          <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 text-xs font-bold animate-pulse flex items-center gap-1 shadow-sm">
            <span>⚡ 属性克制</span>
            <span class="font-mono">(伤害 x${elemRes.multiplier.toFixed(2)})</span>
          </span>
        `;
      } else if (elemRes.relation === 'WEAK') {
        elementalTip = `
          <span class="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1">
            <span>🛡️ 属性劣势</span>
            <span class="font-mono">(伤害 x${elemRes.multiplier.toFixed(2)})</span>
          </span>
        `;
      } else {
        elementalTip = `
          <span class="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 text-xs font-mono">
            属性平性 (1.0x)
          </span>
        `;
      }
    }

    // 战斗胜利结算判定
    if (isOver && this.engine.status === 'VICTORY' && !this.isSettled && this.currentStage && this.playerState) {
      this.isSettled = true;
      this.victoryReward = this.playerState.recordStageVictory(this.currentStage, this.classManager);

      // 若本次升级跨越解锁线习得新技能，自动触发新技能习得流光弹窗
      if (this.victoryReward.newlyUnlockedSkills && this.victoryReward.newlyUnlockedSkills.length > 0 && !this.hasShownSkillUnlockModal) {
        this.hasShownSkillUnlockModal = true;
        const skillsToDisplay = this.victoryReward.newlyUnlockedSkills
          .map(u => this.skillsMap.get(u.skillId))
          .filter(Boolean) as SkillConfig[];

        const charRep = this.victoryReward.levelUpReports.find(r => r.isCharacter);
        const unlockedLevel = charRep ? charRep.newLevel : (this.classManager?.characterLevel || 2);
        let newSlotUnlocked: number | undefined;
        if (unlockedLevel === 2) newSlotUnlocked = 2;
        else if (unlockedLevel === 5) newSlotUnlocked = 5;
        else if (unlockedLevel === 10) newSlotUnlocked = 10;

        setTimeout(() => {
          const modal = new SkillUnlockModal({
            skills: skillsToDisplay,
            unlockedLevel,
            newSlotUnlocked,
            onClose: () => {},
            onGoToEquip: () => {
              const tabBtn = document.getElementById('tab-classes');
              if (tabBtn) tabBtn.click();
            }
          });
          modal.show();
        }, 500);
      }
    }

    this.container.innerHTML = `
      <div class="space-y-4 relative">
        <!-- 战斗开场震撼动画层 (Battle Start Animation Overlay) -->
        ${this.isBattleStarting ? `
          <div id="battle-start-overlay" class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm rounded-xl overflow-hidden pointer-events-auto transition-opacity duration-200">
            <div class="anim-battle-shutter absolute w-full h-28 bg-gradient-to-r from-transparent via-amber-600/35 to-transparent border-y border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]"></div>
            <div class="anim-battle-start text-center relative z-10 space-y-3 px-4">
              <div class="text-xs uppercase tracking-widest text-amber-400 font-bold px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-full inline-block shadow-lg">
                ${this.currentStage ? this.currentStage.name : (this.currentMode === 'EARLY' ? '前期开荒演练' : '后期核爆演练')}
              </div>
              <div class="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 tracking-widest drop-shadow-[0_0_25px_rgba(245,158,11,0.7)]">
                ⚔️ 战斗开始 · BATTLE START ⚔️
              </div>
              <div class="text-sm font-semibold text-slate-300 flex items-center justify-center gap-2 pt-1">
                ${active ? `
                  <div class="px-4 py-1.5 rounded-full ${isPlayerTurn ? 'bg-sky-950/90 text-sky-200 border border-sky-500/60 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'bg-rose-950/90 text-rose-200 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]'} text-xs flex items-center gap-2">
                    <span class="font-bold">⚡ 先手行动:</span>
                    <span class="text-sm">${active.avatar}</span>
                    <span class="font-bold text-white">${active.name}</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded font-mono ${isPlayerTurn ? 'bg-sky-800/80 text-sky-100' : 'bg-rose-800/80 text-rose-100'}">
                      ${isPlayerTurn ? '我方先发制人' : '敌方先发制人'}
                    </span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}
        <!-- 顶部关卡信息或模式切换 -->
        ${this.currentStage ? `
          <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <button id="btn-back-to-stages" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold transition-all flex items-center gap-1.5">
                <span>← 关卡选择</span>
              </button>
              <div>
                <h2 class="text-sm font-bold text-white flex items-center gap-2">
                  <span>🗺️ ${this.currentStage.name}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    推荐 Lv.${this.currentStage.recommendedLevel}
                  </span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">${this.currentStage.desc}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs font-mono">
              <span class="px-2.5 py-1 rounded bg-slate-950 text-amber-400 border border-slate-800">
                💰 基础金币: +${this.currentStage.rewards.gold}
              </span>
              <span class="px-2.5 py-1 rounded bg-slate-950 text-sky-400 border border-slate-800">
                ⭐ 经验: +${this.currentStage.rewards.exp} EXP
              </span>
            </div>
          </div>
        ` : `
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
        `}

        <!-- 元素相克法则速览栏 -->
        <div class="bg-game-card border border-game-border px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="font-bold text-amber-400 flex items-center gap-1">
              <span>☯</span>
              <span>元素克制法则:</span>
            </span>
            <div class="flex items-center gap-1.5 font-mono text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span class="text-rose-400 font-bold">🔥火</span>
              <span class="text-slate-600">→</span>
              <span class="text-emerald-400 font-bold">🌿木</span>
              <span class="text-slate-600">→</span>
              <span class="text-amber-400 font-bold">⚡雷</span>
              <span class="text-slate-600">→</span>
              <span class="text-sky-400 font-bold">💧水</span>
              <span class="text-slate-600">→</span>
              <span class="text-rose-400 font-bold">🔥火</span>
              <span class="text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-700/60 text-[10px] ml-1">克制 x1.30</span>
            </div>
            <div class="flex items-center gap-1.5 font-mono text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span class="text-yellow-300 font-bold">☀️光</span>
              <span class="text-slate-600">↔</span>
              <span class="text-purple-400 font-bold">🌙暗</span>
              <span class="text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950/90 border border-amber-700/60 text-[10px] ml-1">互克 x1.40</span>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>🛡️</span>
            <span>逆属性劣势: 反制 <strong>0.75x</strong> 伤害</span>
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

        <!-- 下方控制台：行动指示、技能卡牌与目标选择 -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-game-border">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-200">当前出手行动者：</span>
              ${active ? `
                <div class="flex items-center gap-2 px-3 py-1 rounded-lg ${isPlayerTurn ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
                  <span class="text-lg">${active.avatar}</span>
                  <span class="text-xs font-bold">${active.name}</span>
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${isPlayerTurn ? 'bg-sky-800/60 text-white' : 'bg-rose-800/60 text-white'}">
                    ${isPlayerTurn ? '我方回合' : '敌方 AI 回合'}
                  </span>
                </div>
              ` : '<span class="text-xs text-slate-500">等待调度...</span>'}
            </div>

            <div class="text-xs text-slate-400">
              ${!isPlayerTurn && !isOver ? '⏳ 敌方正在计算战术与技能释放...' : '👉 选择技能与目标，点击执行完成行动'}
            </div>
          </div>

          <!-- 技能卡牌库选择 -->
          <div class="mb-4">
            <div class="text-xs text-slate-400 mb-2 font-medium flex items-center justify-between">
              <span>可用技能卡组：</span>
              ${currentSkill ? `
                <span class="text-[11px] text-amber-300">
                  当前选中：<strong>${currentSkill.name}</strong> (${this.engine.getSkillCostMp(active!, currentSkill)} MP)
                </span>
              ` : ''}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              ${active?.skills.map((skillId, index) => {
                const skill = this.skillsMap.get(skillId);
                if (!skill) return '';

                const actualCost = (active ? this.engine.getSkillCostMp(active, skill) : skill.costMp) ?? 0;
                const isAffordable = active ? this.canAffordSkill(active, skill) : false;
                const isSelected = this.selectedSkillId === skill.id;
                const isBasic = index === 0;
                const badge = this.getCategoryBadge(skill.category);

                return `
                  <button 
                    class="btn-select-skill p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected 
                        ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 shadow-lg' 
                        : isAffordable 
                        ? 'border-slate-800 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-800/80' 
                        : 'border-slate-800/40 bg-slate-950/40 opacity-40 cursor-not-allowed'
                    }"
                    data-skill-id="${skill.id}"
                    ${!isPlayerTurn || !isAffordable || isOver ? 'disabled' : ''}
                  >
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}">
                          ${skill.name}
                        </span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${actualCost > 0 ? (isAffordable ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-rose-950 text-rose-300 border border-rose-800') : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}">
                          ${actualCost > 0 ? `${actualCost} MP` : (isBasic ? '0 MP (+25)' : '无消耗')}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 mb-2">
                        <span class="text-[10px] px-1.5 py-0.2 rounded ${badge.bg} ${badge.text} ${badge.border} border flex items-center gap-1">
                          <span>${badge.icon}</span>
                          <span>${badge.label}</span>
                        </span>
                        <span class="text-[10px] text-slate-400">
                          ${skill.targetType === 'ALL_ENEMIES' ? '全体敌方' : skill.targetType === 'ALL_ALLIES' ? '全体友方' : skill.targetType === 'ALLY_PET' ? '指定宠物' : '单体目标'}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-2">${skill.desc}</p>
                    </div>

                    <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span class="${isSelected ? 'text-amber-400 font-bold' : 'text-slate-500'}">
                        ${isSelected ? '● 已选定' : '点击选择'}
                      </span>
                      ${isBasic ? '<span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">槽位1[普攻]</span>' : ''}
                    </div>
                  </button>
                `;
              }).join('') || ''}
            </div>
          </div>

          <!-- 行动操作执行按钮 -->
          <div class="flex items-center justify-between pt-3 border-t border-game-border flex-wrap gap-3">
            <div class="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span>当前选定目标：</span>
              ${isAoeSkill ? `
                <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold text-xs">
                  ✨ 全体目标 (无需单点)
                </span>
              ` : this.selectedTargetId ? `
                <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-1">
                  <span>🎯 ${this.engine.findUnitById(this.selectedTargetId)?.name || '未选定'}</span>
                </span>
                ${elementalTip}
              ` : `
                <span class="text-rose-400">请在上方面板中点选目标</span>
              `}
            </div>

            <button 
              id="btn-execute-action"
              class="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                isReadyToExecute
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }"
              ${!isReadyToExecute ? 'disabled' : ''}
            >
              <span>⚡ 执行战技行动</span>
            </button>
          </div>
        </div>

        <!-- 战斗日志面板 -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="text-xs font-bold text-slate-400 mb-2">📜 战斗实况战报日志：</div>
          <div class="space-y-1.5 max-h-36 overflow-y-auto pr-2 font-mono text-xs text-slate-300">
            ${this.engine.logs.slice(0, 15).map(log => `
              <div class="p-1.5 rounded bg-slate-950/60 border ${log.elementalRelation === 'STRONG' ? 'border-emerald-800/80 bg-emerald-950/20' : log.elementalRelation === 'WEAK' ? 'border-rose-900/60 bg-rose-950/20' : 'border-slate-900'} flex items-center justify-between">
                <span>${log.message}</span>
                <span class="text-[10px] text-slate-500 font-mono">回合 ${log.turn}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 战役大捷结算弹窗 (Victory Reward Modal) -->
        ${isOver && this.engine.status === 'VICTORY' ? this.renderVictoryModal() : ''}

        <!-- 战役溃败结算弹窗 (Defeat Modal) -->
        ${isOver && this.engine.status === 'DEFEAT' ? this.renderDefeatModal() : ''}
      </div>
    `;

    this.bindEvents();
  }

  private renderVictoryModal(): string {
    const stage = this.currentStage;
    const reward = this.victoryReward;

    const nextStage = this.currentStage && this.stages
      ? this.stages[this.stages.findIndex(s => s.id === this.currentStage!.id) + 1]
      : null;

    return `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-amber-500/20 text-center animate-in fade-in zoom-in duration-200">
          <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-amber-500/40 mb-3 animate-bounce">
            🏆
          </div>

          <h2 class="text-xl font-bold text-amber-400 tracking-wide mb-1">
            战役大捷 · 全军告捷！
          </h2>
          <p class="text-xs text-slate-300 mb-4">
            ${stage ? `成功征服关卡【${stage.name}】！` : '成功清空敌对目标！'}
          </p>

          <!-- 战利品结算区 -->
          ${reward ? `
            <div class="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left mb-4 font-mono">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">💰</span>
                <div>
                  <div class="text-[10px] text-slate-400">获得金币</div>
                  <div class="text-sm font-bold text-amber-400">+${reward.goldGained} 金币</div>
                  ${reward.isFirstClear ? `
                    <div class="text-[10px] text-emerald-400 font-bold">★ 包含首通奖励!</div>
                  ` : ''}
                </div>
              </div>

              <div class="flex items-center gap-2.5">
                <span class="text-2xl">⭐</span>
                <div>
                  <div class="text-[10px] text-slate-400">团队获得经验</div>
                  <div class="text-sm font-bold text-sky-400">+${reward.expGained} EXP</div>
                  <div class="text-[10px] text-slate-400">全员共享获得</div>
                </div>
              </div>
            </div>

            <!-- 关卡珍稀掉落：宠物蛋 -->
            ${reward.droppedEgg ? (() => {
              const eggMeta = PlayerState.getEggMetadata(reward.droppedEgg.tier);
              return `
                <div class="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950/80 border border-amber-500/50 mb-4 flex items-center justify-between gap-3 text-left">
                  <div class="flex items-center gap-3">
                    <div class="text-3xl animate-bounce">🥚</div>
                    <div>
                      <div class="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>✨ 战役珍稀掉落</span>
                        <span class="px-2 py-0.5 rounded font-bold text-[10px] ${eggMeta.badgeClass}">
                          ${reward.droppedEgg.tier === 4 ? '神话远古' : reward.droppedEgg.tier === 3 ? '史诗真灵' : reward.droppedEgg.tier === 2 ? '进阶血脉' : '普通血脉'}
                        </span>
                      </div>
                      <div class="text-sm font-bold text-white">${reward.droppedEgg.name}</div>
                      <div class="text-[11px] text-slate-300 mt-0.5">${reward.droppedEgg.desc}</div>
                    </div>
                  </div>
                  <button id="btn-modal-hatch-egg" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center gap-1 shrink-0 active:scale-95">
                    <span>🐣 立即破壳</span>
                  </button>
                </div>
              `;
            })() : ''}

            <!-- 升级与成长报告 -->
            ${reward.levelUpReports && reward.levelUpReports.length > 0 ? `
              <div class="space-y-2 mb-5 text-left">
                <div class="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span>🆙 等级跃升与属性强化：</span>
                </div>
                ${reward.levelUpReports.map(rep => `
                  <div class="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/60 text-xs">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-white">${rep.name}</span>
                      <span class="px-2 py-0.2 rounded bg-emerald-900 text-emerald-200 font-mono font-bold">
                        Lv.${rep.oldLevel} → Lv.${rep.newLevel}
                      </span>
                    </div>
                    <div class="text-[11px] text-emerald-300 font-mono grid grid-cols-4 gap-1">
                      <span>HP: +${rep.hpGained}</span>
                      <span>ATK: +${rep.atkGained}</span>
                      <span>DEF: +${rep.defGained}</span>
                      <span>SPD: +${rep.spdGained}</span>
                    </div>
                    ${rep.unlockedClass ? `
                      <div class="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-transparent border border-amber-500/60 text-amber-300 font-bold text-xs flex items-center justify-between shadow-inner">
                        <span class="flex items-center gap-1.5">
                          <span class="text-base">👑</span>
                          <span>【职业觉醒】主角达成 Lv.10！四大进阶职业首次免费 4 选 1 转职已开放！</span>
                        </span>
                        <button id="btn-goto-class-awakening" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all shrink-0 active:scale-95">
                          立即 4 选 1 转职 ✨
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}

                ${reward.newlyUnlockedSkills && reward.newlyUnlockedSkills.length > 0 ? `
                  <div class="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-between shadow-inner">
                    <span class="flex items-center gap-1.5">
                      <span class="text-base">✨</span>
                      <span>晋升习得新战技 (${reward.newlyUnlockedSkills.length}个)！</span>
                    </span>
                    <button id="btn-show-skill-unlock" class="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 shadow transition-all">
                      查看新技能
                    </button>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          ` : ''}

          <!-- 操作按钮组 -->
          <div class="flex items-center justify-center gap-3">
            <button id="btn-modal-retry" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
              🔄 再次挑战
            </button>
            <button id="btn-modal-back-stages" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
              🗺️ 关卡列表
            </button>
            ${nextStage ? `
              <button id="btn-modal-next-stage" class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20">
                ⚔️ 挑战下一关
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderDefeatModal(): string {
    return `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border-2 border-rose-900 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
          <div class="w-16 h-16 rounded-full bg-rose-950 border border-rose-800 mx-auto flex items-center justify-center text-3xl mb-3">
            💀
          </div>

          <h2 class="text-xl font-bold text-rose-400 tracking-wide mb-1">
            战役溃败 · 队伍阵亡
          </h2>
          <p class="text-xs text-slate-300 mb-4 leading-relaxed">
            敌人实力强劲！建议前往【基因培育台】合成高阶强力宠物，或提升等级、洗点优化职业技能卡组后再来挑战！
          </p>

          <div class="flex items-center justify-center gap-3">
            <button id="btn-modal-retry" class="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all">
              🔄 重新挑战
            </button>
            <button id="btn-modal-back-stages" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
              🗺️ 返回关卡列表
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderUnitCard(unit: BattleUnit, isActive: boolean, isSelectable: boolean, isAoeHighlight: boolean): string {
    const isPlayer = this.engine.isPlayerSide(unit);
    const hpPercent = Math.max(0, Math.min(100, Math.round((unit.currentHp / unit.maxHp) * 100)));
    const mpPercent = unit.maxMp > 0 ? Math.max(0, Math.min(100, Math.round((unit.currentMp / unit.maxMp) * 100))) : 0;
    const isSelected = this.selectedTargetId === unit.id;
    const elemBadge = this.getElementBadge(unit.element);

    return `
      <div 
        id="unit-card-${unit.id}"
        class="unit-card p-3 rounded-xl border transition-all relative select-none ${
          unit.isDead 
            ? 'opacity-40 bg-slate-950/60 border-slate-900 grayscale' 
            : isActive 
            ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/40 shadow-lg' 
            : isSelected
            ? 'border-rose-400 bg-rose-950/30 ring-2 ring-rose-400/60 shadow-lg'
            : isAoeHighlight
            ? 'border-purple-400/80 bg-purple-950/20 ring-1 ring-purple-400/40'
            : isSelectable 
            ? 'border-slate-700 bg-slate-900/90 hover:border-slate-500 cursor-pointer' 
            : 'border-slate-800/80 bg-slate-900/40'
        }"
        data-unit-id="${unit.id}"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${unit.avatar}</span>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold ${isPlayer ? 'text-white' : 'text-rose-200'}">${unit.name}</span>
                <span class="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">Lv.${unit.level}</span>
                ${elemBadge ? `
                  <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${elemBadge.bg} ${elemBadge.text} ${elemBadge.border} flex items-center gap-0.5 shadow-sm">
                    <span>${elemBadge.icon}</span>
                    <span>${elemBadge.label}</span>
                  </span>
                ` : ''}
              </div>
              <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                <span>攻 ${unit.atk}</span>
                <span>防 ${unit.def}</span>
                <span>速 ${unit.spd}</span>
                ${unit.shield && unit.shield > 0 ? `<span class="text-sky-300 font-bold">盾 ${unit.shield}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end">
            ${isActive ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold animate-pulse">行动中</span>' : ''}
            ${isSelected ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">目标</span>' : ''}
          </div>
        </div>

        <!-- 血条 -->
        <div class="space-y-1 mt-2">
          <div class="flex justify-between text-[10px] font-mono">
            <span class="text-slate-400">HP</span>
            <span class="${hpPercent < 25 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${unit.currentHp}/${unit.maxHp}</span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800 relative">
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-300" style="width: ${hpPercent}%"></div>
            ${unit.shield && unit.shield > 0 ? `
              <div class="absolute inset-0 bg-sky-400/40 border-r-2 border-sky-300" style="width: ${Math.min(100, Math.round((unit.shield / unit.maxHp) * 100))}%"></div>
            ` : ''}
          </div>

          <!-- 蓝条 (MP) - 仅玩家方角色/宠物展示，敌方怪物不展示 MP -->
          ${isPlayer ? `
            <div class="flex justify-between text-[10px] font-mono">
              <span class="text-slate-400">MP</span>
              <span class="text-sky-300">${unit.currentMp}/${unit.maxMp}</span>
            </div>
            <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div class="bg-gradient-to-r from-sky-600 to-sky-400 h-full transition-all duration-300" style="width: ${mpPercent}%"></div>
            </div>
          ` : ''}
        </div>

        <!-- 状态 Buff/Debuff 图标栏 -->
        ${unit.buffs && unit.buffs.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2 pt-1 border-t border-slate-800/60">
            ${unit.buffs.map(b => `
              <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700" title="${b.name}">
                ${b.name} (${b.remainingTurns}T)
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private spawnFloatingText(targetUnitId: string, text: string, type: 'DAMAGE' | 'CRIT' | 'STRONG' | 'WEAK' | 'HEAL' | 'COMMAND'): void {
    const cardEl = this.container.querySelector(`#unit-card-${targetUnitId}`);
    if (!cardEl) return;

    const el = document.createElement('div');
    el.className = `floating-number ${
      type === 'CRIT' ? 'crit' : 
      type === 'STRONG' ? 'strong' :
      type === 'WEAK' ? 'weak' :
      type === 'HEAL' ? 'heal' : 
      type === 'COMMAND' ? 'command' : 'damage'
    }`;
    el.textContent = text;

    // 随机微偏移，防止同次多段或多伤害数字完全重叠
    const offsetX = (Math.random() - 0.5) * 36;
    const offsetY = (Math.random() - 0.5) * 16;
    el.style.left = `calc(50% + ${offsetX.toFixed(1)}px)`;
    el.style.top = `calc(40% + ${offsetY.toFixed(1)}px)`;

    cardEl.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1100);
  }

  private playUnitAnimation(unitId: string, animClass: string): Promise<void> {
    return new Promise(resolve => {
      const cardEl = this.container.querySelector(`#unit-card-${unitId}`);
      if (!cardEl) {
        resolve();
        return;
      }
      cardEl.classList.add(animClass);
      setTimeout(() => {
        cardEl.classList.remove(animClass);
        resolve();
      }, 400);
    });
  }

  private triggerScreenShake(): void {
    const stageEl = this.container.querySelector('#battle-stage-area');
    if (!stageEl) return;
    stageEl.classList.add('screen-shake');
    setTimeout(() => {
      stageEl.classList.remove('screen-shake');
    }, 500);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private bindEvents(): void {
    // 返回关卡列表
    this.container.querySelector('#btn-back-to-stages')?.addEventListener('click', () => {
      if (this.onNavigateToStages) this.onNavigateToStages();
    });

    // 模态弹窗返回关卡列表
    this.container.querySelector('#btn-modal-back-stages')?.addEventListener('click', () => {
      if (this.onNavigateToStages) this.onNavigateToStages();
    });

    // 模态弹窗前往职业觉醒 (4选1)
    this.container.querySelector('#btn-goto-class-awakening')?.addEventListener('click', () => {
      if (this.onNavigateToClasses) {
        this.onNavigateToClasses();
      }
    });

    // 点击查看新技能习得弹窗
    this.container.querySelector('#btn-show-skill-unlock')?.addEventListener('click', () => {
      if (!this.victoryReward?.newlyUnlockedSkills) return;
      const skillsToDisplay = this.victoryReward.newlyUnlockedSkills
        .map(u => this.skillsMap.get(u.skillId))
        .filter(Boolean) as SkillConfig[];
      const charRep = this.victoryReward.levelUpReports.find(r => r.isCharacter);
      const unlockedLevel = charRep ? charRep.newLevel : (this.classManager?.characterLevel || 2);
      let newSlotUnlocked: number | undefined;
      if (unlockedLevel === 2) newSlotUnlocked = 2;
      else if (unlockedLevel === 5) newSlotUnlocked = 5;
      else if (unlockedLevel === 10) newSlotUnlocked = 10;

      const modal = new SkillUnlockModal({
        skills: skillsToDisplay,
        unlockedLevel,
        newSlotUnlocked,
        onClose: () => {},
        onGoToEquip: () => {
          const tabBtn = document.getElementById('tab-classes');
          if (tabBtn) tabBtn.click();
        }
      });
      modal.show();
    });

    // 模态弹窗破壳孵化宠物蛋
    this.container.querySelector('#btn-modal-hatch-egg')?.addEventListener('click', () => {
      if (this.victoryReward?.droppedEgg && this.playerState) {
        const egg = this.victoryReward.droppedEgg;
        const hatchResult = this.playerState.hatchEgg(egg.id, this.petConfigs);
        if (hatchResult) {
          this.victoryReward.droppedEgg = undefined;
          const modal = new EggHatchModal({
            egg: hatchResult.egg,
            pet: hatchResult.pet,
            onConfirm: () => {
              this.render();
            }
          });
          modal.show();
        }
      }
    });

    // 模态弹窗再次挑战
    this.container.querySelector('#btn-modal-retry')?.addEventListener('click', () => {
      if (this.currentStage) {
        this.render(this.currentStage);
      } else {
        this.render(this.currentMode);
      }
    });

    // 模态弹窗挑战下一关
    this.container.querySelector('#btn-modal-next-stage')?.addEventListener('click', () => {
      const nextStage = this.currentStage && this.stages
        ? this.stages[this.stages.findIndex(s => s.id === this.currentStage!.id) + 1]
        : null;
      if (nextStage) {
        this.render(nextStage);
      }
    });

    // 切换演练场景模式
    this.container.querySelector('#btn-mode-early')?.addEventListener('click', () => this.render('EARLY'));
    this.container.querySelector('#btn-mode-late')?.addEventListener('click', () => this.render('LATE'));

    // 选择技能
    this.container.querySelectorAll('.btn-select-skill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;
        this.selectedSkillId = skillId;
        this.syncTargetForCurrentSkill();
        this.updateDOM();
      });
    });

    // 点选战场目标
    this.container.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const unitId = (e.currentTarget as HTMLElement).dataset.unitId;
        if (!unitId) return;
        const targetUnit = this.engine.findUnitById(unitId);
        if (!targetUnit || targetUnit.isDead) return;

        const active = this.engine.activeUnit;
        const skill = this.selectedSkillId ? this.skillsMap.get(this.selectedSkillId) : undefined;
        if (!active || !skill) return;

        const validTargets = this.engine.getValidTargets(active, skill);
        if (validTargets.some(t => t.id === unitId)) {
          this.selectedTargetId = unitId;
          this.updateDOM();
        }
      });
    });

    // 执行战技行动
    this.container.querySelector('#btn-execute-action')?.addEventListener('click', async () => {
      if (this.isActionInProgress) return;
      const active = this.engine.activeUnit;
      if (!active || !this.selectedSkillId) return;

      const skill = this.skillsMap.get(this.selectedSkillId);
      if (!skill) return;

      const isAoe = skill.targetType === 'ALL_ENEMIES' || skill.targetType === 'ALL_ALLIES';
      const targetId = isAoe 
        ? (skill.targetType === 'ALL_ENEMIES' ? this.engine.enemyTeam.find(u => !u.isDead)?.id : this.engine.playerTeam.find(u => !u.isDead)?.id)
        : this.selectedTargetId;
      if (!targetId) return;

      this.isActionInProgress = true;
      this.updateDOM();

      // 1. 播放主动方突进/施法动作
      const isPlayer = this.engine.isPlayerSide(active);
      const animClass = skill.category === 'COMMAND' ? 'anim-cast' : isPlayer ? 'anim-dash-right' : 'anim-dash-left';
      await this.playUnitAnimation(active.id, animClass);

      // 2. 核心战斗逻辑结算
      const logCountBefore = this.engine.logs.length;
      this.engine.executeAction(active.id, skill.id, targetId);
      const actionLogs = this.engine.logs.slice(0, this.engine.logs.length - logCountBefore);

      // 3. 命中反馈与全员并发受创飘字
      const animPromises: Promise<void>[] = [];
      let anyCrit = false;

      actionLogs.forEach(log => {
        const hitUnit = this.engine.playerTeam.find(u => u.name === log.targetName) || 
                        this.engine.enemyTeam.find(u => u.name === log.targetName) ||
                        this.engine.findUnitById(targetId);
        if (!hitUnit) return;

        if (log.type === 'DAMAGE' && log.damage !== undefined) {
          const isStrong = log.elementalRelation === 'STRONG';
          const isWeak = log.elementalRelation === 'WEAK';
          if (log.isCrit) {
            anyCrit = true;
            this.spawnFloatingText(hitUnit.id, `💥 ${isStrong ? '克制暴击!' : ''}-${log.damage}!`, 'CRIT');
          } else if (isStrong) {
            anyCrit = true;
            this.spawnFloatingText(hitUnit.id, `⚡克制 -${log.damage}`, 'STRONG');
          } else if (isWeak) {
            this.spawnFloatingText(hitUnit.id, `🛡️劣势 -${log.damage}`, 'WEAK');
          } else {
            this.spawnFloatingText(hitUnit.id, `-${log.damage}`, 'DAMAGE');
          }
          animPromises.push(this.playUnitAnimation(hitUnit.id, 'anim-hit'));
        } else if (log.type === 'HEAL') {
          this.spawnFloatingText(hitUnit.id, '💚 回复', 'HEAL');
        } else if (log.type === 'COMMAND') {
          this.spawnFloatingText(hitUnit.id, `✨ ${skill.name}`, 'COMMAND');
        }
      });

      if (anyCrit) {
        this.triggerScreenShake();
      }

      if (animPromises.length > 0) {
        await Promise.all(animPromises);
      }

      this.updateDOM();

      // 4. 连续推进敌方 AI 回合
      await this.runEnemyTurnsSequence();

      // 5. 解锁并完成轮次同步
      this.isActionInProgress = false;
      this.syncTargetForCurrentSkill();
      this.updateDOM();
    });
  }

  private async runEnemyTurnsSequence(): Promise<void> {
    while (this.container.isConnected && this.engine.activeUnit && !this.engine.isPlayerSide(this.engine.activeUnit) && !this.engine.checkBattleOver()) {
      await this.sleep(350);
      const enemy = this.engine.activeUnit;

      // 怪物随机选择可用技能
      const availableSkills = enemy.skills
        .map(sId => this.skillsMap.get(sId))
        .filter((s): s is SkillConfig => {
          if (!s) return false;
          if (s.costMp && enemy.maxMp > 0 && enemy.currentMp < s.costMp) return false;
          return true;
        });

      const enemySkill = availableSkills.length > 0
        ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
        : (this.skillsMap.get('skill_basic_strike') || this.skillsMap.get(enemy.skills[0])!);

      if (!enemySkill) {
        enemy.actionDistance = 10000;
        this.engine.advanceToNextTurn();
        continue;
      }

      const enemyTargets = this.engine.getValidTargets(enemy, enemySkill);
      if (enemyTargets.length === 0) {
        enemy.actionDistance = 10000;
        this.engine.advanceToNextTurn();
        continue;
      }

      // 怪物随机攻击我方存活目标（优先受嘲讽锁定影响）
      const tauntedTarget = enemyTargets.find(t => t.buffs.some(b => b.effect.type === 'TAUNT'));
      const enemyTarget = tauntedTarget || enemyTargets[Math.floor(Math.random() * enemyTargets.length)];

      await this.playUnitAnimation(enemy.id, 'anim-dash-left');

      const enemyLogCountBefore = this.engine.logs.length;
      this.engine.executeAction(enemy.id, enemySkill.id, enemyTarget.id);
      const enemyActionLogs = this.engine.logs.slice(0, this.engine.logs.length - enemyLogCountBefore);

      const enemyAnimPromises: Promise<void>[] = [];
      let anyCritOrStrong = false;

      enemyActionLogs.forEach(log => {
        const hitUnit = this.engine.playerTeam.find(u => u.name === log.targetName) || 
                        this.engine.enemyTeam.find(u => u.name === log.targetName) ||
                        this.engine.findUnitById(enemyTarget.id);
        if (!hitUnit) return;

        if (log.type === 'DAMAGE' && log.damage !== undefined) {
          const isStrong = log.elementalRelation === 'STRONG';
          const isWeak = log.elementalRelation === 'WEAK';
          if (log.isCrit) {
            anyCritOrStrong = true;
            this.spawnFloatingText(hitUnit.id, `💥 ${isStrong ? '克制暴击!' : ''}-${log.damage}!`, 'CRIT');
          } else if (isStrong) {
            anyCritOrStrong = true;
            this.spawnFloatingText(hitUnit.id, `⚡克制 -${log.damage}`, 'STRONG');
          } else if (isWeak) {
            this.spawnFloatingText(hitUnit.id, `🛡️劣势 -${log.damage}`, 'WEAK');
          } else {
            this.spawnFloatingText(hitUnit.id, `-${log.damage}`, 'DAMAGE');
          }
          enemyAnimPromises.push(this.playUnitAnimation(hitUnit.id, 'anim-hit'));
        } else if (log.type === 'HEAL') {
          this.spawnFloatingText(hitUnit.id, '💚 回复', 'HEAL');
        } else if (log.type === 'COMMAND') {
          this.spawnFloatingText(hitUnit.id, `✨ ${enemySkill.name}`, 'COMMAND');
        }
      });

      if (anyCritOrStrong) {
        this.triggerScreenShake();
      }

      if (enemyAnimPromises.length > 0) {
        await Promise.all(enemyAnimPromises);
      }

      this.updateDOM();
    }
  }
}
