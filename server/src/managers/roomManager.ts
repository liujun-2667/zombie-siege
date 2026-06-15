import { Room, RoomStatus, Difficulty, PlayerState } from '../types'
import { redisClient } from '../redis/client'
import { generateId } from '../utils/helpers'
import { GAME_CONFIG, DIFFICULTY_CONFIG } from '../config/gameConfig'

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  async createRoom(hostId: string, difficulty: Difficulty, roomName: string): Promise<Room> {
    const roomId = generateId()
    
    const room: Room = {
      id: roomId,
      name: roomName,
      difficulty,
      maxPlayers: GAME_CONFIG.MAX_PLAYERS,
      status: 'waiting',
      hostId,
      currentNight: 0,
    }
    
    this.rooms.set(roomId, room)
    
    await redisClient.hSet(`room:${roomId}`, {
      name: roomName,
      difficulty,
      maxPlayers: GAME_CONFIG.MAX_PLAYERS.toString(),
      status: 'waiting',
      hostId,
      currentNight: '0',
    })
    
    await redisClient.sAdd(`room:${roomId}:players`, hostId)
    
    return room
  }

  async joinRoom(roomId: string, playerId: string): Promise<boolean> {
    const room = this.rooms.get(roomId)
    
    if (!room || room.status !== 'waiting') {
      return false
    }
    
    const players = await redisClient.sMembers(`room:${roomId}:players`)
    
    if (players.length >= room.maxPlayers) {
      return false
    }
    
    await redisClient.sAdd(`room:${roomId}:players`, playerId)
    
    return true
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    await redisClient.sRem(`room:${roomId}:players`, playerId)
    
    const room = this.rooms.get(roomId)
    if (room) {
      const players = await redisClient.sMembers(`room:${roomId}:players`)
      
      if (players.length === 0) {
        this.rooms.delete(roomId)
        await redisClient.del(`room:${roomId}`)
        await redisClient.del(`room:${roomId}:players`)
      } else if (room.hostId === playerId) {
        room.hostId = players[0]
        await redisClient.hSet(`room:${roomId}`, { hostId: players[0] })
      }
    }
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    const room = this.rooms.get(roomId)
    if (room) {
      room.status = status
      await redisClient.hSet(`room:${roomId}`, { status })
    }
  }

  async updateRoomNight(roomId: string, night: number): Promise<void> {
    const room = this.rooms.get(roomId)
    if (room) {
      room.currentNight = night
      await redisClient.hSet(`room:${roomId}`, { currentNight: night.toString() })
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  async getRoomPlayers(roomId: string): Promise<string[]> {
    return await redisClient.sMembers(`room:${roomId}:players`)
  }

  async getRoomList(): Promise<Room[]> {
    const keys = await redisClient.keys('room:*:players')
    const roomIds = keys.map(key => key.replace(':players', ''))
    
    const rooms: Room[] = []
    
    for (const roomKey of roomIds) {
      const roomId = roomKey.replace('room:', '')
      const roomData = await redisClient.hGetAll(roomKey)
      
      if (roomData.status === 'waiting') {
        const players = await redisClient.sMembers(`${roomKey}:players`)
        
        rooms.push({
          id: roomId,
          name: roomData.name || 'Unnamed Room',
          difficulty: roomData.difficulty as Difficulty || 'normal',
          maxPlayers: parseInt(roomData.maxPlayers || '4'),
          status: roomData.status as RoomStatus,
          hostId: roomData.hostId || '',
          currentNight: parseInt(roomData.currentNight || '0'),
        })
      }
    }
    
    return rooms
  }

  async findQuickMatchRoom(): Promise<string | null> {
    const rooms = await this.getRoomList()
    
    const availableRooms = rooms.filter(room => {
      return room.status === 'waiting'
    })
    
    if (availableRooms.length === 0) {
      return null
    }
    
    return availableRooms[Math.floor(Math.random() * availableRooms.length)].id
  }

  getDifficultyConfig(difficulty: Difficulty) {
    return DIFFICULTY_CONFIG[difficulty]
  }
}

export const roomManager = new RoomManager()
