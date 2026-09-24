import { PetInstance, PetConfig, SkillConfig } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';
import { getPetGrowthRanges, getGrowthRating } from '../../core/pet/PetGrowthEngine.ts';
import { RACE_METADATA, TIER_METADATA, ELEMENT_METADATA } from './DexView.ts';

export interface PetDetailModalOptions {
  pet: PetInstance;
  petConfig?: PetConfig;
  skillsMap: Map<string, SkillConfig>;
  playerState?: PlayerState;
  isDeployed: boolean;
  onClose: () => void;
  onDeploy?: (petId: string) => void;
  onRecall?: (petId: string) => void;
  onGoToBreeding?: (pet: PetInstance) => void;
  onPetUpdated?: () => void;
}

export class PetDetailModal {
  private options: PetDetailModalOptions;
  private modalEl: HTMLElement | null = null;
  private selectedSlotIndex: number = 0; // 当前选中的替换/装配目标槽位 (0~3)

  constructor(options: PetDetailModalOptions) {
    this.options = options;

    // 默认选中第一个空槽位，若全满则默认选中槽位 0
    const equipped = this.getEquippedSkills();
    const firstEmpty = equipped.length < 4 ? equipped.length : 0;
    this.selectedSlotIndex = firstEmpty;
  }

  private getEquippedSkills(): string[] {
    const { pet, playerState } = this.options;
    if (playerState) {
      return playerState.getPetEquippedSkills(pet);
    }
    if (pet.equippedSkills && Array.isArray(pet.equippedSkills) && pet.equippedSkills.length > 0) {
      return pet.equippedSkills.slice(0, 4);
    }
    const defaults = pet.skills && pet.skills.length > 0 ? pet.skills.slice(0, 4) : ['skill_basic_strike', pet.innateSkillId];
    pet.equippedSkills = [...defaults];
    return pet.equippedSkills;
  }

  public show(): void {
    const existing = document.getElementById('pet-detail-modal-root');
    if (existing) existing.remove();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'pet-detail-modal-root';
    this.modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-all select-none animate-in fade-in duration-200';

    this.render();
    document.body.appendChild(this.modalEl);
  }

  public close(): void {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    this.options.onClose();
  }

