import WebSocket, { WebSocketServer } from 'ws'
import { connectRedis } from './redis/client'
import { roomManager } from './managers/roomManager'
import { gameEngine } from './game/GameEngine'
import { generateId } from './utils/helpers'
import { ClientMessage, ServerMessage, Difficulty, PlayerClass } from './types'

const PORT = Number(process.env.PORT) || 3001

interface PlayerConnection {
  ws: WebSocket
  id: string
  name: string
  roomId: string | null
  classType: PlayerClass | null
}

const players: Map<string, PlayerConnection> = new Map()
const roomConnections: Map<string, Set<string>> = new Map()

async function main() {
  await connectRedis()
  console.log('Redis connected')

  const wss = new WebSocketServer({ port: PORT })
  console.log(`WebSocket server listening on port ${PORT}`)

  wss.on('connection', (ws: WebSocket) => {
    const playerId = generateId()
    
    const player: PlayerConnection = {
      ws,
      id: playerId,
      name: '',
      roomId: null,
      classType: null,
    }
    
    players.set(playerId, player)

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString())
        await handleMessage(playerId, message)
      } catch (error) {
        console.error('Message parsing error:', error)
      }
    })

    ws.on('close', async () => {
      await handleDisconnect(playerId)
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  })
}

async function handleMessage(playerId: string, message: ClientMessage): Promise<void> {
  const player = players.get(playerId)
  if (!player) return

  switch (message.type) {
    case 'create_room': {
      const { difficulty, roomName } = message.payload as { difficulty: Difficulty; roomName: string }
      const room = await roomManager.createRoom(playerId, difficulty, roomName)
      player.roomId = room.id
      player.name = (message.payload as any).playerName || 'Player'
      
      addToRoomConnections(room.id, playerId)
      
      sendToPlayer(playerId, {
        type: 'room_created',
        payload: { roomId: room.id, roomName: room.name },
      })
      
      await sendRoomList()
      break
    }

    case 'join_room': {
      const { roomId, playerName } = message.payload as { roomId: string; playerName: string }
      const success = await roomManager.joinRoom(roomId, playerId)
      
      if (success) {
        player.roomId = roomId
        player.name = playerName
        
        addToRoomConnections(roomId, playerId)
        
        sendToPlayer(playerId, {
          type: 'room_joined',
          payload: { roomId },
        })
        
        await sendRoomList()
        broadcastToRoom(roomId, {
          type: 'player_joined',
          payload: { playerId, playerName },
        })
      } else {
        sendToPlayer(playerId, {
          type: 'error',
          payload: { message: 'Failed to join room' },
        })
      }
      break
    }

    case 'quick_match': {
      const { playerName } = message.payload as { playerName: string }
      const roomId = await roomManager.findQuickMatchRoom()
      
      if (roomId) {
        const success = await roomManager.joinRoom(roomId, playerId)
        if (success) {
          player.roomId = roomId
          player.name = playerName
          
          addToRoomConnections(roomId, playerId)
          
          sendToPlayer(playerId, {
            type: 'room_joined',
            payload: { roomId },
          })
          
          await sendRoomList()
          broadcastToRoom(roomId, {
            type: 'player_joined',
            payload: { playerId, playerName },
          })
        }
      } else {
        const room = await roomManager.createRoom(playerId, 'normal', 'Quick Match Room')
        player.roomId = room.id
        player.name = playerName
        
        addToRoomConnections(room.id, playerId)
        
        sendToPlayer(playerId, {
          type: 'room_created',
          payload: { roomId: room.id, roomName: room.name },
        })
        
        await sendRoomList()
      }
      break
    }

    case 'leave_room': {
      if (player.roomId) {
        await roomManager.leaveRoom(player.roomId, playerId)
        removeFromRoomConnections(player.roomId, playerId)
        
        broadcastToRoom(player.roomId, {
          type: 'player_left',
          payload: { playerId },
        })
        
        player.roomId = null
        player.classType = null
        
        await sendRoomList()
      }
      break
    }

    case 'get_room_list': {
      const rooms = await roomManager.getRoomList()
      sendToPlayer(playerId, {
        type: 'room_list',
        payload: { rooms },
      })
      break
    }

    case 'start_game': {
      if (player.roomId) {
        const room = roomManager.getRoom(player.roomId)
        if (room && room.hostId === playerId) {
          await roomManager.updateRoomStatus(player.roomId, 'playing')
          gameEngine.startGame(player.roomId)
          
          broadcastToRoom(player.roomId, {
            type: 'game_started',
            payload: {},
          })
          
          startGameStateSync(player.roomId)
        }
      }
      break
    }

    case 'select_class': {
      const { classType } = message.payload as { classType: PlayerClass }
      player.classType = classType
      
      if (player.roomId) {
        const gameState = gameEngine.getGameState(player.roomId)
        if (gameState) {
          gameEngine.addPlayer(player.roomId, playerId, player.name, classType)
        }
        
        broadcastToRoom(player.roomId, {
          type: 'class_selected',
          payload: { playerId, classType },
        })
      }
      break
    }

    case 'move': {
      const { x, y } = message.payload as { x: number; y: number }
      if (player.roomId) {
        gameEngine.movePlayer(player.roomId, playerId, x, y)
      }
      break
    }

    case 'shoot': {
      const { x, y } = message.payload as { x: number; y: number }
      if (player.roomId) {
        gameEngine.shoot(player.roomId, playerId, x, y)
      }
      break
    }

    case 'scavenge': {
      if (player.roomId) {
        gameEngine.scavenge(player.roomId, playerId)
      }
      break
    }

    case 'build': {
      const { type, x, y } = message.payload as { type: string; x: number; y: number }
      if (player.roomId) {
        const success = gameEngine.buildStructure(player.roomId, playerId, type, x, y)
        sendToPlayer(playerId, {
          type: 'build_result',
          payload: { success },
        })
      }
      break
    }

    default:
      console.log('Unknown message type:', message.type)
  }
}

