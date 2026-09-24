import { PetConfig, SpecialRecipeConfig, SkillConfig, RaceType, ElementType } from '../../core/types.ts';

export const RACE_METADATA: Record<RaceType, {
  name: string;
  icon: string;
  traitName: string;
  traitDesc: string;
  badgeClass: string;
}> = {
  BEAST: {
    name: '野兽系',
    icon: '🐺',
    traitName: '野性背水',
    traitDesc: '生命低于50%时攻击力+25%，伤害附带20%吸血',
    badgeClass: 'bg-amber-950/70 text-amber-300 border border-amber-700/60'
  },
  DRAGON: {
    name: '龙系',
    icon: '🐲',
    traitName: '真龙威能',
    traitDesc: '天生暴击率永久+15%，攻击生命高于70%的目标伤害+30%',
    badgeClass: 'bg-red-950/70 text-red-300 border border-red-700/60'
  },
  ELEMENTAL: {
    name: '元素系',
    icon: '✨',
    traitName: '灵能涌动',
    traitDesc: '技能MP消耗-25%，普通攻击回蓝额外+10点',
    badgeClass: 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60'
  },
  UNDEAD: {
    name: '不死系',
    icon: '💀',
    traitName: '亡骸噬魂',
    traitDesc: '全伤害常驻20%吸血，受到致命伤必定锁血保留1点生命(限1次)',
    badgeClass: 'bg-purple-950/70 text-purple-300 border border-purple-700/60'
  },
  MECHANIC: {
    name: '机械系',
    icon: '⚙️',
    traitName: '自律护甲',
    traitDesc: '开局生成自身防御力250%科技护盾，护盾期防御力额外+20%',
    badgeClass: 'bg-blue-950/70 text-blue-300 border border-blue-700/60'
  }
};

export const TIER_METADATA: Record<number, {
  shortName: string;
  fullName: string;
  levelDesc: string;
  badgeClass: string;
  cardBorder: string;
}> = {
  1: {
    shortName: '普通血脉',
    fullName: '普通血脉',
    levelDesc: '野外常见栖息种，资质平缓，适合前期开荒过渡',
    badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-700/80',
    cardBorder: 'border-emerald-900/40 hover:border-emerald-500/50'
  },
  2: {
    shortName: '进阶血脉',
    fullName: '进阶血脉',
    levelDesc: '精英亚种，各维资质显著跃升，中期队伍核心',
    badgeClass: 'bg-sky-950 text-sky-200 border border-sky-600/80',
    cardBorder: 'border-sky-900/40 hover:border-sky-500/50'
  },
  3: {
    shortName: '史诗真灵',
    fullName: '史诗真灵',
    levelDesc: '秘境与深渊霸主，拥有出类拔萃的特化资质，后期核心战术主C/铁壁',
    badgeClass: 'bg-purple-950 text-purple-200 border border-purple-500/80 shadow-sm',
    cardBorder: 'border-purple-900/50 hover:border-purple-500/60'
  },
  4: {
    shortName: '神话远古',
    fullName: '神话远古',
    levelDesc: '创世与禁忌神兽，全维资质达到理论天花板，终极追求',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300',
    cardBorder: 'border-amber-500/60 hover:border-amber-400 ring-1 ring-amber-500/30'
  }
};

export const ELEMENT_METADATA: Record<ElementType, { name: string; icon: string; style: string }> = {
  FIRE: { name: '火系', icon: '🔥', style: 'text-rose-400 border-rose-900 bg-rose-950/40' },
  WATER: { name: '水系', icon: '💧', style: 'text-sky-400 border-sky-900 bg-sky-950/40' },
  WOOD: { name: '木系', icon: '🌿', style: 'text-emerald-400 border-emerald-900 bg-emerald-950/40' },
  THUNDER: { name: '雷系', icon: '⚡', style: 'text-amber-400 border-amber-900 bg-amber-950/40' },
  LIGHT: { name: '光系', icon: '☀️', style: 'text-yellow-300 border-yellow-800 bg-yellow-950/40' },
  DARK: { name: '暗系', icon: '🌙', style: 'text-purple-400 border-purple-900 bg-purple-950/40' }
};

