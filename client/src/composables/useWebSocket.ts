import { ref, onMounted, onUnmounted } from 'vue'
import { gameStore, setRooms, setConnected, setCurrentRoom, setShowClassSelection, setGameState, setShowGameOver } from '../stores/gameStore'
import type { Room, GameState, PlayerClass } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnecting = ref(false)

  const connect = () => {
    if (ws.value?.readyState === WebSocket.OPEN) return

    isConnecting.value = true
    
    ws.value = new WebSocket(WS_URL)

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
        setShowClassSelection(true)
        break
      }

      case 'class_selected': {
        break
      }

      case 'game_state': {
        const state = message.payload as GameState
        setGameState(state)
        
        if (state.gameOver) {
          setShowGameOver(true, state.victory ? 'victory' : 'defeat')
        }
        break
      }

      case 'build_result': {
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
  }
}
