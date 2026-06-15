import { ref, onMounted, onUnmounted } from 'vue'
import { gameStore, setRooms, setConnected, setCurrentRoom, setGameState, setShowGameOver, setFormationPresets, setGameStats, setPostMatchStats } from '../stores/gameStore'
import type { Room, GameState, PlayerClass, WeaponType, FormationPreset, FormationPosition, GameStats } from '../types'

const getWsUrl = () => {
  if (import.meta.env.MODE === 'production') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/`
  }
  return import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
}

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnecting = ref(false)

  const connect = () => {
    if (ws.value?.readyState === WebSocket.OPEN) return

    isConnecting.value = true
    
    const url = getWsUrl()
    console.log('Connecting to WebSocket:', url)
    
    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
      isConnecting.value = false
      sendMessage({ type: 'get_room_list', payload: {} })
    }

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Message parsing error:', error)
      }
    }

    ws.value.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      isConnecting.value = false
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnecting.value = false
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  const sendMessage = (message: { type: string; payload: Record<string, unknown> }) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
    }
  }

  const handleMessage = (message: { type: string; payload: Record<string, unknown> }) => {
    switch (message.type) {
      case 'room_list': {
        const rooms = message.payload.rooms as Room[]
        setRooms(rooms)
        break
      }

      case 'room_created': {
        const roomId = message.payload.roomId as string
        const room = gameStore.rooms.find(r => r.id === roomId)
        if (room) {
          setCurrentRoom(room)
        }
        break
      }

      case 'room_joined': {
        const roomId = message.payload.roomId as string
        const room = gameStore.rooms.find(r => r.id === roomId)
        if (room) {
          setCurrentRoom(room)
        }
        break
      }

      case 'player_joined': {
        break
      }

      case 'player_left': {
        break
      }

      case 'game_started': {
        break
      }

      case 'class_selected': {
        break
      }

      case 'game_state': {
        const state = message.payload as GameState
        setGameState(state)
        
        if (state.gameOver) {
          sendMessage({ type: 'get_game_stats', payload: {} })
          setShowGameOver(true, state.victory ? 'victory' : 'defeat')
        }
        break
      }

      case 'build_result': {
        break
      }

      case 'formation_deployed': {
        break
      }

      case 'formation_presets': {
        const presets = message.payload.presets as FormationPreset[]
        setFormationPresets(presets)
        break
      }

      case 'formation_presets_updated': {
        const presets = message.payload.presets as FormationPreset[]
        setFormationPresets(presets)
        break
      }

      case 'save_formation_result': {
        const success = message.payload.success as boolean
        if (success) {
          sendMessage({ type: 'get_formation_presets', payload: {} })
        }
        break
      }

      case 'delete_formation_result': {
        break
      }

      case 'deployment_canceled': {
        break
      }

      case 'game_stats': {
        const stats = message.payload.stats as GameStats
        setGameStats(stats)
        setPostMatchStats(stats)
        break
      }

      case 'error': {
        console.error('Server error:', message.payload.message)
        break
      }
    }
  }

  const createRoom = (difficulty: string, roomName: string, playerName: string) => {
    sendMessage({
      type: 'create_room',
      payload: { difficulty, roomName, playerName },
    })
  }

  const joinRoom = (roomId: string, playerName: string) => {
    sendMessage({
      type: 'join_room',
      payload: { roomId, playerName },
    })
  }

  const quickMatch = (playerName: string) => {
    sendMessage({
      type: 'quick_match',
      payload: { playerName },
    })
  }

  const leaveRoom = () => {
    sendMessage({
      type: 'leave_room',
      payload: {},
    })
    setCurrentRoom(null)
  }

  const startGame = () => {
    sendMessage({
      type: 'start_game',
      payload: {},
    })
  }

  const selectClass = (classType: PlayerClass) => {
    sendMessage({
      type: 'select_class',
      payload: { classType },
    })
  }

  const move = (x: number, y: number) => {
    sendMessage({
      type: 'move',
      payload: { x, y },
    })
  }

  const shoot = (x: number, y: number) => {
    sendMessage({
      type: 'shoot',
      payload: { x, y },
    })
  }

  const scavenge = () => {
    sendMessage({
      type: 'scavenge',
      payload: {},
    })
  }

  const build = (type: string, x: number, y: number) => {
    sendMessage({
      type: 'build',
      payload: { type, x, y },
    })
  }

  const upgradeWeapon = (weaponType: WeaponType) => {
    sendMessage({
      type: 'upgrade_weapon',
      payload: { weaponType },
    })
  }

  const selectSkill = (skillId: string) => {
    sendMessage({
      type: 'select_skill',
      payload: { skillId },
    })
  }

  const deployFormation = (positions: FormationPosition[]) => {
    sendMessage({
      type: 'deploy_formation',
      payload: { positions },
    })
  }

  const saveFormationPreset = (name: string, positions: FormationPosition[]) => {
    sendMessage({
      type: 'save_formation_preset',
      payload: { name, positions },
    })
  }

  const loadFormationPreset = (presetId: string) => {
    sendMessage({
      type: 'load_formation_preset',
      payload: { presetId },
    })
  }

  const getFormationPresets = () => {
    sendMessage({
      type: 'get_formation_presets',
      payload: {},
    })
  }

  const deleteFormationPreset = (presetId: string) => {
    sendMessage({
      type: 'delete_formation_preset',
      payload: { presetId },
    })
  }

  const cancelDeployment = (targetPlayerId?: string) => {
    sendMessage({
      type: 'cancel_deployment',
      payload: { targetPlayerId },
    })
  }

  const getGameStats = () => {
    sendMessage({
      type: 'get_game_stats',
      payload: {},
    })
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    ws,
    isConnecting,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    quickMatch,
    leaveRoom,
    startGame,
    selectClass,
    move,
    shoot,
    scavenge,
    build,
    upgradeWeapon,
    selectSkill,
    deployFormation,
    saveFormationPreset,
    loadFormationPreset,
    getFormationPresets,
    deleteFormationPreset,
    cancelDeployment,
    getGameStats,
  }
}
