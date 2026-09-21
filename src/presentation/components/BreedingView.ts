import { BreedingEngine, FusionPreview } from '../../core/breeding/BreedingEngine.ts';
import { PetInstance, PetConfig, SkillConfig } from '../../core/types.ts';

export class BreedingView {
  private container: HTMLElement;
  private engine: BreedingEngine;
  private petConfigs: Map<string, PetConfig>;
  private skillsMap: Map<string, SkillConfig>;

  // 用户当前持有的宠物库
  public userPets: PetInstance[] = [];
  private selectedParentA: PetInstance | null = null;
  private selectedParentB: PetInstance | null = null;
  private lockedSkillId: string | null = null;
  private lastFusionResult: string | null = null;

  constructor(
    container: HTMLElement,
    engine: BreedingEngine,
    petConfigs: PetConfig[],
    skills: SkillConfig[]
  ) {
    this.container = container;
    this.engine = engine;
    this.petConfigs = new Map(petConfigs.map(p => [p.id, p]));
    this.skillsMap = new Map(skills.map(s => [s.id, s]));

    this.initDefaultInventory();
  }

  private initDefaultInventory(): void {
    const lizardConfig = this.petConfigs.get('pet_fire_lizard')!;
    const turtleConfig = this.petConfigs.get('pet_rock_turtle')!;
    const falconConfig = this.petConfigs.get('pet_storm_falcon')!;
    const ghostConfig = this.petConfigs.get('pet_spectral_wisp')!;
    const houndConfig = this.petConfigs.get('pet_bone_hound')!;

    this.userPets = [
      {
        instanceId: 'pet_inv_1',
        configId: lizardConfig.id,
        name: '火尾蜥 (A)',
        level: 10,
        exp: 0,
        tier: 1,
        race: lizardConfig.race,
        element: lizardConfig.element,
        currentHp: 200,
        maxHp: 200,
        atk: 38,
        def: 18,
        spd: 95,
        critRate: 0.1,
        critDmg: 1.5,
        growth: lizardConfig.growth,
        innateSkillId: lizardConfig.innateSkillId,
        skills: [lizardConfig.innateSkillId, 'skill_flame_burst'], // 带稀有技能【烈焰暴击】
        traits: [],
        generation: 1
      },
      {
        instanceId: 'pet_inv_2',
        configId: turtleConfig.id,
        name: '岩壳龟 (B)',
        level: 10,
        exp: 0,
        tier: 1,
        race: turtleConfig.race,
        element: turtleConfig.element,
        currentHp: 320,
        maxHp: 320,
        atk: 22,
        def: 42,
        spd: 60,
        critRate: 0.05,
        critDmg: 1.5,
        growth: turtleConfig.growth,
        innateSkillId: turtleConfig.innateSkillId,
        skills: [turtleConfig.innateSkillId],
        traits: [],
        generation: 1
      },
      {
        instanceId: 'pet_inv_3',
        configId: falconConfig.id,
        name: '暴风隼 (C)',
        level: 12,
        exp: 0,
        tier: 1,
        race: falconConfig.race,
        element: falconConfig.element,
        currentHp: 180,
        maxHp: 180,
        atk: 45,
        def: 15,
        spd: 130,
        critRate: 0.15,
        critDmg: 1.6,
        growth: falconConfig.growth,
        innateSkillId: falconConfig.innateSkillId,
        skills: [falconConfig.innateSkillId],
        traits: [],
        generation: 1
      },
      {
        instanceId: 'pet_inv_4',
        configId: ghostConfig.id,
        name: '冰霜幽魂 (D)',
        level: 11,
        exp: 0,
        tier: 1,
        race: ghostConfig.race,
        element: ghostConfig.element,
        currentHp: 190,
        maxHp: 190,
        atk: 48,
        def: 18,
        spd: 92,
        critRate: 0.1,
        critDmg: 1.5,
        growth: ghostConfig.growth,
        innateSkillId: ghostConfig.innateSkillId,
        skills: [ghostConfig.innateSkillId],
        traits: [],
        generation: 1
      },
      {
        instanceId: 'pet_inv_5',
        configId: houndConfig.id,
        name: '骸骨恶犬 (E)',
        level: 10,
        exp: 0,
        tier: 1,
        race: houndConfig.race,
        element: houndConfig.element,
        currentHp: 220,
        maxHp: 220,
        atk: 42,
        def: 20,
        spd: 108,
        critRate: 0.1,
        critDmg: 1.5,
        growth: houndConfig.growth,
        innateSkillId: houndConfig.innateSkillId,
        skills: [houndConfig.innateSkillId],
        traits: [],
        generation: 1
      }
    ];

    // 默认选中前两只
    this.selectedParentA = this.userPets[0];
    this.selectedParentB = this.userPets[1];
  }

