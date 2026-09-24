import { ShopManager } from '../../core/shop/ShopManager.ts';
import { PlayerState } from '../../core/player/PlayerState.ts';
import { ShopCategory, ShopItemConfig, PetConfig, PetEggItem } from '../../core/types.ts';
import { EggHatchModal } from './EggHatchModal.ts';
import petsData from '../../data/pets.json';

export class ShopView {
  private container: HTMLElement;
  private shopManager: ShopManager;
  private playerState: PlayerState;
  private petConfigs: PetConfig[];

  private currentCategory: 'ALL' | ShopCategory = 'ALL';
  private selectedItemForBuy: ShopItemConfig | null = null;
  private buyCount: number = 1;
  private showInventoryModal: boolean = false;
  private selectedPetId: string = '';
  private toastMessage: string | null = null;
  private latestPurchasedEggs: PetEggItem[] = [];

  constructor(
    container: HTMLElement,
    shopManager: ShopManager,
    playerState: PlayerState,
    petConfigs?: PetConfig[]
  ) {
    this.container = container;
    this.shopManager = shopManager;
    this.playerState = playerState;
    this.petConfigs = petConfigs || (petsData as PetConfig[]);
  }

  public render(): void {
    const items = this.shopManager.getItems(
      this.currentCategory === 'ALL' ? undefined : this.currentCategory
    );
    const gold = this.playerState.gold;
    const inventoryKeys = Object.keys(this.playerState.inventory);
    const totalInventoryCount = inventoryKeys.reduce((acc, k) => acc + (this.playerState.inventory[k] || 0), 0);

    this.container.innerHTML = `
      <div class="space-y-6 relative animate-in fade-in duration-200">
        <!-- 顶部信息栏与资产状态 -->
        <div class="bg-game-card border border-game-border p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shrink-0">
              🛒
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-black text-white tracking-wide">幻境宝阁 · 灵物集市</h2>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  常驻直供
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                通关积累金币，随时选购高阶血脉宝蛋、纯阳经验丹与造化洗髓神药！
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- 金币资产胶囊 -->
            <div class="px-4 py-2 rounded-xl bg-slate-950/80 border border-amber-500/40 flex items-center gap-2.5 shadow-inner">
              <span class="text-xl">💰</span>
              <div>
                <div class="text-[10px] text-slate-400 font-medium">持有金币</div>
                <div class="text-base font-black text-amber-400 font-mono" id="shop-current-gold">
                  ${gold.toLocaleString()}
                </div>
              </div>
            </div>

            <!-- 我的行囊快捷入口 -->
            <button id="btn-open-inventory-modal" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 text-xs font-bold shadow active:scale-95">
              <span>🎒</span>
              <span>我的行囊</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${totalInventoryCount > 0 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-400'}">
                ${totalInventoryCount}
              </span>
            </button>
          </div>
        </div>

        <!-- 消息轻提示 Toast -->
        ${this.toastMessage ? `
          <div id="shop-toast" class="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div class="flex items-center gap-2">
              <span class="text-base">✨</span>
              <span>${this.toastMessage}</span>
            </div>
            ${this.latestPurchasedEggs.length > 0 ? `
              <button id="btn-toast-hatch-now" class="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[11px] shadow hover:from-amber-300 hover:to-yellow-400 transition-all flex items-center gap-1 shrink-0 active:scale-95">
                <span>🐣 立即破壳 (${this.latestPurchasedEggs.length})</span>
              </button>
            ` : `
              <button id="btn-close-toast" class="text-slate-400 hover:text-white text-xs px-2 py-1">✕</button>
            `}
          </div>
        ` : ''}

        <!-- 分类选项卡 -->
        <div class="flex flex-wrap items-center gap-2 border-b border-game-border pb-3">
          ${[
            { key: 'ALL', label: '🌟 全部商品' },
            { key: 'PET_EGGS', label: '🥚 灵宠宝蛋' },
            { key: 'CONSUMABLES', label: '🧪 养成资源' },
            { key: 'SKILL_SCROLLS', label: '📜 技能秘卷' }
          ].map(tab => {
            const isActive = this.currentCategory === tab.key;
            return `
              <button 
                class="btn-shop-category px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'bg-game-card hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-game-border'
                }"
                data-category="${tab.key}"
              >
                ${tab.label}
              </button>
            `;
          }).join('')}
        </div>

        <!-- 货架网格陈列 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${items.map(item => this.renderItemCard(item, gold)).join('')}
        </div>

        <!-- 购买确认弹窗 -->
        ${this.selectedItemForBuy ? this.renderBuyModal(this.selectedItemForBuy, gold) : ''}

        <!-- 背包行囊与道具喂养弹窗 -->
        ${this.showInventoryModal ? this.renderInventoryModal() : ''}
      </div>
    `;

