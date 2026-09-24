import { SkillConfig } from '../../core/types.ts';

export interface SkillUnlockModalOptions {
  skills: SkillConfig[];
  unlockedLevel: number;
  newSlotUnlocked?: number; // e.g. 2, 5, 10
  onClose: () => void;
  onGoToEquip: () => void;
}

export class SkillUnlockModal {
  private container: HTMLElement | null = null;
  private options: SkillUnlockModalOptions;

  constructor(options: SkillUnlockModalOptions) {
    this.options = options;
  }

  public show(): void {
    // 移除已存在的弹窗
    const existing = document.getElementById('skill-unlock-modal-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'skill-unlock-modal-root';
    root.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300';

    const { skills, unlockedLevel, newSlotUnlocked } = this.options;

    root.innerHTML = `
      <div class="relative max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl shadow-amber-500/30 transform transition-all animate-bounce-short">
        <!-- 顶部装饰辉光 -->
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-500/30 rounded-full blur-2xl pointer-events-none"></div>

        <!-- 头部图标与标题 -->
        <div class="text-center relative">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 text-3xl shadow-lg shadow-amber-500/40 mb-3 animate-pulse">
            ✨
          </div>
          <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
            恭喜晋升 Lv.${unlockedLevel}！
          </h2>
          <p class="text-xs text-amber-300/80 font-medium mt-1">
            历练成长 · 觉醒习得全新战术技能
          </p>
        </div>

        ${newSlotUnlocked ? `
          <div class="mt-4 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center gap-2.5">
            <span class="text-lg">🔓</span>
            <div class="text-left text-xs">
              <span class="font-bold text-amber-300">新槽位解锁通知：</span>
              <span class="text-slate-300">自选技能槽位已正式开放！可立即前往装配新战技。</span>
            </div>
          </div>
        ` : ''}

        <!-- 习得技能列表卡片 -->
        <div class="my-5 space-y-3 max-h-72 overflow-y-auto pr-1">
          ${skills.map(skill => `
            <div class="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 relative overflow-hidden group shadow-inner">
              <div class="absolute top-0 right-0 px-2 py-0.5 bg-gradient-to-l from-amber-500/40 to-transparent text-[10px] text-amber-300 font-mono font-bold">
                NEW 技能
              </div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-xl">⚔️</span>
                  <span class="text-sm font-bold text-white">${skill.name}</span>
                </div>
                <span class="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                  ${skill.costMp || 0} MP
                </span>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  伤害战技
                </span>
                <span class="text-[10px] text-slate-400">
                  目标: ${skill.targetType === 'ALL_ENEMIES' ? '敌方全体' : '敌方单体'}
                </span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                ${skill.desc}
              </p>
            </div>
          `).join('')}
        </div>

        <!-- 底部操作按钮 -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button 
            id="btn-unlock-modal-close" 
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            继续冒险
          </button>
          <button 
            id="btn-unlock-modal-equip" 
            class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            <span>⚔️ 立即前往装配</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.container = root;

    // 绑定事件
    const closeBtn = root.querySelector('#btn-unlock-modal-close');
    const equipBtn = root.querySelector('#btn-unlock-modal-equip');

    closeBtn?.addEventListener('click', () => {
      this.close();
      this.options.onClose();
    });

    equipBtn?.addEventListener('click', () => {
      this.close();
      this.options.onGoToEquip();
    });
  }

  public close(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
