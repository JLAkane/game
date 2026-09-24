import { PlayerState } from '../../core/player/PlayerState.ts';
import { ClassManager } from '../../core/classes/ClassManager.ts';

export interface SaveManagerModalOptions {
  playerState: PlayerState;
  classManager?: ClassManager;
  onRefresh: () => void;
}

export class SaveManagerModal {
  private playerState: PlayerState;
  private classManager?: ClassManager;
  private onRefresh: () => void;
  private modalEl: HTMLElement | null = null;
  private activeTab: 'STATUS' | 'EXPORT' | 'IMPORT' | 'RESET' = 'STATUS';
  private copyFeedback: boolean = false;
  private importError: string | null = null;
  private importSuccess: string | null = null;
  private confirmReset: boolean = false;
  private fileActionMsg: string | null = null;

  constructor(options: SaveManagerModalOptions) {
    this.playerState = options.playerState;
    this.classManager = options.classManager;
    this.onRefresh = options.onRefresh;
  }

  public show(): void {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[120] flex items-center justify-center p-4';
    this.render();
    document.body.appendChild(this.modalEl);
  }

  public close(): void {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }

  private formatDate(timestamp: number): string {
    if (!timestamp) return '未知时间';
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private render(): void {
    if (!this.modalEl) return;

    const lastSaveStr = this.formatDate(this.playerState.lastSaveTime);
    const totalPets = this.playerState.ownedPets.length;
    const teamPetsCount = this.playerState.teamPets.length;
    const clearedCount = this.playerState.clearedStageIds.length;
    const eggsCount = this.playerState.petEggs.length;
    const boundFileName = this.playerState.getBoundFileName();

    this.modalEl.innerHTML = `
      <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <!-- 头部标题与关闭按钮 -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
              📁
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>本地物理文件存档</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>文件持久化运行中</span>
                </span>
              </h2>
              <p class="text-xs text-slate-400">所有关卡战利品、灵宠血统与技能配置均实时保存于本地文件 (save.json)，不占用 LocalStorage</p>
            </div>
          </div>
          <button id="btn-close-modal" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-lg">
            ✕
          </button>
        </div>

        <!-- 选项卡导航 -->
        <div class="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 my-4 text-xs font-semibold">
          <button class="nav-subtab flex-1 py-1.5 rounded-lg text-center transition-all ${this.activeTab === 'STATUS' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}" data-tab="STATUS">
            📊 状态概览
          </button>
          <button class="nav-subtab flex-1 py-1.5 rounded-lg text-center transition-all ${this.activeTab === 'EXPORT' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}" data-tab="EXPORT">
            📤 备份导出
          </button>
          <button class="nav-subtab flex-1 py-1.5 rounded-lg text-center transition-all ${this.activeTab === 'IMPORT' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}" data-tab="IMPORT">
            📥 存档导入
          </button>
          <button class="nav-subtab flex-1 py-1.5 rounded-lg text-center transition-all ${this.activeTab === 'RESET' ? 'bg-rose-600 text-white font-bold shadow' : 'text-slate-400 hover:text-rose-300'}" data-tab="RESET">
            🗑️ 初始重置
          </button>
        </div>

        <!-- 选项卡内容区域 -->
        <div class="flex-1 overflow-y-auto pr-1 text-xs">
          ${this.renderTabContent(lastSaveStr, totalPets, teamPetsCount, clearedCount, eggsCount, boundFileName)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderTabContent(
    lastSaveStr: string,
    totalPets: number,
    teamPetsCount: number,
    clearedCount: number,
    eggsCount: number,
    boundFileName: string
  ): string {
    if (this.activeTab === 'STATUS') {
      return `
        <div class="space-y-4">
          <!-- 存档核心概况卡片 -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span class="text-[11px] text-slate-400">🧙‍♂️ 主角等级</span>
              <span class="text-base font-bold text-amber-300 mt-1 font-mono">Lv.${this.playerState.characterLevel}</span>
              <span class="text-[10px] text-slate-500 font-mono">${this.playerState.characterExp} EXP</span>
            </div>
            <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span class="text-[11px] text-slate-400">💰 累积金币</span>
              <span class="text-base font-bold text-amber-400 mt-1 font-mono">${this.playerState.gold}</span>
              <span class="text-[10px] text-slate-500 font-mono">通用通行币</span>
            </div>
            <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span class="text-[11px] text-slate-400">🐾 灵宠伙伴</span>
              <span class="text-base font-bold text-sky-400 mt-1 font-mono">${totalPets} 只</span>
              <span class="text-[10px] text-slate-500 font-mono">出战 ${teamPetsCount} / 仓库 ${totalPets - teamPetsCount}</span>
            </div>
            <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span class="text-[11px] text-slate-400">🗺️ 关卡挑战</span>
              <span class="text-base font-bold text-emerald-400 mt-1 font-mono">${clearedCount} 关</span>
              <span class="text-[10px] text-slate-500 font-mono">蛋仓 ${eggsCount} 枚</span>
            </div>
          </div>

          <!-- 存档技术细节与安全状态 -->
          <div class="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
            <div class="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>🛡️ 持久化存储机制</span>
              <span class="text-emerald-400 font-mono font-semibold">本地物理文件 ✓</span>
            </div>
            <div class="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
              <div class="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>存储介质</span>
                <span class="font-mono text-slate-200">本地磁盘文件 (save.json / File System)</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>物理文件目标</span>
                <span class="font-mono ${boundFileName ? 'text-amber-400 font-semibold' : 'text-slate-300'}">
                  ${boundFileName ? `📁 已绑定外部: ${boundFileName}` : '📄 项目根目录: save.json'}
                </span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>自动写入策略</span>
                <span class="text-emerald-400">变动实时异步同步至磁盘物理文件</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>最近写入时间</span>
                <span class="font-mono text-amber-300">${lastSaveStr}</span>
              </div>
              <div class="flex items-center justify-between py-1">
                <span>LocalStorage 状态</span>
                <span class="text-emerald-400 font-mono font-semibold">0 字节已清空（不占用浏览器缓存）</span>
              </div>
            </div>
          </div>

          <!-- 自动存储说明横幅 -->
          <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-center gap-2.5">
            <span class="text-base">🟢</span>
            <div>
              <span class="font-bold text-emerald-200">全程全自动存储中：</span>
              <span>所有战利品结算、角色升级、灵宠孵化/合成与技能装配变动时均<strong>全自动静默写入本地 save.json 物理文件</strong>，无需手动点击保存。下方按钮仅供外部备份或另存为使用。</span>
            </div>
          </div>

          <!-- 快捷操作栏 -->
          <div class="flex items-center gap-2 pt-1 flex-wrap">
            <button id="btn-manual-save" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow active:scale-95">
              <span>💾 立即写入本地文件</span>
            </button>
            <button id="btn-bind-file" class="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow active:scale-95">
              <span>📁 选取/绑定本地文件</span>
            </button>
            ${boundFileName ? `
              <button id="btn-unbind-file" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all">
                解除绑定
              </button>
            ` : ''}
          </div>

          ${this.fileActionMsg ? `
            <div class="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-center font-bold animate-in fade-in">
              ${this.fileActionMsg}
            </div>
          ` : ''}
        </div>
      `;
    }

    if (this.activeTab === 'EXPORT') {
      const jsonStr = this.playerState.exportSaveData();
      return `
        <div class="space-y-3">
          <p class="text-slate-400 leading-relaxed">
            您可以导出当前的 JSON 存档代码进行本地备份，或复制到其他设备中继续游玩：
          </p>

          <div class="relative">
            <textarea 
              id="txt-export-data" 
              class="w-full h-44 bg-slate-950 font-mono text-[11px] p-3 rounded-xl border border-slate-800 text-slate-300 select-all resize-none focus:outline-none focus:border-amber-500/60"
              readonly
            >${jsonStr}</textarea>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <button id="btn-copy-export" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 active:scale-95">
              <span>📋 复制存档代码到剪贴板</span>
            </button>
            <button id="btn-download-file" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow active:scale-95">
              <span>💾 另存为本地文件 (.json)</span>
            </button>
          </div>

          ${this.copyFeedback ? `
            <div class="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-center font-bold animate-in fade-in">
              ✓ 存档代码已成功复制至剪贴板！
            </div>
          ` : ''}
        </div>
      `;
    }

    if (this.activeTab === 'IMPORT') {
      return `
        <div class="space-y-3">
          <p class="text-slate-400 leading-relaxed">
            您可以直接读取本地的 .json 存档文件，或将先前备份的 JSON 存档代码粘贴在下方输入框中恢复进度：
          </p>

          <div class="flex items-center gap-2">
            <button id="btn-pick-import-file" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow active:scale-95">
              <span>📂 打开本地 .json 存档文件并填入</span>
            </button>
            <input type="file" id="file-import-input" accept=".json" class="hidden" />
          </div>

          <textarea 
            id="txt-import-data" 
            class="w-full h-36 bg-slate-950 font-mono text-[11px] p-3 rounded-xl border border-slate-800 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500/60"
            placeholder="请在此粘贴 JSON 格式的存档代码..."
          ></textarea>

          ${this.importError ? `
            <div class="p-2.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 text-xs font-bold animate-in fade-in">
              ⚠️ ${this.importError}
            </div>
          ` : ''}

          ${this.importSuccess ? `
            <div class="p-2.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs font-bold animate-in fade-in">
              ✓ ${this.importSuccess}
            </div>
          ` : ''}

          <div class="pt-1">
            <button id="btn-execute-import" class="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 active:scale-95">
              <span>⚡ 校验并恢复此存档</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'RESET') {
      return `
        <div class="space-y-4">
          <div class="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 space-y-2">
            <div class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span>⚠️ 警告：重置与重新开荒</span>
            </div>
            <p class="text-[11px] text-rose-300 leading-relaxed">
              此操作将<strong>彻底清空本地物理文件 save.json</strong>（包括角色等级、已通关关卡、拥有的全部灵宠、蛋仓与技能配置），并将游戏还原为最初的【见习冒险家 Lv.1 启程状态】。
            </p>
            <p class="text-[11px] text-rose-400 font-semibold">
              建议在重置前前往【备份导出】页面保存一份备份代码以防误操作！
            </p>
          </div>

          ${this.confirmReset ? `
            <div class="p-4 rounded-xl bg-slate-950 border border-rose-500 text-center space-y-3 animate-in fade-in zoom-in-95">
              <div class="text-sm font-bold text-white">⚠️ 再次确认：确定要清空全部数据重开吗？</div>
              <p class="text-xs text-slate-400">此动作不可撤销！</p>
              <div class="flex items-center justify-center gap-3">
                <button id="btn-do-final-reset" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95">
                  💥 彻底清空并重置
                </button>
                <button id="btn-cancel-reset" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all">
                  取消
                </button>
              </div>
            </div>
          ` : `
            <div class="pt-2">
              <button id="btn-ask-reset" class="w-full py-2.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 border border-rose-700 text-rose-200 text-xs font-bold transition-all shadow active:scale-95">
                🗑️ 清空本地存档文件（重置开荒）
              </button>
            </div>
          `}
        </div>
      `;
    }

    return '';
  }