  public render(): void {
    let preview: FusionPreview | null = null;
    if (this.selectedParentA && this.selectedParentB && this.selectedParentA.instanceId !== this.selectedParentB.instanceId) {
      preview = this.engine.previewFusion(this.selectedParentA, this.selectedParentB);
    }

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 头部机制解析横幅 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🧬</span>
            <div>
              <h2 class="text-sm font-bold text-amber-400">基因融合研究所 (Gene Fusion Chamber)</h2>
              <p class="text-xs text-slate-400">低阶宠物跨代升阶培育 | 特殊配方突破 | 技能概率遗传与神技锁定</p>
            </div>
          </div>
          <button id="btn-add-starter-pet" class="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
            ➕ 领取基础幼体胚胎
          </button>
        </div>

        <!-- 融合操作台核心区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：父系与母系选择槽 -->
          <div class="space-y-4">
            <!-- 父本 A 槽位 -->
            <div class="bg-game-card border border-game-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-sky-400">🔹 父系母体 A</span>
                ${this.selectedParentA ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">${this.selectedParentA.name}</span>` : ''}
              </div>
              ${this.selectedParentA ? this.renderSelectedSlot(this.selectedParentA, 'A') : '<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">从下方仓库选择</div>'}
            </div>

            <!-- 母本 B 槽位 -->
            <div class="bg-game-card border border-game-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-rose-400">🔸 父系母体 B</span>
                ${this.selectedParentB ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">${this.selectedParentB.name}</span>` : ''}
              </div>
              ${this.selectedParentB ? this.renderSelectedSlot(this.selectedParentB, 'B') : '<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">从下方仓库选择</div>'}
            </div>
          </div>

          <!-- 中间：合成预测与基因稳定器 (明牌博弈) -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-xs font-bold text-amber-400">🔮 基因合成预览与概率透视</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">5% 良性突变几率</span>
              </div>

              ${preview ? `
                <div class="space-y-3">
                  <!-- 产出物种形态 -->
                  <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <span class="text-4xl p-2 rounded-xl bg-slate-800/80">${preview.targetConfig.avatar}</span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-white">${preview.targetConfig.name}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${preview.targetTier >= 3 ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}">
                          T${preview.targetTier} ${preview.targetTier === 3 ? '史诗巨兽' : (preview.targetTier === 2 ? '稀有物种' : '普通')}
                        </span>
                      </div>
                      <p class="text-[11px] text-amber-300 mt-0.5 font-medium">✨ ${preview.recipeDesc}</p>
                    </div>
                  </div>

                  <!-- 技能继承池与锁定选择 -->
                  <div>
                    <div class="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
                      <span>可继承技能候选池：</span>
                      <span class="text-purple-400 text-[10px]">可勾选 1 个锁定 100% 遗传</span>
                    </div>
                    <div class="space-y-1.5 max-h-[140px] overflow-y-auto">
                      ${preview.candidateSkills.length > 0 ? preview.candidateSkills.map(skill => {
                        const isLocked = this.lockedSkillId === skill.id;
                        return `
                          <div 
                            class="skill-lock-item p-2 rounded border transition-all flex items-center justify-between cursor-pointer ${
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
                                <div class="text-[10px] text-slate-400">${skill.desc}</div>
                              </div>
                            </div>
                            <span class="text-[10px] text-amber-400 font-bold whitespace-nowrap">
                              ${isLocked ? '🔒 100% 锁定' : `${Math.round(skill.inheritRate * 100)}% 概率`}
                            </span>
                          </div>
                        `;
                      }).join('') : '<div class="text-xs text-slate-500 py-2">父母双方暂无额外可继承技能</div>'}
                    </div>
                  </div>
                </div>
              ` : `
                <div class="py-12 text-center text-xs text-slate-500">
                  请在左右两侧放入两只不同的宠物进行基因配对
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
                🧬 确认融合并觉醒子代
              </button>
            </div>
          </div>

          <!-- 右侧：融合通知与近期成果 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">🎉 最近孵化成果</span>
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
                  执行融合后，子代将在此完成初生鉴定与资质展示
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- 底部：玩家宠物仓库 (点击直接装填进 A 或 B) -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-200">🎒 我的宠物库 (${this.userPets.length} 只)</span>
            <span class="text-[10px] text-slate-400">点击【设为父A】或【设为母B】进行基因配种</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            ${this.userPets.map(pet => {
              const isA = this.selectedParentA?.instanceId === pet.instanceId;
              const isB = this.selectedParentB?.instanceId === pet.instanceId;
              const config = this.petConfigs.get(pet.configId);
              return `
                <div class="p-3 rounded-xl border bg-slate-900/60 transition-all ${
                  isA ? 'border-sky-500 ring-1 ring-sky-500/50' : 
                  (isB ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-800 hover:border-slate-700')
                }">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">${config?.avatar || '🐾'}</span>
                      <div>
                        <div class="text-xs font-bold text-white">${pet.name}</div>
                        <span class="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400">T${pet.tier} | ${pet.generation}代</span>
                      </div>
                    </div>
                  </div>

                  <div class="text-[11px] space-y-0.5 text-slate-400 mb-2">
                    <div class="flex justify-between"><span>HP成长: ${pet.growth.hpGrowth}</span><span>攻成长: ${pet.growth.atkGrowth}</span></div>
                    <div class="flex justify-between"><span>防成长: ${pet.growth.defGrowth}</span><span>速成长: ${pet.growth.spdGrowth}</span></div>
                  </div>

                  <!-- 携带技能 -->
                  <div class="flex flex-wrap gap-1 mb-2">
                    ${pet.skills.map(sId => {
                      const s = this.skillsMap.get(sId);
                      return `<span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">${s?.name || sId}</span>`;
                    }).join('')}
                    ${pet.traits.map(t => `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">${t}</span>`).join('')}
                  </div>

                  <!-- 选择操作 -->
                  <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                    <button 
                      class="btn-pick-a py-1 text-[10px] rounded font-semibold transition-all ${isA ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-400 hover:bg-slate-700'}"
                      data-instance-id="${pet.instanceId}"
                    >
                      ${isA ? '✓ 已选父A' : '设为父A'}
                    </button>
                    <button 
                      class="btn-pick-b py-1 text-[10px] rounded font-semibold transition-all ${isB ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-rose-400 hover:bg-slate-700'}"
                      data-instance-id="${pet.instanceId}"
                    >
                      ${isB ? '✓ 已选母B' : '设为母B'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSelectedSlot(pet: PetInstance, type: 'A' | 'B'): string {
    const config = this.petConfigs.get(pet.configId);
    return `
      <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <span class="text-3xl">${config?.avatar || '🐾'}</span>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white">${pet.name}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${type === 'A' ? 'bg-sky-950 text-sky-300' : 'bg-rose-950 text-rose-300'}">
              T${pet.tier} (${pet.generation}代)
            </span>
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
    // 设为父 A
    this.container.querySelectorAll('.btn-pick-a').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.instanceId;
        this.selectedParentA = this.userPets.find(p => p.instanceId === id) || null;
        this.lockedSkillId = null;
        this.render();
      });
    });

    // 设为母 B
    this.container.querySelectorAll('.btn-pick-b').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.instanceId;
        this.selectedParentB = this.userPets.find(p => p.instanceId === id) || null;
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

    // 领取基础幼体胚胎 (测试便利)
    this.container.querySelector('#btn-add-starter-pet')?.addEventListener('click', () => {
      const config = Array.from(this.petConfigs.values())[Math.floor(Math.random() * 3)];
      const newPet: PetInstance = {
        instanceId: `pet_starter_${Date.now()}`,
        configId: config.id,
        name: `${config.name} (野外捕获)`,
        level: 5,
        exp: 0,
        tier: config.tier,
        race: config.race,
        element: config.element,
        currentHp: config.baseHp,
        maxHp: config.baseHp,
        atk: config.baseAtk,
        def: config.baseDef,
        spd: config.baseSpd,
        critRate: 0.1,
        critDmg: 1.5,
        growth: config.growth,
        innateSkillId: config.innateSkillId,
        skills: [config.innateSkillId, 'skill_flame_burst'],
        traits: [],
        generation: 1
      };
      this.userPets.unshift(newPet);
      this.render();
    });

    // 执行合成
    this.container.querySelector('#btn-execute-fusion')?.addEventListener('click', () => {
      if (!this.selectedParentA || !this.selectedParentB) return;
      const res = this.engine.executeFusion(this.selectedParentA, this.selectedParentB, this.lockedSkillId || undefined);

      // 新宠物入库
      this.userPets.unshift(res.child);
      this.lastFusionResult = `成功诞育：${res.child.name}！${res.isMutation ? `触发突变【${res.mutationTrait}】!` : ''} 继承了 ${res.inheritedSkillIds.length} 个神技！`;

      // 自动选定新宠物作为新父代，方便玩家继续杂交
      this.selectedParentA = res.child;
      this.lockedSkillId = null;
      this.render();
    });
  }
}
