export const GAME_CONFIG = {
  MAP_WIDTH: 800,
  MAP_HEIGHT: 800,
  BASE_SIZE: 200,
  GATE_WIDTH: 60,
  GATE_INITIAL_HP: 500,
  
  DAY_DURATION: 90,
  NIGHT_DURATION: 120,
  
  PLAYER_MAX_HEALTH: 100,
  PLAYER_BASE_SPEED: 3,
  
  RESOURCE_MAX_STACK: 99,
  
  ZOMBIE_BASE_COUNT: 50,
  ZOMBIE_INCREMENT_PER_NIGHT: 30,
  
  SPECIAL_ZOMBIE_RATIO_START: 0,
  SPECIAL_ZOMBIE_RATIO_MID: 0.3,
  SPECIAL_ZOMBIE_RATIO_END: 0.5,
  
  MAX_PLAYERS: 4,
  
  LIGHT_RADIUS: 300,
  
  RESPAWN_TIME_DAY: 10,
  RESPAWN_TIME_NIGHT: 20,
}

export const DIFFICULTY_CONFIG = {
  easy: {
    zombieMultiplier: 0.7,
    resourceRefreshSpeed: 1.3,
  },
  normal: {
    zombieMultiplier: 1.0,
    resourceRefreshSpeed: 1.0,
  },
  hard: {
    zombieMultiplier: 1.5,
    resourceRefreshSpeed: 0.7,
  },
}

export const PLAYER_CLASSES = {
  assault: {
    name: '突击手',
    health: 100,
    armor: 0.1,
    speed: 1.2,
    damage: 1.5,
    buildSpeed: 1.0,
    skill: {
      active: { name: '狂暴射击', cooldown: 30, effect: '连续射击5次' },
      passive: '暴击率+15%',
    },
  },
  engineer: {
    name: '工程师',
    health: 100,
    armor: 0.2,
    speed: 0.9,
    damage: 0.8,
    buildSpeed: 2.0,
    skill: {
      active: { name: '快速建造', cooldown: 30, effect: '立即完成一个建造' },
      passive: '建造速度翻倍',
    },
  },
  medic: {
    name: '医疗兵',
    health: 80,
    armor: 0.1,
    speed: 1.0,
    damage: 0.7,
    buildSpeed: 1.0,
    skill: {
      active: { name: '范围治疗', cooldown: 30, effect: '治疗周围队友' },
      passive: '复活速度+100%',
    },
  },
  commander: {
    name: '指挥官',
    health: 90,
    armor: 0.15,
    speed: 1.0,
    damage: 1.0,
    buildSpeed: 1.0,
    skill: {
      active: { name: '全局减速', cooldown: 30, effect: '所有敌人减速50%' },
      passive: '队友伤害+10%',
    },
  },
}

export const ZOMBIE_CONFIG = {
  normal: {
    health: 50,
    speed: 1,
    damage: 10,
    reward: { ammo: 1, wood: 0, iron: 0, medkit: 0 },
  },
  runner: {
    health: 30,
    speed: 2.5,
    damage: 8,
    reward: { ammo: 2, wood: 0, iron: 0, medkit: 0 },
  },
  tank: {
    health: 200,
    speed: 0.5,
    damage: 25,
    reward: { ammo: 0, wood: 2, iron: 1, medkit: 0 },
  },
  bomber: {
    health: 40,
    speed: 0.8,
    damage: 50,
    explosionRadius: 80,
    reward: { ammo: 1, wood: 1, iron: 1, medkit: 0 },
  },
  spitter: {
    health: 60,
    speed: 0.6,
    damage: 15,
    range: 150,
    reward: { ammo: 2, wood: 0, iron: 1, medkit: 0 },
  },
  summoner: {
    health: 100,
    speed: 0.4,
    damage: 0,
    summonInterval: 3000,
    reward: { ammo: 0, wood: 0, iron: 2, medkit: 1 },
  },
  boss: {
    health: 5000,
    speed: 0.3,
    damage: 100,
    reward: { ammo: 20, wood: 10, iron: 10, medkit: 5 },
  },
}