async function handleDisconnect(playerId: string): Promise<void> {
  const player = players.get(playerId)
  if (!player) return

  if (player.roomId) {
    await roomManager.leaveRoom(player.roomId, playerId)
    removeFromRoomConnections(player.roomId, playerId)
    
    broadcastToRoom(player.roomId, {
      type: 'player_disconnected',
      payload: { playerId },
    })
    
    await sendRoomList()
  }

  players.delete(playerId)
}

function sendToPlayer(playerId: string, message: ServerMessage): void {
  const player = players.get(playerId)
  if (player && player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(message))
  }
}

function broadcastToRoom(roomId: string, message: ServerMessage): void {
  const connectionIds = roomConnections.get(roomId)
  if (!connectionIds) return

  for (const playerId of connectionIds) {
    sendToPlayer(playerId, message)
  }
}

function addToRoomConnections(roomId: string, playerId: string): void {
  let connections = roomConnections.get(roomId)
  if (!connections) {
    connections = new Set()
    roomConnections.set(roomId, connections)
  }
  connections.add(playerId)
}

function removeFromRoomConnections(roomId: string, playerId: string): void {
  const connections = roomConnections.get(roomId)
  if (connections) {
    connections.delete(playerId)
    if (connections.size === 0) {
      roomConnections.delete(roomId)
    }
  }
}

async function sendRoomList(): Promise<void> {
  const rooms = await roomManager.getRoomList()
  const message: ServerMessage = {
    type: 'room_list',
    payload: { rooms },
  }

  for (const player of players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message))
    }
  }
}

function startGameStateSync(roomId: string): void {
  setInterval(() => {
    const gameState = gameEngine.getGameState(roomId)
    if (gameState) {
      broadcastToRoom(roomId, {
        type: 'game_state',
        payload: gameState as Record<string, unknown>,
      })
    }
  }, 100)
}

main().catch(console.error)
