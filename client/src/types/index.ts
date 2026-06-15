export type Difficulty = 'easy' | 'normal' | 'hard'

export type TimeOfDay = 'day' | 'night'

export type PlayerClass = 'assault' | 'engineer' | 'medic' | 'commander'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export type ZombieType = 'normal' | 'runner' | 'tank' | 'bomber' | 'spitter' | 'summoner' | 'boss'

export type StructureType = 'barracks' | 'workshop' | 'medical' | 'command' | 'wall' | 'watchtower' | 'trap' | 'mine' | 'turret'

export type GatePosition = 'north' | 'south' | 'east' | 'west'

export interface Position {
  x: number
  y: number
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
  isDead: boolean
  deathTime: number
  kills: number
  resourcesCollected: number
}

export interface SkillState {
  name: string
  cooldown: number
  maxCooldown: number
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

export interface GameState {
  roomId: string
  day: number
  timeOfDay: TimeOfDay
  timeRemaining: number
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
}

export interface ClientMessage {
  type: string
  payload: Record<string, unknown>
}

export interface ServerMessage {
  type: string
  payload: Record<string, unknown>
}
