import { reactive } from 'vue'
import type { GameState, PlayerState, ZombieState, Room, PlayerClass, FormationPreset, GameStats } from '../types'

export interface GameStore {
  rooms: Room[]
  currentRoom: Room | null
  playerId: string
  playerName: string
  playerClass: PlayerClass | null
  gameState: GameState | null
  isConnected: boolean
  showClassSelection: boolean
  showGameOver: boolean
  gameResult: 'victory' | 'defeat' | null
  showCommandPanel: boolean
  commandPanelTab: 'situation' | 'formation' | 'stats'
  formationPresets: FormationPreset[]
  gameStats: GameStats | null
  postMatchStats: GameStats | null
}

export const gameStore = reactive<GameStore>({
  rooms: [],
  currentRoom: null,
  playerId: '',
  playerName: '',
  playerClass: null,
  gameState: null,
  isConnected: false,
  showClassSelection: false,
  showGameOver: false,
  gameResult: null,
  showCommandPanel: false,
  commandPanelTab: 'situation',
  formationPresets: [],
  gameStats: null,
  postMatchStats: null,
})

export function setRooms(rooms: Room[]) {
  gameStore.rooms = rooms
}

export function setCurrentRoom(room: Room | null) {
  gameStore.currentRoom = room
}

export function setPlayerId(id: string) {
  gameStore.playerId = id
}

export function setPlayerName(name: string) {
  gameStore.playerName = name
}

export function setPlayerClass(classType: PlayerClass | null) {
  gameStore.playerClass = classType
}

export function setGameState(state: GameState | null) {
  gameStore.gameState = state
}

export function setConnected(connected: boolean) {
  gameStore.isConnected = connected
}

export function setShowClassSelection(show: boolean) {
  gameStore.showClassSelection = show
}

export function setShowGameOver(show: boolean, result?: 'victory' | 'defeat') {
  gameStore.showGameOver = show
  gameStore.gameResult = result || null
}

export function setShowCommandPanel(show: boolean) {
  gameStore.showCommandPanel = show
}

export function setCommandPanelTab(tab: 'situation' | 'formation' | 'stats') {
  gameStore.commandPanelTab = tab
}

export function setFormationPresets(presets: FormationPreset[]) {
  gameStore.formationPresets = presets
}

export function setGameStats(stats: GameStats | null) {
  gameStore.gameStats = stats
}

export function setPostMatchStats(stats: GameStats | null) {
  gameStore.postMatchStats = stats
}

export function resetGame() {
  gameStore.gameState = null
  gameStore.playerClass = null
  gameStore.showClassSelection = false
  gameStore.showGameOver = false
  gameStore.gameResult = null
  gameStore.showCommandPanel = false
  gameStore.commandPanelTab = 'situation'
  gameStore.formationPresets = []
  gameStore.gameStats = null
  gameStore.postMatchStats = null
}
