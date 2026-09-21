# 模块二：宠物基因融合与技能配方系统 (Pet Breeding & Genetics Engine)

## 1. 深度思考与设计目标 (Design Goals & Nuances)

宠物培育与融合是整个游戏的心流中枢。如果设计不当，极易出现两个极端：
- **过于随机（纯脸黑）**：玩家耗费几小时抓的宠物，一合出来全是垃圾技能，导致直接弃坑；
- **过于确定（无惊喜）**：只要看固定攻略表，完全沦为流水线作业，丧失探索欲。

本模块的核心设计目标是：**“有目标感（确定性升阶与神技锁定）” + “有惊喜感（基因突变与隐藏配方）” + “有兜底与容错（反悔与回炉重铸）”**。

---

## 2. 融合配方判定算法 (Breeding Algorithm Pipeline)

当玩家在【基因研究所】将 `ParentA` 与 `ParentB` 放入合成槽时，系统按以下严格的优先级管道执行：

```
[输入 ParentA & ParentB]
        │
        ▼
[步骤 1: 查特殊配方表 (Exact Recipe Match)]
        ├──> (命中) ──> 100% 生成指定目标品种 (如: 火蜥蜴 + 岩壳龟 = 熔岩巨兽)
        └──> (未命中) ──> 进入步骤 2
                │
                ▼
[步骤 2: 查通用种族与阶级矩阵 (Generic Matrix Match)]
        ├──> 阶级计算: 基础阶级 = max(TierA, TierB)
        │              若 TierA == TierB, 80%概率升阶 (+1 Tier, 上限T4), 20%保持同阶高资质
        └──> 种族计算: 查种族融合表 [RaceA][RaceB] -> 确定子代种族，在该种族同阶池中随机抽选
                │
                ▼
[步骤 3: 属性资质继承与方差计算 (Stat Growth Inheritance)]
                │
                ▼
[步骤 4: 技能继承池抽取与技能锁定判定 (Skill Inheritance)]
                │
                ▼
[步骤 5: 基因突变检测 (Mutation Check)]
                │
                ▼
[输出子代宠物预览 / 确认合成]
```

### 2.1 种族融合矩阵表示例 (Race Intersection Matrix)

| ParentA \ ParentB | 野兽系 (Beast) | 龙系 (Dragon) | 元素系 (Elemental) | 不死系 (Undead) |
| :--- | :--- | :--- | :--- | :--- |
| **野兽系** | 野兽系 | 龙系 (偏物理) | 变异兽 (附带元素) | 骸骨兽 |
| **龙系** | 龙系 (偏物理) | 远古真龙 | 元素巨龙 | 幽冥骨龙 |
| **元素系** | 变异兽 (附带元素)| 元素巨龙 | 复合元素体 | 恶灵体 |
| **不死系** | 骸骨兽 | 幽冥骨龙 | 恶灵体 | 亡灵领主 |

---

## 3. 资质遗传与代数膨胀抑制机制 (Stat Inheritance & Generation Cap)

### 3.1 资质遗传公式（均值回归与微小浮动）
为了避免“无限杂交导致数值无上限膨胀”，资质增长遵循**均值回归模型**：

$$\text{ChildGrowth} = \frac{\text{Growth}_A + \text{Growth}_B}{2} + \text{Random}(-0.05, +0.08) \times \text{TierFactor}$$

- 每种宠物的资质上限严格受其物种品阶（Tier 1~4）的上限截断（Cap）；
- 只有通过升阶到更高阶的物种（如从 T2 熔岩巨兽 升到 T3 狱火炎龙），才能突破原物种的资质天花板。

### 3.2 代数标记 (Generation Tag)
- 子代代数 $\text{Gen}_{child} = \max(\text{Gen}_A, \text{Gen}_B) + 1$；
- 代数越高，子代在合成时提供微量初始经验加成，但不直接影响无上限战斗数值，保证平衡。

---

## 4. 技能继承与打书系统详细规则 (Skills & Gene Inheritance)

### 4.1 技能栏位规格（6 个格子）
每个宠物最多拥有 **6 个技能槽**：
1. **槽位 1：物种固有技 (Innate Skill)** —— 随物种固定，100% 保留，不可被覆盖。
2. **槽位 2~4：基础技能槽 (Basic Slots)** —— 合成默认开放，由父母技能遗传或打书填充。
3. **槽位 5~6：高阶基因潜能槽 (Potential Slots)** —— T3/T4 宠物解锁，或消耗“基因扩容晶核”解锁。

### 4.2 遗传算法与锁定机制
```typescript
interface SkillCandidate {
  skillId: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  source: 'PARENT_A' | 'PARENT_B';
}

function inheritSkills(parentA: Pet, parentB: Pet, lockedSkillId?: string): string[] {
  const result: string[] = [];
  
  // 1. 如果使用了基因稳定剂，强制继承锁定技能
  if (lockedSkillId) {
    result.push(lockedSkillId);
  }
  
  // 2. 提取父母双方所有非固有技能并去重
  const pool = getNonInnateUniqueSkills(parentA, parentB)
    .filter(id => id !== lockedSkillId);
    
  // 3. 概率抽取
  for (const skill of pool) {
    if (result.length >= 4) break; // 基础槽位上限
    const rate = skill.rarity === 'EPIC' ? 0.35 : (skill.rarity === 'RARE' ? 0.50 : 0.70);
    if (Math.random() < rate) {
      result.push(skill.id);
    }
  }
  
  // 4. 保底机制：若未锁定且概率全落空，保底抽取1个
  if (result.length === 0 && pool.length > 0) {
    result.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  
  return result;
}
```

### 4.3 基因突变机制 (Beneficial Mutation)
- 每次合成固定有 $5\%$ 的独立突变判定；
- 突变不会覆盖已有技能，而是以“特殊基因光环 (Trait)”形式赋予子代（如【神圣之躯：全属性抗性+20%】、【绝境潜能：血量低于30%时必定暴击】）；
- 突变光环可以被后代继续以 $30\%$ 概率继承。

### 4.4 技能打书机制 (Skill Book Inscription)
- 玩家可使用【技能秘笈】直接让宠物习得新技能；
- 若有空闲槽位，直接填入；
- 若技能槽已满，弹出 UI 让玩家**手动选择覆盖哪一个现有技能**，杜绝“随机顶掉极品技能”的极度负面体验。

---

## 5. 防挫败与回炉保底机制 (Anti-Frustration Mechanics)

为杜绝合成失败带来的巨大挫败感，设计两项核心保底机制：

1. **基因回炉重铸 (Gene Reclaim)**：
   - 玩家若对合成产出的属性不满意，可在合成完成界面选择“回炉重铸”；
   - 消耗少量金币，返还 1 个“纯净基因精粹（可直接兑换任意指定技能书）”，使每一次“失败”的合成都为下一次积累硬通货。
2. **合成结果预览 (Breg-Preview)**：
   - 在按下最终合成按钮前，UI 会清晰展示：
     - 可能产出的子代物种范围与概率（如：80% 熔岩巨兽 / 20% 高级火蜥蜴）；
     - 可继承的技能候选池与各自的命中率；
     - 让玩家对风险有充分预期，属于“明牌博弈”。
