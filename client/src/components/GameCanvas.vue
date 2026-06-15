<template>
  <div class="relative w-full h-screen bg-dark overflow-hidden">
    <canvas
      ref="canvasRef"
      class="block mx-auto"
      :width="800"
      :height="800"
      @mousemove="handleMouseMove"
      @click="handleClick"
      @touchmove="handleTouchMove"
      @touchstart="handleTouchStart"
    ></canvas>
    
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div class="flex items-center gap-4 bg-dark/80 rounded-lg px-4 py-2 border border-gray">
        <button
          class="px-4 py-2 bg-primary hover:bg-primary-dark text-light rounded-lg transition-all"
          @click="$emit('scavenge')"
        >
          搜刮资源
        </button>
        <button
          class="px-4 py-2 bg-secondary hover:bg-secondary/80 text-light rounded-lg transition-all"
          @click="$emit('build')"
        >
          建造工事
        </button>
      </div>
    </div>
    
    <div class="absolute bottom-4 right-4 bg-dark/80 rounded-lg p-3 border border-gray">
      <div class="text-sm text-gray">弹药: <span class="text-yellow-400">{{ resources?.ammo || 0 }}</span></div>
      <div class="text-sm text-gray">木材: <span class="text-orange-400">{{ resources?.wood || 0 }}</span></div>
      <div class="text-sm text-gray">铁矿: <span class="text-gray-300">{{ resources?.iron || 0 }}</span></div>
      <div class="text-sm text-gray">医疗包: <span class="text-red-400">{{ resources?.medkit || 0 }}</span></div>
    </div>
    
    <div class="absolute top-4 left-4 bg-dark/80 rounded-lg p-3 border border-gray">
      <div class="text-sm text-gray">第 <span class="text-light font-bold">{{ day || 1 }}</span> 天</div>
      <div class="text-sm" :class="timeOfDay === 'night' ? 'text-red-400' : 'text-yellow-400'">
        {{ timeOfDay === 'night' ? '🌙 夜晚' : '☀️ 白天' }}
      </div>
      <div class="text-sm text-gray">剩余: <span class="text-light">{{ Math.floor(timeRemaining || 0) }}s</span></div>
    </div>
    
    <div class="absolute top-4 right-4 flex flex-col gap-2">
      <div
        v-for="player in players"
        :key="player.id"
        class="bg-dark/80 rounded-lg px-3 py-2 border border-gray flex items-center gap-3"
      >
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm" :class="getClassColor(player.classType)">
          {{ getClassIcon(player.classType) }}
        </div>
        <div>
          <div class="text-sm text-light">{{ player.name }}</div>
          <div class="w-24 h-2 bg-gray rounded-full overflow-hidden">
            <div
              class="h-full transition-all"
              :class="player.isDead ? 'bg-gray' : getHealthBarColor(player.health, player.maxHealth)"
              :style="{ width: `${(player.health / player.maxHealth) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { GameState, PlayerState, ZombieState, PlayerClass } from '../types'

const props = defineProps<{
  gameState: GameState | null
}>()

const emit = defineEmits<{
  (e: 'move', x: number, y: number): void
  (e: 'shoot', x: number, y: number): void
  (e: 'scavenge'): void
  (e: 'build'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const mousePos = ref({ x: 0, y: 0 })
let animationId: number

const resources = ref<{ ammo: number; wood: number; iron: number; medkit: number } | null>(null)
const day = ref(1)
const timeOfDay = ref<'day' | 'night'>('day')
const timeRemaining = ref(90)
const players = ref<PlayerState[]>([])

watch(
  () => props.gameState,
  (newState) => {
    if (newState) {
      resources.value = newState.resources
      day.value = newState.day
      timeOfDay.value = newState.timeOfDay
      timeRemaining.value = newState.timeRemaining
      players.value = newState.players
    }
  },
  { deep: true }
)

const getClassColor = (classType: PlayerClass): string => {
  switch (classType) {
    case 'assault': return 'bg-red-900'
    case 'engineer': return 'bg-yellow-900'
    case 'medic': return 'bg-green-900'
    case 'commander': return 'bg-blue-900'
    default: return 'bg-gray'
  }
}

const getClassIcon = (classType: PlayerClass): string => {
  switch (classType) {
    case 'assault': return '⚔️'
    case 'engineer': return '🔧'
    case 'medic': return '💉'
    case 'commander': return '🎖️'
    default: return '👤'
  }
}

const getHealthBarColor = (health: number, maxHealth: number): string => {
  const percent = health / maxHealth
  if (percent > 0.6) return 'bg-green-500'
  if (percent > 0.3) return 'bg-yellow-500'
  return 'bg-red-500'
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (rect) {
    mousePos.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }
}

const handleClick = () => {
  emit('shoot', mousePos.value.x, mousePos.value.y)
}

const handleTouchMove = (e: TouchEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (rect && e.touches[0]) {
    mousePos.value = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    }
  }
}

const handleTouchStart = () => {
  emit('shoot', mousePos.value.x, mousePos.value.y)
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, 800, 800)

  drawGrid(ctx)
  drawBase(ctx)
  drawResources(ctx)
  drawStructures(ctx)
  drawZombies(ctx)
  drawPlayers(ctx)
  
  if (timeOfDay.value === 'night') {
    drawLight(ctx)
  }

  animationId = requestAnimationFrame(draw)
}

