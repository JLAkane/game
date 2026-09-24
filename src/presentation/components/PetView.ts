import { PetInstance, PetConfig, SkillConfig } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';
import { EggHatchModal } from './EggHatchModal.ts';
import { PetDetailModal } from './PetDetailModal.ts';
import { RACE_METADATA, TIER_METADATA, ELEMENT_METADATA } from './DexView.ts';

export class PetView {
  private container: HTMLElement;
  private playerState: PlayerState;
  private petConfigs: Map<string, PetConfig>;
  private skillsMap: Map<string, SkillConfig>;
  private allPetConfigsList: PetConfig[];
  private onGoToBreeding: (preselectedPet?: PetInstance) => void;
  private onGoToStages: () => void;

  private selectedWarehouseRace: string = 'ALL';
  private selectedWarehouseTier: number | 'ALL' = 'ALL';

  constructor(
    container: HTMLElement,
    playerState: PlayerState,
    petConfigs: PetConfig[],
    skills: SkillConfig[],
    onGoToBreeding: (preselectedPet?: PetInstance) => void,
    onGoToStages: () => void
  ) {
    this.container = container;
    this.playerState = playerState;
    this.allPetConfigsList = petConfigs;
    this.petConfigs = new Map(petConfigs.map(p => [p.id, p]));
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
    this.onGoToBreeding = onGoToBreeding;
    this.onGoToStages = onGoToStages;
  }

