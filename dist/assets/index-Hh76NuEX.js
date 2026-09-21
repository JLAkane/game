var A=Object.defineProperty;var M=(p,e,t)=>e in p?A(p,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):p[e]=t;var d=(p,e,t)=>M(p,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function t(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(s){if(s.ep)return;s.ep=!0;const i=t(s);fetch(s.href,i)}})();class E{static calculate(e,t,a,s){const i=s.baseFlat||0,r=s.multiplier||1;let n=e.atk;s.scalingStat==="DEF"&&(n=e.def),s.scalingStat==="SPD"&&(n=e.spd);const c=i+n*r,u=1e3/(1e3+Math.max(0,t.def*(1-0)));let o=Math.random()<e.critRate;e.buffs.some(g=>g.effect.type==="OVERLOAD")&&(o=!0);const f=o?e.critDmg:1;let x=1;if(e.type==="PET"){const g=t.buffs.find(_=>_.effect.type==="VULNERABILITY");g&&g.effect.value&&(x=1+g.effect.value)}const y=c*f*x,b=Math.max(1,Math.round(y*u));let v=0;const k=t.buffs.find(g=>g.effect.type==="THORNS_AURA");return k&&k.effect.value&&(v=Math.round(b*k.effect.value)),{rawDamage:Math.round(y),finalDamage:b,isCrit:o,reflectedDamage:v,mitigationPercent:Math.round((1-u)*100),details:`[${e.name}] 对 [${t.name}] 造成 ${b} 伤害${o?" (💥暴击!)":""}${x>1?` (🎯弱点增幅 x${x})`:""}`}}}class w{constructor(e){d(this,"playerTeam",[]);d(this,"enemyTeam",[]);d(this,"activeUnit",null);d(this,"logs",[]);d(this,"turnCount",0);d(this,"status","READY");d(this,"skillsMap",new Map);e.forEach(t=>this.skillsMap.set(t.id,t))}initBattle(e,t){this.playerTeam=e,this.enemyTeam=t,this.logs=[],this.turnCount=0,this.status="IN_PROGRESS",[...this.playerTeam,...this.enemyTeam].forEach(a=>{a.actionDistance=1e4,a.buffs=[],a.isDead=!1}),this.addLog("系统","战斗开始！","INFO"),this.advanceToNextTurn()}advanceToNextTurn(){if(this.checkBattleOver())return null;const e=[...this.playerTeam,...this.enemyTeam].filter(s=>!s.isDead);if(e.length===0)return null;let t=1/0;e.forEach(s=>{const i=s.actionDistance/Math.max(1,s.spd);i<t&&(t=i)}),e.forEach(s=>{s.actionDistance=Math.max(0,s.actionDistance-t*s.spd)});const a=e.find(s=>s.actionDistance<=.001)||e[0];return this.activeUnit=a,this.turnCount++,a}executeAction(e,t,a){const s=this.findUnitById(e);if(!s||s.isDead)return!1;const i=this.skillsMap.get(t);if(!i)return!1;let r=this.findUnitById(a);return(!r||r.isDead)&&(i.targetType==="SINGLE_ENEMY"?r=(this.isPlayerSide(s)?this.enemyTeam:this.playerTeam).find(c=>!c.isDead):(i.targetType==="ALLY_PET"||i.targetType==="SINGLE_ALLY")&&(r=(this.isPlayerSide(s)?this.playerTeam:this.enemyTeam).find(c=>!c.isDead&&(i.targetType!=="ALLY_PET"||c.type==="PET")))),!r||i.costTp&&s.currentMp<i.costTp||i.costMp&&s.currentMp<i.costMp?!1:(s.currentMp-=i.costTp||i.costMp||0,i.effects.forEach(n=>{switch(n.type){case"DAMAGE":{(i.targetType==="ALL_ENEMIES"?this.isPlayerSide(s)?this.enemyTeam.filter(l=>!l.isDead):this.playerTeam.filter(l=>!l.isDead):[r]).forEach(l=>{const m=E.calculate(s,l,i,n);l.currentHp=Math.max(0,l.currentHp-m.finalDamage),this.addLog(s.name,`施展【${i.name}】对 [${l.name}] 造成 ${m.finalDamage} 点伤害${m.isCrit?" 💥暴击!":""}`,"DAMAGE",l.name,m.finalDamage,m.isCrit),m.reflectedDamage>0&&!s.isDead&&(s.currentHp=Math.max(0,s.currentHp-m.reflectedDamage),this.addLog(l.name,`【荆棘反伤】对 [${s.name}] 反震 ${m.reflectedDamage} 点伤害！`,"DAMAGE"),s.currentHp<=0&&(s.isDead=!0,this.addLog("系统",`[${s.name}] 倒下了！`,"DEATH"))),l.currentHp<=0&&(l.isDead=!0,this.addLog("系统",`[${l.name}] 阵亡！`,"DEATH"))});break}case"OVERLOAD":{const c=Math.max(1,Math.round(r.currentHp*.1));r.currentHp=Math.max(1,r.currentHp-c);const l=Math.round(r.atk*(n.statPercent||1.5));r.atk+=l,r.buffs.push({id:`overload_${Date.now()}`,name:"战术超载",effect:n,remainingTurns:n.turns||1,sourceId:s.id}),this.addLog(s.name,`对 [${r.name}] 注射【战术超载】！扣除 ${c} HP，攻击力暴增 +${l}，必定暴击！`,"COMMAND");break}case"VULNERABILITY":{r.buffs.push({id:`vuln_${Date.now()}`,name:"弱点标记",effect:n,remainingTurns:n.turns||2,sourceId:s.id}),this.addLog(s.name,`向 [${r.name}] 发射【弱点指示】！受到宠物的伤害提升 +150%！`,"COMMAND");break}case"EXTRA_TURN":{r.actionDistance=0,this.addLog(s.name,`发动【战术再动号令】！[${r.name}] 立即插队获得额外行动回合！`,"COMMAND");break}case"THORNS_AURA":{(i.targetType==="ALL_ALLIES"?(this.isPlayerSide(s)?this.playerTeam:this.enemyTeam).filter(l=>!l.isDead):[r]).forEach(l=>{l.buffs.push({id:`thorns_${Date.now()}`,name:"荆棘共鸣",effect:n,remainingTurns:n.turns||2,sourceId:s.id})}),this.addLog(s.name,"开启【荆棘共鸣指令】！全体获得 300% 伤害受击反弹！","COMMAND");break}case"BUFF_STAT":{if(n.statKey&&n.statPercent){const c=Math.round(r[n.statKey]*n.statPercent);r[n.statKey]+=c,r.buffs.push({id:`buff_${Date.now()}`,name:i.name,effect:n,remainingTurns:n.turns||2,sourceId:s.id}),this.addLog(s.name,`释放【${i.name}】，${r.name} 的 ${n.statKey} 提升了 ${c} 点！`,"BUFF")}break}}}),s.actionDistance=1e4,this.tickBuffs(s),this.checkBattleOver()||this.advanceToNextTurn(),!0)}tickBuffs(e){e.buffs=e.buffs.filter(t=>{if(t.remainingTurns--,t.remainingTurns<=0){if(t.effect.type==="OVERLOAD"&&t.effect.statPercent){const a=Math.round(e.atk-e.atk/(1+t.effect.statPercent));e.atk=Math.max(1,e.atk-a)}if(t.effect.type==="BUFF_STAT"&&t.effect.statKey&&t.effect.statPercent){const a=Math.round(e[t.effect.statKey]-e[t.effect.statKey]/(1+t.effect.statPercent));e[t.effect.statKey]=Math.max(1,e[t.effect.statKey]-a)}return!1}return!0})}checkBattleOver(){const e=this.playerTeam.every(a=>a.isDead);return this.enemyTeam.every(a=>a.isDead)?(this.status="VICTORY",this.addLog("系统","🎉 战斗胜利！敌人全灭！","INFO"),!0):e?(this.status="DEFEAT",this.addLog("系统","💀 队伍阵亡，战斗失败！","INFO"),!0):!1}findUnitById(e){return[...this.playerTeam,...this.enemyTeam].find(t=>t.id===e)}isPlayerSide(e){return this.playerTeam.some(t=>t.id===e.id)}addLog(e,t,a,s,i,r){this.logs.unshift({turn:this.turnCount,sourceName:e,actionName:"",targetName:s,damage:i,isCrit:r,message:t,type:a})}}const T=["【狂怒嗜血：击杀敌人后回复15%最大生命】","【不灭意志：濒死时抵挡一次致命伤害并锁血1点】","【疾风突刺：开局第一回合行动速度提高50%】","【天雷共鸣：暴击伤害额外追加30%真实伤害】"];class D{constructor(e,t,a){d(this,"petConfigs",new Map);d(this,"skillsMap",new Map);d(this,"specialRecipes",[]);e.forEach(s=>this.petConfigs.set(s.id,s)),t.forEach(s=>this.skillsMap.set(s.id,s)),this.specialRecipes=a.specialRecipes}previewFusion(e,t){const a=this.findSpecialRecipe(e.configId,t.configId);let s,i=!1,r="",n=Math.max(e.tier,t.tier);a?(s=this.petConfigs.get(a.childId),i=!0,r=a.desc,n=a.tier):(e.tier===t.tier&&e.tier<4&&(n=e.tier+1),s=this.findFallbackChild(e,t,n),r=`通用基因合成：${e.name} (T${e.tier}) + ${t.name} (T${t.tier}) 产出 T${n} 宠物`);const c=this.getCandidateSkills(e,t);return{targetConfig:s,targetTier:n,isSpecialRecipe:i,recipeDesc:r,candidateSkills:c,mutationRate:.05}}executeFusion(e,t,a){const s=this.previewFusion(e,t),i=s.targetConfig,r=Math.random()*.12-.04,n=i.tier*.1,c={hpGrowth:Math.round((e.growth.hpGrowth+t.growth.hpGrowth)/2*(1+r+n)*10)/10,atkGrowth:Math.round((e.growth.atkGrowth+t.growth.atkGrowth)/2*(1+r+n)*10)/10,defGrowth:Math.round((e.growth.defGrowth+t.growth.defGrowth)/2*(1+r+n)*10)/10,spdGrowth:Math.round((e.growth.spdGrowth+t.growth.spdGrowth)/2*(1+r+n)*10)/10},l=[];a&&l.push(a);const m=this.getCandidateSkills(e,t).filter(b=>b.id!==a);if(m.forEach(b=>{if(l.length>=4)return;const v=b.rarity==="EPIC"?.35:b.rarity==="RARE"?.5:.7;Math.random()<v&&l.push(b.id)}),l.length===0&&m.length>0){const b=m[Math.floor(Math.random()*m.length)];l.push(b.id)}const u=Math.random()<.05;let o;const h=[...e.traits||[]];u&&(o=T[Math.floor(Math.random()*T.length)],h.includes(o)||h.push(o));const f=Math.max(e.generation,t.generation)+1,x=[i.innateSkillId,...l];return{child:{instanceId:`pet_${Date.now()}_${Math.floor(Math.random()*1e3)}`,configId:i.id,name:`${i.name} [${f}代]`,level:1,exp:0,tier:i.tier,race:i.race,element:i.element,currentHp:i.baseHp,maxHp:i.baseHp,atk:i.baseAtk,def:i.baseDef,spd:i.baseSpd,critRate:.1,critDmg:1.5,growth:c,innateSkillId:i.innateSkillId,skills:x,traits:h,generation:f},isMutation:u,mutationTrait:o,inheritedSkillIds:l,recipeDesc:s.recipeDesc}}findSpecialRecipe(e,t){return this.specialRecipes.find(a=>a.parentA===e&&a.parentB===t||a.parentA===t&&a.parentB===e)}findFallbackChild(e,t,a){const s=Array.from(this.petConfigs.values()),i=s.find(n=>n.tier===a&&(n.race===e.race||n.race===t.race));if(i)return i;const r=s.find(n=>n.tier===a);return r||this.petConfigs.get(e.configId)}getCandidateSkills(e,t){const a=new Set;[...e.skills,...t.skills].forEach(i=>{i!==e.innateSkillId&&i!==t.innateSkillId&&a.add(i)});const s=[];return a.forEach(i=>{const r=this.skillsMap.get(i);r&&r.inheritRate>0&&s.push(r)}),s}}class ${constructor(e){d(this,"classes",new Map);d(this,"activeClassId","TACTICAL_COMMANDER");d(this,"characterLevel",1);e.forEach(t=>this.classes.set(t.id,t))}get activeClass(){return this.classes.get(this.activeClassId)}getAllClasses(){return Array.from(this.classes.values())}switchClass(e){return this.classes.has(e)?(this.activeClassId=e,!0):!1}createCharacterBattleUnit(e){const t=this.activeClass;return e==="EARLY_GAME"?{id:"player_char",name:`主角 (${t.name})`,type:"CHARACTER",avatar:"🧙‍♂️",level:5,currentHp:450,maxHp:450,currentMp:100,maxMp:100,atk:65,def:30,spd:100,critRate:.15,critDmg:1.5,actionDistance:1e4,skills:t.skills,buffs:[],isDead:!1}:{id:"player_char",name:`主角 (${t.name})`,type:"CHARACTER",avatar:"👑",level:35,currentHp:2800,maxHp:2800,currentMp:200,maxMp:200,atk:120,def:180,spd:110,critRate:.2,critDmg:1.5,actionDistance:1e4,skills:t.skills,buffs:[],isDead:!1}}}class I{constructor(e,t,a){d(this,"container");d(this,"engine");d(this,"skillsMap");d(this,"currentMode","EARLY");d(this,"selectedSkillId",null);d(this,"selectedTargetId",null);this.container=e,this.engine=t,this.skillsMap=new Map(a.map(s=>[s.id,s]))}render(e){e&&(this.currentMode=e),this.initScenario(this.currentMode),this.updateDOM()}initScenario(e){var t,a;if(e==="EARLY"){const s={id:"player_char",name:"主角 (冒险者)",type:"CHARACTER",avatar:"🧙‍♂️",level:5,currentHp:450,maxHp:450,currentMp:100,maxMp:100,atk:70,def:25,spd:105,critRate:.15,critDmg:1.5,actionDistance:1e4,skills:["skill_char_slash","skill_char_cleave"],buffs:[],isDead:!1},i={id:"pet_early_1",name:"火尾蜥 (幼体)",type:"PET",avatar:"🦎",level:1,currentHp:120,maxHp:120,currentMp:30,maxMp:30,atk:22,def:10,spd:90,critRate:.05,critDmg:1.5,actionDistance:1e4,skills:["skill_ember_spit"],buffs:[],isDead:!1},r=[{id:"mob_slime_1",name:"荒野史莱姆 A",type:"MONSTER",avatar:"🟢",level:3,currentHp:220,maxHp:220,currentMp:0,maxMp:0,atk:18,def:10,spd:60,critRate:0,critDmg:1.5,actionDistance:1e4,skills:[],buffs:[],isDead:!1},{id:"mob_slime_2",name:"荒野史莱姆 B",type:"MONSTER",avatar:"🟢",level:3,currentHp:220,maxHp:220,currentMp:0,maxMp:0,atk:18,def:10,spd:60,critRate:0,critDmg:1.5,actionDistance:1e4,skills:[],buffs:[],isDead:!1}];this.engine.initBattle([s,i],r)}else{const s={id:"player_char",name:"主角 (战术指挥官)",type:"CHARACTER",avatar:"👑",level:35,currentHp:2800,maxHp:2800,currentMp:200,maxMp:200,atk:120,def:160,spd:110,critRate:.1,critDmg:1.5,actionDistance:1e4,skills:["skill_char_slash","skill_char_vulnerability","skill_char_overload","skill_char_extra_turn"],buffs:[],isDead:!1},i={id:"pet_dragon",name:"狱火炎龙 (T3 史诗)",type:"PET",avatar:"🐲",level:35,currentHp:4200,maxHp:4200,currentMp:160,maxMp:160,atk:780,def:320,spd:120,critRate:.35,critDmg:2,actionDistance:1e4,skills:["skill_apocalypse_flame","skill_flame_burst"],buffs:[],isDead:!1},r={id:"pet_behemoth",name:"熔岩巨兽 (T2 稀有)",type:"PET",avatar:"🌋",level:32,currentHp:3100,maxHp:3100,currentMp:100,maxMp:100,atk:320,def:280,spd:85,critRate:.2,critDmg:1.6,actionDistance:1e4,skills:["skill_magma_slam","skill_rock_armor"],buffs:[],isDead:!1},n={id:"mob_titan_boss",name:"灭世泰坦领主",type:"MONSTER",avatar:"👹",level:40,currentHp:5e4,maxHp:5e4,currentMp:0,maxMp:0,atk:320,def:350,spd:85,critRate:.15,critDmg:1.8,actionDistance:1e4,skills:[],buffs:[],isDead:!1};this.engine.initBattle([s,i,r],[n])}this.selectedSkillId=((t=this.engine.activeUnit)==null?void 0:t.skills[0])||null,this.selectedTargetId=((a=this.engine.enemyTeam[0])==null?void 0:a.id)||null}updateDOM(){var a;const e=this.engine.activeUnit,t=e?this.engine.isPlayerSide(e):!1;this.container.innerHTML=`
      <div class="space-y-4">
        <!-- 模式切换与核心对比提示 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">场景演练</span>
            <div class="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button id="btn-mode-early" class="px-3 py-1 text-xs rounded font-medium transition-all ${this.currentMode==="EARLY"?"bg-amber-500 text-slate-950 font-bold":"text-slate-400 hover:text-white"}">
                🌱 前期开荒 (角色输出 85%+)
              </button>
              <button id="btn-mode-late" class="px-3 py-1 text-xs rounded font-medium transition-all ${this.currentMode==="LATE"?"bg-purple-600 text-white font-bold glow-command":"text-slate-400 hover:text-white"}">
                🔥 后期核爆 (宠物输出 95%+)
              </button>
            </div>
          </div>
          <div class="text-xs text-slate-400">
            ${this.currentMode==="EARLY"?'💡 <span class="text-amber-300 font-semibold">前期手感</span>：主角手持大剑一招重劈秒杀小怪，幼体宠物只能补刀打微量伤害。':'💡 <span class="text-purple-300 font-semibold">后期体验</span>：主角打上【弱点标记】与【战术超载】，神宠狱火炎龙一击打出数万级毁灭伤害！'}
          </div>
        </div>

        <!-- 战场双方面板 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 我方战阵 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                  🛡️ 冒险者小队 (${this.engine.playerTeam.filter(s=>!s.isDead).length}/${this.engine.playerTeam.length})
                </span>
                <span class="text-xs text-slate-400">行动条推演中</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.playerTeam.map(s=>this.renderUnitCard(s,(e==null?void 0:e.id)===s.id)).join("")}
              </div>
            </div>
          </div>

          <!-- 敌方战阵 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  ⚔️ 敌对目标 (${this.engine.enemyTeam.filter(s=>!s.isDead).length}/${this.engine.enemyTeam.length})
                </span>
                <span class="text-xs text-slate-400">点击卡片可锁定目标</span>
              </div>
              <div class="space-y-2.5">
                ${this.engine.enemyTeam.map(s=>this.renderUnitCard(s,(e==null?void 0:e.id)===s.id,!0)).join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- 底部行动操作区 + 战斗日志 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- 技能释放控制面板 -->
          <div class="lg:col-span-2 bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-0.5 rounded ${t?"bg-emerald-500/20 text-emerald-300 border border-emerald-500/40":"bg-slate-800 text-slate-400"}">
                    ${t?"👉 等待玩家指令":"⏳ 敌方行动计算中"}
                  </span>
                  <span class="text-sm font-bold text-white">当前出手：${(e==null?void 0:e.name)||"无"}</span>
                </div>
                ${(e==null?void 0:e.type)==="CHARACTER"?'<span class="text-xs text-purple-400 font-medium">👑 主角可释放战术指挥指令</span>':""}
              </div>

              <!-- 技能按钮列表 -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                ${((e==null?void 0:e.skills)||[]).map(s=>{const i=this.skillsMap.get(s);if(!i)return"";const r=this.selectedSkillId===s,n=i.type==="COMMAND";return`
                    <button 
                      class="skill-btn text-left p-2.5 rounded-lg border transition-all ${r?n?"border-purple-500 bg-purple-950/50 glow-command":"border-amber-500 bg-amber-950/40":"border-slate-800 bg-slate-900/60 hover:border-slate-700"}"
                      data-skill-id="${i.id}"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold ${n?"text-purple-300":"text-slate-200"}">
                          ${n?"✨ ":"⚔️ "}${i.name}
                        </span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          ${i.costTp?`TP: ${i.costTp}`:i.costMp?`MP: ${i.costMp}`:"免费"}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${i.desc}</p>
                    </button>
                  `}).join("")}
              </div>
            </div>

            <!-- 执行按钮 -->
            <div class="flex items-center justify-between pt-2 border-t border-game-border">
              <div class="text-xs text-slate-400">
                当前目标：<span class="text-amber-400 font-bold">${((a=this.engine.findUnitById(this.selectedTargetId||""))==null?void 0:a.name)||"未选择"}</span>
              </div>
              <div class="flex gap-2">
                <button id="btn-reset-battle" class="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
                  🔄 重置战局
                </button>
                <button 
                  id="btn-execute-action" 
                  class="px-5 py-1.5 text-xs rounded-lg font-bold transition-all shadow-lg ${t&&!this.engine.checkBattleOver()?"bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:brightness-110":"bg-slate-800 text-slate-500 cursor-not-allowed"}"
                  ${!t||this.engine.checkBattleOver()?"disabled":""}
                >
                  ⚡ 执行当前指令
                </button>
              </div>
            </div>
          </div>

          <!-- 实时战斗日志 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col h-[280px]">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">📜 战术播报日志</span>
              <span class="text-[10px] text-slate-500">最新记录在上</span>
            </div>
            <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono">
              ${this.engine.logs.map(s=>{let i="text-slate-400";return s.type==="DAMAGE"&&(i=s.isCrit?"text-amber-300 font-bold":"text-slate-200"),s.type==="COMMAND"&&(i="text-purple-300 font-semibold"),s.type==="BUFF"&&(i="text-emerald-400"),s.type==="DEATH"&&(i="text-rose-400 font-bold"),`
                  <div class="p-1 rounded bg-slate-950/40 border border-slate-900 ${i}">
                    <span class="text-slate-600">[T${s.turn}]</span>
                    <span class="text-slate-300 font-semibold">${s.sourceName}</span>:
                    ${s.message}
                  </div>
                `}).join("")}
            </div>
          </div>
        </div>
      </div>
    `,this.bindEvents()}renderUnitCard(e,t,a=!1){const s=Math.max(0,Math.min(100,Math.round(e.currentHp/e.maxHp*100))),i=this.selectedTargetId===e.id,r=e.isDead;return`
      <div 
        class="unit-card p-3 rounded-lg border transition-all cursor-pointer ${r?"opacity-40 grayscale border-slate-900 bg-slate-950":t?"border-amber-500 bg-amber-950/20 shadow-md ring-1 ring-amber-500/50":i?"border-rose-500 bg-rose-950/30":"border-slate-800 bg-slate-900/60 hover:border-slate-700"}"
        data-unit-id="${e.id}"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">${e.avatar}</span>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white">${e.name}</span>
                <span class="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Lv.${e.level}</span>
                ${r?'<span class="text-[10px] text-rose-500 font-bold">阵亡</span>':""}
              </div>
              <div class="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                <span>攻 ${e.atk}</span>
                <span>防 ${e.def}</span>
                <span>速 ${e.spd}</span>
              </div>
            </div>
          </div>

          <!-- Buff 状态徽章 -->
          <div class="flex flex-wrap gap-1 max-w-[120px] justify-end">
            ${e.buffs.map(n=>`
              <span class="text-[9px] px-1 rounded bg-purple-900/80 text-purple-200 border border-purple-700">
                ${n.name}(${n.remainingTurns})
              </span>
            `).join("")}
          </div>
        </div>

        <!-- 生命条 -->
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-300 ${a?"bg-rose-500":"bg-emerald-500"}" 
            style="width: ${s}%"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>HP ${e.currentHp}/${e.maxHp}</span>
          <span>${s}%</span>
        </div>
      </div>
    `}bindEvents(){var e,t,a,s;(e=this.container.querySelector("#btn-mode-early"))==null||e.addEventListener("click",()=>{this.render("EARLY")}),(t=this.container.querySelector("#btn-mode-late"))==null||t.addEventListener("click",()=>{this.render("LATE")}),this.container.querySelectorAll(".skill-btn").forEach(i=>{i.addEventListener("click",r=>{const n=r.currentTarget.dataset.skillId;n&&(this.selectedSkillId=n,this.updateDOM())})}),this.container.querySelectorAll(".unit-card").forEach(i=>{i.addEventListener("click",r=>{const n=r.currentTarget.dataset.unitId;n&&(this.selectedTargetId=n,this.updateDOM())})}),(a=this.container.querySelector("#btn-reset-battle"))==null||a.addEventListener("click",()=>{this.initScenario(this.currentMode),this.updateDOM()}),(s=this.container.querySelector("#btn-execute-action"))==null||s.addEventListener("click",()=>{var c,l,m,u;const i=this.engine.activeUnit;if(!i||!this.selectedSkillId)return;const r=this.skillsMap.get(this.selectedSkillId);if(!r)return;let n=this.selectedTargetId;if((!n||(c=this.engine.findUnitById(n))!=null&&c.isDead)&&(r.targetType==="SINGLE_ENEMY"?n=((l=this.engine.enemyTeam.find(o=>!o.isDead))==null?void 0:l.id)||"":r.targetType==="ALLY_PET"?n=((m=this.engine.playerTeam.find(o=>!o.isDead&&o.type==="PET"))==null?void 0:m.id)||"":n=i.id),this.engine.executeAction(i.id,this.selectedSkillId,n),this.engine.activeUnit&&!this.engine.isPlayerSide(this.engine.activeUnit)&&!this.engine.checkBattleOver()){const o=this.engine.activeUnit,h=this.engine.playerTeam.find(f=>!f.isDead);if(h){const f=Math.max(10,Math.round(o.atk*1.2-h.def*.5));h.currentHp=Math.max(0,h.currentHp-f),this.engine.logs.unshift({turn:this.engine.turnCount,sourceName:o.name,actionName:"攻击",targetName:h.name,damage:f,message:`[${o.name}] 反扑攻击 [${h.name}] 造成 ${f} 伤害！`,type:"DAMAGE"}),h.currentHp<=0&&(h.isDead=!0),this.engine.advanceToNextTurn()}}this.engine.activeUnit&&(this.selectedSkillId=this.engine.activeUnit.skills[0]||null),this.selectedTargetId=((u=this.engine.enemyTeam.find(o=>!o.isDead))==null?void 0:u.id)||null,this.updateDOM()})}}class S{constructor(e,t,a,s){d(this,"container");d(this,"engine");d(this,"petConfigs");d(this,"skillsMap");d(this,"userPets",[]);d(this,"selectedParentA",null);d(this,"selectedParentB",null);d(this,"lockedSkillId",null);d(this,"lastFusionResult",null);this.container=e,this.engine=t,this.petConfigs=new Map(a.map(i=>[i.id,i])),this.skillsMap=new Map(s.map(i=>[i.id,i])),this.initDefaultInventory()}initDefaultInventory(){const e=this.petConfigs.get("pet_fire_lizard"),t=this.petConfigs.get("pet_rock_turtle"),a=this.petConfigs.get("pet_storm_falcon"),s=this.petConfigs.get("pet_spectral_wisp"),i=this.petConfigs.get("pet_bone_hound");this.userPets=[{instanceId:"pet_inv_1",configId:e.id,name:"火尾蜥 (A)",level:10,exp:0,tier:1,race:e.race,element:e.element,currentHp:200,maxHp:200,atk:38,def:18,spd:95,critRate:.1,critDmg:1.5,growth:e.growth,innateSkillId:e.innateSkillId,skills:[e.innateSkillId,"skill_flame_burst"],traits:[],generation:1},{instanceId:"pet_inv_2",configId:t.id,name:"岩壳龟 (B)",level:10,exp:0,tier:1,race:t.race,element:t.element,currentHp:320,maxHp:320,atk:22,def:42,spd:60,critRate:.05,critDmg:1.5,growth:t.growth,innateSkillId:t.innateSkillId,skills:[t.innateSkillId],traits:[],generation:1},{instanceId:"pet_inv_3",configId:a.id,name:"暴风隼 (C)",level:12,exp:0,tier:1,race:a.race,element:a.element,currentHp:180,maxHp:180,atk:45,def:15,spd:130,critRate:.15,critDmg:1.6,growth:a.growth,innateSkillId:a.innateSkillId,skills:[a.innateSkillId],traits:[],generation:1},{instanceId:"pet_inv_4",configId:s.id,name:"冰霜幽魂 (D)",level:11,exp:0,tier:1,race:s.race,element:s.element,currentHp:190,maxHp:190,atk:48,def:18,spd:92,critRate:.1,critDmg:1.5,growth:s.growth,innateSkillId:s.innateSkillId,skills:[s.innateSkillId],traits:[],generation:1},{instanceId:"pet_inv_5",configId:i.id,name:"骸骨恶犬 (E)",level:10,exp:0,tier:1,race:i.race,element:i.element,currentHp:220,maxHp:220,atk:42,def:20,spd:108,critRate:.1,critDmg:1.5,growth:i.growth,innateSkillId:i.innateSkillId,skills:[i.innateSkillId],traits:[],generation:1}],this.selectedParentA=this.userPets[0],this.selectedParentB=this.userPets[1]}render(){let e=null;this.selectedParentA&&this.selectedParentB&&this.selectedParentA.instanceId!==this.selectedParentB.instanceId&&(e=this.engine.previewFusion(this.selectedParentA,this.selectedParentB)),this.container.innerHTML=`
      <div class="space-y-6">
        <!-- 头部机制解析横幅 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🧬</span>
            <div>
              <h2 class="text-sm font-bold text-amber-400">基因融合研究所 (Gene Fusion Chamber)</h2>
              <p class="text-xs text-slate-400">低阶宠物跨代升阶培育 | 特殊配方突破 | 技能概率遗传与神技锁定</p>
            </div>
          </div>
          <button id="btn-add-starter-pet" class="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
            ➕ 领取基础幼体胚胎
          </button>
        </div>

        <!-- 融合操作台核心区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：父系与母系选择槽 -->
          <div class="space-y-4">
            <!-- 父本 A 槽位 -->
            <div class="bg-game-card border border-game-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-sky-400">🔹 父系母体 A</span>
                ${this.selectedParentA?`<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">${this.selectedParentA.name}</span>`:""}
              </div>
              ${this.selectedParentA?this.renderSelectedSlot(this.selectedParentA,"A"):'<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">从下方仓库选择</div>'}
            </div>

            <!-- 母本 B 槽位 -->
            <div class="bg-game-card border border-game-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-rose-400">🔸 父系母体 B</span>
                ${this.selectedParentB?`<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">${this.selectedParentB.name}</span>`:""}
              </div>
              ${this.selectedParentB?this.renderSelectedSlot(this.selectedParentB,"B"):'<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">从下方仓库选择</div>'}
            </div>
          </div>

          <!-- 中间：合成预测与基因稳定器 (明牌博弈) -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-game-border">
                <span class="text-xs font-bold text-amber-400">🔮 基因合成预览与概率透视</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">5% 良性突变几率</span>
              </div>

              ${e?`
                <div class="space-y-3">
                  <!-- 产出物种形态 -->
                  <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <span class="text-4xl p-2 rounded-xl bg-slate-800/80">${e.targetConfig.avatar}</span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-white">${e.targetConfig.name}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${e.targetTier>=3?"bg-purple-900 text-purple-200":"bg-blue-900 text-blue-200"}">
                          T${e.targetTier} ${e.targetTier===3?"史诗巨兽":e.targetTier===2?"稀有物种":"普通"}
                        </span>
                      </div>
                      <p class="text-[11px] text-amber-300 mt-0.5 font-medium">✨ ${e.recipeDesc}</p>
                    </div>
                  </div>

                  <!-- 技能继承池与锁定选择 -->
                  <div>
                    <div class="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
                      <span>可继承技能候选池：</span>
                      <span class="text-purple-400 text-[10px]">可勾选 1 个锁定 100% 遗传</span>
                    </div>
                    <div class="space-y-1.5 max-h-[140px] overflow-y-auto">
                      ${e.candidateSkills.length>0?e.candidateSkills.map(t=>{const a=this.lockedSkillId===t.id;return`
                          <div 
                            class="skill-lock-item p-2 rounded border transition-all flex items-center justify-between cursor-pointer ${a?"border-purple-500 bg-purple-950/60 glow-command":"border-slate-800 bg-slate-950/50 hover:border-slate-700"}"
                            data-skill-id="${t.id}"
                          >
                            <div class="flex items-center gap-2">
                              <input type="checkbox" ${a?"checked":""} class="pointer-events-none accent-purple-500">
                              <div>
                                <div class="text-xs font-semibold text-slate-200">${t.name}</div>
                                <div class="text-[10px] text-slate-400">${t.desc}</div>
                              </div>
                            </div>
                            <span class="text-[10px] text-amber-400 font-bold whitespace-nowrap">
                              ${a?"🔒 100% 锁定":`${Math.round(t.inheritRate*100)}% 概率`}
                            </span>
                          </div>
                        `}).join(""):'<div class="text-xs text-slate-500 py-2">父母双方暂无额外可继承技能</div>'}
                    </div>
                  </div>
                </div>
              `:`
                <div class="py-12 text-center text-xs text-slate-500">
                  请在左右两侧放入两只不同的宠物进行基因配对
                </div>
              `}
            </div>

            <!-- 合成确认按钮 -->
            <div class="pt-4 border-t border-game-border mt-4">
              <button 
                id="btn-execute-fusion"
                class="w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-lg ${e?"bg-gradient-to-r from-purple-600 via-amber-500 to-rose-500 text-slate-950 hover:brightness-110 glow-command":"bg-slate-800 text-slate-500 cursor-not-allowed"}"
                ${e?"":"disabled"}
              >
                🧬 确认融合并觉醒子代
              </button>
            </div>
          </div>

          <!-- 右侧：融合通知与近期成果 -->
          <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-game-border">
              <span class="text-xs font-bold text-slate-300">🎉 最近孵化成果</span>
              <span class="text-[10px] text-slate-500">自动入库</span>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center p-4">
              ${this.lastFusionResult?`
                <div class="space-y-2 animate-bounce">
                  <div class="text-4xl">✨🐣✨</div>
                  <div class="text-xs text-emerald-300 font-bold">${this.lastFusionResult}</div>
                </div>
              `:`
                <div class="text-slate-600 text-xs">
                  <span class="text-3xl block mb-2 opacity-40">🧪</span>
                  执行融合后，子代将在此完成初生鉴定与资质展示
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- 底部：玩家宠物仓库 (点击直接装填进 A 或 B) -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-200">🎒 我的宠物库 (${this.userPets.length} 只)</span>
            <span class="text-[10px] text-slate-400">点击【设为父A】或【设为母B】进行基因配种</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            ${this.userPets.map(t=>{var r,n;const a=((r=this.selectedParentA)==null?void 0:r.instanceId)===t.instanceId,s=((n=this.selectedParentB)==null?void 0:n.instanceId)===t.instanceId,i=this.petConfigs.get(t.configId);return`
                <div class="p-3 rounded-xl border bg-slate-900/60 transition-all ${a?"border-sky-500 ring-1 ring-sky-500/50":s?"border-rose-500 ring-1 ring-rose-500/50":"border-slate-800 hover:border-slate-700"}">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">${(i==null?void 0:i.avatar)||"🐾"}</span>
                      <div>
                        <div class="text-xs font-bold text-white">${t.name}</div>
                        <span class="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400">T${t.tier} | ${t.generation}代</span>
                      </div>
                    </div>
                  </div>

                  <div class="text-[11px] space-y-0.5 text-slate-400 mb-2">
                    <div class="flex justify-between"><span>HP成长: ${t.growth.hpGrowth}</span><span>攻成长: ${t.growth.atkGrowth}</span></div>
                    <div class="flex justify-between"><span>防成长: ${t.growth.defGrowth}</span><span>速成长: ${t.growth.spdGrowth}</span></div>
                  </div>

                  <!-- 携带技能 -->
                  <div class="flex flex-wrap gap-1 mb-2">
                    ${t.skills.map(c=>{const l=this.skillsMap.get(c);return`<span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">${(l==null?void 0:l.name)||c}</span>`}).join("")}
                    ${t.traits.map(c=>`<span class="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">${c}</span>`).join("")}
                  </div>

                  <!-- 选择操作 -->
                  <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                    <button 
                      class="btn-pick-a py-1 text-[10px] rounded font-semibold transition-all ${a?"bg-sky-500 text-slate-950":"bg-slate-800 text-sky-400 hover:bg-slate-700"}"
                      data-instance-id="${t.instanceId}"
                    >
                      ${a?"✓ 已选父A":"设为父A"}
                    </button>
                    <button 
                      class="btn-pick-b py-1 text-[10px] rounded font-semibold transition-all ${s?"bg-rose-500 text-slate-950":"bg-slate-800 text-rose-400 hover:bg-slate-700"}"
                      data-instance-id="${t.instanceId}"
                    >
                      ${s?"✓ 已选母B":"设为母B"}
                    </button>
                  </div>
                </div>
              `}).join("")}
          </div>
        </div>
      </div>
    `,this.bindEvents()}renderSelectedSlot(e,t){const a=this.petConfigs.get(e.configId);return`
      <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <span class="text-3xl">${(a==null?void 0:a.avatar)||"🐾"}</span>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white">${e.name}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${t==="A"?"bg-sky-950 text-sky-300":"bg-rose-950 text-rose-300"}">
              T${e.tier} (${e.generation}代)
            </span>
          </div>
          <div class="text-[10px] text-slate-400 flex gap-2 mt-0.5">
            <span>HP ${e.maxHp}</span>
            <span>攻 ${e.atk}</span>
            <span>防 ${e.def}</span>
            <span>速 ${e.spd}</span>
          </div>
        </div>
      </div>
    `}bindEvents(){var e,t;this.container.querySelectorAll(".btn-pick-a").forEach(a=>{a.addEventListener("click",s=>{const i=s.currentTarget.dataset.instanceId;this.selectedParentA=this.userPets.find(r=>r.instanceId===i)||null,this.lockedSkillId=null,this.render()})}),this.container.querySelectorAll(".btn-pick-b").forEach(a=>{a.addEventListener("click",s=>{const i=s.currentTarget.dataset.instanceId;this.selectedParentB=this.userPets.find(r=>r.instanceId===i)||null,this.lockedSkillId=null,this.render()})}),this.container.querySelectorAll(".skill-lock-item").forEach(a=>{a.addEventListener("click",s=>{const i=s.currentTarget.dataset.skillId;i&&(this.lockedSkillId=this.lockedSkillId===i?null:i,this.render())})}),(e=this.container.querySelector("#btn-add-starter-pet"))==null||e.addEventListener("click",()=>{const a=Array.from(this.petConfigs.values())[Math.floor(Math.random()*3)],s={instanceId:`pet_starter_${Date.now()}`,configId:a.id,name:`${a.name} (野外捕获)`,level:5,exp:0,tier:a.tier,race:a.race,element:a.element,currentHp:a.baseHp,maxHp:a.baseHp,atk:a.baseAtk,def:a.baseDef,spd:a.baseSpd,critRate:.1,critDmg:1.5,growth:a.growth,innateSkillId:a.innateSkillId,skills:[a.innateSkillId,"skill_flame_burst"],traits:[],generation:1};this.userPets.unshift(s),this.render()}),(t=this.container.querySelector("#btn-execute-fusion"))==null||t.addEventListener("click",()=>{if(!this.selectedParentA||!this.selectedParentB)return;const a=this.engine.executeFusion(this.selectedParentA,this.selectedParentB,this.lockedSkillId||void 0);this.userPets.unshift(a.child),this.lastFusionResult=`成功诞育：${a.child.name}！${a.isMutation?`触发突变【${a.mutationTrait}】!`:""} 继承了 ${a.inheritedSkillIds.length} 个神技！`,this.selectedParentA=a.child,this.lockedSkillId=null,this.render()})}}class R{constructor(e,t,a){d(this,"container");d(this,"classManager");d(this,"skillsMap");this.container=e,this.classManager=t,this.skillsMap=new Map(a.map(s=>[s.id,s]))}render(){const e=this.classManager.getAllClasses(),t=this.classManager.activeClass;this.container.innerHTML=`
      <div class="space-y-6">
        <!-- 核心原则引导横幅 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-amber-400">👑 角色职业与协同指挥体系 (Multi-Class & Synergy)</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              原则：<span class="text-slate-200 font-semibold">培育系统完全独立通用，而职业决定战术协同机制与宠物的培育流派方向 (Build-Driven)</span>。
            </p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-medium">
            自由转职 · 零成本洗点
          </span>
        </div>

        <!-- 四大职业卡片横向网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${e.map(a=>{const s=a.id===t.id;let i="⚔️";return a.id==="TACTICAL_COMMANDER"&&(i="👑"),a.id==="IRON_VANGUARD"&&(i="🛡️"),a.id==="PSIONIC_CONDUCTOR"&&(i="🔮"),a.id==="SHADOW_PACKMASTER"&&(i="🏹"),`
              <div 
                class="p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${s?"border-amber-500 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/50":"border-slate-800 bg-slate-900/60 hover:border-slate-700"}"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-3xl">${i}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded font-bold ${s?"bg-amber-500 text-slate-950":"bg-slate-800 text-slate-400"}">
                      ${s?"● 当前出战":"可切换"}
                    </span>
                  </div>
                  <h3 class="text-sm font-bold text-white mb-0.5">${a.name}</h3>
                  <div class="text-[11px] text-amber-400 font-medium mb-2">${a.title}</div>
                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${a.desc}</p>
                </div>

                <div>
                  <div class="p-2 rounded bg-slate-950/80 border border-slate-800 mb-3">
                    <div class="text-[10px] text-purple-300 font-bold mb-0.5">🎯 牵引培育流派：</div>
                    <div class="text-[11px] text-slate-300">${a.recommendedPetBuild}</div>
                  </div>
                  <button 
                    class="btn-switch-class w-full py-1.5 text-xs rounded-lg font-bold transition-all ${s?"bg-amber-500 text-slate-950 cursor-default":"bg-slate-800 text-slate-200 hover:bg-slate-700"}"
                    data-class-id="${a.id}"
                    ${s?"disabled":""}
                  >
                    ${s?"已激活此职业":"切换为此流派"}
                  </button>
                </div>
              </div>
            `}).join("")}
        </div>

        <!-- 当前职业详细技能树与前后期职能对比 -->
        <div class="bg-game-card border border-game-border rounded-xl p-5">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-game-border">
            <div>
              <span class="text-sm font-bold text-white">当前激活技能构筑：${t.name}</span>
              <span class="text-xs text-slate-400 ml-2">(${t.skills.length} 个专属战技与指挥令)</span>
            </div>
            <span class="text-xs text-emerald-400">已自动同步至战斗演练舱</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 前期单兵战技 -->
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">
                  ⚔️ 前期自身输出技能
                </span>
                <span class="text-[11px] text-slate-400">基础固定伤害高，开荒横扫小怪</span>
              </div>
              <div class="space-y-2">
                ${t.skills.filter(a=>{const s=this.skillsMap.get(a);return s&&s.type!=="COMMAND"}).map(a=>this.renderSkillDetail(a)).join("")}
              </div>
            </div>

            <!-- 后期战术指挥技能 -->
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800 glow-command">
                  ✨ 后期御兽指挥指令
                </span>
                <span class="text-[11px] text-slate-400">百分比倍率放大，全权交由宠物核爆</span>
              </div>
              <div class="space-y-2">
                ${t.skills.filter(a=>{const s=this.skillsMap.get(a);return s&&s.type==="COMMAND"}).map(a=>this.renderSkillDetail(a)).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `,this.bindEvents()}renderSkillDetail(e){const t=this.skillsMap.get(e);return t?`
      <div class="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-slate-200">${t.name}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            ${t.costTp?`消耗 TP: ${t.costTp}`:"无消耗"}
          </span>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">${t.desc}</p>
      </div>
    `:""}bindEvents(){this.container.querySelectorAll(".btn-switch-class").forEach(e=>{e.addEventListener("click",t=>{const a=t.currentTarget.dataset.classId;a&&(this.classManager.switchClass(a),this.render())})})}}class C{constructor(e,t,a,s){d(this,"container");d(this,"pets");d(this,"recipes");d(this,"skillsMap");this.container=e,this.pets=t,this.recipes=a.specialRecipes,this.skillsMap=new Map(s.map(i=>[i.id,i]))}render(){this.container.innerHTML=`
      <div class="space-y-6">
        <!-- 头部图鉴说明 -->
        <div class="bg-game-card border border-game-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-amber-400">📖 宠物全谱系图鉴与隐藏合成谱</h2>
            <p class="text-xs text-slate-400 mt-0.5">收录全部 T1~T3 宠物数据、资质潜力与已发现的升阶合成公式</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">共 ${this.pets.length} 种生物</span>
        </div>

        <!-- 特殊合成配方公式速查卡 -->
        <div class="bg-game-card border border-game-border rounded-xl p-4">
          <div class="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span>✨ 已知特殊指定合成公式 (必出高阶神宠)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            ${this.recipes.map(e=>{const t=this.pets.find(a=>a.id===e.childId);return`
                <div class="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                  <span class="text-3xl">${(t==null?void 0:t.avatar)||"🐲"}</span>
                  <div>
                    <div class="text-xs font-bold text-amber-300">${t==null?void 0:t.name} (T${e.tier})</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${e.desc}</div>
                  </div>
                </div>
              `}).join("")}
          </div>
        </div>

        <!-- 宠物网格 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          ${this.pets.map(e=>{const t=this.skillsMap.get(e.innateSkillId);return`
              <div class="bg-game-card border border-game-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-3xl">${e.avatar}</span>
                      <div>
                        <div class="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>${e.name}</span>
                          <span class="text-[10px] px-1.5 rounded font-bold ${e.tier===3?"bg-purple-900 text-purple-200":e.tier===2?"bg-sky-900 text-sky-200":"bg-slate-800 text-slate-400"}">T${e.tier}</span>
                        </div>
                        <div class="text-[10px] text-slate-400">${e.race} · ${e.element}</div>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-slate-400 leading-relaxed mb-3">${e.desc}</p>

                  <!-- 基础属性与成长率 -->
                  <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1 mb-3">
                    <div class="flex justify-between text-slate-300">
                      <span>初始生命: ${e.baseHp} (成长 +${e.growth.hpGrowth})</span>
                      <span>初始攻击: ${e.baseAtk} (成长 +${e.growth.atkGrowth})</span>
                    </div>
                    <div class="flex justify-between text-slate-300">
                      <span>初始防御: ${e.baseDef} (成长 +${e.growth.defGrowth})</span>
                      <span>初始速度: ${e.baseSpd} (成长 +${e.growth.spdGrowth})</span>
                    </div>
                  </div>
                </div>

                <!-- 固有专属大招 -->
                <div class="p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                  <div class="text-[10px] text-amber-400 font-bold mb-0.5">⚡ 专属固有技：${(t==null?void 0:t.name)||e.innateSkillId}</div>
                  <div class="text-[10px] text-slate-400">${(t==null?void 0:t.desc)||""}</div>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `}}const L=[{id:"pet_fire_lizard",name:"火尾蜥",tier:1,race:"BEAST",element:"FIRE",baseHp:120,baseAtk:22,baseDef:10,baseSpd:95,growth:{hpGrowth:12,atkGrowth:2.5,defGrowth:1.2,spdGrowth:1},innateSkillId:"skill_ember_spit",avatar:"🦎",desc:"栖息于火山岩缝的小蜥蜴，尾尖常年跳跃着火花。"},{id:"pet_rock_turtle",name:"岩壳龟",tier:1,race:"BEAST",element:"WOOD",baseHp:200,baseAtk:14,baseDef:24,baseSpd:60,growth:{hpGrowth:20,atkGrowth:1.2,defGrowth:2.8,spdGrowth:.6},innateSkillId:"skill_rock_armor",avatar:"🐢",desc:"背甲坚硬如磐石的陆龟，擅长防御反击。"},{id:"pet_storm_falcon",name:"暴风隼",tier:1,race:"BEAST",element:"THUNDER",baseHp:100,baseAtk:26,baseDef:8,baseSpd:125,growth:{hpGrowth:10,atkGrowth:2.8,defGrowth:.9,spdGrowth:2},innateSkillId:"skill_gale_claw",avatar:"🦅",desc:"穿梭于雷云中的迅猛猎手，以极速俯冲撕裂猎物。"},{id:"pet_spectral_wisp",name:"冰霜幽魂",tier:1,race:"ELEMENTAL",element:"WATER",baseHp:110,baseAtk:28,baseDef:12,baseSpd:90,growth:{hpGrowth:11,atkGrowth:3,defGrowth:1.1,spdGrowth:1.1},innateSkillId:"skill_frost_bolt",avatar:"👻",desc:"凝聚了极寒之力的灵体，擅长法术轰炸与减速。"},{id:"pet_bone_hound",name:"骸骨恶犬",tier:1,race:"UNDEAD",element:"DARK",baseHp:140,baseAtk:25,baseDef:14,baseSpd:105,growth:{hpGrowth:13,atkGrowth:2.6,defGrowth:1.4,spdGrowth:1.2},innateSkillId:"skill_death_bite",avatar:"🐕",desc:"自冥界爬出的凶残猎犬，攻击附带吸血与撕裂。"},{id:"pet_magma_behemoth",name:"熔岩巨兽",tier:2,race:"BEAST",element:"FIRE",baseHp:480,baseAtk:68,baseDef:52,baseSpd:80,growth:{hpGrowth:36,atkGrowth:5.8,defGrowth:4.5,spdGrowth:1},innateSkillId:"skill_magma_slam",avatar:"🌋",desc:"由火蜥蜴与岩壳龟融合而成的熔岩霸主，兼具恐怖的体魄与灼热烈火。"},{id:"pet_thunder_griffon",name:"雷霆狮鹫",tier:2,race:"BEAST",element:"THUNDER",baseHp:350,baseAtk:82,baseDef:30,baseSpd:140,growth:{hpGrowth:28,atkGrowth:7.2,defGrowth:2.5,spdGrowth:2.8},innateSkillId:"skill_lightning_strike",avatar:"⚡",desc:"执掌风暴的神禽，攻击必定附带麻痹与连击。"},{id:"pet_death_knight",name:"冥骸骑士",tier:2,race:"UNDEAD",element:"DARK",baseHp:520,baseAtk:72,baseDef:58,baseSpd:90,growth:{hpGrowth:40,atkGrowth:6.2,defGrowth:5,spdGrowth:1.2},innateSkillId:"skill_soul_harvest",avatar:"💀",desc:"死者怨念与魔骨铸就的重装统领，受击反伤且越战越强。"},{id:"pet_hellfire_dragon",name:"狱火炎龙",tier:3,race:"DRAGON",element:"FIRE",baseHp:1200,baseAtk:210,baseDef:110,baseSpd:115,growth:{hpGrowth:85,atkGrowth:18,defGrowth:9.5,spdGrowth:2.2},innateSkillId:"skill_apocalypse_flame",avatar:"🐲",desc:"由熔岩巨兽突破升阶而来的古龙，其吐息能焚尽世间万物，后期的绝对核爆主C！"}],N=[{id:"skill_char_slash",name:"重装轰斩",desc:"角色挥舞重武对单体造成高额物理伤害。前期主要输出手段。",type:"ACTIVE",targetType:"SINGLE_ENEMY",costTp:0,rarity:"COMMON",inheritRate:0,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1.5,baseFlat:160}]},{id:"skill_char_cleave",name:"旋风横扫",desc:"角色对敌方全体造成范围挥砍伤害。",type:"ACTIVE",targetType:"ALL_ENEMIES",costTp:20,rarity:"COMMON",inheritRate:0,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1,baseFlat:100}]},{id:"skill_char_overload",name:"战术超载指令",desc:"指挥指令：选定1只主力宠物，消耗其10%当前生命，使其本回合攻击暴增150%且必定暴击！",type:"COMMAND",targetType:"ALLY_PET",costTp:35,rarity:"EPIC",inheritRate:0,effects:[{type:"OVERLOAD",statPercent:1.5,turns:1}]},{id:"skill_char_vulnerability",name:"弱点指示标记",desc:"指挥指令：角色自身不造成伤害，但给目标附加弱点，使其受到宠物的单体技能伤害提升150%。",type:"COMMAND",targetType:"SINGLE_ENEMY",costTp:25,rarity:"RARE",inheritRate:0,effects:[{type:"VULNERABILITY",value:1.5,turns:2}]},{id:"skill_char_extra_turn",name:"战术再动号令",desc:"指挥指令：牺牲自身回合，命令指定宠物立即无视行动轴再次行动一次！",type:"COMMAND",targetType:"ALLY_PET",costTp:50,rarity:"EPIC",inheritRate:0,effects:[{type:"EXTRA_TURN",value:1}]},{id:"skill_char_thorns",name:"荆棘共鸣指令",desc:"铁壁领主指令：赋予全体宠物受击反伤光环，受击时反弹300%伤害给攻击者。",type:"COMMAND",targetType:"ALL_ALLIES",costTp:30,rarity:"RARE",inheritRate:0,effects:[{type:"THORNS_AURA",value:3,turns:2}]},{id:"skill_ember_spit",name:"火花吐息",desc:"喷吐微弱火花，造成少量火焰伤害。",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:10,rarity:"COMMON",inheritRate:.7,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1.2,baseFlat:10}]},{id:"skill_rock_armor",name:"磐石重甲",desc:"强化甲壳，提升自身50%防御力持续2回合。",type:"ACTIVE",targetType:"SELF",costMp:15,rarity:"COMMON",inheritRate:.65,effects:[{type:"BUFF_STAT",statKey:"def",statPercent:.5,turns:2}]},{id:"skill_gale_claw",name:"疾风利爪",desc:"极速突袭，对单体造成快速打击并推进自身行动条。",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:15,rarity:"COMMON",inheritRate:.6,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1.4,baseFlat:15}]},{id:"skill_frost_bolt",name:"极寒冰箭",desc:"凝结寒冰射击单体，造成冰霜法术伤害。",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:20,rarity:"COMMON",inheritRate:.6,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1.5,baseFlat:20}]},{id:"skill_death_bite",name:"亡魂撕咬",desc:"撕扯灵魂，造成伤害并吸取50%伤害转化为自身生命。",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:20,rarity:"COMMON",inheritRate:.6,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:1.3,baseFlat:15}]},{id:"skill_flame_burst",name:"烈焰暴击",desc:"凝聚高浓度烈焰引发大爆炸，高暴击倍率单体爆发！",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:35,rarity:"RARE",inheritRate:.45,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:2.4,baseFlat:30}]},{id:"skill_magma_slam",name:"熔岩重锤",desc:"熔岩巨兽专属技：引动地底岩浆猛烈砸击单体敌人，造成恐怖火焰巨力！",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:40,rarity:"RARE",inheritRate:.4,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:2.8,baseFlat:50}]},{id:"skill_lightning_strike",name:"雷霆万钧",desc:"雷霆狮鹫专属技：引动天雷贯穿单体，附带极高暴击几率！",type:"ACTIVE",targetType:"SINGLE_ENEMY",costMp:45,rarity:"RARE",inheritRate:.4,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:3,baseFlat:60}]},{id:"skill_soul_harvest",name:"死者盛宴",desc:"冥骸骑士专属技：收割亡魂对敌方全体造成范围暗黑侵蚀！",type:"ACTIVE",targetType:"ALL_ENEMIES",costMp:50,rarity:"RARE",inheritRate:.4,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:2.2,baseFlat:40}]},{id:"skill_apocalypse_flame",name:"灭世红莲龙息",desc:"狱火炎龙终极奥义：唤醒远古真龙之怒，对敌方全体造成毁灭性的灭世龙息！",type:"ACTIVE",targetType:"ALL_ENEMIES",costMp:80,rarity:"EPIC",inheritRate:.25,effects:[{type:"DAMAGE",scalingStat:"ATK",multiplier:4.5,baseFlat:120}]}],P=[{parentA:"pet_fire_lizard",parentB:"pet_rock_turtle",childId:"pet_magma_behemoth",tier:2,desc:"火尾蜥 + 岩壳龟 = 熔岩巨兽 (T2 稀有)"},{parentA:"pet_storm_falcon",parentB:"pet_fire_lizard",childId:"pet_thunder_griffon",tier:2,desc:"暴风隼 + 火尾蜥 = 雷霆狮鹫 (T2 稀有)"},{parentA:"pet_spectral_wisp",parentB:"pet_bone_hound",childId:"pet_death_knight",tier:2,desc:"冰霜幽魂 + 骸骨恶犬 = 冥骸骑士 (T2 稀有)"},{parentA:"pet_magma_behemoth",parentB:"pet_thunder_griffon",childId:"pet_hellfire_dragon",tier:3,desc:"熔岩巨兽 + 雷霆狮鹫 = 狱火炎龙 (T3 史诗)"}],G=[{raceA:"BEAST",raceB:"BEAST",resultRace:"BEAST"},{raceA:"BEAST",raceB:"DRAGON",resultRace:"DRAGON"},{raceA:"BEAST",raceB:"ELEMENTAL",resultRace:"BEAST"},{raceA:"BEAST",raceB:"UNDEAD",resultRace:"UNDEAD"},{raceA:"ELEMENTAL",raceB:"UNDEAD",resultRace:"UNDEAD"},{raceA:"DRAGON",raceB:"DRAGON",resultRace:"DRAGON"}],H={specialRecipes:P,genericRaceMatrix:G},O=[{id:"TACTICAL_COMMANDER",name:"战术指挥官",title:"狂暴战术学者",desc:"擅长弱点标记、暴击超载注射与立即再动号令。能够将主力宠物的单体爆发放大至极致！",recommendedPetBuild:"单体极限核爆流（火/雷系高攻高暴宠物，如熔岩巨兽、狱火炎龙）",skills:["skill_char_slash","skill_char_vulnerability","skill_char_overload","skill_char_extra_turn"]},{id:"IRON_VANGUARD",name:"重装铁壁领主",title:"坚韧战阵教官",desc:"擅长全体挑衅嘲讽吸引火力，开启全体荆棘共鸣，将受到的伤害以数倍反震给敌方全体！",recommendedPetBuild:"防守反击刺猬流（高体质双抗巨兽，如岩壳龟、冥骸骑士）",skills:["skill_char_slash","skill_char_cleave","skill_char_thorns"]},{id:"PSIONIC_CONDUCTOR",name:"灵能元素使",title:"奥术共振大师",desc:"擅长全屏法术轰炸，操控元素引力场降低敌方全抗性，催化全队宠物的元素连锁法爆！",recommendedPetBuild:"元素多重轰炸流（高魔攻多属性法宠，如冰霜幽魂、雷霆狮鹫）",skills:["skill_char_cleave","skill_char_vulnerability","skill_char_extra_turn"]},{id:"SHADOW_PACKMASTER",name:"敏捷巡林客",title:"极速狼群统帅",desc:"擅长精准穿心箭与追猎引导标记，指挥高速敏捷型宠物进行一轮又一轮的致命连续追击！",recommendedPetBuild:"暴风极速追击流（高速度高连击刺客宠，如暴风隼、骸骨恶犬）",skills:["skill_char_slash","skill_char_vulnerability","skill_char_extra_turn"]}];document.addEventListener("DOMContentLoaded",()=>{var f,x,y,b;const p=document.getElementById("app-container");if(!p)return;const e=N,t=L,a=H,s=O,i=new w(e),r=new D(t,e,a),n=new $(s),c=new I(p,i,e),l=new S(p,r,t,e),m=new R(p,n,e),u=new C(p,t,a,e),o={battle:document.getElementById("tab-battle"),breeding:document.getElementById("tab-breeding"),classes:document.getElementById("tab-classes"),dex:document.getElementById("tab-dex")};function h(v){switch(Object.entries(o).forEach(([k,g])=>{g&&(k===v?g.className="nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 bg-amber-500 text-slate-950 shadow font-bold":g.className="nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 text-slate-400 hover:text-white")}),v){case"battle":c.render();break;case"breeding":l.render();break;case"classes":m.render();break;case"dex":u.render();break}}(f=o.battle)==null||f.addEventListener("click",()=>h("battle")),(x=o.breeding)==null||x.addEventListener("click",()=>h("breeding")),(y=o.classes)==null||y.addEventListener("click",()=>h("classes")),(b=o.dex)==null||b.addEventListener("click",()=>h("dex")),h("battle")});
