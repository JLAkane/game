import { PetConfig, SpecialRecipeConfig, SkillConfig } from '../../core/types.ts';

export class DexView {
  private container: HTMLElement;
  private pets: PetConfig[];
  private recipes: SpecialRecipeConfig[];
  private skillsMap: Map<string, SkillConfig>;

  constructor(
    container: HTMLElement,
    pets: PetConfig[],
    recipes: { specialRecipes: SpecialRecipeConfig[] },
    skills: SkillConfig[]
  ) {
    this.container = container;
    this.pets = pets;
    this.recipes = recipes.specialRecipes;
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 头部图鉴说明 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-amber-400">📖 宠物全谱系图鉴与隐藏合成谱</h2>
            <p class="text-xs text-slate-400 mt-0.5">收录全部 T1~T3 宠物数据、资质潜力与已发现的升阶合成公式</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">共 ${this.pets.length} 种生物</span>
        </div>

        <!-- 特殊合成配方公式速查卡 -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span>✨ 已知特殊指定合成公式 (必出高阶神宠)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            ${this.recipes.map(r => {
              const child = this.pets.find(p => p.id === r.childId);
              return `
                <div class="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                  <span class="text-3xl">${child?.avatar || '🐲'}</span>
                  <div>
                    <div class="text-xs font-bold text-amber-300">${child?.name} (T${r.tier})</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${r.desc}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 宠物网格 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          ${this.pets.map(pet => {
            const skill = this.skillsMap.get(pet.innateSkillId);
            return `
              <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-3xl">${pet.avatar}</span>
                      <div>
                        <div class="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>${pet.name}</span>
                          <span class="text-[10px] px-1.5 rounded font-bold ${
                            pet.tier === 3 ? 'bg-purple-900 text-purple-200' :
                            (pet.tier === 2 ? 'bg-sky-900 text-sky-200' : 'bg-slate-800 text-slate-400')
                          }">T${pet.tier}</span>
                        </div>
                        <div class="text-[10px] text-slate-400">${pet.race} · ${pet.element}</div>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${pet.desc}</p>

                  <!-- 基础属性与成长率 -->
                  <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1 mb-3">
                    <div class="flex justify-between text-slate-300">
                      <span>初始生命: ${pet.baseHp} (成长 +${pet.growth.hpGrowth})</span>
                      <span>初始攻击: ${pet.baseAtk} (成长 +${pet.growth.atkGrowth})</span>
                    </div>
                    <div class="flex justify-between text-slate-300">
                      <span>初始防御: ${pet.baseDef} (成长 +${pet.growth.defGrowth})</span>
                      <span>初始速度: ${pet.baseSpd} (成长 +${pet.growth.spdGrowth})</span>
                    </div>
                  </div>
                </div>

                <!-- 固有专属大招 -->
                <div class="p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                  <div class="text-[10px] text-amber-400 font-bold mb-0.5">⚡ 专属固有技：${skill?.name || pet.innateSkillId}</div>
                  <div class="text-[10px] text-slate-400">${skill?.desc || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
