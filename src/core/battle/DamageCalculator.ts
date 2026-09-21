import { BattleUnit, SkillConfig, SkillEffect } from '../types.ts';

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  reflectedDamage: number;
  mitigationPercent: number;
  details: string;
}

export class DamageCalculator {
  /**
   * 综合伤害流水线计算
   */
  public static calculate(
    attacker: BattleUnit,
    target: BattleUnit,
    _skill: SkillConfig,
    effect: SkillEffect
  ): DamageResult {
    // 1. 基础区计算
    const baseFlat = effect.baseFlat || 0;
    const multiplier = effect.multiplier || 1.0;
    
    let statVal = attacker.atk;
    if (effect.scalingStat === 'DEF') statVal = attacker.def;
    if (effect.scalingStat === 'SPD') statVal = attacker.spd;
    
    const baseDamage = baseFlat + statVal * multiplier;
    
    // 2. 防御减免区 (非线性防御衰减)
    const armorPen = 0; // 基础破甲
    const effectiveDef = Math.max(0, target.def * (1 - armorPen));
    const mitigationCoeff = 1000 / (1000 + effectiveDef);
    
    // 3. 暴击判定区
    let isCrit = Math.random() < attacker.critRate;
    // 检查是否有必定暴击的 Buff (如战术超载)
    const hasForceCrit = attacker.buffs.some(b => b.effect.type === 'OVERLOAD');
    if (hasForceCrit) {
      isCrit = true;
    }
    const critMultiplier = isCrit ? attacker.critDmg : 1.0;
    
    // 4. 指挥与弱点乘区 (针对宠物攻击受到角色弱点标记加成)
    let vulnerabilityMultiplier = 1.0;
    if (attacker.type === 'PET') {
      const vulnBuff = target.buffs.find(b => b.effect.type === 'VULNERABILITY');
      if (vulnBuff && vulnBuff.effect.value) {
        vulnerabilityMultiplier = 1.0 + vulnBuff.effect.value; // 如 1 + 1.5 = 2.5倍
      }
    }
    
    // 5. 最终伤害合成
    const damageBeforeMitigation = baseDamage * critMultiplier * vulnerabilityMultiplier;
    const finalDamage = Math.max(1, Math.round(damageBeforeMitigation * mitigationCoeff));
    
    // 6. 荆棘反弹计算 (受击方拥有 THORNS_AURA)
    let reflectedDamage = 0;
    const thornsBuff = target.buffs.find(b => b.effect.type === 'THORNS_AURA');
    if (thornsBuff && thornsBuff.effect.value) {
      reflectedDamage = Math.round(finalDamage * thornsBuff.effect.value);
    }
    
    return {
      rawDamage: Math.round(damageBeforeMitigation),
      finalDamage,
      isCrit,
      reflectedDamage,
      mitigationPercent: Math.round((1 - mitigationCoeff) * 100),
      details: `[${attacker.name}] 对 [${target.name}] 造成 ${finalDamage} 伤害${isCrit ? ' (💥暴击!)' : ''}${vulnerabilityMultiplier > 1 ? ` (🎯弱点增幅 x${vulnerabilityMultiplier})` : ''}`
    };
  }
}
