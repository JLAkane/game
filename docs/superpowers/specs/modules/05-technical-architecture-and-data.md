# 模块五：技术架构、数据Schema与工程落地规范 (Technical Architecture & Engineering Plan)

## 1. 软件工程分层架构原则 (Software Architecture Principles)

为了保证游戏核心逻辑的纯粹性与可维护性，遵循以下架构设计规范：
- **逻辑表现彻底解耦 (Headless-First)**：所有回合制战斗计算、属性增益、基因遗传合成均为**纯 TypeScript 类与函数**，完全脱离 DOM 与 Canvas。这使得所有核心机制可以在无界面的 Node 环境下以毫秒级运行自动化单元测试。
- **发布-订阅事件总线 (Event-Driven Communication)**：核心逻辑层通过触发事件（如 `ENTITY_DAMAGED`, `BUFF_APPLIED`, `TURN_STARTED`, `PET_SYNTHESIZED`）通知表现层播放动画或飘字。表现层无需关心数值公式。

```
┌─────────────────────────────────────────────────────────────┐
│                    表现层 (Presentation Layer)               │
│   - UI View: 背包、基因合成面板、职业切换与加点界面 (HTML/CSS)  │
│   - Battle Canvas: 精灵渲染、动画补间、伤害飘字、血条渲染   │
└──────────────────────────────┬──────────────────────────────┘
                               ▲ 订阅事件 (EventBus)
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                  核心领域逻辑层 (Domain Core Layer)          │
│   - BattleEngine: 回合调度、行动轴计算、行动命令处理        │
│   - DamageCalculator: 乘区结算、暴击、防御与指挥修正        │
│   - BreedingEngine: 配方匹配、技能遗传、突变抽取            │
│   - ClassManager: 职业技能树、战术点(TP)与协同指挥          │
└──────────────────────────────┬──────────────────────────────┘
                               │ 读取配置 / 读写状态
┌──────────────────────────────▼──────────────────────────────┐
│                    数据与存档层 (Data & Persistence)         │
│   - 配置静态库: pets.json, skills.json, recipes.json        │
│   - 存档管理器: SaveManager (LocalStorage, JSON 导出导入)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 强类型接口与配置 Schema (TypeScript Types)

### 2.1 宠物与个体实例定义
```typescript
export type ElementType = 'FIRE' | 'WATER' | 'WOOD' | 'THUNDER' | 'LIGHT' | 'DARK';
export type RaceType = 'BEAST' | 'DRAGON' | 'ELEMENTAL' | 'UNDEAD' | 'MECHANIC';
export type PetTier = 1 | 2 | 3 | 4; // T1(普通), T2(稀有), T3(史诗), T4(传说)

export interface PetConfig {
  id: string;              // 如 "pet_fire_lizard"
  name: string;            // 如 "火尾蜥"
  tier: PetTier;
  race: RaceType;
  element: ElementType;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  innateSkillId: string;   // 专属固有技能
  spriteKey: string;       // 资源贴图标识
}

export interface PetInstance {
  instanceId: string;      // 唯一 UUID
  configId: string;
  name: string;
  level: number;
  exp: number;
  tier: PetTier;
  race: RaceType;
  element: ElementType;
  currentHp: number;
  // 实时成长属性
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;        // 如 0.15 表示 15%
  critDmg: number;         // 如 1.5 表示 150%
  // 资质系数 (均值+浮动)
  growthRate: {
    hpGrowth: number;
    atkGrowth: number;
    defGrowth: number;
  };
  innateSkillId: string;
  skills: string[];        // 习得的技能 ID 列表 (最多 6 个)
  traits: string[];        // 变异获得的被动词条 (如 "TRAIT_BERSERK")
  generation: number;      // 杂交代数
}
```

### 2.2 配方表配置 Schema
```typescript
export interface SpecialRecipeConfig {
  parentA: string;         // 明确配置ID，如 "pet_fire_lizard"
  parentB: string;         // 明确配置ID，如 "pet_rock_turtle"
  childId: string;         // 产出配置ID，如 "pet_magma_behemoth"
  minTierRequirement?: number;
}