const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 1

  for (let x = 0; x <= 800; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 800)
    ctx.stroke()
  }

  for (let y = 0; y <= 800; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(800, y)
    ctx.stroke()
  }
}

const drawBase = (ctx: CanvasRenderingContext2D) => {
  const centerX = 400
  const centerY = 400
  const baseSize = 200
  const gateWidth = 60

  ctx.fillStyle = '#2d5a3d'
  ctx.fillRect(centerX - baseSize / 2, centerY - baseSize / 2, baseSize, baseSize)

  ctx.fillStyle = '#1a3d27'
  ctx.fillRect(centerX - baseSize / 2 + 5, centerY - baseSize / 2 + 5, baseSize - 10, baseSize - 10)

  ctx.fillStyle = '#8b4513'
  
  ctx.fillRect(centerX - gateWidth / 2, centerY - baseSize / 2 - 10, gateWidth, 15)
  ctx.fillRect(centerX - gateWidth / 2, centerY + baseSize / 2 - 5, gateWidth, 15)
  ctx.fillRect(centerX - baseSize / 2 - 5, centerY - gateWidth / 2, 15, gateWidth)
  ctx.fillRect(centerX + baseSize / 2 - 10, centerY - gateWidth / 2, 15, gateWidth)
}

const drawResources = (ctx: CanvasRenderingContext2D) => {
  if (!props.gameState) return

  for (const point of props.gameState.resourcePoints) {
    if (point.isDepleted) continue

    let color = '#FFD700'
    let icon = 'A'
    switch (point.type) {
      case 'wood': color = '#8B4513'; icon = 'W'; break
      case 'iron': color = '#708090'; icon = 'I'; break
      case 'medkit': color = '#FF6B6B'; icon = 'M'; break
    }

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(point.position.x, point.position.y, 15, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, point.position.x, point.position.y)
  }
}

const drawStructures = (ctx: CanvasRenderingContext2D) => {
  if (!props.gameState) return

  for (const structure of props.gameState.structures) {
    ctx.fillStyle = '#4a5568'
    ctx.fillRect(structure.position.x - 15, structure.position.y - 15, 30, 30)

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let icon = '?'
    switch (structure.type) {
      case 'barracks': icon = '🏭'; break
      case 'workshop': icon = '🔨'; break
      case 'medical': icon = '⛺'; break
      case 'command': icon = '🏰'; break
      case 'wall': icon = '🧱'; break
      case 'watchtower': icon = '🗼'; break
      case 'trap': icon = '⚠️'; break
      case 'mine': icon = '💣'; break
      case 'turret': icon = '🔫'; break
    }
    ctx.fillText(icon, structure.position.x, structure.position.y)
  }
}

const drawZombies = (ctx: CanvasRenderingContext2D) => {
  if (!props.gameState) return

  for (const zombie of props.gameState.zombies) {
    let color = '#22c55e'
    let size = 15
    switch (zombie.type) {
      case 'runner': color = '#f59e0b'; size = 12; break
      case 'tank': color = '#991b1b'; size = 25; break
      case 'bomber': color = '#7c3aed'; size = 14; break
      case 'spitter': color = '#059669'; size = 14; break
      case 'summoner': color = '#8b5cf6'; size = 18; break
      case 'boss': color = '#dc2626'; size = 35; break
    }

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(zombie.position.x, zombie.position.y, size, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(zombie.position.x - 5, zombie.position.y - 3)
    ctx.lineTo(zombie.position.x + 5, zombie.position.y - 3)
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.fillRect(zombie.position.x - size, zombie.position.y - size - 8, size * 2, 4)
    ctx.fillStyle = '#22c55e'
    const healthPercent = zombie.health / zombie.maxHealth
    ctx.fillRect(zombie.position.x - size, zombie.position.y - size - 8, size * 2 * healthPercent, 4)
  }
}

const drawPlayers = (ctx: CanvasRenderingContext2D) => {
  if (!props.gameState) return

  for (const player of props.gameState.players) {
    let color = '#ef4444'
    switch (player.classType) {
      case 'engineer': color = '#eab308'; break
      case 'medic': color = '#22c55e'; break
      case 'commander': color = '#3b82f6'; break
    }

    ctx.fillStyle = player.isDead ? '#6b7280' : color
    ctx.beginPath()
    ctx.arc(player.position.x, player.position.y, 18, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.name.charAt(0), player.position.x, player.position.y)

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(player.position.x - 15, player.position.y - 28, 30, 4)
    ctx.fillStyle = player.isDead ? '#6b7280' : '#22c55e'
    const healthPercent = player.health / player.maxHealth
    ctx.fillRect(player.position.x - 15, player.position.y - 28, 30 * healthPercent, 4)
  }
}

const drawLight = (ctx: CanvasRenderingContext2D) => {
  const centerX = 400
  const centerY = 400
  const radius = 300

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, 'rgba(255, 200, 100, 0)')
  gradient.addColorStop(0.7, 'rgba(255, 200, 100, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 800, 800)
}

onMounted(() => {
  draw()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
})
</script>
