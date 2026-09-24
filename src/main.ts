import { BattleEngine } from './core/battle/BattleEngine.ts';
import { BreedingEngine } from './core/breeding/BreedingEngine.ts';
import { ClassManager } from './core/classes/ClassManager.ts';
import { PlayerState } from './core/player/PlayerState.ts';
import { BattleView } from './presentation/components/BattleView.ts';
import { BreedingView } from './presentation/components/BreedingView.ts';
import { ClassTalentView } from './presentation/components/ClassTalentView.ts';
import { DexView } from './presentation/components/DexView.ts';
import { StageView } from './presentation/components/StageView.ts';
import { PetView } from './presentation/components/PetView.ts';
import { SaveManagerModal } from './presentation/components/SaveManagerModal.ts';
import { ShopView } from './presentation/components/ShopView.ts';
import { ShopManager } from './core/shop/ShopManager.ts';

import petsData from './data/pets.json';
import skillsData from './data/skills.json';
import recipesData from './data/recipes.json';
import classesData from './data/classes.json';
import stagesData from './data/stages.json';
import shopData from './data/shop.json';
import { PetConfig, SkillConfig, CharacterClassConfig, SpecialRecipeConfig, StageConfig, ShopItemConfig } from './core/types.ts';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('app-container');
  if (!container) return;

  // 1. 初始化纯逻辑领域引擎与玩家状态
  const skills = skillsData as SkillConfig[];
  const pets = petsData as PetConfig[];
  const recipes = recipesData as { specialRecipes: SpecialRecipeConfig[] };
  const classes = classesData as CharacterClassConfig[];
  const stages = stagesData as StageConfig[];

  const playerState = PlayerState.getInstance();
  const loaded = await playerState.initFromLocalFile();
  if (!loaded) {
    // 首次进入游戏自动落盘生成本地物理存档 save.json
    await playerState.saveToLocalFile();
  }
  const battleEngine = new BattleEngine(skills);
  const breedingEngine = new BreedingEngine(pets, skills, recipes);
  const classManager = new ClassManager(classes, playerState);
  const shopItems = shopData as ShopItemConfig[];
  const shopManager = new ShopManager(playerState, shopItems);

  // 2. 路由控制与组件声明
  // 培育作为独立界面，不作为顶部一级Tab
  type TabType = 'stages' | 'battle' | 'pets' | 'shop' | 'classes' | 'dex' | 'breeding';

  const tabs: Record<'stages' | 'battle' | 'pets' | 'shop' | 'classes' | 'dex', HTMLElement | null> = {
    stages: document.getElementById('tab-stages'),
    battle: document.getElementById('tab-battle'),
    pets: document.getElementById('tab-pets'),
    shop: document.getElementById('tab-shop'),
    classes: document.getElementById('tab-classes'),
    dex: document.getElementById('tab-dex')
  };

  function showBattleTab(): void {
    if (tabs.battle) {
      tabs.battle.classList.remove('hidden');
      tabs.battle.style.display = '';
      tabs.battle.textContent = '⚔️ 战役进行中';
    }
  }

  function hideBattleTab(): void {
    if (tabs.battle) {
      tabs.battle.classList.add('hidden');
      tabs.battle.style.display = 'none';
    }
  }

  // 表现层组件
  const battleView = new BattleView(
    container, 
    battleEngine, 
    skills, 
    classManager, 
    playerState, 
    stages, 
    () => {
      hideBattleTab();
      switchTab('stages');
    },
    pets,
    () => {
      hideBattleTab();
      switchTab('classes');
      classTalentView.openAwakeningModal();
    }
  );

  const stageView = new StageView(
    container, 
    stages, 
    playerState, 
    (stage) => {
      showBattleTab();
      battleView.startStage(stage);
      switchTab('battle');
    }
  );

  // 独立培育界面 (由宠物界面入口唤起，支持返回宠物界面)
  const breedingView = new BreedingView(
    container, 
    breedingEngine, 
    pets, 
    skills, 
    playerState,
    () => {
      switchTab('pets');
    }
  );

  // 宠物主界面 (展示获取的宠物蛋、仓库宠物、出战阵容、以及培育入口)
  const petView = new PetView(
    container,
    playerState,
    pets,
    skills,
    (preselectedPet) => {
      if (preselectedPet) {
        breedingView.setSelectedParent(preselectedPet);
      }
      switchTab('breeding');
    },
    () => {
      switchTab('stages');
    }
  );

  const classTalentView = new ClassTalentView(container, classManager, skills);
  const dexView = new DexView(container, pets, recipes, skills);
  const shopView = new ShopView(container, shopManager, playerState, pets);

  let currentTab: TabType = 'stages';

  function switchTab(tab: TabType): void {
    currentTab = tab;
    // 更新选项卡高亮状态 (若在独立培育界面，高亮【灵宠伙伴】Tab)
    const activeTabKey = tab === 'breeding' ? 'pets' : tab;

    Object.entries(tabs).forEach(([k, el]) => {
      if (!el) return;
      if (k === activeTabKey) {
        el.className = 'nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 bg-amber-500 text-slate-950 shadow font-bold';
      } else {
        el.className = 'nav-tab px-4 py-1.5 rounded-lg font-medium transition-all duration-200 text-slate-400 hover:text-white';
      }
    });

    // 渲染对应视图
    switch (tab) {
      case 'stages':
        stageView.render();
        break;
      case 'battle':
        battleView.render();
        break;
      case 'pets':
        petView.render();
        break;
      case 'breeding':
        breedingView.render();
        break;
      case 'shop':
        shopView.render();
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
  tabs.stages?.addEventListener('click', () => {
    hideBattleTab();
    switchTab('stages');
  });
  tabs.battle?.addEventListener('click', () => switchTab('battle'));
  tabs.pets?.addEventListener('click', () => {
    hideBattleTab();
    switchTab('pets');
  });
  tabs.shop?.addEventListener('click', () => {
    hideBattleTab();
    switchTab('shop');
  });
  tabs.classes?.addEventListener('click', () => {
    hideBattleTab();
    switchTab('classes');
  });
  tabs.dex?.addEventListener('click', () => {
    hideBattleTab();
    switchTab('dex');
  });

  // 绑定存档管理器弹窗
  document.getElementById('btn-open-save-manager')?.addEventListener('click', () => {
    const modal = new SaveManagerModal({
      playerState,
      classManager,
      onRefresh: () => {
        switchTab(currentTab);
      }
    });
    modal.show();
  });

  // 默认隐藏战斗演练舱，直接启动冒险关卡界面
  hideBattleTab();
  switchTab('stages');
});
