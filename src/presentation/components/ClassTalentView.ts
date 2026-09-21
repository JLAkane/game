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
    const equippedSkills = this.classManager.getEquippedSkills(currentClass.id);
    const rawSlots = this.classManager.getRawCustomSlots(currentClass.id);
    const basicAttack = this.skillsMap.get(ClassManager.BASIC_ATTACK_ID);

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 角色基础状态栏与职业原则 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>🧙‍♂️ 主角面板</span>
                <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Lv.${this.classManager.characterLevel}
                </span>
                <span class="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                  💰 ${this.classManager.gold} 金币
                </span>
              </h2>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              当前流派：<span class="text-amber-400 font-bold">${currentClass.name}</span> (${currentClass.title}) · 
              <span class="text-slate-300">培育系统完全独立通用，职业提供专属乘区与光环，牵引特定培育流派 (Build-Driven)</span>。
            </p>
          </div>

          <!-- 当前职业专属常驻被动光环徽章 -->
          <div class="p-3 rounded-lg bg-slate-950/80 border border-purple-800/60 flex items-center gap-3">
            <div class="text-2xl">
              ${currentClass.id === 'IRON_VANGUARD' ? '🛡️' : currentClass.id === 'TACTICAL_COMMANDER' ? '👑' : currentClass.id === 'PSIONIC_CONDUCTOR' ? '🔮' : '🏹'}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-purple-300">常驻职业光环：【${currentClass.passive.name}】</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-700">全场生效</span>
              </div>
              <div class="text-[11px] text-slate-300 mt-0.5">${currentClass.passive.desc}</div>
            </div>
          </div>
        </div>

        <!-- 四大职业切换选择栏 -->
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
                class="p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive 
                    ? 'border-amber-500 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/50' 
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-3xl">${icon}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded font-bold ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}">
                      ${isActive ? '● 当前出战' : `需 Lv.${cls.minLevel}`}
                    </span>
                  </div>
                  <h3 class="text-sm font-bold text-white mb-0.5">${cls.name}</h3>
                  <div class="text-[11px] text-amber-400 font-medium mb-1.5">${cls.title}</div>
                  
                  <!-- 属性成长面板概览 -->
                  <div class="grid grid-cols-3 gap-1 p-2 rounded bg-slate-950/60 text-[10px] text-slate-400 mb-2.5 font-mono">
                    <div>生命: <span class="text-slate-200">${cls.baseHp}</span></div>
                    <div>能量: <span class="text-sky-300">${cls.baseMp}</span></div>
                    <div>攻击: <span class="text-amber-300">${cls.baseAtk}</span></div>
                    <div>防御: <span class="text-emerald-300">${cls.baseDef}</span></div>
                    <div>速度: <span class="text-purple-300">${cls.baseSpd}</span></div>
                    <div>暴击: <span class="text-rose-300">${Math.round(cls.baseCritRate * 100)}%</span></div>
                  </div>

                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${cls.desc}</p>
                </div>

                <div>
                  <div class="p-2 rounded bg-slate-950/80 border border-slate-800 mb-3">
                    <div class="text-[10px] text-purple-300 font-bold mb-0.5">🎯 牵引宠物流派：</div>
                    <div class="text-[11px] text-slate-300">${cls.recommendedPetBuild}</div>
                  </div>
                  <button 
                    class="btn-switch-class w-full py-1.5 text-xs rounded-lg font-bold transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 cursor-default' 
                        : 'bg-slate-800 text-slate-200 hover:bg-amber-600 hover:text-white'
                    }"
                    data-class-id="${cls.id}"
                    ${isActive ? 'disabled' : ''}
                  >
                    ${isActive ? '已激活当前职业' : `切换职业 (消耗 500 金币)`}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 核心构筑区：出战技能卡槽 (4 格) 与 本职技能库 (6 个技能) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：当前出战技能槽位 (1 普攻 + 3 自选) -->
          <div class="bg-game-card border border-game-border rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-white">⚔️ 出战技能构筑栏</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    ${equippedSkills.length} / 4 满载
                  </span>
                </div>
                <span class="text-[11px] text-slate-400">1 普攻 + 3 自选</span>
              </div>

              <!-- 4 个出战卡槽 -->
              <div class="space-y-3">
                <!-- 槽位 1：固定普通攻击 -->
                <div class="p-3 rounded-lg bg-slate-950/80 border border-slate-700 relative">
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">槽 1 [固定]</span>
                      <span class="text-xs font-bold text-amber-300">${basicAttack?.name || '普通攻击'}</span>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                      0 消耗 · +25 MP
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 leading-relaxed">${basicAttack?.desc || '对单体造成物理打击并回复 25 点 MP。'}</p>
                </div>

                <!-- 槽位 2~4：玩家可配置的 3 个自定义技能 -->
                ${[0, 1, 2].map(slotIdx => {
                  const skillId = rawSlots[slotIdx];
                  const skill = skillId ? this.skillsMap.get(skillId) : null;

                  if (skill) {
                    return `
                      <div class="p-3 rounded-lg bg-slate-950/90 border border-amber-500/40 shadow-sm relative group">
                        <div class="flex items-center justify-between mb-1">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              槽 ${slotIdx + 2}
                            </span>
                            <span class="text-xs font-bold text-white">${skill.name}</span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded ${this.getCategoryClass(skill.category)}">
                              ${this.getCategoryName(skill.category)}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono">
                              ${skill.costMp ? `${skill.costMp} MP` : '0 MP'}
                            </span>
                            <button 
                              class="btn-unequip text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-all"
                              data-slot-index="${slotIdx}"
                            >
                              卸下
                            </button>
                          </div>
                        </div>
                        <p class="text-xs text-slate-400 leading-relaxed">${skill.desc}</p>
                      </div>
                    `;
                  } else {
                    return `
                      <div class="p-4 rounded-lg bg-slate-950/40 border border-dashed border-slate-800 text-center flex items-center justify-center">
                        <span class="text-xs text-slate-500">➕ 槽位 ${slotIdx + 2} 空闲 (请在右侧技能库中选择装配)</span>
                      </div>
                    `;
                  }
                }).join('')}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-game-border text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>💡</span>
              <span>出战技能配置已实时同步至【战斗演练】，战斗中角色仅可施放这 4 个技能。</span>
            </div>
          </div>

          <!-- 右侧：当前职业完整技能库 (按等级解锁) -->
          <div class="lg:col-span-2 bg-game-card border border-game-border rounded-xl p-5">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
              <div>
                <span class="text-sm font-bold text-white">📖 ${currentClass.name} 专属技能库</span>
                <span class="text-xs text-slate-400 ml-2">随角色等级提升解锁，自由搭配构筑</span>
              </div>
              <span class="text-xs text-slate-400">当前等级：Lv.${this.classManager.characterLevel}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${currentClass.skillsPool.map(poolItem => {
                const skill = this.skillsMap.get(poolItem.skillId);
                if (!skill) return '';

                const isUnlocked = this.classManager.characterLevel >= poolItem.unlockLevel;
                const isEquipped = equippedSkills.includes(skill.id);

                let cardStyle = 'border-slate-800 bg-slate-950/70';
                if (!isUnlocked) {
                  cardStyle = 'border-slate-900 bg-slate-950/30 opacity-40 grayscale cursor-not-allowed';
                } else if (isEquipped) {
                  cardStyle = 'border-emerald-800/80 bg-emerald-950/20';
                }

                return `
                  <div class="p-3.5 rounded-lg border transition-all flex flex-col justify-between ${cardStyle}">
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-white">${skill.name}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded ${this.getCategoryClass(skill.category)}">
                            ${this.getCategoryName(skill.category)}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            ${skill.costMp ? `${skill.costMp} MP` : '0 MP'}
                          </span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded ${isUnlocked ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-slate-900 text-slate-600'}">
                            Lv.${poolItem.unlockLevel} 解锁
                          </span>
                        </div>
                      </div>
                      <p class="text-xs text-slate-400 leading-relaxed mb-3">${skill.desc}</p>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-slate-900">
                      <span class="text-[10px] text-slate-500">
                        目标: ${this.getTargetName(skill.targetType)}
                      </span>
                      ${!isUnlocked ? `
                        <span class="text-[11px] text-slate-500 font-medium">🔒 等级未达到</span>
                      ` : isEquipped ? `
                        <span class="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          ✓ 已在出战栏中
                        </span>
                      ` : `
                        <button 
                          class="btn-equip-skill px-3 py-1 text-xs rounded font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all"
                          data-skill-id="${skill.id}"
                        >
                          装配进卡槽
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private getCategoryName(cat: string): string {
    switch (cat) {
      case 'DAMAGE': return '伤害';
      case 'HEAL': return '治疗';
      case 'BUFF': return '增益';
      case 'DEBUFF': return '减益';
      case 'COMMAND': return '战术指挥';
      default: return '技能';
    }
  }

  private getCategoryClass(cat: string): string {
    switch (cat) {
      case 'DAMAGE': return 'bg-rose-950 text-rose-300 border border-rose-800';
      case 'HEAL': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
      case 'BUFF': return 'bg-sky-950 text-sky-300 border border-sky-800';
      case 'DEBUFF': return 'bg-amber-950 text-amber-300 border border-amber-800';
      case 'COMMAND': return 'bg-purple-950 text-purple-300 border border-purple-800 glow-command';
      default: return 'bg-slate-800 text-slate-400';
    }
  }

  private getTargetName(t: string): string {
    switch (t) {
      case 'SINGLE_ENEMY': return '单体敌人';
      case 'ALL_ENEMIES': return '全体敌人';
      case 'ALLY_PET': return '友方宠物';
      case 'ALL_ALLIES': return '全体友方';
      case 'SINGLE_ALLY': return '友方单体';
      case 'SELF': return '自身';
      default: return '指定目标';
    }
  }

  private bindEvents(): void {
    // 切换职业 (转职消耗 500 金币)
    this.container.querySelectorAll('.btn-switch-class').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const classId = (e.currentTarget as HTMLElement).dataset.classId as ClassType;
        if (classId) {
          const res = this.classManager.switchClass(classId);
          alert(res.message);
          this.render();
        }
      });
    });

    // 卸下自定义技能
    this.container.querySelectorAll('.btn-unequip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotIdx = parseInt((e.currentTarget as HTMLElement).dataset.slotIndex || '0', 10);
        this.classManager.unequipSkill(this.classManager.activeClassId, slotIdx);
        this.render();
      });
    });

    // 装配技能到空闲卡槽
    this.container.querySelectorAll('.btn-equip-skill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;

        const currentClassId = this.classManager.activeClassId;
        const equipped = this.classManager.getEquippedSkills(currentClassId);
        
        // 寻找第一个未装配的槽位 (槽位 0, 1, 2)
        let targetSlot = -1;
        for (let i = 0; i < 3; i++) {
          if (!equipped[i + 1]) {
            targetSlot = i;
            break;
          }
        }
        // 若满员则替换最后一个槽位
        if (targetSlot === -1) {
          targetSlot = 2;
        }

        this.classManager.equipSkill(currentClassId, targetSlot, skillId);
        this.render();
      });
    });
  }
}
