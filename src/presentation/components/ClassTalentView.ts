import { ClassManager } from '../../core/classes/ClassManager.ts';
import { ClassType, SkillConfig } from '../../core/types.ts';

export class ClassTalentView {
  private container: HTMLElement;
  private classManager: ClassManager;
  private skillsMap: Map<string, SkillConfig>;

  constructor(container: HTMLElement, classManager: ClassManager, skills: SkillConfig[]) {
    this.container = container;
    this.classManager = classManager;
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
  }

  public render(): void {
    const classes = this.classManager.getAllClasses();
    const currentClass = this.classManager.activeClass;

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 核心原则引导横幅 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-amber-400">👑 角色职业与协同指挥体系 (Multi-Class & Synergy)</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              原则：<span class="text-slate-200 font-semibold">培育系统完全独立通用，而职业决定战术协同机制与宠物的培育流派方向 (Build-Driven)</span>。
            </p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-medium">
            自由转职 · 零成本洗点
          </span>
        </div>

        <!-- 四大职业卡片横向网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${classes.map(cls => {
            const isActive = cls.id === currentClass.id;
            let icon = '⚔️';
            if (cls.id === 'TACTICAL_COMMANDER') icon = '👑';
            if (cls.id === 'IRON_VANGUARD') icon = '🛡️';
            if (cls.id === 'PSIONIC_CONDUCTOR') icon = '🔮';
            if (cls.id === 'SHADOW_PACKMASTER') icon = '🏹';

            return `
              <div 
                class="p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isActive 
                    ? 'border-amber-500 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/50' 
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-3xl">${icon}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded font-bold ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}">
                      ${isActive ? '● 当前出战' : '可切换'}
                    </span>
                  </div>
                  <h3 class="text-sm font-bold text-white mb-0.5">${cls.name}</h3>
                  <div class="text-[11px] text-amber-400 font-medium mb-2">${cls.title}</div>
                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${cls.desc}</p>
                </div>

                <div>
                  <div class="p-2 rounded bg-slate-950/80 border border-slate-800 mb-3">
                    <div class="text-[10px] text-purple-300 font-bold mb-0.5">🎯 牵引培育流派：</div>
                    <div class="text-[11px] text-slate-300">${cls.recommendedPetBuild}</div>
                  </div>
                  <button 
                    class="btn-switch-class w-full py-1.5 text-xs rounded-lg font-bold transition-all ${
                      isActive ? 'bg-amber-500 text-slate-950 cursor-default' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }"
                    data-class-id="${cls.id}"
                    ${isActive ? 'disabled' : ''}
                  >
                    ${isActive ? '已激活此职业' : '切换为此流派'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 当前职业详细技能树与前后期职能对比 -->
        <div class="bg-game-card border border-game-border rounded-xl p-5">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
            <div>
              <span class="text-sm font-bold text-white">当前激活技能构筑：${currentClass.name}</span>
              <span class="text-xs text-slate-400 ml-2">(${currentClass.skills.length} 个专属战技与指挥令)</span>
            </div>
            <span class="text-xs text-emerald-400">已自动同步至战斗演练舱</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 前期单兵战技 -->
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">
                  ⚔️ 前期自身输出技能
                </span>
                <span class="text-[11px] text-slate-400">基础固定伤害高，开荒横扫小怪</span>
              </div>
              <div class="space-y-2">
                ${currentClass.skills.filter(sId => {
                  const s = this.skillsMap.get(sId);
                  return s && s.type !== 'COMMAND';
                }).map(sId => this.renderSkillDetail(sId)).join('')}
              </div>
            </div>

            <!-- 后期战术指挥技能 -->
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800 glow-command">
                  ✨ 后期御兽指挥指令
                </span>
                <span class="text-[11px] text-slate-400">百分比倍率放大，全权交由宠物核爆</span>
              </div>
              <div class="space-y-2">
                ${currentClass.skills.filter(sId => {
                  const s = this.skillsMap.get(sId);
                  return s && s.type === 'COMMAND';
                }).map(sId => this.renderSkillDetail(sId)).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSkillDetail(skillId: string): string {
    const skill = this.skillsMap.get(skillId);
    if (!skill) return '';

    return `
      <div class="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-slate-200">${skill.name}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            ${skill.costTp ? `消耗 TP: ${skill.costTp}` : '无消耗'}
          </span>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">${skill.desc}</p>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.querySelectorAll('.btn-switch-class').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const classId = (e.currentTarget as HTMLElement).dataset.classId as ClassType;
        if (classId) {
          this.classManager.switchClass(classId);
          this.render();
        }
      });
    });
  }
}