export class DexView {
  private container: HTMLElement;
  private pets: PetConfig[];
  private recipes: SpecialRecipeConfig[];
  private skillsMap: Map<string, SkillConfig>;
  private selectedRace: string = 'ALL';
  private selectedTier: number | 'ALL' = 'ALL';
  private sortOrder: 'DESC' | 'ASC' = 'DESC'; // 默认稀有度降序：神话远古 -> 普通血脉

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
    // 筛选
    const filteredPets = this.pets.filter(pet => {
      const matchRace = this.selectedRace === 'ALL' || pet.race === this.selectedRace;
      const matchTier = this.selectedTier === 'ALL' || pet.tier === this.selectedTier;
      return matchRace && matchTier;
    });

    // 稀有度排序 (按品阶高低，同阶按种族顺序稳定排列)
    const raceOrder: Record<string, number> = { BEAST: 1, DRAGON: 2, ELEMENTAL: 3, UNDEAD: 4, MECHANIC: 5 };
    filteredPets.sort((a, b) => {
      if (this.sortOrder === 'DESC') {
        if (b.tier !== a.tier) return b.tier - a.tier;
      } else {
        if (a.tier !== b.tier) return a.tier - b.tier;
      }
      const rA = raceOrder[a.race] || 99;
      const rB = raceOrder[b.race] || 99;
      if (rA !== rB) return rA - rB;
      return a.id.localeCompare(b.id);
    });

    const raceCounts: Record<string, number> = {
      ALL: this.pets.length,
      BEAST: this.pets.filter(p => p.race === 'BEAST').length,
      DRAGON: this.pets.filter(p => p.race === 'DRAGON').length,
      ELEMENTAL: this.pets.filter(p => p.race === 'ELEMENTAL').length,
      UNDEAD: this.pets.filter(p => p.race === 'UNDEAD').length,
      MECHANIC: this.pets.filter(p => p.race === 'MECHANIC').length
    };

