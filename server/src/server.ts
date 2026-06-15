import WebSocket, { WebSocketServer } from 'ws'
import { connectRedis, getReplay } from './redis/client'
import { roomManager } from './managers/roomManager'
import { gameEngine } from './game/GameEngine'
import { generateId } from './utils/helpers'
import { ClientMessage, ServerMessage, Difficulty, PlayerClass, WeaponType } from './types'

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
const gameStateIntervals: Map<string, NodeJS.Timeout> = new Map()

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
        const roomId = player.roomId
        await roomManager.leaveRoom(roomId, playerId)
        removeFromRoomConnections(roomId, playerId)
        
        broadcastToRoom(roomId, {
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
          
          const gameState = gameEngine.getGameState(player.roomId)
          if (gameState) {
            for (const [pId, p] of players) {
              if (p.roomId === player.roomId && p.classType) {
                try {
                  gameEngine.addPlayer(player.roomId, pId, p.name, p.classType)
                } catch (e) {
                  console.log('Player already added:', pId)
                }
              }
            }
          }
          
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
          try {
            gameEngine.addPlayer(player.roomId, playerId, player.name, classType)
          } catch (e) {
            console.log('Player already added or game state not ready:', playerId)
          }
          
          broadcastToRoom(player.roomId, {
            type: 'game_state',
            payload: gameState as unknown as Record<string, unknown>,
          })
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

    case 'upgrade_weapon': {
      const { weaponType } = message.payload as { weaponType: WeaponType }
      if (player.roomId) {
        const success = gameEngine.upgradeWeapon(player.roomId, playerId, weaponType)
        sendToPlayer(playerId, {
          type: 'upgrade_weapon_result',
          payload: { success, weaponType },
        })
      }
      break
    }

    case 'select_skill': {
      const { skillId } = message.payload as { skillId: string }
      if (player.roomId) {
        const success = gameEngine.selectSkill(player.roomId, playerId, skillId)
        sendToPlayer(playerId, {
          type: 'select_skill_result',
          payload: { success, skillId },
        })
      }
      break
    }

    case 'deploy_formation': {
      const { positions } = message.payload as { positions: Array<{ playerId: string; x: number; y: number }> }
      if (player.roomId) {
        gameEngine.deployFormation(player.roomId, positions)
        
        broadcastToRoom(player.roomId, {
          type: 'formation_deployed',
          payload: { positions },
        })
      }
      break
    }

    case 'save_formation_preset': {
      const { name, positions } = message.payload as { name: string; positions: Array<{ playerId: string; x: number; y: number }> }
      if (player.roomId) {
        const success = gameEngine.saveFormationPreset(player.roomId, name, positions)
        sendToPlayer(playerId, {
          type: 'save_formation_result',
          payload: { success },
        })
        
        if (success) {
          broadcastToRoom(player.roomId, {
            type: 'formation_presets_updated',
            payload: { presets: gameEngine.getFormationPresets(player.roomId) },
          })
        }
      }
      break
    }

    case 'load_formation_preset': {
      const { presetId } = message.payload as { presetId: string }
      if (player.roomId) {
        const positions = gameEngine.loadFormationPreset(player.roomId, presetId)
        if (positions) {
          gameEngine.deployFormation(player.roomId, positions)
          
          broadcastToRoom(player.roomId, {
            type: 'formation_deployed',
            payload: { positions },
          })
        }
      }
      break
    }

    case 'get_formation_presets': {
      if (player.roomId) {
        const presets = gameEngine.getFormationPresets(player.roomId)
        sendToPlayer(playerId, {
          type: 'formation_presets',
          payload: { presets },
        })
      }
      break
    }

    case 'delete_formation_preset': {
      const { presetId } = message.payload as { presetId: string }
      if (player.roomId) {
        const success = gameEngine.deleteFormationPreset(player.roomId, presetId)
        sendToPlayer(playerId, {
          type: 'delete_formation_result',
          payload: { success },
        })
        
        if (success) {
          broadcastToRoom(player.roomId, {
            type: 'formation_presets_updated',
            payload: { presets: gameEngine.getFormationPresets(player.roomId) },
          })
        }
      }
      break
    }

    case 'cancel_deployment': {
      const { targetPlayerId } = message.payload as { targetPlayerId?: string }
      if (player.roomId) {
        gameEngine.cancelDeployment(player.roomId, targetPlayerId)
        
        broadcastToRoom(player.roomId, {
          type: 'deployment_canceled',
          payload: { targetPlayerId },
        })
      }
      break
    }

    case 'get_game_stats': {
      if (player.roomId) {
        const stats = gameEngine.getGameStats(player.roomId)
        sendToPlayer(playerId, {
          type: 'game_stats',
          payload: { 
            stats: stats ? {
              playerStats: Array.from(stats.playerStats.entries()).map(([id, stat]) => ({ ...stat })),
              damageTimeSeries: stats.damageTimeSeries,
              resourceConsumption: stats.resourceConsumption,
              totalZombiesKilled: stats.totalZombiesKilled,
              totalResourcesCollected: stats.totalResourcesCollected,
            } : null 
          },
        })
      }
      break
    }

    case 'get_replay': {
      const { roomId } = message.payload as { roomId: string }
      const replayJson = await getReplay(roomId)
      
      if (!replayJson) {
        sendToPlayer(playerId, {
          type: 'replay_error',
          payload: { message: 'Replay not found' },
        })
        break
      }

      const replayData = JSON.parse(replayJson)
      const frames = replayData.frames
      const totalFrames = frames.length
      const SHARD_SIZE = 50

      // Send metadata first
      sendToPlayer(playerId, {
        type: 'replay_metadata',
        payload: {
          roomId,
          totalFrames,
          duration: replayData.duration,
          victory: replayData.victory,
          startTime: replayData.startTime,
          endTime: replayData.endTime,
        },
      })

      // Send frames in shards
      for (let i = 0; i < totalFrames; i += SHARD_SIZE) {
        const shard = frames.slice(i, Math.min(i + SHARD_SIZE, totalFrames))
        const shardIndex = Math.floor(i / SHARD_SIZE)
        const totalShards = Math.ceil(totalFrames / SHARD_SIZE)

        sendToPlayer(playerId, {
          type: 'replay_shard',
          payload: {
            shardIndex,
            totalShards,
            frames: shard,
          },
        })

        // Small delay between shards to prevent overwhelming the client
        if (i + SHARD_SIZE < totalFrames) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // Send completion message
      sendToPlayer(playerId, {
        type: 'replay_complete',
        payload: { roomId },
      })
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
    const roomId = player.roomId
    await roomManager.leaveRoom(roomId, playerId)
    removeFromRoomConnections(roomId, playerId)
    
    broadcastToRoom(roomId, {
      type: 'player_disconnected',
      payload: { playerId },
    })
    
    await sendRoomList()
    
    // 检查房间是否为空，如果为空则清理interval
    checkAndCleanupRoom(roomId)
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
  // 立即推送一次游戏状态
  const initialState = gameEngine.getGameState(roomId)
  if (initialState) {
    broadcastToRoom(roomId, {
      type: 'game_state',
      payload: initialState as unknown as Record<string, unknown>,
    })
  }
  
  // 清除已存在的interval（防止重复）
  stopGameStateSync(roomId)
  
  // 启动定期同步
  const interval = setInterval(() => {
    const gameState = gameEngine.getGameState(roomId)
    if (gameState) {
      // 检查游戏是否已结束
      if (gameState.gameOver) {
        stopGameStateSync(roomId)
        return
      }
      
      broadcastToRoom(roomId, {
        type: 'game_state',
        payload: gameState as unknown as Record<string, unknown>,
      })
    }
  }, 100)
  
  gameStateIntervals.set(roomId, interval)
}

function stopGameStateSync(roomId: string): void {
  const interval = gameStateIntervals.get(roomId)
  if (interval) {
    clearInterval(interval)
    gameStateIntervals.delete(roomId)
  }
}

function checkAndCleanupRoom(roomId: string): void {
  // 停止游戏状态同步
  stopGameStateSync(roomId)
  
  // 销毁游戏状态
  gameEngine.destroyGameState(roomId)
}

main().catch(console.error)
