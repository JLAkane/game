import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerState } from '../src/core/player/PlayerState.ts';
import { ClassManager } from '../src/core/classes/ClassManager.ts';
import classesData from '../src/data/classes.json';
import { CharacterClassConfig, PetInstance } from '../src/core/types.ts';

describe('Data Local File Persistence System (本地物理文件存储体系)', () => {
  let playerState: PlayerState;
  const classes = classesData as CharacterClassConfig[];
  let mockStorage: Record<string, string> = {};
  let mockFetchHistory: Array<{ url: string; method: string; body?: string }> = [];
  let mockFileContent: string | null = null;

  beforeEach(() => {
    mockStorage = {};
    mockFetchHistory = [];
    mockFileContent = null;

    // 模拟浏览器 localStorage，专门用于验证绝不写入 localStorage
    const storageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };

    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', { localStorage: storageMock });

    // 模拟 fetch 对应 Vite localFileStoragePlugin 的 /api/save, /api/load, /api/clear
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method || 'GET').toUpperCase();
      const body = init?.body ? String(init.body) : undefined;
      mockFetchHistory.push({ url, method, body });

      if (url === '/api/save' && method === 'POST') {
        mockFileContent = body || null;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, path: './save.json' })
        };
      }

      if (url === '/api/load' && method === 'GET') {
        if (mockFileContent !== null) {
          return {
            ok: true,
            status: 200,
            json: async () => JSON.parse(mockFileContent!)
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({ notFound: true })
          };
        }
      }

      if (url === '/api/clear' && method === 'POST') {
        mockFileContent = null;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    playerState = PlayerState.getInstance();
    playerState.clearBoundFileHandle();
    playerState.reset();
  });

  describe('零 LocalStorage 占用验证 (Strict Negative Constraint)', () => {
    it('当修改金币、经验、配置或调用保存时，严禁向 localStorage 写入存档数据', async () => {
      playerState.addGold(300);
      playerState.addCharacterExp(50);
      playerState.setSelectedStageId('stage_1_3');
      await playerState.saveToLocalFile();

      // 验证 localStorage.setItem 从未被用来写入存档数据
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(mockStorage['akane_player_state_v3']).toBeUndefined();
      expect(mockStorage['akane_player_state_v2']).toBeUndefined();
      expect(mockStorage['akane_player_state_v1']).toBeUndefined();
    });

    it('初始化或清除时，应主动清理历史可能残留的旧 localStorage 项', () => {
      mockStorage['akane_player_state_v1'] = 'legacy_1';
      mockStorage['akane_player_state_v2'] = 'legacy_2';
      mockStorage['akane_player_state_v3'] = 'legacy_3';

      playerState.clearStorage();

      expect(mockStorage['akane_player_state_v1']).toBeUndefined();
      expect(mockStorage['akane_player_state_v2']).toBeUndefined();
      expect(mockStorage['akane_player_state_v3']).toBeUndefined();
    });
  });

  describe('本地物理文件 save.json 持久化与异步自动同步', () => {
    it('saveToLocalFile 应通过 POST /api/save 将全部游戏状态写入本地物理文件', async () => {
      playerState.gold = 1500;
      playerState.characterLevel = 6;
      playerState.characterExp = 80;
      playerState.clearedStageIds = ['stage_1_1', 'stage_1_2'];

      const res = await playerState.saveToLocalFile();
      expect(res.success).toBe(true);

      const saveCall = mockFetchHistory.find(h => h.url === '/api/save');
      expect(saveCall).toBeDefined();
      expect(saveCall?.method).toBe('POST');
      expect(mockFileContent).not.toBeNull();

      const savedJson = JSON.parse(mockFileContent!);
      expect(savedJson.gold).toBe(1500);
      expect(savedJson.characterLevel).toBe(6);
      expect(savedJson.clearedStageIds).toEqual(['stage_1_1', 'stage_1_2']);
    });

    it('initFromLocalFile 应通过 GET /api/load 读取本地物理文件并完整恢复状态', async () => {
      // 预先写入本地文件内容
      const mockSavedState = {
        version: '3.1',
        saveTime: 1727160000000,
        gold: 2500,
        characterLevel: 8,
        characterExp: 220,
        clearedStageIds: ['stage_1_1', 'stage_1_2', 'stage_1_3'],
        activeClassId: 'TACTICAL_COMMANDER',
        characterCustomSlots: {
          novice: ['skill_char_slash', '', ''],
          classes: {}
        },
        ownedPets: [],
        teamPets: [],
        petEggs: [],
        selectedStageId: 'stage_1_4'
      };
      mockFileContent = JSON.stringify(mockSavedState);

      // 重设当前状态并从本地文件初始化
      playerState.gold = 0;
      playerState.characterLevel = 1;
      playerState.characterExp = 0;
      playerState.clearedStageIds = [];

      const loadSuccess = await playerState.initFromLocalFile();
      expect(loadSuccess).toBe(true);

      expect(playerState.gold).toBe(2500);
      expect(playerState.characterLevel).toBe(8);
      expect(playerState.characterExp).toBe(220);
      expect(playerState.clearedStageIds).toEqual(['stage_1_1', 'stage_1_2', 'stage_1_3']);
      expect(playerState.selectedStageId).toBe('stage_1_4');
      expect(playerState.characterCustomSlots.novice[0]).toBe('skill_char_slash');
    });

    it('当本地文件不存在 (notFound) 时，initFromLocalFile 应优雅返回 false 并不破坏初始状态', async () => {
      mockFileContent = null; // 无本地存档文件
      const loadSuccess = await playerState.initFromLocalFile();
      expect(loadSuccess).toBe(false);
      expect(playerState.gold).toBe(500);
      expect(playerState.characterLevel).toBe(1);
    });
  });

  describe('File System Access API 本地文件句柄绑定支持', () => {
    it('当用户绑定本地文件句柄时，saveToLocalFile 应优先写入绑定的文件句柄', async () => {
      let writtenData = '';
      const mockWritable = {
        write: vi.fn(async (content: string) => {
          writtenData = content;
        }),
        close: vi.fn(async () => {})
      };
      const mockHandle = {
        name: 'my_custom_rpg_save.json',
        createWritable: vi.fn(async () => mockWritable)
      };

      playerState.setBoundFileHandle(mockHandle, 'my_custom_rpg_save.json');
      expect(playerState.getBoundFileName()).toBe('my_custom_rpg_save.json');

      playerState.gold = 3333;
      await playerState.saveToLocalFile();

      expect(mockHandle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalled();
      expect(mockWritable.close).toHaveBeenCalled();

      const parsed = JSON.parse(writtenData);
      expect(parsed.gold).toBe(3333);
    });

    it('解除绑定后应清空句柄', () => {
      playerState.setBoundFileHandle({ name: 'test.json' }, 'test.json');
      expect(playerState.getBoundFileName()).toBe('test.json');
      playerState.clearBoundFileHandle();
      expect(playerState.getBoundFileName()).toBe('');
    });
  });

  describe('灵宠与出战队伍持久化及引用同一性', () => {
    it('灵宠实例的四维、经验、携带技能应完整持久化，恢复后 teamPets 与 ownedPets 保持同一引用', async () => {
      const pet: PetInstance = {
        instanceId: 'test_pet_001',
        configId: 'pet_wolf',
        name: '苍原幼狼',
        level: 3,
        exp: 80,
        tier: 1,
        race: 'BEAST',
        element: 'WOOD',
        currentHp: 200,
        maxHp: 200,
        atk: 35,
        def: 20,
        spd: 95,
        critRate: 0.05,
        critDmg: 1.5,
        growth: { hpGrowth: 18, atkGrowth: 3.5, defGrowth: 2.0, spdGrowth: 1.5 },
        innateSkillId: 'skill_monster_bite',
        skills: ['skill_basic_strike', 'skill_monster_bite', 'skill_rock_armor'],
        equippedSkills: ['skill_basic_strike', 'skill_monster_bite'],
        traits: ['破壳初生'],
        generation: 1
      };

      playerState.ownedPets = [pet];
      playerState.teamPets = [pet];
      await playerState.saveToLocalFile();

      // 清空并重新从本地文件读取
      playerState.ownedPets = [];
      playerState.teamPets = [];
      await playerState.initFromLocalFile();

      expect(playerState.ownedPets).toHaveLength(1);
      expect(playerState.teamPets).toHaveLength(1);
      expect(playerState.ownedPets[0].level).toBe(3);
      expect(playerState.ownedPets[0].exp).toBe(80);
      expect(playerState.ownedPets[0].equippedSkills).toEqual(['skill_basic_strike', 'skill_monster_bite']);

      // 验证出战队伍对象与仓库宠物对象是同一内存引用
      expect(playerState.teamPets[0]).toBe(playerState.ownedPets[0]);
    });
  });

  describe('职业与战术技能槽位持久化联动 (ClassManager)', () => {
    it('在见习阶段装配技能，应同步至 PlayerState 内存并在重载时恢复', () => {
      playerState.characterLevel = 3;
      const manager1 = new ClassManager(classes, playerState);

      const equipRes = manager1.equipSkill('TACTICAL_COMMANDER', 0, 'skill_char_slash');
      expect(equipRes).toBe(true);
      expect(playerState.characterCustomSlots.novice[0]).toBe('skill_char_slash');

      // 模拟页面重新加载
      const manager2 = new ClassManager(classes, playerState);
      const equipped = manager2.getEquippedSkills();
      expect(equipped).toContain('skill_char_slash');
    });

    it('转职切换职业时，activeClassId 应立即同步', () => {
      playerState.characterLevel = 10;
      playerState.gold = 1000;
      const manager = new ClassManager(classes, playerState);

      const switchRes = manager.switchClass('IRON_VANGUARD');
      expect(switchRes.success).toBe(true);
      expect(playerState.activeClassId).toBe('IRON_VANGUARD');
    });
  });

  describe('导出与导入存档 (Export / Import Backup)', () => {
    it('exportSaveData 应生成合法格式且包含当前全部游戏进度的 JSON 字符串', () => {
      playerState.gold = 999;
      playerState.characterLevel = 8;
      const jsonStr = playerState.exportSaveData();

      expect(typeof jsonStr).toBe('string');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.gold).toBe(999);
      expect(parsed.characterLevel).toBe(8);
      expect(parsed.version).toBe('3.1');
    });

    it('importSaveData 能够完整导入并覆盖现有状态', () => {
      const backupData = {
        version: '3.1',
        gold: 8888,
        characterLevel: 15,
        characterExp: 340,
        clearedStageIds: ['stage_1_1', 'stage_1_2', 'stage_1_3'],
        activeClassId: 'TACTICAL_COMMANDER',
        characterCustomSlots: {
          novice: ['skill_char_slash', '', ''],
          classes: {}
        },
        ownedPets: [],
        teamPets: [],
        petEggs: []
      };

      const res = playerState.importSaveData(JSON.stringify(backupData));
      expect(res.success).toBe(true);
      expect(playerState.gold).toBe(8888);
      expect(playerState.characterLevel).toBe(15);
      expect(playerState.clearedStageIds).toHaveLength(3);
      expect(playerState.activeClassId).toBe('TACTICAL_COMMANDER');
    });

    it('importSaveData 输入非法 JSON 时应安全拦截并返回错误信息', () => {
      const res = playerState.importSaveData('invalid json content');
      expect(res.success).toBe(false);
      expect(res.message).toContain('解析失败');
    });
  });

  describe('重置与清空本地物理文件 (Clear & Reset)', () => {
    it('调用 clearLocalFile 应向 /api/clear 发送请求并清空存储', async () => {
      playerState.gold = 5000;
      playerState.characterLevel = 20;
      await playerState.saveToLocalFile();
      expect(mockFileContent).not.toBeNull();

      await playerState.clearLocalFile();
      expect(mockFileContent).toBeNull();

      const clearCall = mockFetchHistory.find(h => h.url === '/api/clear');
      expect(clearCall).toBeDefined();
      expect(clearCall?.method).toBe('POST');

      playerState.reset();
      expect(playerState.gold).toBe(500);
      expect(playerState.characterLevel).toBe(1);
      expect(playerState.characterExp).toBe(0);
      expect(playerState.clearedStageIds).toHaveLength(0);
      expect(playerState.teamPets).toHaveLength(0);
      expect(playerState.ownedPets).toHaveLength(0);
      expect(playerState.activeClassId).toBeUndefined();
    });
  });
});