export const STRUCTURE_CONFIG = {
  barracks: {
    name: '兵工厂',
    cost: { ammo: 0, wood: 50, iron: 30 },
    buildTime: 10000,
    maxLevel: 3,
    levelBonus: {
      1: { ammoProduction: 5 },
      2: { ammoProduction: 10, weaponDamage: 1.1 },
      3: { ammoProduction: 20, weaponDamage: 1.25 },
    },
  },
  workshop: {
    name: '工程站',
    cost: { ammo: 0, wood: 30, iron: 50 },
    buildTime: 10000,
    maxLevel: 3,
    levelBonus: {
      1: { woodProduction: 3, ironProduction: 2 },
      2: { woodProduction: 6, ironProduction: 4, buildSpeed: 1.1 },
      3: { woodProduction: 10, ironProduction: 6, buildSpeed: 1.2 },
    },
  },
  medical: {
    name: '医疗帐篷',
    cost: { ammo: 0, wood: 40, iron: 20 },
    buildTime: 8000,
    maxLevel: 3,
    levelBonus: {
      1: { healAmount: 10 },
      2: { healAmount: 20, healRange: 100 },
      3: { healAmount: 35, healRange: 150, respawnSpeed: 1.5 },
    },
  },
  command: {
    name: '指挥塔',
    cost: { ammo: 0, wood: 60, iron: 60 },
    buildTime: 15000,
    maxLevel: 3,
    levelBonus: {
      1: { viewRange: 200 },
      2: { viewRange: 250, slowAura: 0.1 },
      3: { viewRange: 350, slowAura: 0.2 },
    },
  },
  wall: {
    name: '城墙段',
    cost: { ammo: 0, wood: 20, iron: 10 },
    buildTime: 5000,
    maxHealth: 800,
  },
  watchtower: {
    name: '瞭望塔',
    cost: { ammo: 0, wood: 30, iron: 20 },
    buildTime: 8000,
    maxLevel: 3,
    levelBonus: {
      1: { viewRange: 150, damageBonus: 1.1 },
      2: { viewRange: 200, damageBonus: 1.15 },
      3: { viewRange: 250, damageBonus: 1.25 },
    },
  },
  trap: {
    name: '木刺陷阱',
    cost: { ammo: 0, wood: 10, iron: 0 },
    buildTime: 3000,
    slowEffect: 0.5,
    damagePerTick: 5,
  },
  mine: {
    name: '地雷',
    cost: { ammo: 5, wood: 0, iron: 5 },
    buildTime: 2000,
    damage: 100,
    radius: 60,
  },
  turret: {
    name: '自动炮塔',
    cost: { ammo: 20, wood: 10, iron: 30 },
    buildTime: 10000,
    maxLevel: 3,
    damage: 15,
    fireRate: 1000,
    ammoConsumption: 1,
    levelBonus: {
      1: { range: 180, damage: 15 },
      2: { range: 220, damage: 20 },
      3: { range: 260, damage: 30, fireRate: 600 },
    },
  },
}

export const WEAPON_CONFIG = {
  pistol: {
    name: '手枪',
    icon: '🔫',
    baseDamage: 10,
    baseFireRate: 2,
    baseRange: 200,
  },
  submachine: {
    name: '冲锋枪',
    icon: '💥',
    baseDamage: 8,
    baseFireRate: 6,
    baseRange: 150,
    upgradeCosts: [10, 25, 50],
    levelBonuses: [
      { damage: 8, fireRate: 6, range: 150 },
      { damage: 10, fireRate: 8, range: 160 },
      { damage: 12, fireRate: 10, range: 175 },
    ],
  },
  sniper: {
    name: '狙击枪',
    icon: '🎯',
    baseDamage: 35,
    baseFireRate: 0.5,
    baseRange: 400,
    upgradeCosts: [10, 25, 50],
    levelBonuses: [
      { damage: 35, fireRate: 0.5, range: 400 },
      { damage: 50, fireRate: 0.6, range: 450 },
      { damage: 75, fireRate: 0.7, range: 500 },
    ],
  },
  shotgun: {
    name: '霰弹枪',
    icon: '🔶',
    baseDamage: 20,
    baseFireRate: 1,
    baseRange: 100,
    spreadAngle: 45,
    pellets: 8,
    upgradeCosts: [10, 25, 50],
    levelBonuses: [
      { damage: 20, fireRate: 1, range: 100, pellets: 8 },
      { damage: 25, fireRate: 1.2, range: 110, pellets: 10 },
      { damage: 30, fireRate: 1.5, range: 120, pellets: 12 },
    ],
  },
}

