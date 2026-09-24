import { ClassManager } from '../../core/classes/ClassManager.ts';
import { ClassType, SkillConfig } from '../../core/types.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';

export class ClassTalentView {
  private container: HTMLElement;
  private classManager: ClassManager;
  private skillsMap: Map<string, SkillConfig>;

  // 弹窗状态管理
  private showClassSelectModal: boolean = false;
  private showConfirmModal: boolean = false;
  private alertModalMessage: string | null = null;

  constructor(container: HTMLElement, classManager: ClassManager, skills: SkillConfig[]) {
    this.container = container;
    this.classManager = classManager;
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
  }

  public openAwakeningModal(): void {
    this.showClassSelectModal = true;
    this.render();
  }

  public render(): void {
    const isNovice = this.classManager.isNovice;
    const currentClass = this.classManager.activeClass;
    const hasChosenClass = Boolean(this.classManager.activeClassId);
    const equippedSkills = this.classManager.getEquippedSkills(this.classManager.activeClassId);
    const rawSlots = this.classManager.getRawCustomSlots(this.classManager.activeClassId);
    const basicAttack = this.skillsMap.get(ClassManager.BASIC_ATTACK_ID);

    // 严格过滤：只获取当前等级真正已解锁习得的技能，绝不提前展示未习得技能
    const acquiredSkills = this.classManager.getUnlockedSkills(this.classManager.activeClassId);

    // 经验值进度计算
    const playerState = PlayerState.getInstance();
    const currentExp = playerState.characterExp;
    const nextLevelExp = PlayerState.getExpForNextLevel(this.classManager.characterLevel);
    const expPercent = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));
    const expRemaining = Math.max(0, nextLevelExp - currentExp);

    let avatar = '🧙‍♂️';
    if (hasChosenClass) {
      if (currentClass.id === 'TACTICAL_COMMANDER') avatar = '👑';
      if (currentClass.id === 'IRON_VANGUARD') avatar = '🛡️';
      if (currentClass.id === 'PSIONIC_CONDUCTOR') avatar = '🔮';
      if (currentClass.id === 'SHADOW_PACKMASTER') avatar = '🏹';
    }

    this.container.innerHTML = `
      <div class="space-y-6 relative">
        <!-- 角色基础状态与当前专精面板 (只展示当前职业和面板) -->
        <div class="bg-game-card border border-game-border p-6 rounded-2xl shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-game-border">
            <div class="flex items-center gap-4 flex-1 min-w-[280px]">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-4xl shadow-lg shrink-0">
                ${avatar}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-lg font-bold text-white flex items-center gap-2">
                    <span>${!hasChosenClass ? '见习冒险家' : currentClass.name}</span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                      Lv.${this.classManager.characterLevel}
                    </span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      💰 ${this.classManager.gold} 金币
                    </span>
                  </h2>
                </div>
                <div class="text-xs text-amber-400 font-medium mt-1">
                  ${!hasChosenClass 
                    ? (this.classManager.characterLevel >= 10 
                        ? '🌟【职业觉醒就绪】主角已达 Lv.10！四大进阶职业觉醒殿堂已开启（首次免费 4 选 1）' 
                        : '【称号】初出茅庐的探险者 · 依靠自身战技与初始战宠协同作战，正在历练成长中（Lv.10 解锁职业觉醒）') 
                    : `【称号】${currentClass.title} · <span class="text-slate-400 font-normal">${currentClass.desc}</span>`
                  }
                </div>

                <!-- 角色积攒经验值与升级所需经验进度条 -->
                <div class="mt-3 max-w-md bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div class="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span class="text-amber-300 font-bold flex items-center gap-1.5">
                      <span>⭐ 经验积攒:</span>
                      <span class="text-white">${currentExp} / ${nextLevelExp} EXP</span>
                    </span>
                    <span class="text-amber-400 font-bold text-[11px]">${expPercent}%</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-2 border border-slate-700/60 overflow-hidden shadow-inner">
                    <div 
                      class="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-sm shadow-amber-500/50" 
                      style="width: ${expPercent}%"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>当前升级进度: ${expPercent}%</span>
                    <span>距离升至 Lv.${this.classManager.characterLevel + 1} 还差 <strong class="text-amber-300 font-mono">${expRemaining}</strong> EXP</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 转职 / 职业变更按钮 -->
            <div>
              <button 
                id="btn-trigger-class-action"
                class="px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2 ${
                  !hasChosenClass 
                    ? (this.classManager.characterLevel >= 10 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 animate-pulse' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed')
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40'
                }"
              >
                <span>${!hasChosenClass ? (this.classManager.characterLevel >= 10 ? '👑 职业觉醒 (首次免费 4 选 1)' : '🔒 职业觉醒 (Lv.10 解锁)') : '🔄 职业变更 (消耗 500 金币)'}</span>
              </button>
            </div>
          </div>

          <!-- 角色四维属性与被动光环展示 -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
            <!-- 属性面板数值 -->
            <div class="lg:col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">生命上限</div>
                <div class="text-sm font-bold text-white mt-1">${isNovice ? 320 + (this.classManager.characterLevel - 1) * 35 : currentClass.baseHp}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">战术法力</div>
                <div class="text-sm font-bold text-sky-300 mt-1">${isNovice ? 80 + (this.classManager.characterLevel - 1) * 5 : currentClass.baseMp}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">物理/法术攻击</div>
                <div class="text-sm font-bold text-amber-300 mt-1">${isNovice ? 30 + (this.classManager.characterLevel - 1) * 4 : currentClass.baseAtk}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">护甲防御</div>
                <div class="text-sm font-bold text-emerald-300 mt-1">${isNovice ? 15 + (this.classManager.characterLevel - 1) * 2 : currentClass.baseDef}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">出手速度</div>
                <div class="text-sm font-bold text-purple-300 mt-1">${isNovice ? 100 + (this.classManager.characterLevel - 1) * 1 : currentClass.baseSpd}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div class="text-[10px] text-slate-400">暴击概率</div>
                <div class="text-sm font-bold text-rose-300 mt-1">${isNovice ? '5%' : `${Math.round(currentClass.baseCritRate * 100)}%`}</div>
              </div>
            </div>

            <!-- 专属光环展示 -->
            <div class="p-3 rounded-xl bg-slate-950/80 border border-purple-800/60 flex items-center gap-3">
              <div class="text-3xl">
                ${isNovice ? '🌱' : currentClass.id === 'IRON_VANGUARD' ? '🛡️' : currentClass.id === 'TACTICAL_COMMANDER' ? '👑' : currentClass.id === 'PSIONIC_CONDUCTOR' ? '🔮' : '🏹'}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-purple-300">
                    ${isNovice ? '常驻光环：【尚未觉醒】' : `常驻职业光环：【${currentClass.passive.name}】`}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                    ${isNovice ? '未激活' : '全场常驻'}
                  </span>
                </div>
                <div class="text-[11px] text-slate-300 mt-1">
                  ${isNovice ? '角色升至 Lv.10 完成职业觉醒后，即可获得强力全队战术光环。' : currentClass.passive.desc}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 技能核心区：当前携带的技能 (出战栏) 与 已经习得的技能库 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：当前携带的技能槽位 -->
          <div class="bg-game-card border border-game-border rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-white">⚔️ 当前携带技能 (出战构筑)</span>
                </div>
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

                <!-- 槽位 2~4：3 个自定义职业槽位 (分别于 Lv.2, Lv.5, Lv.10 开放) -->
                ${rawSlots.map((skillId, idx) => {
                  const slotNumber = idx + 2;
                  const unlockLevel = ClassManager.getSlotUnlockLevel(idx);
                  const isSlotUnlocked = this.classManager.isSlotUnlocked(idx);

                  if (!isSlotUnlocked) {
                    return `
                      <div class="p-3.5 rounded-lg bg-slate-950/30 border border-dashed border-slate-800/80 text-center flex flex-col items-center justify-center text-slate-500">
                        <div class="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <span>🔒</span>
                          <span>槽 ${slotNumber} [未解锁]</span>
                        </div>
                        <span class="text-[10px] text-slate-600 mt-1">
                          ${idx === 2 ? '需角色达到 Lv.10 职业觉醒后开启' : `需角色达到 Lv.${unlockLevel} 开启`}
                        </span>
                      </div>
                    `;
                  }

                  const skill = skillId ? this.skillsMap.get(skillId) : null;

                  if (skill) {
                    const badge = this.getCategoryBadge(skill.category);
                    return `
                      <div class="p-3 rounded-lg bg-slate-950/90 border border-amber-500/40 relative group hover:border-amber-400 transition-all">
                        <div class="flex items-center justify-between mb-1">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              槽 ${slotNumber} [自选]
                            </span>
                            <span class="text-xs font-bold text-white">${skill.name}</span>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                              ${skill.costMp || 0} MP
                            </span>
                            <button 
                              class="btn-unequip px-2 py-0.5 text-[10px] rounded bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-all"
                              data-slot-index="${idx}"
                            >
                              卸下
                            </button>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 my-1">
                          <span class="text-[9px] px-1.5 py-0.2 rounded ${badge.bg} ${badge.text} ${badge.border} border">
                            ${badge.label}
                          </span>
                          <span class="text-[10px] text-slate-400">目标: ${this.getTargetName(skill.targetType)}</span>
                        </div>
                        <p class="text-xs text-slate-400 leading-relaxed">${skill.desc}</p>
                      </div>
                    `;
                  } else {
                    return `
                      <div class="p-4 rounded-lg bg-slate-950/30 border border-dashed border-amber-500/30 text-center flex flex-col items-center justify-center text-slate-500">
                        <span class="text-xs font-mono mb-1 text-slate-300 font-bold">槽 ${slotNumber} [已解锁 · 空闲]</span>
                        <span class="text-[11px] text-slate-400">从右侧【已习得技能】中点击装配</span>
                      </div>
                    `;
                  }
                }).join('')}
              </div>
            </div>
          </div>

          <!-- 右侧：已经习得的技能 (严格不展示未习得技能) -->
          <div class="lg:col-span-2 bg-game-card border border-game-border rounded-xl p-5">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">📖 已经习得的技能库</span>
                <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  已习得 ${acquiredSkills.length} 个
                </span>
              </div>
              <span class="text-[11px] text-slate-400">
                升级后将自动觉醒更高阶战术技能
              </span>
            </div>

            ${acquiredSkills.length === 0 ? `
              <div class="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400">
                <span class="text-3xl block mb-2">${isNovice ? '🌱' : '📜'}</span>
                <p class="text-sm font-bold text-slate-300">
                  ${isNovice ? '见习冒险家 (Lv.1 初出茅庐)' : '当前尚未习得进阶职业战术技能'}
                </p>
                <p class="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                  ${isNovice 
                    ? '当前角色仅掌握基础【普通攻击】。<br/>请前往【冒险关卡】挑战副本，升至 <span class="text-amber-400 font-bold">Lv.2</span> 即可解锁首个自选战术槽，并自动习得强力伤害战技【重装轰斩】！' 
                    : '提升角色等级后将自动觉醒更高阶战术技能！'}
                </p>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${acquiredSkills.map(unlock => {
                  const skill = this.skillsMap.get(unlock.skillId);
                  if (!skill) return '';

                  const isEquipped = equippedSkills.includes(skill.id);
                  const badge = this.getCategoryBadge(skill.category);

                  return `
                    <div class="p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isEquipped 
                        ? 'border-emerald-600/60 bg-emerald-950/10' 
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }">
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-xs font-bold text-white">${skill.name}</span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono font-bold">
                            ${skill.costMp} MP
                          </span>
                        </div>

                        <div class="flex items-center gap-1.5 my-1.5">
                          <span class="text-[9px] px-1.5 py-0.2 rounded ${badge.bg} ${badge.text} ${badge.border} border">
                            ${badge.label}
                          </span>
                          <span class="text-[10px] text-slate-400">
                            ${unlock.unlockLevel} 级习得
                          </span>
                        </div>

                        <p class="text-xs text-slate-400 leading-relaxed mb-3">${skill.desc}</p>
                      </div>

                      <div class="flex items-center justify-between pt-2 border-t border-slate-900">
                        <span class="text-[10px] text-slate-500">
                          目标: ${this.getTargetName(skill.targetType)}
                        </span>
                        ${isEquipped ? `
                          <span class="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            ✓ 已在出战栏中
                          </span>
                        ` : `
                          <button 
                            class="btn-equip-skill px-3 py-1 text-xs rounded font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow"
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
            `}
          </div>
        </div>

        <!-- 弹窗 1：等级或金币不足友好提示弹窗 -->
        ${this.alertModalMessage ? `
          <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-150">
              <div class="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/50 mx-auto flex items-center justify-center text-3xl mb-3">
                ⚠️
              </div>
              <h3 class="text-base font-bold text-amber-300 mb-2">转职条件提示</h3>
              <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-5">${this.alertModalMessage}</p>
              <button id="btn-close-alert-modal" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20">
                我知道了
              </button>
            </div>
          </div>
        ` : ''}

        <!-- 弹窗 2：进入转职面板前的确认弹窗 -->
        ${this.showConfirmModal ? `
          <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-slate-900 border-2 border-purple-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-150">
              <div class="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/50 mx-auto flex items-center justify-center text-3xl mb-3">
                👑
              </div>
              <h3 class="text-base font-bold text-purple-300 mb-2">即将进入职业选择殿堂</h3>
              <p class="text-xs text-slate-300 leading-relaxed mb-5">
                转职/变更职业将开启专精乘区与专属团队光环，确定进入后可自由查阅四大专精职业详情。是否立即进入？
              </p>
              <div class="flex items-center justify-center gap-3">
                <button id="btn-cancel-confirm" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all">
                  暂不进入
                </button>
                <button id="btn-agree-confirm" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-900/40">
                  确认进入职业殿堂
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 弹窗 3：四大职业全景展示与选定转职面板 (Class Selection Modal) -->
        ${this.showClassSelectModal ? this.renderClassSelectionModal() : ''}
      </div>
    `;

    this.bindEvents();
  }

  // 渲染四大职业全景展示转职面板
  private renderClassSelectionModal(): string {
    const classes = this.classManager.getAllClasses();
    const currentClassId = this.classManager.activeClassId;
    const isFirstAwakening = !currentClassId;

    return `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-5xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <!-- 弹窗标题 -->
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 class="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>👑 进阶职业觉醒殿堂</span>
                <span class="text-xs px-2.5 py-0.5 rounded ${
                  isFirstAwakening 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                } font-mono font-bold">
                  ${isFirstAwakening ? '🎉 首次觉醒转职: 免费 0 金币' : '转职消耗: 500 金币'}
                </span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">
                ${isFirstAwakening 
                  ? '恭喜达成 Lv.10 职业觉醒！请从以下四大进阶职业中自由选择一位作为您的专属流派（四大职业平等可选，首次免费）！' 
                  : '选择适合您队伍构筑的核心职业。每个职业拥有独特的全队常驻光环、属性特化与核心优势！'
                }
              </p>
            </div>
            <button id="btn-close-class-modal" class="text-slate-400 hover:text-white text-xl p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-all">
              ✕
            </button>
          </div>

          <!-- 四大职业卡片展示 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${classes.map(cls => {
              const isActive = !isFirstAwakening && cls.id === currentClassId;
              let icon = '⚔️';
              let styleTag = '单体暴击 / 致命核爆';
              let bestPets = '🐲 龙系、⚙️ 机械系 (单体爆发型)';
              if (cls.id === 'TACTICAL_COMMANDER') {
                icon = '👑';
                styleTag = '弱点破甲 · 超载扣血必暴';
                bestPets = '🐲 龙系、⚙️ 机械系 (极致单体核爆)';
              } else if (cls.id === 'IRON_VANGUARD') {
                icon = '🛡️';
                styleTag = '团队高额护盾 · 受击反伤刺猬';
                bestPets = '💀 不死系、🐺 野兽系 (高防反伤坦克)';
              } else if (cls.id === 'PSIONIC_CONDUCTOR') {
                icon = '🔮';
                styleTag = '全屏法术轰炸 · 全队无伤增伤';
                bestPets = '✨ 元素系 (高魔攻多段 AOE 法炮)';
              } else if (cls.id === 'SHADOW_PACKMASTER') {
                icon = '🏹';
                styleTag = '顺风极速 · 100% 满拉条立刻再动';
                bestPets = '🐺 野兽系、高速敏捷刺客宠';
              }

              return `
                <div class="p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive 
                    ? 'border-amber-400 bg-amber-950/20 shadow-lg ring-2 ring-amber-400/40' 
                    : isFirstAwakening 
                      ? 'border-slate-800 bg-slate-950/70 hover:border-amber-500/60 hover:bg-slate-950/90' 
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }">
                  <div>
                    <!-- 头部 -->
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2.5">
                        <span class="text-3xl">${icon}</span>
                        <div>
                          <h3 class="text-base font-bold text-white">${cls.name}</h3>
                          <div class="text-xs text-amber-400 font-medium">${cls.title}</div>
                        </div>
                      </div>
                      ${isActive ? `
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                          ● 当前激活
                        </span>
                      ` : isFirstAwakening ? `
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                          首次免费
                        </span>
                      ` : `
                        <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          消耗 500 金币
                        </span>
                      `}
                    </div>

                    <!-- 优势特长标签 -->
                    <div class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3 flex items-center gap-1.5">
                      <span>⚡ 核心优势：</span>
                      <span>${styleTag}</span>
                    </div>

                    <!-- 专属常驻光环 -->
                    <div class="p-3 rounded-xl bg-purple-950/30 border border-purple-800/60 mb-3 text-xs">
                      <div class="font-bold text-purple-300 flex items-center gap-1 mb-0.5">
                        <span>🌟 专属全场光环：【${cls.passive.name}】</span>
                      </div>
                      <div class="text-slate-300 text-[11px]">${cls.passive.desc}</div>
                    </div>

                    <!-- 牵引宠物流派 -->
                    <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 mb-3 text-xs">
                      <div class="text-[10px] text-slate-400 font-medium mb-0.5">🎯 推荐搭配宠系：</div>
                      <div class="text-slate-200 text-[11px]">${bestPets}</div>
                    </div>

                    <!-- 属性特化倾向 -->
                    <div class="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-950/90 text-center font-mono text-[10px] text-slate-400 mb-4 border border-slate-800">
                      <div>生命: <span class="text-white font-bold">${cls.baseHp}</span></div>
                      <div>攻击: <span class="text-amber-300 font-bold">${cls.baseAtk}</span></div>
                      <div>防御: <span class="text-emerald-300 font-bold">${cls.baseDef}</span></div>
                      <div>速度: <span class="text-purple-300 font-bold">${cls.baseSpd}</span></div>
                      <div>能量: <span class="text-sky-300 font-bold">${cls.baseMp}</span></div>
                      <div>暴击: <span class="text-rose-300 font-bold">${Math.round(cls.baseCritRate * 100)}%</span></div>
                    </div>
                  </div>

                  <!-- 选定按钮 -->
                  <div>
                    <button 
                      class="btn-select-class w-full py-2.5 text-xs rounded-xl font-bold transition-all ${
                        isActive 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default' 
                          : isFirstAwakening
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md font-black active:scale-95 cursor-pointer'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md font-bold active:scale-95'
                      }"
                      data-class-id="${cls.id}"
                      ${isActive ? 'disabled' : ''}
                    >
                      ${isActive 
                        ? '当前已是该职业' 
                        : isFirstAwakening 
                          ? `✨ 觉醒选定【${cls.name}】(免费)` 
                          : `选定此职业 (消耗 500 金币)`
                      }
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private getCategoryBadge(category: string): { label: string; bg: string; text: string; border: string } {
    switch (category) {
      case 'DAMAGE':
        return { label: '伤害', bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-800' };
      case 'HEAL':
        return { label: '治疗', bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-800' };
      case 'BUFF':
        return { label: '增益', bg: 'bg-sky-950', text: 'text-sky-300', border: 'border-sky-800' };
      case 'DEBUFF':
        return { label: '减益', bg: 'bg-orange-950', text: 'text-orange-300', border: 'border-orange-800' };
      case 'COMMAND':
        return { label: '战术指挥', bg: 'bg-purple-950', text: 'text-purple-300', border: 'border-purple-800' };
      default:
        return { label: '技能', bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
    }
  }

  private getTargetName(t: string): string {
    switch (t) {
      case 'SINGLE_ENEMY': return '单体敌人';
      case 'ALL_ENEMIES': return '全体敌人';
      case 'ALLY_PET': return '指定友方宠物';
      case 'ALL_ALLIES': return '全体友方';
      case 'SINGLE_ALLY': return '友方单体';
      case 'SELF': return '自身';
      default: return '指定目标';
    }
  }

  private bindEvents(): void {
    // 点击转职/职业变更触发按钮
    this.container.querySelector('#btn-trigger-class-action')?.addEventListener('click', () => {
      // 1. 等级不足校验
      if (this.classManager.characterLevel < 10) {
        this.alertModalMessage = `转职门槛尚未达到！成为专精职业需要角色达到 Lv.10（当前角色为 Lv.${this.classManager.characterLevel}）。\n\n请前往【🗺️ 冒险关卡】挑战副本提升等级！`;
        this.render();
        return;
      }

      // 2. 首次觉醒转职：完全免费（0 金币），直接打开 4 选 1 觉醒殿堂！
      const isFirstAwakening = !this.classManager.activeClassId;
      if (isFirstAwakening) {
        this.showClassSelectModal = true;
        this.render();
        return;
      }

      // 3. 后续变更职业：消耗 500 金币校验
      if (this.classManager.gold < 500) {
        this.alertModalMessage = `金币不足！重选变更职业需要消耗 500 金币（当前拥有 ${this.classManager.gold} 金币）。\n\n请先前往【🗺️ 冒险关卡】通关副本赚取金币！`;
        this.render();
        return;
      }

      // 4. 符合要求，打开确认对话框
      this.showConfirmModal = true;
      this.render();
    });

    // 关闭提示弹窗
    this.container.querySelector('#btn-close-alert-modal')?.addEventListener('click', () => {
      this.alertModalMessage = null;
      this.render();
    });

    // 确认对话框 - 取消
    this.container.querySelector('#btn-cancel-confirm')?.addEventListener('click', () => {
      this.showConfirmModal = false;
      this.render();
    });

    // 确认对话框 - 同意打开转职面板
    this.container.querySelector('#btn-agree-confirm')?.addEventListener('click', () => {
      this.showConfirmModal = false;
      this.showClassSelectModal = true;
      this.render();
    });

    // 关闭转职面板
    this.container.querySelector('#btn-close-class-modal')?.addEventListener('click', () => {
      this.showClassSelectModal = false;
      this.render();
    });

    // 在转职面板中选定职业
    this.container.querySelectorAll('.btn-select-class').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const classId = (e.currentTarget as HTMLElement).dataset.classId as ClassType;
        if (!classId) return;

        const res = this.classManager.switchClass(classId);
        if (res.success) {
          this.showClassSelectModal = false;
          this.render();
        } else {
          alert(res.message);
        }
      });
    });

    // 卸下出战技能
    this.container.querySelectorAll('.btn-unequip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotIdx = parseInt((e.currentTarget as HTMLElement).dataset.slotIndex || '0', 10);
        this.classManager.unequipSkill(this.classManager.activeClassId, slotIdx);
        this.render();
      });
    });

    // 装配已习得技能进出战卡槽
    this.container.querySelectorAll('.btn-equip-skill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillId = (e.currentTarget as HTMLElement).dataset.skillId;
        if (!skillId) return;

        const currentClassId = this.classManager.activeClassId;
        const rawSlots = this.classManager.getRawCustomSlots(currentClassId);

        // 寻找第一个已解锁且未装配的自定义槽位 (0, 1, 2)
        let targetSlot = -1;
        for (let i = 0; i < 3; i++) {
          if (this.classManager.isSlotUnlocked(i) && !rawSlots[i]) {
            targetSlot = i;
            break;
          }
        }
        // 若所有已解锁槽位均已装满，则替换最后一个已解锁槽位
        if (targetSlot === -1) {
          for (let i = 2; i >= 0; i--) {
            if (this.classManager.isSlotUnlocked(i)) {
              targetSlot = i;
              break;
            }
          }
        }

        if (targetSlot !== -1) {
          this.classManager.equipSkill(currentClassId, targetSlot, skillId);
          this.render();
        } else {
          alert('当前暂无可用的已解锁自选技能槽位！请先提升角色等级。');
        }
      });
    });
  }
}
