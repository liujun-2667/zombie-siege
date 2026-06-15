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
      1: { range: 180 },
      2: { range: 220, damage: 20 },
      3: { range: 260, damage: 30, fireRate: 600 },
    },
  },
}

export const RESOURCE_CONFIG = {
  ammo: { name: '弹药', color: '#FFD700' },
  wood: { name: '木材', color: '#8B4513' },
  iron: { name: '铁矿', color: '#708090' },
  medkit: { name: '医疗包', color: '#FF6B6B' },
}
