export type Difficulty = 'easy' | 'normal' | 'hard'

export type TimeOfDay = 'day' | 'night'

export type PlayerClass = 'assault' | 'engineer' | 'medic' | 'commander'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export type ZombieType = 'normal' | 'runner' | 'tank' | 'bomber' | 'spitter' | 'summoner' | 'boss'

export type StructureType = 'barracks' | 'workshop' | 'medical' | 'command' | 'wall' | 'watchtower' | 'trap' | 'mine' | 'turret'

export type GatePosition = 'north' | 'south' | 'east' | 'west'

export type WeaponType = 'pistol' | 'submachine' | 'sniper' | 'shotgun'

export type WeaponUpgradePath = 'submachine' | 'sniper' | 'shotgun'

export interface Position {
  x: number
  y: number
}

export interface WeaponState {
  type: WeaponType
  level: number
  damage: number
  fireRate: number
  range: number
}

export interface SkillTreeNode {
  id: string
  name: string
  description: string
  level: number
  isUnlocked: boolean
  isSelected: boolean
}

export interface PlayerState {
  id: string
  name: string
  classType: PlayerClass
  position: Position
  health: number
  maxHealth: number
  armor: number
  speed: number
  skills: SkillState[]
  skillPoints: number
  skillTree: SkillTreeNode[]
  weapon: WeaponState
  isDead: boolean
  deathTime: number
  kills: number
  zombieKills: number
  specialZombieKills: number
  resourcesCollected: number
}

export interface SkillState {
  name: string
  cooldown: number
  maxCooldown: number
}

export interface SkillConfig {
  id: string
  name: string
  description: string
  effect: Record<string, unknown>
}

export interface SkillTreeConfig {
  classType: PlayerClass
  tiers: SkillConfig[][]
}

export interface ZombieState {
  id: string
  type: ZombieType
  position: Position
  health: number
  maxHealth: number
  speed: number
  damage: number
  targetId: string | null
}

export interface StructureState {
  id: string
  type: StructureType
  position: Position
  health: number
  maxHealth: number
  level: number
}

export interface GateState {
  id: string
  position: GatePosition
  health: number
  maxHealth: number
}

export interface ResourcePoint {
  id: string
  type: 'ammo' | 'wood' | 'iron' | 'medkit'
  position: Position
  isDepleted: boolean
  respawnTime: number
}

export interface Room {
  id: string
  name: string
  difficulty: Difficulty
  maxPlayers: number
  status: RoomStatus
  hostId: string
  currentNight: number
}

export interface ThreatGrid {
  grid: number[][]
  lastUpdate: number
}

export interface FormationPosition {
  playerId: string
  x: number
  y: number
}

export interface FormationPreset {
  id: string
  name: string
  positions: FormationPosition[]
}

export interface DamageEvent {
  time: number
  damage: number
}

export interface PlayerStats {
  playerId: string
  playerName: string
  classType: PlayerClass
  totalDamage: number
  kills: {
    normal: number
    special: number
    boss: number
  }
  damageTaken: number
  healingDone: number
  structuresBuilt: number
  deaths: number
  maxKillStreak: number
  currentKillStreak: number
  dpsHistory: DamageEvent[]
}

export interface DamageTimePoint {
  period: string
  day: number
  isNight: boolean
  damage: number
  perPlayer: Record<string, number>
}

export interface GameStats {
  playerStats: PlayerStats[]
  damageTimeSeries: DamageTimePoint[]
  resourceConsumption: {
    ammoPerMinute: number
    medkitPerMinute: number
  }
  totalZombiesKilled: number
  totalResourcesCollected: number
}

export interface DeploymentOrder {
  playerId: string
  targetX: number
  targetY: number
  active: boolean
}

export interface GameState {
  roomId: string
  day: number
  timeOfDay: TimeOfDay
  timeRemaining: number
  currentNight: number
  players: PlayerState[]
  zombies: ZombieState[]
  structures: StructureState[]
  gates: GateState[]
  resourcePoints: ResourcePoint[]
  resources: {
    ammo: number
    wood: number
    iron: number
    medkit: number
  }
  gameOver: boolean
  victory: boolean
  threatGrid: ThreatGrid
  currentFormation: FormationPosition[] | null
  deploymentOrders: DeploymentOrder[]
}

export interface ClientMessage {
  type: string
  payload: Record<string, unknown>
}

export interface ServerMessage {
  type: string
  payload: Record<string, unknown>
}