export const SKILL_TREE_CONFIG: Record<string, { tiers: Array<{ id: string; name: string; description: string; effect: Record<string, unknown> }[]> }> = {
  assault: {
    tiers: [
      [
        { id: 'assault_1a', name: '弹药回收', description: '击杀返还30%弹药', effect: { ammoRefund: 0.3 } },
        { id: 'assault_1b', name: '暴击概率', description: '20%概率双倍伤害', effect: { critChance: 0.2, critMultiplier: 2 } },
      ],
      [
        { id: 'assault_2a', name: '穿透射击', description: '子弹穿透2个目标', effect: { pierceCount: 2 } },
        { id: 'assault_2b', name: '燃烧弹', description: '命中后持续3秒灼伤', effect: { burnDuration: 3, burnDamage: 5 } },
      ],
      [
        { id: 'assault_3a', name: '狂暴模式增强', description: '持续时间翻倍', effect: { rageDurationMultiplier: 2 } },
        { id: 'assault_3b', name: '死亡标记', description: '被标记的僵尸受到全队伤害加成50%', effect: { markDamageBonus: 0.5 } },
      ],
    ],
  },
  engineer: {
    tiers: [
      [
        { id: 'engineer_1a', name: '快速部署', description: '建造时间减半', effect: { buildTimeMultiplier: 0.5 } },
        { id: 'engineer_1b', name: '坚固工事', description: '工事血量+50%', effect: { structureHealthBonus: 0.5 } },
      ],
      [
        { id: 'engineer_2a', name: '连锁地雷', description: '地雷爆炸触发相邻地雷', effect: { mineChainReaction: true } },
        { id: 'engineer_2b', name: '智能炮塔', description: '炮塔优先攻击血量最低目标', effect: { turretSmartTargeting: true } },
      ],
      [
        { id: 'engineer_3a', name: '过载模式', description: '炮塔射速翻倍持续10秒', effect: { turretOverloadDuration: 10, turretFireRateMultiplier: 2 } },
        { id: 'engineer_3b', name: '防御矩阵', description: '周围工事10秒内免疫伤害', effect: { defenseMatrixDuration: 10, immunity: true } },
      ],
    ],
  },
  medic: {
    tiers: [
      [
        { id: 'medic_1a', name: '治疗增幅', description: '治疗效果+30%', effect: { healBonus: 0.3 } },
        { id: 'medic_1b', name: '复活加速', description: '复活时间-30%', effect: { respawnTimeReduction: 0.3 } },
      ],
      [
        { id: 'medic_2a', name: '群体治疗', description: '治疗范围扩大50%', effect: { healRangeBonus: 0.5 } },
        { id: 'medic_2b', name: '急救专精', description: '医疗包效果翻倍', effect: { medkitMultiplier: 2 } },
      ],
      [
        { id: 'medic_3a', name: '重生光环', description: '死亡时立即复活周围队友', effect: { reviveAura: true } },
        { id: 'medic_3b', name: '生命链接', description: '队友伤害的10%转化为自身治疗', effect: { lifestealShare: 0.1 } },
      ],
    ],
  },
  commander: {
    tiers: [
      [
        { id: 'commander_1a', name: '光环范围', description: '指挥官光环范围+50%', effect: { auraRangeBonus: 0.5 } },
        { id: 'commander_1b', name: '减速增强', description: '减速效果+20%', effect: { slowEffectBonus: 0.2 } },
      ],
      [
        { id: 'commander_2a', name: '攻击指挥', description: '队友伤害+15%', effect: { damageBuff: 0.15 } },
        { id: 'commander_2b', name: '防御指挥', description: '队友护甲+20%', effect: { armorBuff: 0.2 } },
      ],
      [
        { id: 'commander_3a', name: '战术撤退', description: '全体队友获得5秒无敌', effect: { invincibilityDuration: 5 } },
        { id: 'commander_3b', name: '终极号令', description: '所有炮塔和队友伤害翻倍持续8秒', effect: { ultimateDamageMultiplier: 2, duration: 8 } },
      ],
    ],
  },
}

export const RESOURCE_CONFIG = {
  ammo: { name: '弹药', color: '#FFD700' },
  wood: { name: '木材', color: '#8B4513' },
  iron: { name: '铁矿', color: '#708090' },
  medkit: { name: '医疗包', color: '#FF6B6B' },
}
