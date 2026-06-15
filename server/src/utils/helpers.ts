import { v4 as uuidv4 } from 'uuid'
import { GAME_CONFIG } from '../config/gameConfig'
import { Position } from '../types'

export function generateId(): string {
  return uuidv4()
}

export function getDistance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function isInBase(position: Position): boolean {
  const centerX = GAME_CONFIG.MAP_WIDTH / 2
  const centerY = GAME_CONFIG.MAP_HEIGHT / 2
  const halfBase = GAME_CONFIG.BASE_SIZE / 2
  
  return (
    position.x >= centerX - halfBase &&
    position.x <= centerX + halfBase &&
    position.y >= centerY - halfBase &&
    position.y <= centerY + halfBase
  )
}

export function isNearGate(position: Position, gatePosition: string): boolean {
  const centerX = GAME_CONFIG.MAP_WIDTH / 2
  const centerY = GAME_CONFIG.MAP_HEIGHT / 2
  const halfBase = GAME_CONFIG.BASE_SIZE / 2
  const halfGate = GAME_CONFIG.GATE_WIDTH / 2
  
  let gateX: number, gateY: number
  
  switch (gatePosition) {
    case 'north':
      gateX = centerX
      gateY = centerY - halfBase
      break
    case 'south':
      gateX = centerX
      gateY = centerY + halfBase
      break
    case 'east':
      gateX = centerX + halfBase
      gateY = centerY
      break
    case 'west':
      gateX = centerX - halfBase
      gateY = centerY
      break
    default:
      return false
  }
  
  return (
    position.x >= gateX - halfGate - 10 &&
    position.x <= gateX + halfGate + 10 &&
    position.y >= gateY - 10 &&
    position.y <= gateY + 10
  )
}

export function getRandomSpawnPosition(): Position {
  const side = Math.floor(Math.random() * 4)
  const mapWidth = GAME_CONFIG.MAP_WIDTH
  const mapHeight = GAME_CONFIG.MAP_HEIGHT
  const margin = 50
  
  switch (side) {
    case 0: // north
      return { x: Math.random() * mapWidth, y: margin }
    case 1: // south
      return { x: Math.random() * mapWidth, y: mapHeight - margin }
    case 2: // east
      return { x: mapWidth - margin, y: Math.random() * mapHeight }
    default: // west
      return { x: margin, y: Math.random() * mapHeight }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
