import { BattleEngine } from './core/battle/BattleEngine.ts';
import { BreedingEngine } from './core/breeding/BreedingEngine.ts';
import { ClassManager } from './core/classes/ClassManager.ts';
import { BattleView } from './presentation/components/BattleView.ts';
import { BreedingView } from './presentation/components/BreedingView.ts';
import { ClassTalentView } from './presentation/components/ClassTalentView.ts';
import { DexView } from './presentation/components/DexView.ts';

import petsData from './data/pets.json';
import skillsData from './data/skills.json';
import recipesData from './data/recipes.json';
import classesData from './data/classes.json';
import { PetConfig, SkillConfig, CharacterClassConfig, SpecialRecipeConfig } from './core/types.ts';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');
  if (!container) return;

  // 1. 初始化纯逻辑领域引擎
  const skills = skillsData as SkillConfig[];
  const pets = petsData as PetConfig[];
  const recipes = recipesData as { specialRecipes: SpecialRecipeConfig[] };
  const classes = classesData as CharacterClassConfig[];

  const battleEngine = new BattleEngine(skills);
  const breedingEngine = new BreedingEngine(pets, skills, recipes);
  const classManager = new ClassManager(classes);

  // 2. 初始化表现层组件
  const battleView = new BattleView(container, battleEngine, skills);
  const breedingView = new BreedingView(container, breedingEngine, pets, skills);
  const classTalentView = new ClassTalentView(container, classManager, skills);
  const dexView = new DexView(container, pets, recipes, skills);

  // 3. 选项卡路由控制
  type TabType = 'battle' | 'breeding' | 'classes' | 'dex';

  const tabs: Record<TabType, HTMLElement | null> = {
    battle: document.getElementById('tab-battle'),
    breeding: document.getElementById('tab-breeding'),
    classes: document.getElementById('tab-classes'),
    dex: document.getElementById('tab-dex')
  };

  function switchTab(tab: TabType): void {
    // 更新选项卡高亮状态
    Object.entries(tabs).forEach(([k, el]) => {
      if (!el) return;
      if (k === tab) {
        el.className = 'nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 bg-amber-500 text-slate-950 shadow font-bold';
      } else {
        el.className = 'nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 text-slate-400 hover:text-white';
      }
    });

    // 渲染对应视图
    switch (tab) {
      case 'battle':
        battleView.render();
        break;
      case 'breeding':
        breedingView.render();
        break;
      case 'classes':
        classTalentView.render();
        break;
      case 'dex':
        dexView.render();
        break;
    }
  }

  // 绑定选项卡点击
  tabs.battle?.addEventListener('click', () => switchTab('battle'));
  tabs.breeding?.addEventListener('click', () => switchTab('breeding'));
  tabs.classes?.addEventListener('click', () => switchTab('classes'));
  tabs.dex?.addEventListener('click', () => switchTab('dex'));

  // 默认启动战斗演练舱
  switchTab('battle');
});