  private bindEvents(): void {
    if (!this.modalEl) return;

    // 关闭弹窗
    this.modalEl.querySelector('#btn-close-modal')?.addEventListener('click', () => this.close());

    // 点击遮罩层背景关闭
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // 子选项卡切换
    this.modalEl.querySelectorAll('.nav-subtab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as any;
        if (!tab) return;
        this.activeTab = tab;
        this.copyFeedback = false;
        this.importError = null;
        this.importSuccess = null;
        this.confirmReset = false;
        this.fileActionMsg = null;
        this.render();
      });
    });

    // 手动同步保存按钮
    this.modalEl.querySelector('#btn-manual-save')?.addEventListener('click', async () => {
      const res = await this.playerState.saveToLocalFile();
      this.fileActionMsg = `✓ ${res.message || '已成功写入本地物理文件！'}`;
      this.render();
      setTimeout(() => {
        this.fileActionMsg = null;
        this.render();
      }, 2500);
    });

    // 绑定外部本地物理文件
    this.modalEl.querySelector('#btn-bind-file')?.addEventListener('click', async () => {
      if ('showOpenFilePicker' in window) {
        try {
          const [handle] = await (window as any).showOpenFilePicker({
            types: [
              {
                description: 'JSON 存档文件',
                accept: { 'application/json': ['.json'] }
              }
            ],
            multiple: false
          });
          if (handle) {
            this.playerState.setBoundFileHandle(handle, handle.name);
            const file = await handle.getFile();
            const text = await file.text();
            if (text.trim().startsWith('{')) {
              this.playerState.importSaveData(text);
              if (this.classManager) {
                this.classManager.loadCustomSlotsFromPlayerState();
              }
              this.onRefresh();
            }
            this.fileActionMsg = `✓ 已成功绑定并同步本地文件: ${handle.name}`;
            this.render();
          }
        } catch {
          // 用户取消选择
        }
      } else {
        alert('当前浏览器环境不支持 File System Access API，已默认使用开发服务器 save.json 本地文件同步');
      }
    });

    // 解除文件绑定
    this.modalEl.querySelector('#btn-unbind-file')?.addEventListener('click', () => {
      this.playerState.clearBoundFileHandle();
      this.fileActionMsg = '已解除外部物理文件绑定，恢复为项目根目录 save.json';
      this.render();
    });

    // 复制导出内容
    this.modalEl.querySelector('#btn-copy-export')?.addEventListener('click', () => {
      const textarea = this.modalEl?.querySelector('#txt-export-data') as HTMLTextAreaElement;
      if (textarea) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          this.copyFeedback = true;
          this.render();
        }).catch(() => {
          textarea.select();
          document.execCommand('copy');
          this.copyFeedback = true;
          this.render();
        });
      }
    });

    // 另存为 / 下载存档文件
    this.modalEl.querySelector('#btn-download-file')?.addEventListener('click', async () => {
      const jsonStr = this.playerState.exportSaveData();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const d = new Date();
      const defaultFilename = `pet_rpg_save_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [
              {
                description: 'JSON 存档文件',
                accept: { 'application/json': ['.json'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(jsonStr);
          await writable.close();
          this.playerState.setBoundFileHandle(handle, handle.name);
          this.copyFeedback = true;
          this.render();
          return;
        } catch {
          // 用户取消或降级
        }
      }

      // 降级下载
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      a.click();
      URL.revokeObjectURL(url);
    });

    // 打开本地文件载入
    const fileInput = this.modalEl.querySelector('#file-import-input') as HTMLInputElement;
    this.modalEl.querySelector('#btn-pick-import-file')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const textarea = this.modalEl?.querySelector('#txt-import-data') as HTMLTextAreaElement;
          if (textarea && content) {
            textarea.value = content;
          }
        };
        reader.readAsText(file);
      }
    });

    // 执行导入
    this.modalEl.querySelector('#btn-execute-import')?.addEventListener('click', () => {
      const textarea = this.modalEl?.querySelector('#txt-import-data') as HTMLTextAreaElement;
      if (!textarea || !textarea.value.trim()) {
        this.importError = '请输入有效的 JSON 存档内容！';
        this.render();
        return;
      }

      const res = this.playerState.importSaveData(textarea.value.trim());
      if (res.success) {
        this.importSuccess = res.message;
        this.importError = null;
        if (this.classManager) {
          this.classManager.loadCustomSlotsFromPlayerState();
        }
        this.onRefresh();
        this.render();
      } else {
        this.importError = res.message;
        this.importSuccess = null;
        this.render();
      }
    });

    // 弹出重置确认
    this.modalEl.querySelector('#btn-ask-reset')?.addEventListener('click', () => {
      this.confirmReset = true;
      this.render();
    });

    // 取消重置
    this.modalEl.querySelector('#btn-cancel-reset')?.addEventListener('click', () => {
      this.confirmReset = false;
      this.render();
    });

    // 最终执行重置
    this.modalEl.querySelector('#btn-do-final-reset')?.addEventListener('click', async () => {
      await this.playerState.clearLocalFile();
      this.playerState.reset();
      if (this.classManager) {
        this.classManager.characterLevel = 1;
        this.classManager.gold = 500;
        this.classManager.activeClassId = 'TACTICAL_COMMANDER';
        this.classManager.loadCustomSlotsFromPlayerState();
      }
      this.onRefresh();
      this.close();
    });
  }
}
