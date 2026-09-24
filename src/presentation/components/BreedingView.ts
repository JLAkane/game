import { BreedingEngine, FusionPreview } from '../../core/breeding/BreedingEngine.ts';
import { PetInstance, PetConfig, SkillConfig } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';
import { TIER_METADATA, RACE_METADATA } from './DexView.ts';

export class BreedingView {
  private container: HTMLElement;
  private engine: BreedingEngine;
  private petConfigs: Map<string, PetConfig>;
  private skillsMap: Map<string, SkillConfig>;
  private playerState?: PlayerState;
  private onBack?: () => void;

  // 用户当前持有的宠物库
  public userPets: PetInstance[] = [];
  public selectedPetA: PetInstance | null = null;
  public selectedPetB: PetInstance | null = null;
  public activeSlot: 'A' | 'B' = 'A';
  private lockedSkillId: string | null = null;
  private lastFusionResult: string | null = null;

  constructor(
    container: HTMLElement,
    engine: BreedingEngine,
    petConfigs: PetConfig[],
    skills: SkillConfig[],
    playerState?: PlayerState,
    onBack?: () => void
  ) {
    this.container = container;
    this.engine = engine;
    this.petConfigs = new Map(petConfigs.map(p => [p.id, p]));
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
    this.playerState = playerState;
    this.onBack = onBack;

    this.initDefaultInventory();
  }

  public isPetDeployed(petId: string): boolean {
    return this.playerState ? this.playerState.teamPets.some(p => p.instanceId === petId) : false;
  }

  public setSelectedPet(pet: PetInstance): void {
    if (this.isPetDeployed(pet.instanceId)) return;
    this.selectedPetA = pet;
    this.selectedPetB = null;
    this.activeSlot = 'B';
  }

  public setSelectedParent(pet: PetInstance): void {
    this.setSelectedPet(pet);
  }

  private initDefaultInventory(): void {
    if (this.playerState && this.playerState.ownedPets) {
      this.userPets = [...this.playerState.ownedPets];
    } else {
      this.userPets = [];
    }

    // 默认选择非出战的仓库宠物进行融合
    const availablePets = this.userPets.filter(p => !this.isPetDeployed(p.instanceId));
    if (availablePets.length > 0) {
      this.selectedPetA = availablePets[0];
      this.selectedPetB = availablePets.length > 1 ? availablePets[1] : null;
      this.activeSlot = this.selectedPetB ? 'A' : 'B';
    } else {
      this.selectedPetA = null;
      this.selectedPetB = null;
      this.activeSlot = 'A';
    }
  }