  public render(): void {
    const teamPets = this.playerState.teamPets || [];
    const warehousePets = this.playerState.getWarehousePets();
    const petEggs = this.playerState.petEggs || [];

    // 过滤仓库宠物
    const filteredWarehousePets = warehousePets.filter(p => {
      const matchRace = this.selectedWarehouseRace === 'ALL' || p.race === this.selectedWarehouseRace;
      const matchTier = this.selectedWarehouseTier === 'ALL' || p.tier === this.selectedWarehouseTier;
      return matchRace && matchTier;
    });

    // 仓库宠物按稀有度从高到低排序
    filteredWarehousePets.sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier;
      return b.level - a.level;
    });

    const races = [
      { key: 'ALL', name: '全部种族', icon: '🌐' },
      { key: 'BEAST', name: RACE_METADATA.BEAST.name, icon: RACE_METADATA.BEAST.icon },
      { key: 'DRAGON', name: RACE_METADATA.DRAGON.name, icon: RACE_METADATA.DRAGON.icon },
      { key: 'ELEMENTAL', name: RACE_METADATA.ELEMENTAL.name, icon: RACE_METADATA.ELEMENTAL.icon },
      { key: 'UNDEAD', name: RACE_METADATA.UNDEAD.name, icon: RACE_METADATA.UNDEAD.icon },
      { key: 'MECHANIC', name: RACE_METADATA.MECHANIC.name, icon: RACE_METADATA.MECHANIC.icon }
    ];

    const tiers: Array<{ key: number | 'ALL'; name: string }> = [
      { key: 'ALL', name: '全部品阶' },
      { key: 4, name: '🌟 神话远古' },
      { key: 3, name: '💜 史诗真灵' },
      { key: 2, name: '🔷 进阶血脉' },
      { key: 1, name: '🌿 普通血脉' }
    ];

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 顶部总览横幅与培育入口 -->
        <div class="bg-game-card border border-game-border p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            <div class="flex items-center gap-3 mb-1">
              <span class="text-3xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">🐾</span>
              <div>
                <h2 class="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span>灵宠大厅与战队协同</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    战队 ${teamPets.length}/3 · 仓库 ${warehousePets.length} · 灵蛋 ${petEggs.length}
                  </span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  掌控出战阵容 · 管理备战仓库 · 破壳战利品灵蛋 · 进阶融合
                </p>
              </div>
            </div>
          </div>

          <!-- 4. 专属培育入口 (大按钮，点击跳转独立培育界面) -->
          <button id="btn-go-to-breeding" class="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-amber-600 to-rose-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 transition-all flex items-center gap-3 border border-amber-400/40 active:scale-95 group">
            <span class="text-2xl group-hover:scale-110 transition-transform">🧬</span>
            <div class="text-left">
              <div class="text-xs font-black tracking-wide text-amber-200">进入独立融合界面</div>
              <div class="text-sm font-black text-white">基因融合研究所 →</div>
            </div>
          </button>
        </div>

        <!-- 3. 出战战队阵容展示 (Active Battle Squad 1~3 只) -->
        <div class="bg-game-card border border-game-border p-5 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">⚔️</span>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>出战战队阵容</span>
                <span class="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  ${teamPets.length} / 3 位灵宠出战中
                </span>
              </h3>
            </div>
            <span class="text-xs text-slate-400">出战宠物将跟随主角进入关卡，提供高额伤害输出与战术奥义</span>
          </div>

          <!-- 3 个出战槽位网格 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${[0, 1, 2].map(slotIndex => {
              const pet = teamPets[slotIndex];
              const slotTitle = slotIndex === 0 ? '首发出战 · 核心主力' : slotIndex === 1 ? '先锋出战 · 战术协同' : '侧翼出战 · 支援火力';

              if (!pet) {
                return `
                  <div class="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all bg-slate-950/40 min-h-[220px]">
                    <div class="text-3xl text-slate-600 mb-2">➕</div>
                    <div class="text-xs font-bold text-slate-400 mb-1">【槽位 ${slotIndex + 1} 空缺】</div>
                    <div class="text-[11px] text-slate-500 mb-3">${slotTitle}</div>
                    ${warehousePets.length > 0 ? `
                      <a href="#warehouse-section" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition-all">
                        从下方仓库派遣灵宠
                      </a>
                    ` : `
                      <span class="text-[10px] text-slate-600">仓库暂无备战灵宠，可前往关卡获取灵蛋孵化</span>
                    `}
                  </div>
                `;
              }

              const raceInfo = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;
              const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
              const elemInfo = ELEMENT_METADATA[pet.element] || ELEMENT_METADATA.FIRE;
              const petAvatar = this.petConfigs.get(pet.configId)?.avatar || '🦎';
              const hpPercent = Math.max(0, Math.min(100, Math.round((pet.currentHp / pet.maxHp) * 100)));
              const equippedSkillIds = this.playerState.getPetEquippedSkills(pet);

              return `
                <div class="pet-card-clickable cursor-pointer bg-slate-950/80 border ${tierMeta.cardBorder} rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:ring-2 hover:ring-amber-400/50 hover:shadow-amber-500/10 transition-all" data-pet-id="${pet.instanceId}" data-is-deployed="true" title="点击查看【${pet.name}】的详细属性与成长值">
                  <div class="absolute top-2 right-2 flex items-center gap-1.5">
                    <span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-900 border border-slate-700 text-amber-400">
                      槽位 ${slotIndex + 1}
                    </span>
                    <span class="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-900/90 border border-slate-700 text-slate-400 group-hover:text-amber-300 transition-colors">
                      🔍 详情
                    </span>
                  </div>

                  <div>
                    <!-- 头部信息 -->
                    <div class="flex items-center gap-3 mb-2.5">
                      <span class="text-3xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">${petAvatar}</span>
                      <div>
                        <div class="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>${pet.name}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${tierMeta.badgeClass}">
                            ${tierMeta.shortName}
                          </span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span class="text-[10px] px-1 py-0.2 rounded font-bold ${raceInfo.badgeClass}">
                            ${raceInfo.icon} ${raceInfo.name}
                          </span>
                          <span class="text-[9px] px-1 py-0.2 rounded font-mono font-bold border ${elemInfo.style}">
                            ${elemInfo.icon} ${elemInfo.name}
                          </span>
                          <span class="text-[10px] font-mono text-amber-300 font-bold">Lv.${pet.level}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 生命条 -->
                    <div class="mb-2.5">
                      <div class="flex justify-between text-[10px] text-slate-400 mb-0.5 font-mono">
                        <span>当前生命值</span>
                        <span class="text-slate-200 font-bold">${pet.currentHp} / ${pet.maxHp}</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div class="h-full bg-emerald-500 rounded-full transition-all" style="width: ${hpPercent}%"></div>
                      </div>
                    </div>

                    <!-- 种族天生特性 -->
                    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 mb-2.5 text-[10px]">
                      <div class="font-bold text-slate-300 flex items-center gap-1 mb-0.5">
                        <span class="text-amber-400">🧬 特性:</span>
                        <span class="text-white">【${raceInfo.traitName}】</span>
                      </div>
                      <div class="text-slate-400 leading-tight">${raceInfo.traitDesc}</div>
                    </div>

                    <!-- 属性面板 -->
                    <div class="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] font-mono mb-2.5">
                      <div class="flex justify-between text-slate-300">
                        <span class="text-slate-400">攻击:</span>
                        <span class="text-amber-300 font-bold">${pet.atk} <span class="text-emerald-400 text-[9px]">(+${pet.growth.atkGrowth})</span></span>
                      </div>
                      <div class="flex justify-between text-slate-300">
                        <span class="text-slate-400">防御:</span>
                        <span class="text-sky-300 font-bold">${pet.def} <span class="text-emerald-400 text-[9px]">(+${pet.growth.defGrowth})</span></span>
                      </div>
                      <div class="flex justify-between text-slate-300">
                        <span class="text-slate-400">速度:</span>
                        <span class="text-purple-300 font-bold">${pet.spd} <span class="text-emerald-400 text-[9px]">(+${pet.growth.spdGrowth})</span></span>
                      </div>
                      <div class="flex justify-between text-slate-300">
                        <span class="text-slate-400">暴击:</span>
                        <span class="text-rose-300 font-bold">${Math.round(pet.critRate * 100)}%</span>
                      </div>
                    </div>

                    <!-- 携带战术技能 (上限4个) -->
                    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] mb-3">
                      <div class="text-amber-400 font-bold mb-1 flex items-center justify-between">
                        <span>⚔️ 携带技能 (${equippedSkillIds.length}/4):</span>
                        <span class="text-[9px] text-slate-500 font-normal">点击卡片可替换</span>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        ${equippedSkillIds.map(sid => {
                          const s = this.skillsMap.get(sid);
                          return `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[9px] font-medium">${s?.name || sid}</span>`;
                        }).join('')}
                      </div>
                    </div>
                  </div>

                  <!-- 操作栏：调换顺位、卸下归仓、送去培育 -->
                  <div class="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    ${slotIndex > 0 ? `
                      <button class="btn-swap-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" data-slot="${slotIndex}" title="前移一位">
                        ←
                      </button>
                    ` : ''}
                    ${slotIndex < teamPets.length - 1 ? `
                      <button class="btn-swap-right px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" data-slot="${slotIndex}" title="后移一位">
                        →
                      </button>
                    ` : ''}
                    
                    <button class="btn-recall-pet flex-1 py-1 rounded bg-slate-800/80 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-medium border border-slate-700 transition-all" data-pet-id="${pet.instanceId}" title="将灵宠卸下召回仓库">
                      📥 卸下入库
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 1. 获取的宠物蛋展示 (Acquired Pet Eggs) -->
        <div class="bg-game-card border border-game-border p-5 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xl animate-bounce">🥚</span>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>战利品灵蛋温室</span>
                <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  持有 ${petEggs.length} 枚灵蛋
                </span>
              </h3>
            </div>
            <span class="text-xs text-slate-400">关卡掉落不同品阶宠物蛋，越后期关卡品质越高，点击立即注入灵力破壳！</span>
          </div>

          ${petEggs.length === 0 ? `
            <div class="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-3">
              <span class="text-3xl">🧺</span>
              <p>暂无待孵化宠物蛋。前往【冒险关卡】挑战副本，通关必得/概率掉落各阶宠物蛋（最高可掉落神话远古蛋）！</p>
              <button id="btn-empty-goto-stages" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all">
                🗺️ 前往冒险关卡征战
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${petEggs.map(egg => {
                const meta = PlayerState.getEggMetadata(egg.tier);
                const tierName = egg.tier === 4 ? '神话远古' : egg.tier === 3 ? '史诗真灵' : egg.tier === 2 ? '进阶血脉' : '普通血脉';
                return `
                  <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between shadow-sm">
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-3xl animate-pulse">${egg.avatar}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded font-bold ${meta.badgeClass}">
                          ${tierName}
                        </span>
                      </div>
                      <div class="text-sm font-bold text-white mb-0.5">${egg.name}</div>
                      <div class="text-[10px] text-amber-400/90 mb-1.5 font-mono">来源: ${egg.sourceStageName}</div>
                      <div class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">${egg.desc}</div>
                    </div>
                    <button class="btn-hatch-egg w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5" data-egg-id="${egg.id}">
                      <span>🐣 注入灵力 破壳孵化</span>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 2. 灵宠仓库展示 (Warehouse Pets) -->
        <div id="warehouse-section" class="bg-game-card border border-game-border p-5 rounded-2xl shadow-sm space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">🏰</span>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>灵宠备战仓库</span>
                <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  共 ${warehousePets.length} 只在仓
                </span>
              </h3>
            </div>
          </div>

          <!-- 筛选栏 (按种族与按品阶) -->
          <div class="space-y-2">
            <!-- 种族筛选 -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs text-slate-400 font-bold mr-1">种族筛选:</span>
              ${races.map(r => {
                const isActive = this.selectedWarehouseRace === r.key;
                return `
                  <button class="btn-warehouse-race px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isActive 
                      ? 'bg-amber-500 text-slate-950 shadow' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }" data-race="${r.key}">
                    <span>${r.icon}</span>
                    <span>${r.name}</span>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- 品阶筛选 -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs text-slate-400 font-bold mr-1">品阶筛选:</span>
              ${tiers.map(t => {
                const isActive = this.selectedWarehouseTier === t.key;
                return `
                  <button class="btn-warehouse-tier px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-purple-600 text-white font-bold shadow' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }" data-tier="${t.key}">
                    ${t.name}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 仓库宠物网格 -->
          ${filteredWarehousePets.length === 0 ? `
            <div class="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
              ${warehousePets.length === 0 
                ? '仓内目前暂无备战灵宠。可通过上方破壳孵化灵蛋，或前往【冒险关卡】挑战副本掉落！'
                : '没有符合筛选条件的备战灵宠。可尝试切换种族或品阶筛选条件。'}
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${filteredWarehousePets.map(pet => {
                const raceInfo = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;
                const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
                const elemInfo = ELEMENT_METADATA[pet.element] || ELEMENT_METADATA.FIRE;
                const petAvatar = this.petConfigs.get(pet.configId)?.avatar || '🦎';
                const equippedSkillIds = this.playerState.getPetEquippedSkills(pet);

                return `
                  <div class="pet-card-clickable cursor-pointer bg-slate-950/80 border ${tierMeta.cardBorder} rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-amber-500/50 hover:ring-2 hover:ring-amber-400/40 transition-all group relative" data-pet-id="${pet.instanceId}" data-is-deployed="false" title="点击查看【${pet.name}】的详细属性与成长值">
                    <div class="absolute top-2.5 right-2.5">
                      <span class="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-900/90 border border-slate-800 text-slate-400 group-hover:text-amber-300 transition-colors">
                        🔍 详情
                      </span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2.5 mb-2">
                        <span class="text-3xl p-1 rounded-lg bg-slate-900 border border-slate-800">${petAvatar}</span>
                        <div>
                          <div class="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>${pet.name}</span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${tierMeta.badgeClass}">
                              ${tierMeta.shortName}
                            </span>
                          </div>
                          <div class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span class="text-[9px] px-1 py-0.2 rounded font-bold ${raceInfo.badgeClass}">
                              ${raceInfo.icon} ${raceInfo.name}
                            </span>
                            <span class="text-[9px] px-1 py-0.2 rounded font-mono font-bold border ${elemInfo.style}">
                              ${elemInfo.icon} ${elemInfo.name}
                            </span>
                            <span class="text-[10px] font-mono text-amber-300 font-bold">Lv.${pet.level}</span>
                          </div>
                        </div>
                      </div>

                      <!-- 种族特性摘要 -->
                      <div class="p-1.5 rounded bg-slate-900/90 border border-slate-800/80 mb-2 text-[10px]">
                        <span class="text-amber-400 font-bold">【${raceInfo.traitName}】</span>
                        <span class="text-slate-400 leading-tight">${raceInfo.traitDesc}</span>
                      </div>

                      <!-- 基础数值 -->
                      <div class="p-2 rounded bg-slate-900/70 border border-slate-800 text-[10px] space-y-0.5 font-mono mb-2">
                        <div class="flex justify-between text-slate-300">
                          <span>生命: <b class="text-white">${pet.maxHp}</b> <span class="text-emerald-400">(+${pet.growth.hpGrowth})</span></span>
                          <span>攻击: <b class="text-amber-300">${pet.atk}</b> <span class="text-emerald-400">(+${pet.growth.atkGrowth})</span></span>
                        </div>
                        <div class="flex justify-between text-slate-300">
                          <span>防御: <b class="text-sky-300">${pet.def}</b> <span class="text-emerald-400">(+${pet.growth.defGrowth})</span></span>
                          <span>速度: <b class="text-purple-300">${pet.spd}</b> <span class="text-emerald-400">(+${pet.growth.spdGrowth})</span></span>
                        </div>
                      </div>

                      <!-- 携带技能 -->
                      <div class="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] mb-3">
                        <div class="text-amber-400 font-bold mb-1 flex items-center justify-between">
                          <span>⚔️ 携带技能 (${equippedSkillIds.length}/4)</span>
                          <span class="text-[9px] text-slate-500 font-normal">点击替换</span>
                        </div>
                        <div class="flex flex-wrap gap-1">
                          ${equippedSkillIds.map(sid => {
                            const s = this.skillsMap.get(sid);
                            return `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[9px] font-medium">${s?.name || sid}</span>`;
                          }).join('')}
                        </div>
                      </div>
                    </div>

                    <!-- 操作栏：上阵出战 / 前往基因融合 -->
                    <div class="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button class="btn-deploy-pet flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95" data-pet-id="${pet.instanceId}">
                        <span>⚔️ 派遣出战</span>
                      </button>
                      <button class="btn-breed-pet px-2.5 py-1.5 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold text-xs border border-purple-600 transition-all flex items-center gap-1 active:scale-95" data-pet-id="${pet.instanceId}" title="前往基因融合研究所">
                        <span>🧬 融合</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // 4. 跳转培育界面
    this.container.querySelector('#btn-go-to-breeding')?.addEventListener('click', () => {
      this.onGoToBreeding();
    });

    // 空灵蛋时前往关卡
    this.container.querySelector('#btn-empty-goto-stages')?.addEventListener('click', () => {
      this.onGoToStages();
    });

    // 1. 破壳孵化宠物蛋
    this.container.querySelectorAll('.btn-hatch-egg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eggId = (e.currentTarget as HTMLElement).dataset.eggId;
        if (!eggId) return;
        const res = this.playerState.hatchEgg(eggId, this.allPetConfigsList);
        if (res) {
          const modal = new EggHatchModal({
            egg: res.egg,
            pet: res.pet,
            onConfirm: () => {
              this.render();
            }
          });
          modal.show();
        }
      });
    });

    // 出战队伍槽位左移
    this.container.querySelectorAll('.btn-swap-left').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = Number((e.currentTarget as HTMLElement).dataset.slot);
        if (slot > 0) {
          this.playerState.swapTeamPets(slot, slot - 1);
          this.render();
        }
      });
    });

    // 出战队伍槽位右移
    this.container.querySelectorAll('.btn-swap-right').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = Number((e.currentTarget as HTMLElement).dataset.slot);
        if (slot < this.playerState.teamPets.length - 1) {
          this.playerState.swapTeamPets(slot, slot + 1);
          this.render();
        }
      });
    });

    // 卸下出战入库
    this.container.querySelectorAll('.btn-recall-pet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const petId = (e.currentTarget as HTMLElement).dataset.petId;
        if (petId) {
          const ok = this.playerState.recallPetFromTeam(petId);
          if (ok) {
            this.render();
          }
        }
      });
    });

    // 从仓库派遣上阵
    this.container.querySelectorAll('.btn-deploy-pet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const petId = (e.currentTarget as HTMLElement).dataset.petId;
        if (petId) {
          this.playerState.deployPetToTeam(petId);
          this.render();
        }
      });
    });

    // 点击某宠物的培育按钮，直达培育界面并预选
    this.container.querySelectorAll('.btn-breed-pet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const petId = (e.currentTarget as HTMLElement).dataset.petId;
        const targetPet = this.playerState.ownedPets.find(p => p.instanceId === petId);
        this.onGoToBreeding(targetPet);
      });
    });

    // 点击宠物卡片弹窗查看具体属性、成长值与成长区间
    this.container.querySelectorAll('.pet-card-clickable').forEach(card => {
      card.addEventListener('click', (e) => {
        const petId = (e.currentTarget as HTMLElement).dataset.petId;
        const isDeployed = (e.currentTarget as HTMLElement).dataset.isDeployed === 'true';
        if (!petId) return;

        const pet = this.playerState.ownedPets.find(p => p.instanceId === petId);
        if (!pet) return;

        const petConfig = this.petConfigs.get(pet.configId);
        const modal = new PetDetailModal({
          pet,
          petConfig,
          skillsMap: this.skillsMap,
          playerState: this.playerState,
          isDeployed,
          onClose: () => {},
          onDeploy: (id) => {
            this.playerState.deployPetToTeam(id);
            this.render();
          },
          onRecall: (id) => {
            this.playerState.recallPetFromTeam(id);
            this.render();
          },
          onGoToBreeding: (targetPet) => {
            this.onGoToBreeding(targetPet);
          },
          onPetUpdated: () => {
            this.render();
          }
        });
        modal.show();
      });
    });

    // 仓库种族筛选
    this.container.querySelectorAll('.btn-warehouse-race').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const race = (e.currentTarget as HTMLElement).dataset.race;
        if (race) {
          this.selectedWarehouseRace = race;
          this.render();
        }
      });
    });

    // 仓库品阶筛选
    this.container.querySelectorAll('.btn-warehouse-tier').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tier = (e.currentTarget as HTMLElement).dataset.tier;
        if (tier) {
          this.selectedWarehouseTier = tier === 'ALL' ? 'ALL' : Number(tier);
          this.render();
        }
      });
    });
  }
}
