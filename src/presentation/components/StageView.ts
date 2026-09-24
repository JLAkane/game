import { StageConfig } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';

export class StageView {
  private container: HTMLElement;
  private stages: StageConfig[];
  private playerState: PlayerState;
  private onStartStage: (stage: StageConfig) => void;
  private activeChapter: number = 1;

  constructor(
    container: HTMLElement, 
    stages: StageConfig[], 
    playerState: PlayerState,
    onStartStage: (stage: StageConfig) => void
  ) {
    this.container = container;
    this.stages = stages;
    this.playerState = playerState;
    this.onStartStage = onStartStage;
  }

  public render(): void {
    const chapters = Array.from(new Set(this.stages.map(s => s.chapter))).sort((a, b) => a - b);
    
    // 若当前选中的关卡在其他章节，自动对齐章节
    if (this.playerState.selectedStageId) {
      const selected = this.stages.find(s => s.id === this.playerState.selectedStageId);
      if (selected && chapters.includes(selected.chapter)) {
        if (!chapters.includes(this.activeChapter)) {
          this.activeChapter = selected.chapter;
        }
      }
    }

    const currentChapterStages = this.stages.filter(s => s.chapter === this.activeChapter);
    const totalCleared = this.stages.filter(s => this.playerState.clearedStageIds.includes(s.id)).length;

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 顶部关卡与冒险概况面板 -->
        <div class="bg-game-card border border-game-border p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-3xl">🗺️</span>
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  <span>世界冒险征程</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    已通关 ${totalCleared} / ${this.stages.length}
                  </span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  通关副本获取丰厚金币与经验，提升主角与宠物等级，解锁职业与深渊战术！
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4 text-xs font-mono">
            <div class="px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span class="text-slate-400">💰 资产余额:</span>
              <span class="text-amber-400 font-bold ml-1">${this.playerState.gold} 金币</span>
            </div>
            <div class="px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span class="text-slate-400">⭐ 主角等级:</span>
              <span class="text-sky-300 font-bold ml-1">Lv.${this.playerState.characterLevel}</span>
              <span class="text-[10px] text-slate-400 ml-1">(${this.playerState.characterExp}/${PlayerState.getExpForNextLevel(this.playerState.characterLevel)})</span>
            </div>
          </div>
        </div>

        <!-- 章节切换导航 Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          ${chapters.map(chap => {
            const chapStage = this.stages.find(s => s.chapter === chap);
            const isActive = this.activeChapter === chap;
            const chapClearedCount = this.stages.filter(s => s.chapter === chap && this.playerState.clearedStageIds.includes(s.id)).length;
            const chapTotal = this.stages.filter(s => s.chapter === chap).length;

            return `
              <button 
                class="btn-chapter-tab px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }"
                data-chapter="${chap}"
              >
                <span>第${chap}章：${chapStage?.chapterName || '未知章节'}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded ${isActive ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-400'} font-mono">
                  ${chapClearedCount}/${chapTotal}
                </span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 当前章节关卡卡片列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${currentChapterStages.map((stage) => {
            const isUnlocked = this.playerState.isStageUnlocked(stage.id, this.stages);
            const isCleared = this.playerState.clearedStageIds.includes(stage.id);
            const isFirst = this.playerState.isFirstClear(stage.id);
            const isBoss = stage.name.includes('[领主]');

            return `
              <div 
                class="p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  !isUnlocked 
                    ? 'border-slate-800/50 bg-slate-900/20 opacity-60' 
                    : isBoss
                    ? 'border-rose-900/80 bg-rose-950/10 hover:border-rose-500/80 shadow-lg ring-1 ring-rose-500/20'
                    : isCleared
                    ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    : 'border-amber-500/60 bg-amber-950/10 hover:border-amber-400 ring-1 ring-amber-500/30'
                }"
              >
                <div>
                  <!-- 顶部信息 -->
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">${isBoss ? '👑' : isCleared ? '🏆' : isUnlocked ? '⚔️' : '🔒'}</span>
                      <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <span>${stage.name}</span>
                        ${isBoss ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 border border-rose-700 font-bold">CHAPTER BOSS</span>' : ''}
                      </h3>
                    </div>
                    
                    <div class="flex items-center gap-1.5 text-[10px] font-mono">
                      <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        推荐 Lv.${stage.recommendedLevel}
                      </span>
                      ${isCleared ? `
                        <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          ✓ 已通关
                        </span>
                      ` : isUnlocked ? `
                        <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold animate-pulse">
                          ● 当前可战
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                          未解锁
                        </span>
                      `}
                    </div>
                  </div>

                  <!-- 关卡战报与情报 -->
                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${stage.desc}</p>

                  <!-- 敌方阵容预览 -->
                  <div class="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3 flex items-center justify-between flex-wrap gap-2">
                    <span class="text-[11px] text-slate-400">敌方情报:</span>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${stage.enemies.map(e => {
                        const elemIcon = e.element === 'FIRE' ? '🔥' : e.element === 'WATER' ? '💧' : e.element === 'WOOD' ? '🌿' : e.element === 'THUNDER' ? '⚡' : e.element === 'LIGHT' ? '☀️' : e.element === 'DARK' ? '🌙' : '';
                        const elemColor = e.element === 'FIRE' ? 'text-rose-400 border-rose-900 bg-rose-950/40' : e.element === 'WATER' ? 'text-sky-400 border-sky-900 bg-sky-950/40' : e.element === 'WOOD' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/40' : e.element === 'THUNDER' ? 'text-amber-400 border-amber-900 bg-amber-950/40' : e.element === 'LIGHT' ? 'text-yellow-300 border-yellow-800 bg-yellow-950/40' : 'text-purple-400 border-purple-900 bg-purple-950/40';
                        return `
                          <div class="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded text-xs border border-slate-800">
                            <span>${e.avatar}</span>
                            <span class="text-slate-200 font-medium text-[11px]">${e.name.replace(/【首领】|【领主】/, '')}</span>
                            <span class="text-[10px] text-slate-400 font-mono">Lv.${e.level}</span>
                            ${elemIcon ? `<span class="text-[9px] px-1 py-0.2 rounded font-mono font-bold border ${elemColor}">${elemIcon}</span>` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- 通关战利品奖励 -->
                  <div class="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/90 text-xs font-mono mb-2 border border-slate-800">
                    <div class="flex flex-col">
                      <span class="text-[10px] text-slate-400">固定金币:</span>
                      <span class="text-amber-400 font-bold mt-0.5">💰 +${stage.rewards.gold}</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[10px] text-slate-400">通关经验:</span>
                      <span class="text-sky-300 font-bold mt-0.5">⭐ +${stage.rewards.exp} EXP</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[10px] text-slate-400">首通特惠:</span>
                      <span class="font-bold mt-0.5 ${isFirst ? 'text-emerald-400 font-bold' : 'text-slate-600 line-through'}">
                        ${isFirst ? `🎁 +${stage.rewards.firstClearGoldBonus}` : '已领取'}
                      </span>
                    </div>
                  </div>

                  <!-- 关卡宠物蛋掉落 -->
                  ${stage.rewards.eggDrop ? (() => {
                    const eggMeta = PlayerState.getEggMetadata(stage.rewards.eggDrop.tier);
                    const dropRate = Math.round(stage.rewards.eggDrop.rate * 100);
                    return `
                      <div class="p-2 rounded-lg bg-slate-950/70 border border-amber-500/20 mb-4 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <span class="text-base animate-pulse">🥚</span>
                          <span class="font-bold ${eggMeta.color}">${eggMeta.name}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${eggMeta.badgeClass}">
                            ${stage.rewards.eggDrop.tier === 4 ? '神话远古' : stage.rewards.eggDrop.tier === 3 ? '史诗真灵' : stage.rewards.eggDrop.tier === 2 ? '进阶血脉' : '普通血脉'}
                          </span>
                        </div>
                        <div class="text-[11px] font-mono text-slate-400">
                          掉率: <span class="text-amber-300 font-bold">${dropRate}%</span> ${stage.rewards.eggDrop.firstClearGuaranteed && isFirst ? '<span class="text-emerald-400 font-bold ml-1">(首通必掉!)</span>' : ''}
                        </div>
                      </div>
                    `;
                  })() : ''}
                </div>

                <!-- 出战按钮 -->
                <div>
                  <button 
                    class="btn-start-stage w-full py-2.5 text-xs rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      !isUnlocked 
                        ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800' 
                        : isBoss
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-950'
                        : isCleared
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950 font-bold'
                    }"
                    data-stage-id="${stage.id}"
                    ${!isUnlocked ? 'disabled' : ''}
                  >
                    ${!isUnlocked ? '🔒 需通关前一关解锁' : isCleared ? '⚔️ 再次挑战' : '⚔️ 集结出战！'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // 章节切换
    this.container.querySelectorAll('.btn-chapter-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chap = parseInt((e.currentTarget as HTMLElement).dataset.chapter || '1', 10);
        this.activeChapter = chap;
        this.render();
      });
    });

    // 挑战关卡
    this.container.querySelectorAll('.btn-start-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stageId = (e.currentTarget as HTMLElement).dataset.stageId;
        const stage = this.stages.find(s => s.id === stageId);
        if (stage && this.playerState.isStageUnlocked(stage.id, this.stages)) {
          this.playerState.setSelectedStageId(stage.id);
          this.onStartStage(stage);
        }
      });
    });
  }
}