  public render(): void {
    if (this.playerState && this.playerState.ownedPets) {
      this.userPets = [...this.playerState.ownedPets];
    }

    if (this.selectedPetA && (this.isPetDeployed(this.selectedPetA.instanceId) || !this.userPets.some(p => p.instanceId === this.selectedPetA!.instanceId))) {
      this.selectedPetA = null;
    }
    if (this.selectedPetB && (this.isPetDeployed(this.selectedPetB.instanceId) || !this.userPets.some(p => p.instanceId === this.selectedPetB!.instanceId))) {
      this.selectedPetB = null;
    }

    let preview: FusionPreview | null = null;
    if (this.selectedPetA && this.selectedPetB && this.selectedPetA.instanceId !== this.selectedPetB.instanceId) {
      preview = this.engine.previewFusion(this.selectedPetA, this.selectedPetB);
    }

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 头部机制解析横幅与返回入口 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex items-center gap-3">
            ${this.onBack ? `
              <button id="btn-back-to-pets" class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold transition-all flex items-center gap-1.5 border border-amber-500/40 shadow active:scale-95">
                <span>← 返回灵宠伙伴大厅</span>
              </button>
            ` : ''}
            <span class="text-2xl">🧬</span>
            <div>
              <h2 class="text-sm font-bold text-amber-400">基因融合研究所 (Gene Fusion Chamber)</h2>
              <p class="text-xs text-slate-400">双宠升阶基因融合 | 特殊公式突破觉醒 | 技能概率遗传与神技锁定</p>
            </div>
          </div>
        </div>

        <!-- 融合操作台核心区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：双宠融合选择槽 (点击槽 A 或 槽 B 激活装填) -->
          <div class="space-y-4">
            <!-- 融合灵宠一 (A) 槽位 -->
            <div 
              id="slot-container-a" 
              class="cursor-pointer transition-all rounded-2xl p-4 border ${
                this.activeSlot === 'A' 
                  ? 'bg-sky-950/40 border-sky-400 ring-2 ring-sky-500/50 shadow-lg shadow-sky-950/60' 
                  : 'bg-game-card border-game-border hover:border-slate-700'
              }"
              title="点击激活槽位 A (点击下方仓库灵宠将填充此槽位)"
            >
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-sky-400">🔹 融合槽位 A (灵宠一)</span>
                  ${this.activeSlot === 'A' ? `
                    <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-sky-500 text-slate-950 animate-pulse">
                      👈 正在选择
                    </span>
                  ` : `
                    <span class="text-[9px] text-slate-500 font-medium">点击激活</span>
                  `}
                </div>
                ${this.selectedPetA ? `
                  <button class="btn-clear-slot text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition-colors border border-slate-700" data-slot="A" title="清空槽位 A">
                    ✕ 卸下
                  </button>
                ` : ''}
              </div>
              ${this.selectedPetA ? this.renderSelectedSlot(this.selectedPetA, 'A') : `
                <div class="p-6 text-center text-xs rounded-xl border border-dashed ${
                  this.activeSlot === 'A' ? 'border-sky-500/60 bg-sky-950/30 text-sky-300 font-semibold' : 'border-slate-800 text-slate-500'
                } flex flex-col items-center justify-center gap-1.5 transition-all">
                  <span class="text-2xl">${this.activeSlot === 'A' ? '🎯' : '🐾'}</span>
                  <span>${this.activeSlot === 'A' ? '请点击下方仓库灵宠填充此槽位' : '点击激活槽位 A'}</span>
                </div>
              `}
            </div>

