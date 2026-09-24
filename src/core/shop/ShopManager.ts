import { ShopCategory, ShopItemConfig, PetEggItem } from '../types.ts';
import { PlayerState } from '../player/PlayerState.ts';

export interface BuyResult {
  success: boolean;
  message: string;
  boughtItem?: ShopItemConfig;
  totalCost?: number;
  count?: number;
  createdEggs?: PetEggItem[];
}

export class ShopManager {
  private playerState: PlayerState;
  private itemsMap: Map<string, ShopItemConfig>;
  private itemsList: ShopItemConfig[];

  constructor(playerState: PlayerState, items: ShopItemConfig[]) {
    this.playerState = playerState;
    this.itemsList = [...items];
    this.itemsMap = new Map(items.map(it => [it.id, it]));
  }

  /**
   * 获取所有货架商品或按分类筛选
   */
  public getItems(category?: ShopCategory): ShopItemConfig[] {
    if (!category) {
      return [...this.itemsList];
    }
    return this.itemsList.filter(it => it.category === category);
  }

  /**
   * 根据 ID 查询商品
   */
  public getItemById(itemId: string): ShopItemConfig | undefined {
    return this.itemsMap.get(itemId);
  }

  /**
   * 购买商品（支持单件与批量购买）
   */
  public buyItem(itemId: string, count: number = 1): BuyResult {
    if (count <= 0 || !Number.isInteger(count)) {
      return { success: false, message: '购买数量必须为大于 0 的整数' };
    }

    const item = this.getItemById(itemId);
    if (!item) {
      return { success: false, message: '未找到指定商品' };
    }

    const totalCost = item.price * count;
    if (this.playerState.gold < totalCost) {
      return {
        success: false,
        message: `金币不足！选购 ${count} 个【${item.name}】需要 ${totalCost} 金币，您当前仅拥有 ${this.playerState.gold} 金币。`
      };
    }

    // 1. 扣除金币
    this.playerState.gold -= totalCost;

    // 2. 货品分发
    const createdEggs: PetEggItem[] = [];
    if (item.effect.type === 'ADD_EGG') {
      const tier = item.effect.eggTier || 1;
      for (let i = 0; i < count; i++) {
        const egg = this.playerState.createEggItem(tier, '幻境宝阁采购');
        this.playerState.petEggs.push(egg);
        createdEggs.push(egg);
      }
    } else {
      // 消耗品或技能秘卷存入玩家背包
      this.playerState.inventory[item.id] = (this.playerState.inventory[item.id] || 0) + count;
    }

    // 3. 自动触发持久化与状态更新通知
    this.playerState.notify();

    return {
      success: true,
      message: `🎉 购买成功！消耗 ${totalCost} 金币获得了【${item.name}】x${count}！`,
      boughtItem: item,
      totalCost,
      count,
      createdEggs
    };
  }

  /**
   * 获取当前玩家持有金币
   */
  public getPlayerGold(): number {
    return this.playerState.gold;
  }
}