export interface GenericMatrixRule {
  raceA: RaceType;
  raceB: RaceType;
  resultRace: RaceType;
}
```

### 2.3 技能与效果结构
```typescript
export type SkillType = 'ACTIVE' | 'PASSIVE' | 'COMMAND';
export type TargetType = 'SELF' | 'SINGLE_ENEMY' | 'ALL_ENEMIES' | 'SINGLE_ALLY' | 'ALL_ALLIES';

export interface SkillEffect {
  type: 
    | 'DEAL_DAMAGE'          // 造成伤害
    | 'BUFF_STAT'            // 增益属性
    | 'VULNERABILITY'        // 赋予弱点
    | 'EXTRA_TURN'           // 战术再动
    | 'THORNS_AURA'          // 荆棘反弹
    | 'RESTORE_ENERGY';      // 恢复能量
  scalingStat?: 'ATK' | 'DEF' | 'SPD';
  multiplier?: number;       // 技能倍率
  value?: number;            // 固定值或百分比数值
  durationTurns?: number;
  chance?: number;           // 触发概率 (0~1)
}

export interface SkillConfig {
  id: string;
  name: string;
  desc: string;
  type: SkillType;
  targetType: TargetType;
  costTp?: number;           // 角色战术点消耗
  costMp?: number;           // 宠物魔法消耗
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  inheritRate: number;       // 遗传给子代的概率 (如 0.6)
  effects: SkillEffect[];
}
```

---

## 3. 本地存档与数据迁移策略 (SaveManager & Migration)

游戏采用本地单机存档，保障用户数据安全与版本向后兼容：
- **存储载体**：HTML5 `window.localStorage`。
- **存档结构**：
  ```json
  {
    "version": 1,
    "timestamp": 1758412800000,
    "player": {
      "name": "驯兽学者",
      "level": 25,
      "currentClass": "TACTICAL_COMMANDER",
      "talents": { "HEAVY_CLEAVE": 5, "VULNERABILITY_BEACON": 3 },
      "gold": 12500,
      "memoryCrystals": 4
    },
    "team": ["pet-uuid-1", "pet-uuid-2"],
    "petInventory": [ /* 所有的 PetInstance 数组 */ ],
    "unlockedRecipes": ["fire_lizard+rock_turtle"],
    "stageProgress": { "currentChapter": 2, "highestStage": 18 }
  }
  ```
- **数据迁移器 (Data Migrator)**：当存档内的 `version` 小于当前代码版本时，执行链式迁移管道（如 `v1ToV2(data) -> v2ToV3(data)`），防止游戏迭代更新后坏档。

---

## 4. 工程目录规范与模块划分

```
d:/work/akane/game/
├── docs/                                # 设计与规范文档
│   └── superpowers/specs/
│       ├── 2026-09-21-pet-nurturing-rpg-design.md
│       └── modules/
│           ├── 01-combat-and-dps-transition.md
│           ├── 02-pet-breeding-and-gene-system.md
│           ├── 03-character-classes-and-synergy.md
│           ├── 04-game-loop-and-economy.md
│           └── 05-technical-architecture-and-data.md
├── src/
│   ├── core/                            # 纯逻辑层 (Headless)
│   │   ├── battle/                      # 战斗状态机与结算
│   │   ├── breeding/                    # 基因合成与继承引擎
│   │   ├── classes/                     # 角色职业与指挥技能
│   │   └── economy/                     # 掉落与资源仓库
│   ├── data/                            # 静态配置 JSON
│   │   ├── pets.json
│   │   ├── skills.json
│   │   ├── recipes.json
│   │   └── classes.json
│   ├── presentation/                    # 表现层 (UI + Canvas)
│   │   ├── battle/                      # 战斗画布与特效
│   │   ├── ui/                          # 合成台、背包、技能树面板
│   │   └── audio/                       # 音乐音效管理器
│   └── main.ts                          # 应用入口
├── tests/                               # 核心逻辑单元测试 (Vitest)
│   ├── battle.test.ts
│   └── breeding.test.ts
├── index.html
├── package.json
└── tsconfig.json
```
