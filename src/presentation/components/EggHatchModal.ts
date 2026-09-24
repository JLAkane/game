import { PetEggItem, PetInstance } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';

export interface EggHatchModalOptions {
  egg: PetEggItem;
  pet: PetInstance;
  onConfirm: (pet: PetInstance) => void;
}

export class EggHatchModal {
  private egg: PetEggItem;
  private pet: PetInstance;
  private onConfirm: (pet: PetInstance) => void;
  private modalEl: HTMLElement | null = null;
  private isCracked: boolean = false;

  constructor(options: EggHatchModalOptions) {
    this.egg = options.egg;
    this.pet = options.pet;
    this.onConfirm = options.onConfirm;
  }

  public show(): void {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 select-none';
    
    this.renderInitialEgg();
    document.body.appendChild(this.modalEl);
  }

  private renderInitialEgg(): void {
    if (!this.modalEl) return;

    const meta = PlayerState.getEggMetadata(this.egg.tier);
    const glowColor = this.egg.tier === 4 
      ? 'shadow-amber-500/50 border-amber-400' 
      : this.egg.tier === 3 
      ? 'shadow-purple-500/50 border-purple-400' 
      : this.egg.tier === 2 
      ? 'shadow-sky-500/50 border-sky-400' 
      : 'shadow-emerald-500/40 border-emerald-400';

    this.modalEl.innerHTML = `
      <div class="bg-slate-900 border-2 ${glowColor} rounded-2xl max-w-md w-full p-8 shadow-2xl text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
        <!-- 顶部装饰光环 -->
        <div class="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${meta.badgeClass}">
          ✨ 获得神圣灵蛋 · 即将破壳
        </div>

        <h2 class="text-xl font-bold text-white mb-1">
          【${this.egg.name}】
        </h2>
        <p class="text-xs text-slate-400 mb-6">
          来自关卡【${this.egg.sourceStageName}】，蛋壳内传来强烈的心跳与元素共鸣！
        </p>

        <!-- 宠物蛋容器与晃动动画 -->
        <div id="egg-container" class="cursor-pointer group relative my-6 flex flex-col items-center justify-center">
          <div id="egg-visual" class="text-7xl transition-transform duration-300 transform group-hover:scale-110 group-active:scale-95 animate-bounce drop-shadow-[0_10px_20px_rgba(251,191,36,0.3)]">
            🥚
          </div>
          <div class="w-24 h-4 bg-slate-950/60 rounded-full blur-[2px] mt-2 group-hover:scale-110 transition-transform"></div>
          
          <div class="mt-4 text-xs font-bold text-amber-300/90 flex items-center gap-1.5 animate-pulse">
            <span>👆 点击灵蛋，注入灵力破壳！</span>
          </div>
        </div>

        <div class="mt-4">
          <button id="btn-start-crack" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98]">
            🔨 立即敲碎孵化！
          </button>
        </div>
      </div>
    `;

    const eggEl = this.modalEl.querySelector('#egg-container');
    const crackBtn = this.modalEl.querySelector('#btn-start-crack');

    eggEl?.addEventListener('click', () => this.triggerCracking());
    crackBtn?.addEventListener('click', () => this.triggerCracking());
  }

  private triggerCracking(): void {
    if (this.isCracked || !this.modalEl) return;
    this.isCracked = true;

    const eggVisual = this.modalEl.querySelector('#egg-visual') as HTMLElement;
    const btn = this.modalEl.querySelector('#btn-start-crack') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⚡ 蛋壳正在碎裂...';
    }

