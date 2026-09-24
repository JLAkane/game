import { describe, it, expect, beforeEach } from 'vitest';
import { ShopManager } from '../src/core/shop/ShopManager.ts';
import { PlayerState } from '../src/core/player/PlayerState.ts';
import { ShopItemConfig, PetInstance } from '../src/core/types.ts';
import shopData from '../src/data/shop.json';
import { getPetGrowthRanges } from '../src/core/pet/PetGrowthEngine.ts';

describe('In-Game Shop & Inventory System (商城与背包道具系统)', () => {
  let playerState: PlayerState;
  let shopManager: ShopManager;
  const items = shopData as ShopItemConfig[];

  beforeEach(() => {
    playerState = new PlayerState();
    playerState.reset();
    playerState.gold = 5000;

    const testPet: PetInstance = {
      instanceId: 'pet_test_1',
      configId: 'pet_rock_turtle',
      name: '巨岩玄龟',
      level: 1,
      exp: 0,
      tier: 1,
      race: 'BEAST',
      element: 'WOOD',
      currentHp: 200,
      maxHp: 200,
      atk: 25,
      def: 20,
      spd: 15,
      critRate: 0.05,
      critDmg: 1.5,
      growth: { hpGrowth: 12.0, atkGrowth: 2.2, defGrowth: 1.4, spdGrowth: 0.8 },
      innateSkillId: 'skill_rock_armor',
      skills: ['skill_basic_strike', 'skill_rock_armor'],
      equippedSkills: ['skill_basic_strike', 'skill_rock_armor'],
      traits: ['玄甲磐石'],
      generation: 1
    };
    playerState.ownedPets = [testPet];
    shopManager = new ShopManager(playerState, items);
  });

  describe('商品目录与分类检索 (Catalog & Filtering)', () => {
    it('能够查询全部 8 款首发常驻商品', () => {
      const allItems = shopManager.getItems();
      expect(allItems.length).toBe(8);
    });

    it('支持按商品分类独立过滤', () => {
      const eggs = shopManager.getItems('PET_EGGS');
      expect(eggs.length).toBe(4);
      expect(eggs.every(e => e.category === 'PET_EGGS')).toBe(true);

      const consumables = shopManager.getItems('CONSUMABLES');
      expect(consumables.length).toBe(3);
      expect(consumables.every(c => c.category === 'CONSUMABLES')).toBe(true);

      const scrolls = shopManager.getItems('SKILL_SCROLLS');
      expect(scrolls.length).toBe(1);
      expect(scrolls[0].id).toBe('item_scroll_heal');
    });

    it('根据 ID 查询特定商品元数据', () => {
      const mythicEgg = shopManager.getItemById('item_egg_tier4');
      expect(mythicEgg).toBeDefined();
      expect(mythicEgg?.name).toBe('远古神话蛋');
      expect(mythicEgg?.price).toBe(5000);
      expect(mythicEgg?.tier).toBe(4);
    });
  });

  describe('购买事务与资产分发 (Purchase & Inventory Delivery)', () => {
    it('选购灵宠蛋：正确扣减金币并将宠物蛋加入蛋仓', () => {
      const initialEggs = playerState.petEggs.length;
      playerState.gold = 1000;

      const res = shopManager.buyItem('item_egg_tier1', 2); // 200 * 2 = 400
      expect(res.success).toBe(true);
      expect(playerState.gold).toBe(600);
      expect(playerState.petEggs.length).toBe(initialEggs + 2);
      expect(res.createdEggs?.length).toBe(2);
      expect(res.createdEggs?.[0].tier).toBe(1);
    });

    it('选购消耗道具：正确扣除金币并存入玩家背包 (inventory)', () => {
      playerState.gold = 1000;
      expect(playerState.inventory['item_exp_pill_s']).toBeUndefined();

      const res = shopManager.buyItem('item_exp_pill_s', 3); // 100 * 3 = 300
      expect(res.success).toBe(true);
      expect(playerState.gold).toBe(700);
      expect(playerState.inventory['item_exp_pill_s']).toBe(3);

      // 再次购买叠加数量
      shopManager.buyItem('item_exp_pill_s', 2); // 100 * 2 = 200
      expect(playerState.gold).toBe(500);
      expect(playerState.inventory['item_exp_pill_s']).toBe(5);
    });

    it('金币不足时严格拦截购买并保持资产不变', () => {
      playerState.gold = 50;
      const res = shopManager.buyItem('item_egg_tier1', 1); // 需 200 金币
      expect(res.success).toBe(false);
      expect(res.message).toContain('金币不足');
      expect(playerState.gold).toBe(50);
      expect(playerState.petEggs.length).toBe(0);
    });

    it('非法购买参数（数量小于等于0或非整数）应被拒绝', () => {
      const resZero = shopManager.buyItem('item_egg_tier1', 0);
      expect(resZero.success).toBe(false);
      const resNeg = shopManager.buyItem('item_egg_tier1', -2);
      expect(resNeg.success).toBe(false);
      const resFloat = shopManager.buyItem('item_egg_tier1', 1.5);
      expect(resFloat.success).toBe(false);
    });
  });

  describe('道具背包使用与灵宠成长系统联动 (Consumables Usage & Stat Growth)', () => {
    it('使用凝灵经验丹为宠物注入经验并触发平滑升级与四维成长', () => {
      // 拥有 1 只初始宠物
      const pet = playerState.ownedPets[0];
      expect(pet).toBeDefined();
      const oldLevel = pet.level;
      const oldHp = pet.maxHp;

      playerState.inventory['item_exp_pill_s'] = 2; // 2 颗小经验丹 (+500 * 2)

      const useRes = playerState.useItem('item_exp_pill_s', pet.instanceId);
      expect(useRes.success).toBe(true);
      expect(useRes.report).toBeDefined();
      expect(pet.level).toBeGreaterThan(oldLevel);
      expect(pet.maxHp).toBeGreaterThan(oldHp);
      expect(playerState.inventory['item_exp_pill_s']).toBe(1); // 扣除 1 颗
    });

    it('使用造化洗髓丹：在种族区间内重新 Reroll 资质并附加【洗髓脱胎】特性', () => {
      const pet = playerState.ownedPets[0];
      playerState.inventory['item_wash_pill'] = 1;

      const res = playerState.useItem('item_wash_pill', pet.instanceId);
      expect(res.success).toBe(true);
      expect(playerState.inventory['item_wash_pill']).toBeUndefined(); // 消耗完毕自动清理键值
      expect(pet.traits).toContain('洗髓脱胎');

      // 验证重构后的成长资质仍在原生种族区间内
      const ranges = getPetGrowthRanges(pet.tier, pet.race);
      expect(pet.growth.hpGrowth).toBeGreaterThanOrEqual(ranges.hp.min);
      expect(pet.growth.atkGrowth).toBeGreaterThanOrEqual(ranges.atk.min);
    });

    it('使用回春术古卷：灵宠成功领悟新技能【春风拂体/回春术】，重复学习被拦截', () => {
      const pet = playerState.ownedPets[0];
      playerState.inventory['item_scroll_heal'] = 2;

      // 首次学习
      const res1 = playerState.useItem('item_scroll_heal', pet.instanceId);
      expect(res1.success).toBe(true);
      expect(pet.skills).toContain('skill_spring_heal');
      expect(pet.equippedSkills).toContain('skill_spring_heal');
      expect(playerState.inventory['item_scroll_heal']).toBe(1);

      // 重复学习同一技能被拦截
      const res2 = playerState.useItem('item_scroll_heal', pet.instanceId);
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('无需重复领悟');
      expect(playerState.inventory['item_scroll_heal']).toBe(1); // 未消耗
    });

    it('道具数量不足或未选定目标灵宠时拦截', () => {
      const pet = playerState.ownedPets[0];
      // 背包无该道具
      const resNoItem = playerState.useItem('item_exp_pill_l', pet.instanceId);
      expect(resNoItem.success).toBe(false);
      expect(resNoItem.message).toContain('数量不足');

      // 有道具但未提供目标宠物
      playerState.inventory['item_exp_pill_s'] = 1;
      const resNoTarget = playerState.useItem('item_exp_pill_s', undefined);
      expect(resNoTarget.success).toBe(false);
      expect(resNoTarget.message).toContain('选定要使用该道具的灵宠');
    });
  });

  describe('存档持久化与向下兼容性 (Persistence & Compatibility)', () => {
    it('背包道具能够完整被 exportSaveData 导出并被 importSaveData 还原', () => {
      playerState.gold = 3500;
      playerState.inventory = {
        item_exp_pill_s: 5,
        item_exp_pill_l: 2,
        item_wash_pill: 1
      };

      const jsonStr = playerState.exportSaveData();
      expect(jsonStr).toContain('"item_exp_pill_s": 5');

      const newPlayerState = new PlayerState();
      newPlayerState.reset();
      expect(Object.keys(newPlayerState.inventory).length).toBe(0);

      const restoreRes = newPlayerState.importSaveData(jsonStr);
      expect(restoreRes.success).toBe(true);
      expect(newPlayerState.gold).toBe(3500);
      expect(newPlayerState.inventory['item_exp_pill_s']).toBe(5);
      expect(newPlayerState.inventory['item_exp_pill_l']).toBe(2);
      expect(newPlayerState.inventory['item_wash_pill']).toBe(1);
    });

    it('导入不含 inventory 字段的旧存档时，优雅兼容初始化为空背包', () => {
      const legacySave = JSON.stringify({
        version: '2.0',
        gold: 888,
        characterLevel: 5,
        characterExp: 100,
        ownedPets: []
      });

      const restored = new PlayerState();
      const res = restored.importSaveData(legacySave);
      expect(res.success).toBe(true);
      expect(restored.gold).toBe(888);
      expect(restored.inventory).toEqual({});
    });
  });
});
