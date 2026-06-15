<template>
  <div class="min-h-screen bg-dark">
    <GameCanvas
      v-if="gameStore.gameState"
      :game-state="gameStore.gameState"
      @move="handleMove"
      @shoot="handleShoot"
      @scavenge="handleScavenge"
      @build="handleBuild"
      @upgrade-weapon="handleUpgradeWeapon"
      @select-skill="handleSelectSkill"
      @toggle-command-panel="handleToggleCommandPanel"
    />
    
    <div v-else-if="gameStore.currentRoom" class="min-h-screen">
      <RoomWaiting
        :room="gameStore.currentRoom"
        @leave="handleLeaveRoom"
        @start="handleStartGame"
      />
    </div>
    
    <div v-else class="min-h-screen bg-gradient-to-b from-dark to-dark-light">
      <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-12">
          <h1 class="text-5xl font-bold text-light mb-2 text-shadow">
            🧟 僵尸围城
          </h1>
          <p class="text-gray text-lg">坚守据点，存活到黎明</p>
        </header>
        
        <div class="max-w-4xl mx-auto">
          <div class="flex gap-4 mb-6">
            <button
              class="flex-1 py-3 bg-primary hover:bg-primary-dark text-light font-semibold rounded-lg transition-all glow-primary"
              @click="showCreateModal = true"
            >
              🎮 创建房间
            </button>
            <button
              class="flex-1 py-3 bg-accent hover:bg-accent/80 text-light font-semibold rounded-lg transition-all glow-accent"
              @click="handleQuickMatch"
            >
              ⚡ 快速匹配
            </button>
          </div>
          
          <RoomList @join="handleJoinRoom" />
        </div>
        
        <footer class="text-center mt-12 text-gray text-sm">
          <p>最多4名玩家合作守卫据点</p>
          <p>白天搜集资源，夜晚抵御尸潮</p>
          <p>坚持到第10个夜晚的黎明即为通关</p>
        </footer>
      </div>
    </div>
    
    <CreateRoomModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @create="handleCreateRoom"
    />
    
    <JoinRoomModal
      :show="showJoinModal"
      :room="selectedRoom"
      @close="showJoinModal = false"
      @join="handleJoinRoomConfirm"
    />
    
    <GameOverModal
      :show="gameStore.showGameOver"
      :result="gameStore.gameResult"
      @restart="handleRestart"
      @home="handleBackToHome"
    />
    
    <CommandPanel
      :visible="gameStore.showCommandPanel"
      :game-state="gameStore.gameState"
      :presets="gameStore.formationPresets"
      :game-stats="gameStore.gameStats"
      @close="handleCloseCommandPanel"
      @deploy-formation="handleDeployFormation"
      @save-preset="handleSavePreset"
      @load-preset="handleLoadPreset"
      @delete-preset="handleDeletePreset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { gameStore, setPlayerName, setPlayerClass, resetGame, setCurrentRoom, setShowCommandPanel, setCommandPanelTab } from './stores/gameStore'
import { useWebSocket } from './composables/useWebSocket'
import type { Room, PlayerClass } from './types'

import RoomList from './components/RoomList.vue'
import CreateRoomModal from './components/CreateRoomModal.vue'
import JoinRoomModal from './components/JoinRoomModal.vue'
import RoomWaiting from './components/RoomWaiting.vue'
import GameCanvas from './components/GameCanvas.vue'
import GameOverModal from './components/GameOverModal.vue'
import CommandPanel from './components/CommandPanel.vue'

const { createRoom, joinRoom, quickMatch, leaveRoom, startGame, selectClass, move, shoot, scavenge, build, upgradeWeapon, selectSkill, deployFormation, saveFormationPreset, loadFormationPreset, deleteFormationPreset, getFormationPresets, getGameStats } = useWebSocket()

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const selectedRoom = ref<Room | null>(null)

const handleCreateRoom = (roomName: string, difficulty: string, playerName: string) => {
  setPlayerName(playerName)
  createRoom(difficulty, roomName, playerName)
  showCreateModal.value = false
}

const handleJoinRoom = (room: Room) => {
  selectedRoom.value = room
  showJoinModal.value = true
}

const handleJoinRoomConfirm = (roomId: string, playerName: string) => {
  setPlayerName(playerName)
  if (selectedRoom.value) {
    joinRoom(selectedRoom.value.id, playerName)
  }
  showJoinModal.value = false
}

const handleQuickMatch = () => {
  const playerName = `Player_${Math.floor(Math.random() * 1000)}`
  setPlayerName(playerName)
  quickMatch(playerName)
}

const handleLeaveRoom = () => {
  leaveRoom()
}

const handleStartGame = (classType: PlayerClass) => {
  setPlayerClass(classType)
  selectClass(classType)
  startGame()
}

const handleMove = (x: number, y: number) => {
  move(x, y)
}

const handleShoot = (x: number, y: number) => {
  shoot(x, y)
}

const handleScavenge = () => {
  scavenge()
}

const handleBuild = () => {
  if (gameStore.gameState) {
    build('wall', 400, 300)
  }
}

const handleUpgradeWeapon = (weaponType: string) => {
  upgradeWeapon(weaponType as any)
}

const handleSelectSkill = (skillId: string) => {
  selectSkill(skillId)
}

const handleToggleCommandPanel = () => {
  setShowCommandPanel(!gameStore.showCommandPanel)
  if (gameStore.showCommandPanel) {
    getFormationPresets()
    getGameStats()
  }
}

const handleCloseCommandPanel = () => {
  setShowCommandPanel(false)
}

const handleDeployFormation = (positions: Array<{ playerId: string; x: number; y: number }>) => {
  deployFormation(positions)
}

const handleSavePreset = (name: string, positions: Array<{ playerId: string; x: number; y: number }>) => {
  saveFormationPreset(name, positions)
}

const handleLoadPreset = (presetId: string) => {
  loadFormationPreset(presetId)
}

const handleDeletePreset = (presetId: string) => {
  deleteFormationPreset(presetId)
}

// 监听游戏结束:自动打开CommandPanel并切换到统计tab
watch(
  () => gameStore.gameState?.gameOver,
  (gameOver) => {
    if (gameOver) {
      // 请求最新统计数据
      getGameStats()
      // 短暂延迟以确保数据到达
      setTimeout(() => {
        setCommandPanelTab('stats')
        setShowCommandPanel(true)
      }, 300)
    }
  }
)

const handleRestart = () => {
  resetGame()
  startGame()
}

const handleBackToHome = () => {
  resetGame()
  setCurrentRoom(null)
}
</script>