    this.bindEvents();
  }

  private renderItemCard(item: ShopItemConfig, playerGold: number): string {
    const canAfford = playerGold >= item.price;
    const tierMeta = this.getTierMeta(item.tier);

    return `
      <div class="bg-game-card rounded-2xl border ${tierMeta.borderClass} p-5 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
        <!-- 品质光晕氛围 -->
        <div class="absolute -top-12 -right-12 w-28 h-28 rounded-full ${tierMeta.glowBg} blur-2xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity"></div>

        <div>
          <!-- 卡片顶栏：品质标签与大图标 -->
          <div class="flex items-start justify-between mb-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierMeta.badgeClass}">
              ${tierMeta.name}
            </span>
            <div class="w-12 h-12 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
              ${item.icon}
            </div>
          </div>

          <!-- 商品名与描述 -->
          <h3 class="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
            <span>${item.name}</span>
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed min-h-[40px] mb-4">
            ${item.description}
          </p>
        </div>

        <!-- 底部价格与购买按钮 -->
        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div class="flex items-baseline gap-1 font-mono">
            <span class="text-xs text-amber-400 font-bold">💰</span>
            <span class="text-base font-black text-amber-400">${item.price}</span>
            <span class="text-[10px] text-slate-400">金币</span>
          </div>

          <button 
            class="btn-trigger-buy px-4 py-2 rounded-xl text-xs font-black transition-all ${
              canAfford 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }"
            data-item-id="${item.id}"
            ${!canAfford ? 'title="金币不足"' : ''}
          >
            ${canAfford ? '选购 🛒' : '金币不足'}
          </button>
        </div>
      </div>
    `;
  }

  private renderBuyModal(item: ShopItemConfig, playerGold: number): string {
    const totalCost = item.price * this.buyCount;
    const canAfford = playerGold >= totalCost;
    const maxAffordable = Math.max(1, Math.floor(playerGold / item.price));
    const tierMeta = this.getTierMeta(item.tier);

    return `
      <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border-2 ${tierMeta.borderClass} rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">${item.icon}</span>
              <div>
                <h3 class="text-base font-bold text-white">${item.name}</h3>
                <span class="text-[10px] text-amber-400 font-mono">单价: 💰 ${item.price} 金币</span>
              </div>
            </div>
            <button id="btn-close-buy-modal" class="text-slate-400 hover:text-white p-1 text-lg">✕</button>
          </div>

          <p class="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            ${item.description}
          </p>

          <!-- 数量步进器 -->
          <div class="space-y-2 mb-6">
            <label class="text-xs font-bold text-slate-300">购买数量：</label>
            <div class="flex items-center gap-2">
              <button id="btn-count-dec" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base transition-all flex items-center justify-center">
                -
              </button>
              <input 
                id="input-buy-count" 
                type="number" 
                min="1" 
                value="${this.buyCount}" 
                class="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
              <button id="btn-count-inc" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base transition-all flex items-center justify-center">
                +
              </button>
              <button id="btn-count-plus5" class="px-2.5 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold">
                +5
              </button>
              <button id="btn-count-max" class="px-3 h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold">
                最大(${maxAffordable})
              </button>
            </div>
          </div>

          <!-- 价格结算预估 -->
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 mb-6 space-y-1.5 font-mono text-xs">
            <div class="flex justify-between text-slate-400">
              <span>当前持有金币：</span>
              <span>💰 ${playerGold.toLocaleString()}</span>
            </div>
            <div class="flex justify-between font-bold ${canAfford ? 'text-amber-400' : 'text-rose-400'}">
              <span>合计消费金额：</span>
              <span>💰 ${totalCost.toLocaleString()}</span>
            </div>
            <div class="flex justify-between text-slate-400 border-t border-slate-800/80 pt-1.5">
              <span>购买后预计结余：</span>
              <span class="${canAfford ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">
                ${canAfford ? `💰 ${(playerGold - totalCost).toLocaleString()}` : '金币不足'}
              </span>
            </div>
          </div>

          <!-- 操作按钮组 -->
          <div class="flex items-center justify-end gap-3">
            <button id="btn-cancel-buy" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all">
              取消
            </button>
            <button 
              id="btn-confirm-buy" 
              class="px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg ${
                canAfford 
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }"
              ${!canAfford ? 'disabled' : ''}
            >
              确认支付 (💰 ${totalCost})
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderInventoryModal(): string {
    const inventory = this.playerState.inventory;
    const itemIds = Object.keys(inventory).filter(id => (inventory[id] || 0) > 0);
    const ownedPets = this.playerState.ownedPets;

    if (!this.selectedPetId && ownedPets.length > 0) {
      this.selectedPetId = ownedPets[0].instanceId;
    }

    return `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎒</span>
              <h3 class="text-base font-bold text-white">我的随身行囊 · 道具库</h3>
            </div>
            <button id="btn-close-inventory-modal" class="text-slate-400 hover:text-white p-1 text-lg">✕</button>
          </div>

          <!-- 选定喂养/使用的灵宠选择栏 -->
          ${ownedPets.length > 0 ? `
            <div class="mb-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 shrink-0">
              <div class="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                <span>🎯</span>
                <span>目标灵宠：</span>
              </div>
              <select id="select-inventory-pet" class="flex-1 max-w-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                ${ownedPets.map(p => `
                  <option value="${p.instanceId}" ${this.selectedPetId === p.instanceId ? 'selected' : ''}>
                    ${p.name} (Lv.${p.level} / ${p.element} / HP:${p.maxHp})
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <!-- 道具列表 -->
          <div class="flex-1 overflow-y-auto space-y-3 pr-1">
            ${itemIds.length === 0 ? `
              <div class="text-center py-12 text-slate-500 text-xs">
                <div class="text-3xl mb-2">📦</div>
                行囊空空如也，快去商城选购经验丹或宝蛋吧！
              </div>
            ` : itemIds.map(id => {
              const count = inventory[id];
              const config = this.shopManager.getItemById(id);
              if (!config) return '';
              const tierMeta = this.getTierMeta(config.tier);

              return `
                <div class="p-3.5 rounded-xl bg-slate-950/80 border ${tierMeta.borderClass} flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      ${config.icon}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-white">${config.name}</span>
                        <span class="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          x${count}
                        </span>
                      </div>
                      <div class="text-xs text-slate-400 mt-0.5">${config.description}</div>
                    </div>
                  </div>

                  <button 
                    class="btn-use-inventory-item px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 shrink-0 transition-all active:scale-95"
                    data-item-id="${id}"
                  >
                    立即使用 ✨
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // 切换分类
    this.container.querySelectorAll('.btn-shop-category').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).dataset.category as any;
        this.currentCategory = cat || 'ALL';
        this.render();
      });
    });

    // 打开购买弹窗
    this.container.querySelectorAll('.btn-trigger-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
        if (!itemId) return;
        const item = this.shopManager.getItemById(itemId);
        if (!item) return;

        this.selectedItemForBuy = item;
        this.buyCount = 1;
        this.render();
      });
    });

    // 关闭购买弹窗
    this.container.querySelector('#btn-close-buy-modal')?.addEventListener('click', () => {
      this.selectedItemForBuy = null;
      this.render();
    });
    this.container.querySelector('#btn-cancel-buy')?.addEventListener('click', () => {
      this.selectedItemForBuy = null;
      this.render();
    });

    // 数量调节
    this.container.querySelector('#btn-count-dec')?.addEventListener('click', () => {
      if (this.buyCount > 1) {
        this.buyCount--;
        this.render();
      }
    });
    this.container.querySelector('#btn-count-inc')?.addEventListener('click', () => {
      this.buyCount++;
      this.render();
    });
    this.container.querySelector('#btn-count-plus5')?.addEventListener('click', () => {
      this.buyCount += 5;
      this.render();
    });
    this.container.querySelector('#btn-count-max')?.addEventListener('click', () => {
      if (this.selectedItemForBuy) {
        const max = Math.max(1, Math.floor(this.playerState.gold / this.selectedItemForBuy.price));
        this.buyCount = max;
        this.render();
      }
    });
    this.container.querySelector('#input-buy-count')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value || '1', 10);
      this.buyCount = Math.max(1, isNaN(val) ? 1 : val);
      this.render();
    });

    // 确认支付购买
    this.container.querySelector('#btn-confirm-buy')?.addEventListener('click', () => {
      if (!this.selectedItemForBuy) return;
      const result = this.shopManager.buyItem(this.selectedItemForBuy.id, this.buyCount);
      if (result.success) {
        this.toastMessage = result.message;
        this.latestPurchasedEggs = result.createdEggs || [];
        this.selectedItemForBuy = null;
        this.render();
      } else {
        alert(result.message);
      }
    });

    // 购买蛋后快捷破壳
    this.container.querySelector('#btn-toast-hatch-now')?.addEventListener('click', () => {
      if (this.latestPurchasedEggs.length > 0) {
        const eggToHatch = this.latestPurchasedEggs.pop()!;
        const hatchResult = this.playerState.hatchEgg(eggToHatch.id, this.petConfigs);
        if (hatchResult) {
          const modal = new EggHatchModal({
            egg: hatchResult.egg,
            pet: hatchResult.pet,
            onConfirm: () => {
              this.render();
            }
          });
          modal.show();
        }
      }
    });

    // 关闭 Toast
    this.container.querySelector('#btn-close-toast')?.addEventListener('click', () => {
      this.toastMessage = null;
      this.latestPurchasedEggs = [];
      this.render();
    });

    // 打开/关闭背包弹窗
    this.container.querySelector('#btn-open-inventory-modal')?.addEventListener('click', () => {
      this.showInventoryModal = true;
      this.render();
    });
    this.container.querySelector('#btn-close-inventory-modal')?.addEventListener('click', () => {
      this.showInventoryModal = false;
      this.render();
    });

    // 背包目标宠物变更
    this.container.querySelector('#select-inventory-pet')?.addEventListener('change', (e) => {
      this.selectedPetId = (e.target as HTMLSelectElement).value;
    });

    // 背包使用道具
    this.container.querySelectorAll('.btn-use-inventory-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
        if (!itemId) return;

        const useRes = this.playerState.useItem(itemId, this.selectedPetId);
        if (useRes.success) {
          this.toastMessage = useRes.message;
          this.render();
        } else {
          alert(useRes.message);
        }
      });
    });
  }

  private getTierMeta(tier: number): { name: string; borderClass: string; badgeClass: string; glowBg: string } {
    switch (tier) {
      case 4:
        return {
          name: '神话',
          borderClass: 'border-amber-500/70',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          glowBg: 'bg-amber-500'
        };
      case 3:
        return {
          name: '史诗',
          borderClass: 'border-purple-500/60',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          glowBg: 'bg-purple-500'
        };
      case 2:
        return {
          name: '进阶',
          borderClass: 'border-sky-500/60',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          glowBg: 'bg-sky-500'
        };
      default:
        return {
          name: '普通',
          borderClass: 'border-emerald-500/50',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          glowBg: 'bg-emerald-500'
        };
    }
  }
}