    if (eggVisual) {
      eggVisual.classList.remove('animate-bounce');
      eggVisual.animate([
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(-25deg) scale(1.15)' },
        { transform: 'rotate(25deg) scale(1.2)' },
        { transform: 'rotate(-20deg) scale(1.25)' },
        { transform: 'rotate(20deg) scale(1.3)' },
        { transform: 'rotate(0deg) scale(1.4)' }
      ], {
        duration: 800,
        easing: 'ease-in-out'
      });

      setTimeout(() => {
        eggVisual.textContent = '💥';
        setTimeout(() => {
          this.renderRevealedPet();
        }, 300);
      }, 750);
    } else {
      this.renderRevealedPet();
    }
  }

  private renderRevealedPet(): void {
    if (!this.modalEl) return;

    const pet = this.pet;
    const elemIcon = pet.element === 'FIRE' ? '🔥' : pet.element === 'WATER' ? '💧' : pet.element === 'WOOD' ? '🌿' : pet.element === 'THUNDER' ? '⚡' : pet.element === 'LIGHT' ? '☀️' : '🌙';
    const elemName = pet.element === 'FIRE' ? '火系' : pet.element === 'WATER' ? '水系' : pet.element === 'WOOD' ? '木系' : pet.element === 'THUNDER' ? '雷系' : pet.element === 'LIGHT' ? '光系' : '暗系';
    const elemColor = pet.element === 'FIRE' ? 'text-rose-400 bg-rose-950/40 border-rose-800' : pet.element === 'WATER' ? 'text-sky-400 bg-sky-950/40 border-sky-800' : pet.element === 'WOOD' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800' : pet.element === 'THUNDER' ? 'text-amber-400 bg-amber-950/40 border-amber-800' : pet.element === 'LIGHT' ? 'text-yellow-300 bg-yellow-950/40 border-yellow-800' : 'text-purple-400 bg-purple-950/40 border-purple-800';

    const tierBadge = pet.tier === 4
      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black'
      : pet.tier === 3
      ? 'bg-purple-900 text-purple-200 border border-purple-600 font-bold'
      : pet.tier === 2
      ? 'bg-sky-900 text-sky-200 border border-sky-600 font-bold'
      : 'bg-emerald-900 text-emerald-200 border border-emerald-600 font-bold';

    const tierTitle = pet.tier === 4 ? '神话远古' : pet.tier === 3 ? '史诗真灵' : pet.tier === 2 ? '进阶血脉' : '普通血脉';
    const raceName = pet.race === 'BEAST' ? '🐺 野兽系' : pet.race === 'DRAGON' ? '🐲 龙系' : pet.race === 'ELEMENTAL' ? '✨ 元素系' : pet.race === 'UNDEAD' ? '💀 不死系' : '⚙️ 机械系';

    this.modalEl.innerHTML = `
      <div class="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
        <!-- 绚烂背景光效 -->
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${tierBadge}">
          🎉 破壳成功！迎接入世灵宠！
        </div>

        <!-- 宠物立绘与光环 -->
        <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-sky-500/20 border-2 border-amber-400/80 mx-auto flex items-center justify-center text-5xl shadow-xl shadow-amber-500/20 mb-3 animate-pulse">
          ${pet.tier >= 3 ? '🐲' : pet.element === 'WOOD' ? '🌲' : pet.element === 'WATER' ? '🐉' : pet.element === 'LIGHT' ? '🦄' : '🦎'}
        </div>

        <h3 class="text-xl font-bold text-white flex items-center justify-center gap-2 mb-1">
          <span>${pet.name}</span>
          <span class="text-xs px-2 py-0.5 rounded font-bold border ${elemColor}">${elemIcon} ${elemName}</span>
        </h3>
        <p class="text-xs text-amber-300 font-bold mb-4 flex items-center justify-center gap-2">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/40">【${tierTitle}】</span>
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${raceName}</span>
          <span class="text-slate-400 font-mono">Lv.1 幼体</span>
        </p>

        <!-- 初始属性与资质 -->
        <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left mb-4 font-mono text-xs">
          <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
            <span>基础面板属性</span>
            <span class="text-amber-400">成长资质</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">生命值 (HP):</span>
              <span class="text-white font-bold">${pet.maxHp} <span class="text-emerald-400 text-[10px]">(+${pet.growth.hpGrowth}/级)</span></span>
            </div>
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">攻击力 (ATK):</span>
              <span class="text-amber-300 font-bold">${pet.atk} <span class="text-emerald-400 text-[10px]">(+${pet.growth.atkGrowth}/级)</span></span>
            </div>
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">防御力 (DEF):</span>
              <span class="text-sky-300 font-bold">${pet.def} <span class="text-emerald-400 text-[10px]">(+${pet.growth.defGrowth}/级)</span></span>
            </div>
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">速度 (SPD):</span>
              <span class="text-purple-300 font-bold">${pet.spd} <span class="text-emerald-400 text-[10px]">(+${pet.growth.spdGrowth}/级)</span></span>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-emerald-400 mb-5 flex items-center justify-center gap-1.5 font-bold">
          <span>✅ 灵宠已收录至您的背包，并已编入冒险主力队伍！</span>
        </div>

        <button id="btn-confirm-pet" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all">
          太棒了！收入囊中
        </button>
      </div>
    `;

    this.modalEl.querySelector('#btn-confirm-pet')?.addEventListener('click', () => {
      this.close();
      this.onConfirm(this.pet);
    });
  }

  public close(): void {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }
}