    const races: Array<{ key: string; name: string; icon: string }> = [
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
        <!-- 头部图鉴说明 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span>📖 灵宠全谱系图鉴与隐藏合成谱</span>
              <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                收录全 5 大种族 ${this.pets.length} 种生物 (依据文档06设计)
              </span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">野兽系、龙系、元素系、不死系、机械系各阶血统资质与天生特性全景图谱</p>
          </div>
          <div class="flex items-center gap-2">
            <!-- 稀有度排序切换按钮 -->
            <button id="btn-toggle-sort" class="px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 hover:text-white hover:border-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm">
              <span>${this.sortOrder === 'DESC' ? '⬇️ 稀有度降序 (神话 → 普通)' : '⬆️ 稀有度升序 (普通 → 神话)'}</span>
            </button>
            <span class="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold">
              当前展示: ${filteredPets.length} 种灵宠
            </span>
          </div>
        </div>

        <!-- 筛选过滤器栏 (按种族与按品阶) -->
        <div class="space-y-2.5">
          <!-- 种族筛选 (参考文档06) -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs text-slate-400 font-bold mr-1">种族分类:</span>
            ${races.map(r => {
              const isActive = this.selectedRace === r.key;
              return `
                <button class="btn-filter-race px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }" data-race="${r.key}">
                  <span>${r.icon}</span>
                  <span>${r.name}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded ${isActive ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-400'} font-mono">
                    ${raceCounts[r.key] || 0}
                  </span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- 品阶筛选 (具体文本表示) -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs text-slate-400 font-bold mr-1">血统品阶:</span>
            ${tiers.map(t => {
              const isActive = this.selectedTier === t.key;
              return `
                <button class="btn-filter-tier px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-600 text-white font-bold shadow' 
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }" data-tier="${t.key}">
                  ${t.name}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 特殊合成配方公式速查卡 -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span>✨ 特殊指定突变合成公式速查谱 (必出高阶血脉/神话灵宠)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${this.recipes.map(r => {
              const child = this.pets.find(p => p.id === r.childId);
              const tierMeta = TIER_METADATA[r.tier] || TIER_METADATA[2];
              return `
                <div class="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                  <span class="text-3xl">${child?.avatar || '🐲'}</span>
                  <div>
                    <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>${child?.name}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${tierMeta.badgeClass}">
                        ${tierMeta.shortName}
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${r.desc}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 宠物网格展示 (按稀有度排列) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          ${filteredPets.map(pet => {
            const skill = this.skillsMap.get(pet.innateSkillId);
            const raceInfo = RACE_METADATA[pet.race] || RACE_METADATA.BEAST;
            const tierMeta = TIER_METADATA[pet.tier] || TIER_METADATA[1];
            const elemInfo = ELEMENT_METADATA[pet.element] || ELEMENT_METADATA.FIRE;

            return `
              <div class="bg-game-card border ${tierMeta.cardBorder} transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <!-- 顶部：头像、名字、种族、品阶徽章 -->
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2.5">
                      <span class="text-3xl p-1 rounded-lg bg-slate-950/60 border border-slate-800">${pet.avatar}</span>
                      <div>
                        <div class="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>${pet.name}</span>
                          <!-- 品阶具体文本 -->
                          <span class="text-[10px] px-1.5 py-0.2 rounded ${tierMeta.badgeClass}">
                            ${tierMeta.shortName}
                          </span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                          <!-- 种族明确展示 (文档06) -->
                          <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${raceInfo.badgeClass}">
                            ${raceInfo.icon} ${raceInfo.name}
                          </span>
                          <!-- 元素属性 -->
                          <span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${elemInfo.style}">
                            ${elemInfo.icon} ${elemInfo.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-slate-400 leading-relaxed mb-2.5">${pet.desc}</p>

                  <!-- 种族天生特性 (严格依据文档06) -->
                  <div class="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 mb-2.5 text-[10px]">
                    <div class="font-bold text-slate-300 flex items-center gap-1 mb-0.5">
                      <span class="text-amber-400">🧬 种族特性:</span>
                      <span class="text-white">【${raceInfo.traitName}】</span>
                    </div>
                    <div class="text-slate-400 leading-tight">${raceInfo.traitDesc}</div>
                  </div>

                  <!-- 基础属性与成长率 -->
                  <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1 mb-3 font-mono">
                    <div class="flex justify-between text-slate-300">
                      <span>初始HP: <b class="text-white">${pet.baseHp}</b> <span class="text-emerald-400 text-[10px]">(+${pet.growth.hpGrowth}/级)</span></span>
                      <span>初始攻: <b class="text-amber-300">${pet.baseAtk}</b> <span class="text-emerald-400 text-[10px]">(+${pet.growth.atkGrowth}/级)</span></span>
                    </div>
                    <div class="flex justify-between text-slate-300">
                      <span>初始防: <b class="text-sky-300">${pet.baseDef}</b> <span class="text-emerald-400 text-[10px]">(+${pet.growth.defGrowth}/级)</span></span>
                      <span>初始速: <b class="text-purple-300">${pet.baseSpd}</b> <span class="text-emerald-400 text-[10px]">(+${pet.growth.spdGrowth}/级)</span></span>
                    </div>
                  </div>
                </div>

                <!-- 固有专属大招 -->
                <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                  <div class="text-[10px] text-amber-400 font-bold mb-0.5 flex items-center justify-between">
                    <div class="flex items-center gap-1">
                      <span>⚡ 专属奥义:</span>
                      <span class="text-white">${skill?.name || pet.innateSkillId}</span>
                    </div>
                    <span class="text-[9px] text-slate-500 font-mono">耗蓝 ${skill?.costMp ?? 0} MP</span>
                  </div>
                  <div class="text-[10px] text-slate-400 leading-relaxed">${skill?.desc || ''}</div>
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
    // 稀有度排序切换
    this.container.querySelector('#btn-toggle-sort')?.addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'DESC' ? 'ASC' : 'DESC';
      this.render();
    });

    // 种族筛选
    this.container.querySelectorAll('.btn-filter-race').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const race = (e.currentTarget as HTMLElement).dataset.race;
        if (race) {
          this.selectedRace = race;
          this.render();
        }
      });
    });

    // 品阶筛选
    this.container.querySelectorAll('.btn-filter-tier').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tier = (e.currentTarget as HTMLElement).dataset.tier;
        if (tier) {
          this.selectedTier = tier === 'ALL' ? 'ALL' : Number(tier);
          this.render();
        }
      });
    });
  }
}