            <!-- 融合灵宠二 (B) 槽位 -->
            <div 
              id="slot-container-b" 
              class="cursor-pointer transition-all rounded-2xl p-4 border ${
                this.activeSlot === 'B' 
                  ? 'bg-rose-950/40 border-rose-400 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/60' 
                  : 'bg-game-card border-game-border hover:border-slate-700'
              }"
              title="点击激活槽位 B (点击下方仓库灵宠将填充此槽位)"
            >
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-rose-400">🔸 融合槽位 B (灵宠二)</span>
                  ${this.activeSlot === 'B' ? `
                    <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-500 text-slate-950 animate-pulse">
                      👈 正在选择
                    </span>
                  ` : `
                    <span class="text-[9px] text-slate-500 font-medium">点击激活</span>
                  `}
                </div>
                ${this.selectedPetB ? `
                  <button class="btn-clear-slot text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition-colors border border-slate-700" data-slot="B" title="清空槽位 B">
                    ✕ 卸下
                  </button>
                ` : ''}
              </div>
              ${this.selectedPetB ? this.renderSelectedSlot(this.selectedPetB, 'B') : `
                <div class="p-6 text-center text-xs rounded-xl border border-dashed ${
                  this.activeSlot === 'B' ? 'border-rose-500/60 bg-rose-950/30 text-rose-300 font-semibold' : 'border-slate-800 text-slate-500'
                } flex flex-col items-center justify-center gap-1.5 transition-all">
                  <span class="text-2xl">${this.activeSlot === 'B' ? '🎯' : '🐾'}</span>
                  <span>${this.activeSlot === 'B' ? '请点击下方仓库灵宠填充此槽位' : '点击激活槽位 B'}</span>
                </div>
              `}
            </div>
          </div>

          <!-- 中间：合成预测与基因稳定器 (明牌博弈) -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-xs font-bold text-amber-400">🔮 双宠融合概率透视与资质重塑</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">5% 良性突变几率</span>
              </div>

              ${preview ? `
                <div class="space-y-3">
                  <!-- 产出可能性列表 (至少3种以上，高阶突破<=10%) -->
                  <div class="space-y-1.5">
                    <div class="text-[11px] text-slate-300 flex items-center justify-between">
                      <span class="font-bold">产出形态可能性 (${preview.outcomes.length} 种)：</span>
                      <span class="text-[10px] text-amber-400 font-mono">进阶率 ≤ 10%</span>
                    </div>

                    <div class="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                      ${preview.outcomes.map(item => {
                        const tierBadge = item.targetTier === 4 ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black' :
                          item.targetTier === 3 ? 'bg-purple-900 text-purple-200 border border-purple-700' :
                          item.targetTier === 2 ? 'bg-sky-900 text-sky-200 border border-sky-700' : 'bg-emerald-900 text-emerald-200 border border-emerald-700';
                        const tierName = item.targetTier === 4 ? '神话' : item.targetTier === 3 ? '史诗' : item.targetTier === 2 ? '进阶' : '普通';
                        const pct = Math.round(item.probability * 100);

                        return `
                          <div class="p-2 rounded-lg bg-slate-900/90 border ${item.isAdvancement ? 'border-amber-500/80 bg-amber-950/20 shadow-sm' : 'border-slate-800'} flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                              <span class="text-2xl">${item.targetConfig.avatar}</span>
                              <div>
                                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>${item.targetConfig.name}</span>
                                  <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${tierBadge}">${tierName}血脉</span>
                                  ${item.isAdvancement ? `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black animate-pulse">🌟 突破</span>` : ''}
                                </div>
                                <div class="text-[10px] text-slate-400 line-clamp-1">${item.recipeDesc}</div>
                              </div>
                            </div>
                            <div class="text-right flex-shrink-0">
                              <span class="text-xs font-mono font-black ${item.isAdvancement ? 'text-amber-400' : 'text-sky-300'}">${pct}%</span>
                              <div class="text-[9px] text-slate-500 font-mono">概率</div>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- 资质重塑保底线信息 -->
                  <div class="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono">
                    <div class="flex items-center justify-between text-slate-400 mb-1">
                      <span class="text-emerald-400 font-bold">🌱 成长重塑保底（≥双亲均值）：</span>
                      <span class="text-slate-500">重新随机 Roll 点</span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-300">
                      <div>生命保底: <b class="text-white">≥${preview.guaranteedMinGrowth.hpGrowth}</b></div>
                      <div>攻击保底: <b class="text-amber-300">≥${preview.guaranteedMinGrowth.atkGrowth}</b></div>
                      <div>防御保底: <b class="text-sky-300">≥${preview.guaranteedMinGrowth.defGrowth}</b></div>
                      <div>速度保底: <b class="text-purple-300">≥${preview.guaranteedMinGrowth.spdGrowth}</b></div>
                    </div>
                  </div>

                  <!-- 技能继承池与锁定选择 -->
                  <div>
                    <div class="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                      <span>可继承技能候选池：</span>
                      <span class="text-purple-400 text-[10px]">可勾选 1 个锁定 100% 遗传</span>
                    </div>
                    <div class="space-y-1.5 max-h-[110px] overflow-y-auto">
                      ${preview.candidateSkills.length > 0 ? preview.candidateSkills.map(skill => {
                        const isLocked = this.lockedSkillId === skill.id;
                        return `
                          <div 
                            class="skill-lock-item p-1.5 rounded border transition-all flex items-center justify-between cursor-pointer ${
                              isLocked 
                                ? 'border-purple-500 bg-purple-950/60 glow-command' 
                                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                            }"
                            data-skill-id="${skill.id}"
                          >
                            <div class="flex items-center gap-2">
                              <input type="checkbox" ${isLocked ? 'checked' : ''} class="pointer-events-none accent-purple-500">
                              <div>
                                <div class="text-xs font-semibold text-slate-200">${skill.name}</div>
                                <div class="text-[10px] text-slate-400 line-clamp-1">${skill.desc}</div>
                              </div>
                            </div>
                            <span class="text-[10px] text-amber-400 font-bold whitespace-nowrap">
                              ${isLocked ? '🔒 100% 锁定' : `${Math.round(skill.inheritRate * 100)}% 概率`}
                            </span>
                          </div>
                        `;
                      }).join('') : '<div class="text-xs text-slate-500 py-1.5">融合双方暂无额外可继承技能</div>'}
                    </div>
                  </div>
                </div>
              ` : `
                <div class="py-12 text-center text-xs text-slate-500">
                  请在下方灵宠库中选定两只不同的灵宠放入融合槽位
                </div>
              `}
            </div>

            <!-- 合成确认按钮 -->
            <div class="pt-4 border-t border-game-border mt-4">
              <button 
                id="btn-execute-fusion"
                class="w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-lg ${
                  preview ? 'bg-gradient-to-r from-purple-600 via-amber-500 to-rose-500 text-slate-950 hover:brightness-110 glow-command' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }"
                ${!preview ? 'disabled' : ''}
              >
                🧬 确认执行双宠融合
              </button>
            </div>
          </div>

          <!-- 右侧：融合通知与近期成果 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">🎉 最近融合成果</span>
              <span class="text-[10px] text-slate-500">自动入库</span>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center p-4">
              ${this.lastFusionResult ? `
                <div class="space-y-2 animate-bounce">
                  <div class="text-4xl">✨🐣✨</div>
                  <div class="text-xs text-emerald-300 font-bold">${this.lastFusionResult}</div>
                </div>
              ` : `
                <div class="text-slate-600 text-xs">
                  <span class="text-3xl block mb-2 opacity-40">🧪</span>
                  执行双宠融合后，新灵宠将在此展示资质与继承技能
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- 底部：玩家灵宠库 (点击槽A或槽B，然后选择灵宠填充) -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-200">🎒 备战灵宠库 (${this.userPets.length} 只)</span>
              <span class="text-[10px] text-slate-400">点击上方槽位后，直接点击下方灵宠卡片即可填充进对应槽位</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2.5 py-1 rounded-lg font-bold ${
                this.activeSlot === 'A' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }">
                当前点击将填充进：【融合槽位 ${this.activeSlot}】
              </span>
            </div>
          </div>

          ${this.userPets.length === 0 ? `
            <div class="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-2">
              <span class="text-3xl">🐾</span>
              <p>当前灵宠库为空。请前往【冒险关卡】挑战副本掉落灵蛋并在【灵宠伙伴】大厅破壳孵化！</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              ${this.userPets.map(pet => {
                const isDeployed = this.isPetDeployed(pet.instanceId);
                const isA = this.selectedPetA?.instanceId === pet.instanceId;
                const isB = this.selectedPetB?.instanceId === pet.instanceId;
                const config = this.petConfigs.get(pet.configId);
                const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
                const raceMeta = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;

                return `
                  <div 
                    class="pet-fusion-card p-3 rounded-xl border transition-all ${
                      isDeployed ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed' :
                      (isA ? 'border-sky-500 ring-2 ring-sky-500/50 bg-sky-950/30 cursor-pointer shadow-md shadow-sky-950/50' : 
                      (isB ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-950/30 cursor-pointer shadow-md shadow-rose-950/50' : 
                      'border-slate-800 hover:border-amber-400 bg-slate-900/60 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group'))
                    }"
                    data-instance-id="${pet.instanceId}"
                    title="${isDeployed ? '出战中的灵宠不可作为融合素材' : (isA ? '点击可从槽位 A 卸下' : (isB ? '点击可从槽位 B 卸下' : `点击填充进槽位 ${this.activeSlot}`))}"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-2xl">${config?.avatar || '🐾'}</span>
                        <div>
                          <div class="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>${pet.name}</span>
                            ${isDeployed ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-950 text-emerald-300 border border-emerald-700">⚔️出战中</span>` : ''}
                            ${isA ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-black bg-sky-950 text-sky-300 border border-sky-700">🔹槽位 A</span>` : ''}
                            ${isB ? `<span class="text-[9px] px-1.5 py-0.2 rounded font-black bg-rose-950 text-rose-300 border border-rose-700">🔸槽位 B</span>` : ''}
                          </div>
                          <div class="flex items-center gap-1 mt-0.5">
                            <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${tierMeta.badgeClass}">${tierMeta.fullName}</span>
                            <span class="text-[9px] px-1 py-0.2 rounded font-bold ${raceMeta.badgeClass}">${raceMeta.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="text-[11px] space-y-0.5 text-slate-400 mb-2 font-mono">
                      <div class="flex justify-between"><span>HP成长: <b class="text-slate-300">${pet.growth.hpGrowth}</b></span><span>攻成长: <b class="text-amber-300">${pet.growth.atkGrowth}</b></span></div>
                      <div class="flex justify-between"><span>防成长: <b class="text-sky-300">${pet.growth.defGrowth}</b></span><span>速成长: <b class="text-purple-300">${pet.growth.spdGrowth}</b></span></div>
                    </div>

                    <!-- 携带技能 -->
                    <div class="flex flex-wrap gap-1 mb-2.5">
                      ${pet.skills.map(sId => {
                        const s = this.skillsMap.get(sId);
                        return `<span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">${s?.name || sId}</span>`;
                      }).join('')}
                      ${pet.traits.map(t => `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">${t}</span>`).join('')}
                    </div>

                    <!-- 槽位装填状态与提示栏 (已彻底删除设为灵宠A/B按钮) -->
                    <div class="pt-2 border-t border-slate-800/80">
                      ${isDeployed ? `
                        <div class="py-1 text-[10px] rounded font-semibold text-center bg-slate-950 text-slate-500 border border-slate-800/80">
                          ⚔️ 出战队伍锁定 (不可融合)
                        </div>
                      ` : (isA ? `
                        <div class="py-1 text-[10px] rounded font-bold text-center bg-sky-950 text-sky-300 border border-sky-800/80 flex items-center justify-center gap-1 group-hover:bg-rose-950 group-hover:text-rose-300 transition-colors">
                          <span>✓ 已填充槽位 A</span>
                          <span class="text-[9px] opacity-70 ml-1">(点击卸下)</span>
                        </div>
                      ` : (isB ? `
                        <div class="py-1 text-[10px] rounded font-bold text-center bg-rose-950 text-rose-300 border border-rose-800/80 flex items-center justify-center gap-1 group-hover:bg-rose-950 group-hover:text-rose-300 transition-colors">
                          <span>✓ 已填充槽位 B</span>
                          <span class="text-[9px] opacity-70 ml-1">(点击卸下)</span>
                        </div>
                      ` : `
                        <div class="py-1 text-[10px] rounded font-bold text-center bg-slate-800/80 text-slate-300 group-hover:${
                          this.activeSlot === 'A' ? 'bg-sky-600 text-white' : 'bg-rose-600 text-white'
                        } transition-all flex items-center justify-center gap-1 shadow-sm">
                          <span>⚡ 点击填充至【槽位 ${this.activeSlot}】</span>
                        </div>
                      `))}
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

  private renderSelectedSlot(pet: PetInstance, type: 'A' | 'B'): string {
    const config = this.petConfigs.get(pet.configId);
    const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
    const raceMeta = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;

    return `
      <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <span class="text-3xl">${config?.avatar || '🐾'}</span>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${type === 'A' ? 'bg-sky-950 text-sky-300 border border-sky-700' : 'bg-rose-950 text-rose-300 border border-rose-700'}">灵宠${type}</span>
              <span class="text-xs font-bold text-white">${pet.name}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${tierMeta.badgeClass}">
                ${tierMeta.fullName}
              </span>
              <span class="text-[9px] px-1 py-0.2 rounded font-bold ${raceMeta.badgeClass}">
                ${raceMeta.name}
              </span>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 flex gap-2 mt-0.5">
            <span>HP ${pet.maxHp}</span>
            <span>攻 ${pet.atk}</span>
            <span>防 ${pet.def}</span>
            <span>速 ${pet.spd}</span>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // 点击槽位 A 容器：激活槽位 A
    this.container.querySelector('#slot-container-a')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-clear-slot')) return;
      this.activeSlot = 'A';
      this.render();
    });

    // 点击槽位 B 容器：激活槽位 B
    this.container.querySelector('#slot-container-b')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-clear-slot')) return;
      this.activeSlot = 'B';
      this.render();
    });

    // 槽位卸下按钮
    this.container.querySelectorAll('.btn-clear-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = (e.currentTarget as HTMLElement).dataset.slot;
        if (slot === 'A') {
          this.selectedPetA = null;
          this.activeSlot = 'A';
        } else {
          this.selectedPetB = null;
          this.activeSlot = 'B';
        }
        this.lockedSkillId = null;
        this.render();
      });
    });

    // 点击下方仓库灵宠卡片，填充进当前激活的目标槽位 (槽A / 槽B)
    this.container.querySelectorAll('.pet-fusion-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.instanceId;
        if (!id || this.isPetDeployed(id)) return;
        const pet = this.userPets.find(p => p.instanceId === id);
        if (!pet) return;

        if (this.activeSlot === 'A') {
          if (this.selectedPetA?.instanceId === id) {
            // 重复点击已选中的槽位 A，卸下槽位 A
            this.selectedPetA = null;
          } else {
            // 如果该宠物此前已在槽位 B，将其从槽位 B 移出
            if (this.selectedPetB?.instanceId === id) {
              this.selectedPetB = null;
            }
            this.selectedPetA = pet;
            // 若槽位 B 为空，自动切换到槽位 B 方便继续选择
            if (!this.selectedPetB) {
              this.activeSlot = 'B';
            }
          }
        } else {
          // activeSlot === 'B'
          if (this.selectedPetB?.instanceId === id) {
            // 重复点击已选中的槽位 B，卸下槽位 B
            this.selectedPetB = null;
          } else {
            // 如果该宠物此前已在槽位 A，将其从槽位 A 移出
            if (this.selectedPetA?.instanceId === id) {
              this.selectedPetA = null;
            }
            this.selectedPetB = pet;
            // 若槽位 A 为空，自动切换到槽位 A
            if (!this.selectedPetA) {
              this.activeSlot = 'A';
            }
          }
        }

        this.lockedSkillId = null;
        this.render();
      });
    });

    // 锁定神技点击
    this.container.querySelectorAll('.skill-lock-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (skillId) {
          this.lockedSkillId = this.lockedSkillId === skillId ? null : skillId;
          this.render();
        }
      });
    });

    // 返回灵宠大厅
    this.container.querySelector('#btn-back-to-pets')?.addEventListener('click', () => {
      this.onBack?.();
    });

    // 执行合成
    this.container.querySelector('#btn-execute-fusion')?.addEventListener('click', () => {
      if (!this.selectedPetA || !this.selectedPetB) return;
      if (this.isPetDeployed(this.selectedPetA.instanceId) || this.isPetDeployed(this.selectedPetB.instanceId)) {
        this.lastFusionResult = '❌ 出战中的灵宠不可作为融合素材！请先在【灵宠伙伴】大厅中将其卸下入库。';
        this.render();
        return;
      }
      const petAName = this.selectedPetA.name;
      const petBName = this.selectedPetB.name;
      const petAId = this.selectedPetA.instanceId;
      const petBId = this.selectedPetB.instanceId;

      const res = this.engine.executeFusion(this.selectedPetA, this.selectedPetB, this.lockedSkillId || undefined);

      if (this.playerState) {
        // 双亲原宠物消失，新灵宠入库
        this.playerState.completeFusion(petAId, petBId, res.child);
        this.userPets = [...this.playerState.ownedPets];
      } else {
        const idsToRemove = new Set([petAId, petBId]);
        this.userPets = this.userPets.filter(p => !idsToRemove.has(p.instanceId));
        this.userPets.unshift(res.child);
      }

      const advNotice = res.pickedOutcome.isAdvancement ? '🌟【触发 10% 稀有突破进阶!】' : '';
      const growthSummary = `(HP+${res.child.growth.hpGrowth}, 攻+${res.child.growth.atkGrowth}, 防+${res.child.growth.defGrowth}, 速+${res.child.growth.spdGrowth})`;
      this.lastFusionResult = `成功融合诞育：【${res.child.name}】！原灵宠【${petAName}】与【${petBName}】已化为灵蕴消散。${advNotice} ${res.isMutation ? `良性突变【${res.mutationTrait}】!` : ''} 重塑资质：${growthSummary}，继承技能 ${res.inheritedSkillIds.length} 项！`;

      // 自动选定新宠物作为槽位 A，激活槽位 B，方便继续融合
      this.selectedPetA = res.child;
      this.selectedPetB = null;
      this.activeSlot = 'B';
      this.lockedSkillId = null;
      this.render();
    });
  }
}