  private render(): void {
    if (!this.modalEl) return;
    const { pet, petConfig, skillsMap, isDeployed, playerState } = this.options;

    const raceInfo = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;
    const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
    const elemInfo = ELEMENT_METADATA[pet.element] || ELEMENT_METADATA.FIRE;
    const avatar = petConfig?.avatar || '🐾';

    // 等级与升级所需经验计算
    const maxExp = PlayerState.getExpForNextLevel(pet.level);
    const expRemaining = Math.max(0, maxExp - pet.exp);
    const expPercent = Math.max(0, Math.min(100, Math.round((pet.exp / maxExp) * 100)));

    // 计算四维成长区间与评级
    const ranges = getPetGrowthRanges(pet.tier, pet.race);
    const RATING_METADATA: Record<'C' | 'B' | 'A' | 'S' | 'SS', { name: string; badgeClass: string; barColor: string }> = {
      SS: { name: 'SS极品', badgeClass: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black', barColor: 'from-amber-400 to-rose-500' },
      S: { name: 'S卓越', badgeClass: 'bg-purple-950 text-purple-200 border border-purple-600 font-bold', barColor: 'from-purple-400 to-pink-500' },
      A: { name: 'A优秀', badgeClass: 'bg-sky-950 text-sky-200 border border-sky-600 font-bold', barColor: 'from-sky-400 to-teal-400' },
      B: { name: 'B良好', badgeClass: 'bg-emerald-950 text-emerald-200 border border-emerald-600 font-bold', barColor: 'from-emerald-400 to-teal-400' },
      C: { name: 'C普通', badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700', barColor: 'from-slate-600 to-slate-500' }
    };

    const stats = [
      {
        key: 'hp',
        name: '生命 (HP)',
        icon: '❤️',
        current: pet.maxHp,
        growth: pet.growth.hpGrowth,
        range: ranges.hp,
        barColor: 'from-emerald-500 to-teal-400',
        textColor: 'text-emerald-400'
      },
      {
        key: 'atk',
        name: '攻击 (ATK)',
        icon: '⚔️',
        current: pet.atk,
        growth: pet.growth.atkGrowth,
        range: ranges.atk,
        barColor: 'from-amber-500 to-orange-400',
        textColor: 'text-amber-400'
      },
      {
        key: 'def',
        name: '防御 (DEF)',
        icon: '🛡️',
        current: pet.def,
        growth: pet.growth.defGrowth,
        range: ranges.def,
        barColor: 'from-sky-500 to-indigo-400',
        textColor: 'text-sky-400'
      },
      {
        key: 'spd',
        name: '速度 (SPD)',
        icon: '⚡',
        current: pet.spd,
        growth: pet.growth.spdGrowth,
        range: ranges.spd,
        barColor: 'from-purple-500 to-pink-400',
        textColor: 'text-purple-400'
      }
    ].map(s => {
      const isBreakthrough = s.growth > s.range.max;
      const displayMax = isBreakthrough ? s.growth : s.range.max;
      let rating = RATING_METADATA[getGrowthRating(s.growth, s.range)] || RATING_METADATA.B;
      if (isBreakthrough) {
        rating = {
          name: 'SS·突破',
          badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-black shadow-sm animate-pulse',
          barColor: 'from-amber-400 via-rose-500 to-purple-500'
        };
      }
      const span = displayMax - s.range.min;
      const percent = span > 0 ? Math.max(5, Math.min(100, Math.round(((s.growth - s.range.min) / span) * 100))) : 100;
      return { ...s, isBreakthrough, displayMax, rating, percent };
    });

    // 携带技能（上限4个）与已习得技能
    const equippedSkillIds = this.getEquippedSkills();
    const learnedSkillIds = Array.from(new Set(pet.skills || []));
    // 确保固有技能与普通攻击都在习得列表中
    if (!learnedSkillIds.includes('skill_basic_strike')) learnedSkillIds.unshift('skill_basic_strike');
    if (pet.innateSkillId && !learnedSkillIds.includes(pet.innateSkillId)) learnedSkillIds.push(pet.innateSkillId);

    const learnedSkills = learnedSkillIds
      .map(id => skillsMap.get(id))
      .filter((s): s is SkillConfig => !!s);

    this.modalEl.innerHTML = `
      <div class="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border ${tierMeta.cardBorder} shadow-2xl overflow-hidden font-sans">
        
        <!-- 模态框顶部：头像、基础信息、等级与经验 -->
        <div class="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <span class="text-4xl p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">${avatar}</span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-black text-white">${pet.name}</h3>
                <span class="text-[10px] px-2 py-0.5 rounded font-black ${tierMeta.badgeClass}">
                  ${tierMeta.fullName}
                </span>
                <span class="text-[10px] px-2 py-0.5 rounded font-bold ${
                  isDeployed ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                }">
                  ${isDeployed ? '⚔️ 出战中' : '📦 仓库中'}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs mt-1">
                <span class="px-2 py-0.5 rounded font-bold ${raceInfo.badgeClass}">
                  ${raceInfo.icon} ${raceInfo.name}
                </span>
                <span class="px-2 py-0.5 rounded font-mono font-bold border ${elemInfo.style}">
                  ${elemInfo.icon} ${elemInfo.name}
                </span>
              </div>
            </div>
          </div>

          <!-- 等级与经验值状态卡（具体展示离升级差多少经验） -->
          <div class="flex-1 min-w-[280px] max-w-md p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono font-black text-xs border border-amber-800">
                  Lv.${pet.level}
                </span>
                <span class="text-[11px] font-mono text-slate-300">
                  经验: <b class="text-white">${pet.exp}</b> / ${maxExp}
                </span>
              </div>

              <!-- 突出展示离升级具体差多少经验 -->
              <span class="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 shadow-sm animate-pulse">
                升至 Lv.${pet.level + 1} 还差: <b class="text-white font-black">${expRemaining}</b> EXP
              </span>
            </div>

            <!-- 经验条 -->
            <div class="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800/60 flex">
              <div class="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-300" style="width: ${expPercent}%"></div>
            </div>

            <!-- 快捷经验丹喂养与洗髓栏 (若行囊中有道具) -->
            ${(() => {
              const inv = playerState?.inventory || {};
              const pillS = inv['item_exp_pill_s'] || 0;
              const pillL = inv['item_exp_pill_l'] || 0;
              const washP = inv['item_wash_pill'] || 0;
              if (pillS <= 0 && pillL <= 0 && washP <= 0) return '';
              return `
                <div class="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-400 font-bold">🧪 快捷灵药:</span>
                    ${pillS > 0 ? `
                      <button id="btn-quick-feed-exp-s" class="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-800 text-emerald-300 border border-emerald-700 text-[10px] font-bold transition-all active:scale-95 shadow-sm" title="使用凝灵经验丹 (+500经验)">
                        +500 (${pillS})
                      </button>
                    ` : ''}
                    ${pillL > 0 ? `
                      <button id="btn-quick-feed-exp-l" class="px-2 py-0.5 rounded bg-amber-950/90 hover:bg-amber-800 text-amber-300 border border-amber-700 text-[10px] font-bold transition-all active:scale-95 shadow-sm" title="使用真元纯阳丹 (+2500经验)">
                        +2500 (${pillL})
                      </button>
                    ` : ''}
                  </div>
                  ${washP > 0 ? `
                    <button id="btn-quick-wash-growth" class="px-2 py-0.5 rounded bg-purple-950/90 hover:bg-purple-800 text-purple-300 border border-purple-700 text-[10px] font-bold transition-all active:scale-95 shadow-sm" title="重新摇点该宠物的种族成长区间资质">
                      🧬 洗髓资质 (${washP})
                    </button>
                  ` : ''}
                </div>
              `;
            })()}
          </div>

          <!-- 关闭按钮 -->
          <button id="btn-modal-close-x" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            ✕
          </button>
        </div>

        <!-- 左右主体内容区 (左右结构) -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar">
          
          <!-- ================= 左侧栏 (7列): 数值、成长区间、战斗特性、携带的技能 (只能带4个) ================= -->
          <div class="lg:col-span-7 flex flex-col gap-4">
            
            <!-- 1. 核心四维数值与成长区间 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>📊 核心数值与属性成长区间</span>
                </span>
                <span class="text-[10px] text-slate-400">基于【${tierMeta.shortName} · ${raceInfo.name}】基础区间</span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                ${stats.map(s => `
                  <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between shadow-sm">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <span>${s.icon}</span>
                        <span>${s.name}</span>
                      </span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${s.rating.badgeClass}">
                        ${s.rating.name}
                      </span>
                    </div>

                    <div class="flex items-baseline justify-between font-mono my-1">
                      <span class="text-base font-black text-white">${s.current}</span>
                      <span class="text-xs font-bold ${s.textColor}">成长: +${s.growth}/级</span>
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>成长区间:</span>
                      <span class="text-slate-300 font-semibold">
                        [${s.range.min} ~ ${s.displayMax}]
                        ${s.isBreakthrough ? `<span class="text-amber-400 font-bold ml-1">🌟突破(基准${s.range.max})</span>` : ''}
                      </span>
                    </div>

                    <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/50">
                      <div class="h-full bg-gradient-to-r ${s.barColor} rounded-full" style="width: ${s.percent}%"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 2. 战斗辅助属性与种族天生特性 -->
            <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex flex-col gap-2">
              <div class="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
                <span>暴击几率: <b class="text-rose-300">${Math.round(pet.critRate * 100)}%</b></span>
                <span>暴击倍率: <b class="text-amber-300">${Math.round(pet.critDmg * 100)}%</b></span>
              </div>
              <div class="pt-2 border-t border-slate-800/80 text-[11px] leading-relaxed">
                <span class="text-amber-400 font-bold">🧬 种族特性【${raceInfo.traitName}】:</span>
                <span class="text-slate-400">${raceInfo.traitDesc}</span>
              </div>
            </div>

            <!-- 3. 携带的技能 (只能带4个) -->
            <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-amber-300">⚔️ 携带技能 (只能带四个)</span>
                  <span class="text-[10px] px-2 py-0.2 rounded font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    ${equippedSkillIds.length} / 4 槽位
                  </span>
                </div>
                <span class="text-[10px] text-slate-400">点击槽位设为替换目标</span>
              </div>

              <!-- 4个技能槽位网格 -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                ${[0, 1, 2, 3].map(slotIdx => {
                  const sId = equippedSkillIds[slotIdx];
                  const s = sId ? skillsMap.get(sId) : null;
                  const isTarget = this.selectedSlotIndex === slotIdx;
                  const borderClass = isTarget
                    ? 'ring-2 ring-amber-400 border-amber-400/90 bg-amber-950/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60';

                  if (!s) {
                    return `
                      <div class="btn-slot-card cursor-pointer p-3 rounded-xl border-2 border-dashed ${borderClass} flex flex-col justify-center items-center text-center transition-all min-h-[82px]" data-slot-index="${slotIdx}">
                        <span class="text-xs font-bold ${isTarget ? 'text-amber-300' : 'text-slate-500'}">
                          + 空置槽位 ${slotIdx + 1}
                        </span>
                        <span class="text-[10px] text-slate-500 mt-1">
                          ${isTarget ? '👉 当前替换目标：从右侧点击装配' : '点击选中此槽位'}
                        </span>
                      </div>
                    `;
                  }

                  return `
                    <div class="btn-slot-card cursor-pointer p-2.5 rounded-xl border ${borderClass} flex flex-col justify-between transition-all min-h-[82px] group relative" data-slot-index="${slotIdx}">
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <div class="flex items-center gap-1.5">
                            <span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-300">
                              槽位 ${slotIdx + 1}
                            </span>
                            <span class="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                              ${s.name}
                            </span>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              (s.costMp ?? 0) > 0 ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }">
                              ${(s.costMp ?? 0) > 0 ? `${s.costMp} MP` : '0 MP'}
                            </span>
                            ${equippedSkillIds.length > 1 ? `
                              <button class="btn-unequip-slot text-[10px] px-1.5 py-0.2 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition-all active:scale-95" data-skill-id="${s.id}" title="卸下该技能">
                                卸下
                              </button>
                            ` : ''}
                          </div>
                        </div>
                        <div class="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                          ${s.desc}
                        </div>
                      </div>

                      <div class="mt-1 flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>${s.category === 'DAMAGE' ? '⚔️ 攻击伤害' : s.category === 'HEAL' ? '💚 生命恢复' : s.category === 'BUFF' ? '🛡️ 增益状态' : '🔮 战术辅助'}</span>
                        ${isTarget ? `<span class="text-amber-400 font-bold">🎯 待替换槽位</span>` : `<span class="group-hover:text-slate-300">点击选中</span>`}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- ================= 右侧栏 (5列): 已习得技能库 (可替换的技能) ================= -->
          <div class="lg:col-span-5 flex flex-col bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <div>
                <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📖 已习得技能 (可替换)</span>
                  <span class="text-xs font-mono text-amber-400">(${learnedSkills.length})</span>
                </h4>
                <p class="text-[10px] text-slate-400 mt-0.5">
                  点击装备或替换至左侧槽位 ${this.selectedSlotIndex + 1}
                </p>
              </div>
            </div>

            <!-- 候选技能列表 -->
            <div class="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[480px] custom-scrollbar">
              ${learnedSkills.map(s => {
                const equipSlotIdx = equippedSkillIds.indexOf(s.id);
                const isEquipped = equipSlotIdx !== -1;
                const canEquipNew = equippedSkillIds.length < 4;

                return `
                  <div class="p-3 rounded-xl transition-all flex flex-col justify-between gap-1.5 ${
                    isEquipped
                      ? 'bg-slate-900/90 border border-emerald-600/40 shadow-sm'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-bold ${isEquipped ? 'text-emerald-300' : 'text-white'}">
                          ${s.name}
                        </span>
                        ${s.id === pet.innateSkillId ? `
                          <span class="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            固有
                          </span>
                        ` : ''}
                        ${s.id === 'skill_basic_strike' ? `
                          <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            普攻
                          </span>
                        ` : ''}
                      </div>

                      <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        (s.costMp ?? 0) > 0 ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }">
                        ${(s.costMp ?? 0) > 0 ? `${s.costMp} MP` : '0 MP'}
                      </span>
                    </div>

                    <div class="text-[11px] text-slate-300 leading-relaxed">
                      ${s.desc}
                    </div>

                    <div class="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                      <span class="text-[9px] text-slate-500 font-mono">
                        ${s.category === 'DAMAGE' ? '⚔️ 伤害技' : s.category === 'HEAL' ? '💚 治疗技' : s.category === 'BUFF' ? '🛡️ 增益技' : '🔮 辅助技'}
                      </span>

                      <div>
                        ${isEquipped ? `
                          <div class="flex items-center gap-1.5">
                            <span class="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              ✓ 槽位 ${equipSlotIdx + 1} 携带中
                            </span>
                            ${equippedSkillIds.length > 1 ? `
                              <button class="btn-unequip-candidate px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-[10px] transition-all" data-skill-id="${s.id}">
                                卸下
                              </button>
                            ` : ''}
                          </div>
                        ` : `
                          <button class="btn-equip-candidate px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 ${
                            canEquipNew
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                          }" data-skill-id="${s.id}">
                            <span>${canEquipNew ? '⚡ 装备入槽' : `🔄 替换至槽位 ${this.selectedSlotIndex + 1}`}</span>
                          </button>
                        `}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- 底部指引说明 -->
            <div class="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-2">
              <span class="text-sm">💡</span>
              <div class="leading-relaxed">
                出战关卡获胜升级或通过基因融合，可领悟更多强力技能。在左侧选择槽位后点击右侧技能即可快速替换。
              </div>
            </div>
          </div>
        </div>

        <!-- 底部全局操作栏 -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <button id="btn-modal-close" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all">
            关闭
          </button>

          <div class="flex items-center gap-2">
            ${isDeployed ? `
              <button id="btn-modal-recall" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-bold transition-all">
                📥 卸下入库
              </button>
            ` : `
              <button id="btn-modal-deploy" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm">
                ⚔️ 派遣出战
              </button>
            `}

            ${isDeployed ? `
              <button disabled class="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/60 text-xs font-bold cursor-not-allowed flex items-center gap-1.5 opacity-60" title="出战中的灵宠不可作为融合素材，请先卸下入库">
                <span>⚔️ 出战中不可融合</span>
              </button>
            ` : `
              <button id="btn-modal-breed" class="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                <span>🧬 前往基因融合</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.modalEl) return;
    const { pet, playerState, onDeploy, onRecall, onGoToBreeding, onPetUpdated } = this.options;

    // 关闭弹窗
    this.modalEl.querySelector('#btn-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-modal-close-x')?.addEventListener('click', () => this.close());

    // 点击背景遮罩关闭
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // 派遣出战
    this.modalEl.querySelector('#btn-modal-deploy')?.addEventListener('click', () => {
      this.close();
      onDeploy?.(pet.instanceId);
    });

    // 卸下入库
    this.modalEl.querySelector('#btn-modal-recall')?.addEventListener('click', () => {
      this.close();
      onRecall?.(pet.instanceId);
    });

    // 前往融合
    this.modalEl.querySelector('#btn-modal-breed')?.addEventListener('click', () => {
      this.close();
      onGoToBreeding?.(pet);
    });

    // 快捷喂食小经验丹 (+500)
    this.modalEl.querySelector('#btn-quick-feed-exp-s')?.addEventListener('click', () => {
      if (playerState) {
        const res = playerState.useItem('item_exp_pill_s', pet.instanceId);
        if (res.success) {
          onPetUpdated?.();
          this.render();
        } else {
          alert(res.message);
        }
      }
    });

    // 快捷喂食大经验丹 (+2500)
    this.modalEl.querySelector('#btn-quick-feed-exp-l')?.addEventListener('click', () => {
      if (playerState) {
        const res = playerState.useItem('item_exp_pill_l', pet.instanceId);
        if (res.success) {
          onPetUpdated?.();
          this.render();
        } else {
          alert(res.message);
        }
      }
    });

    // 快捷洗髓资质重构
    this.modalEl.querySelector('#btn-quick-wash-growth')?.addEventListener('click', () => {
      if (playerState) {
        const res = playerState.useItem('item_wash_pill', pet.instanceId);
        if (res.success) {
          alert(res.message);
          onPetUpdated?.();
          this.render();
        } else {
          alert(res.message);
        }
      }
    });

    // 点击左侧槽位卡片：选中该槽位为待替换目标
    this.modalEl.querySelectorAll('.btn-slot-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const slotIdx = Number((e.currentTarget as HTMLElement).dataset.slotIndex);
        if (!isNaN(slotIdx) && slotIdx >= 0 && slotIdx < 4) {
          this.selectedSlotIndex = slotIdx;
          this.render();
        }
      });
    });

    // 卸下左侧槽位技能
    this.modalEl.querySelectorAll('.btn-unequip-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;

        if (playerState) {
          playerState.unequipPetSkill(pet.instanceId, skillId);
        } else if (pet.equippedSkills) {
          pet.equippedSkills = pet.equippedSkills.filter(s => s !== skillId);
        }

        onPetUpdated?.();
        this.render();
      });
    });

    // 卸下右侧候选列表中已携带的技能
    this.modalEl.querySelectorAll('.btn-unequip-candidate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;

        if (playerState) {
          playerState.unequipPetSkill(pet.instanceId, skillId);
        } else if (pet.equippedSkills) {
          pet.equippedSkills = pet.equippedSkills.filter(s => s !== skillId);
        }

        onPetUpdated?.();
        this.render();
      });
    });

    // 点击右侧候选技能：装配入当前槽位或替换
    this.modalEl.querySelectorAll('.btn-equip-candidate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;

        if (playerState) {
          playerState.equipPetSkill(pet.instanceId, skillId, this.selectedSlotIndex);
        } else {
          if (!pet.equippedSkills) pet.equippedSkills = [];
          if (this.selectedSlotIndex >= 0 && this.selectedSlotIndex < 4) {
            if (this.selectedSlotIndex < pet.equippedSkills.length) {
              pet.equippedSkills[this.selectedSlotIndex] = skillId;
            } else {
              pet.equippedSkills.push(skillId);
            }
          } else if (pet.equippedSkills.length < 4) {
            pet.equippedSkills.push(skillId);
          } else {
            pet.equippedSkills[3] = skillId;
          }
        }

        // 自动将焦点移动至下一个空槽位（如果有）
        const equipped = this.getEquippedSkills();
        if (equipped.length < 4) {
          this.selectedSlotIndex = equipped.length;
        }

        onPetUpdated?.();
        this.render();
      });
    });
  }
}
