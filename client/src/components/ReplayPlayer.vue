<template>
  <div v-if="show" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl w-full max-w-5xl border border-gray overflow-hidden flex">
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <div class="bg-dark px-6 py-4 flex items-center justify-between border-b border-gray">
          <div>
            <h2 class="text-2xl font-bold text-light">战场回放</h2>
            <p class="text-gray text-sm">
              {{ formatDate(replayData?.frames[0]?.timestamp) }} ·
              {{ formatDuration(replayData?.frames[replayData.frames.length - 1]?.timestamp) }} ·
              {{ replayData?.victory ? '胜利' : '失败' }}
            </p>
          </div>
          <button
            class="w-10 h-10 rounded-full bg-gray hover:bg-gray-dark text-light flex items-center justify-center transition-all"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <!-- Canvas Container -->
        <div class="flex justify-center p-4 bg-dark">
          <canvas
            ref="canvasRef"
            width="600"
            height="600"
            class="border border-gray rounded"
          ></canvas>
        </div>

        <!-- Playback Controls -->
        <div class="bg-dark px-6 py-4 border-t border-gray">
          <!-- Highlight Markers on Progress Bar -->
          <div class="relative mb-2 h-6">
            <!-- Highlight range for montage mode -->
            <div
              v-if="isMontageMode && currentHighlightIndex >= 0"
              class="absolute top-0 h-full bg-primary/30 rounded"
              :style="{
                left: `${(montageStartTime / totalTime) * 100}%`,
                width: `${((montageEndTime - montageStartTime) / totalTime) * 100}%`
              }"
            ></div>
            <!-- Progress Bar -->
            <input
              type="range"
              :min="0"
              :max="totalTime"
              :value="currentTime"
              class="w-full h-2 bg-gray rounded-lg appearance-none cursor-pointer"
              @input="handleSeek"
              @mousedown="isDragging = true"
              @mouseup="isDragging = false"
            />
            <!-- Highlight Dots -->
            <div
              v-for="(highlight, index) in replayData?.highlights"
              :key="index"
              class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-transform"
              :class="getHighlightDotClass(highlight.eventType)"
              :style="{ left: `${(highlight.timestamp / totalTime) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }"
              @click="jumpToHighlight(highlight)"
              @mouseenter="hoveredHighlight = highlight"
              @mouseleave="hoveredHighlight = null"
            >
              <!-- Tooltip -->
              <div
                v-if="hoveredHighlight === highlight"
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark rounded-lg text-light text-sm whitespace-nowrap z-10"
              >
                {{ highlight.description }}
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark"></div>
              </div>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Play/Pause -->
              <button
                class="w-12 h-12 rounded-full bg-primary hover:bg-primary-dark text-light flex items-center justify-center transition-all text-xl"
                @click="togglePlay"
              >
                {{ isPlaying ? '⏸' : '▶' }}
              </button>

              <!-- Time Display -->
              <div class="text-light font-mono">
                {{ formatTime(currentTime) }} / {{ formatTime(totalTime) }}
              </div>
            </div>

            <!-- Speed Control and Montage Button -->
            <div class="flex items-center gap-4">
              <!-- Montage Mode Button -->
              <button
                v-if="replayData?.highlights && replayData.highlights.length > 0"
                class="px-4 py-2 rounded font-medium transition-all"
                :class="isMontageMode ? 'bg-primary text-light' : 'bg-gray text-gray-light hover:bg-gray-dark'"
                @click="toggleMontageMode"
              >
                {{ isMontageMode ? '退出集锦' : '精彩集锦' }}
              </button>

              <!-- Speed Control -->
              <div class="flex items-center gap-2">
                <span class="text-gray text-sm">倍速:</span>
                <div class="flex gap-1">
                  <button
                    v-for="speed in speeds"
                    :key="speed"
                    class="px-3 py-1 rounded text-sm font-medium transition-all"
                    :class="playbackSpeed === speed ? 'bg-primary text-light' : 'bg-gray text-gray-light hover:bg-gray-dark'"
                    @click="setSpeed(speed)"
                  >
                    {{ speed }}x
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Replay End Message -->
        <div v-if="replayEnded" class="absolute inset-0 flex items-center justify-center bg-black/70">
          <div class="bg-dark-light rounded-xl p-8 text-center border border-gray">
            <div class="text-6xl mb-4">📼</div>
            <h3 class="text-2xl font-bold text-light mb-2">回放结束</h3>
            <p class="text-gray mb-4">录像已播放完毕</p>
            <button
              class="px-6 py-2 bg-primary hover:bg-primary-dark text-light font-semibold rounded-lg transition-all"
              @click="handleReplayEnd"
            >
              重新播放
            </button>
          </div>
        </div>
      </div>

      <!-- Highlights Panel -->
      <div v-if="replayData?.highlights && replayData.highlights.length > 0" class="w-72 bg-dark border-l border-gray flex flex-col">
        <!-- Panel Header -->
        <div class="px-4 py-3 border-b border-gray flex items-center justify-between">
          <h3 class="text-light font-semibold">精彩集锦</h3>
          <button
            class="text-gray hover:text-light transition-colors"
            @click="showHighlightsPanel = !showHighlightsPanel"
          >
            {{ showHighlightsPanel ? '▼' : '▶' }}
          </button>
        </div>

        <!-- Stats Summary -->
        <div v-if="showHighlightsPanel" class="px-4 py-3 border-b border-gray">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              <span class="text-gray">多杀 {{ highlightStats.multiKill }}次</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span class="text-gray">濒死存活 {{ highlightStats.closeCall }}次</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-purple-500"></span>
              <span class="text-gray">Boss击杀 {{ highlightStats.bossKill }}次</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span class="text-gray">据点告急 {{ highlightStats.gateDanger }}次</span>
            </div>
            <div class="flex items-center gap-2 col-span-2">
              <span class="w-2 h-2 rounded-full bg-orange-500"></span>
              <span class="text-gray">全灭危机 {{ highlightStats.teamWipe }}次</span>
            </div>
          </div>
        </div>

        <!-- Highlights List -->
        <div v-if="showHighlightsPanel" class="flex-1 overflow-y-auto">
          <div
            v-for="(highlight, index) in sortedHighlights"
            :key="index"
            class="px-4 py-3 border-b border-gray hover:bg-gray-dark cursor-pointer transition-colors"
            :class="{ 'bg-primary/20': currentHighlightIndex === index && isMontageMode }"
            @click="jumpToHighlight(highlight)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="getHighlightDotClass(highlight.eventType)"
              ></span>
              <span class="text-light text-sm">{{ formatTime(highlight.timestamp) }}</span>
            </div>
            <p class="text-gray text-sm">{{ highlight.description }}</p>
            <div v-if="highlight.playerIds.length > 0" class="text-gray-light text-xs mt-1">
              {{ getPlayerNames(highlight.playerIds) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gameStore, setShowReplayPlayer, setReplayData } from '../stores/gameStore'
import type { ReplayFrame, PlayerClass, HighlightMoment, HighlightEventType } from '../types'

const show = computed(() => gameStore.showReplayPlayer)
const replayData = computed(() => gameStore.replayData)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const playbackSpeed = ref(1)
const isDragging = ref(false)
const replayEnded = ref(false)

// Montage mode
const isMontageMode = ref(false)
const currentHighlightIndex = ref(-1)
const montageStartTime = ref(0)
const montageEndTime = ref(0)
const transitionOpacity = ref(1)
const isTransitioning = ref(false)
const transitionStart = ref(0)

// Highlights panel
const showHighlightsPanel = ref(true)
const hoveredHighlight = ref<HighlightMoment | null>(null)

const speeds = [0.5, 1, 2, 4]

let animationFrameId: number | null = null
let lastFrameTime = 0

const totalTime = computed(() => {
  if (!replayData.value || replayData.value.frames.length === 0) return 0
  const lastFrame = replayData.value.frames[replayData.value.frames.length - 1]
  return lastFrame.timestamp
})

const sortedHighlights = computed(() => {
  if (!replayData.value?.highlights) return []
  return [...replayData.value.highlights].sort((a, b) => a.timestamp - b.timestamp)
})

const highlightStats = computed(() => {
  const highlights = replayData.value?.highlights || []
  return {
    multiKill: highlights.filter(h => h.eventType === 'multi_kill').length,
    closeCall: highlights.filter(h => h.eventType === 'close_call').length,
    bossKill: highlights.filter(h => h.eventType === 'boss_kill').length,
    gateDanger: highlights.filter(h => h.eventType === 'gate_danger').length,
    teamWipe: highlights.filter(h => h.eventType === 'team_wipe').length,
  }
})

const classColors: Record<PlayerClass, string> = {
  assault: '#ef4444',
  engineer: '#eab308',
  medic: '#22c55e',
  commander: '#3b82f6',
}

const highlightColors: Record<HighlightEventType, string> = {
  multi_kill: 'bg-red-500',
  close_call: 'bg-green-500',
  boss_kill: 'bg-purple-500',
  gate_danger: 'bg-yellow-500',
  team_wipe: 'bg-orange-500',
}

function getHighlightDotClass(eventType: HighlightEventType): string {
  return highlightColors[eventType] || 'bg-gray-500'
}

function getPlayerNames(playerIds: string[]): string {
  if (!replayData.value || playerIds.length === 0) return ''
  const names: string[] = []
  for (const id of playerIds) {
    const player = replayData.value.frames[0]?.players.find(p => p.id === id)
    if (player) {
      names.push(player.name)
    }
  }
  return names.join(', ')
}

function findNearestFrames(time: number): { frameA: ReplayFrame | null; frameB: ReplayFrame | null; t: number } {
  if (!replayData.value || replayData.value.frames.length === 0) {
    return { frameA: null, frameB: null, t: 0 }
  }

  const frames = replayData.value.frames
  let left = 0
  let right = frames.length - 1

  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2)
    if (frames[mid].timestamp <= time) {
      left = mid
    } else {
      right = mid
    }
  }

  const frameA = frames[left]
  const frameB = frames[right]

  if (frameA.timestamp === frameB.timestamp) {
    return { frameA, frameB, t: 0 }
  }

  const t = (time - frameA.timestamp) / (frameB.timestamp - frameA.timestamp)
  return { frameA, frameB, t: Math.max(0, Math.min(1, t)) }
}

function interpolatePosition(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: posA.x + (posB.x - posA.x) * t,
    y: posA.y + (posB.y - posA.y) * t,
  }
}

function renderFrame(time: number) {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { frameA, frameB, t } = findNearestFrames(time)

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, 600, 600)

  // Draw grid
  ctx.strokeStyle = '#2d2d44'
  ctx.lineWidth = 1
  for (let i = 0; i <= 600; i += 50) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 600)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(600, i)
    ctx.stroke()
  }

  // Draw base center (command building area)
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(250, 250, 100, 100)
  ctx.strokeStyle = '#4b5563'
  ctx.strokeRect(250, 250, 100, 100)

  if (!frameA) return

  const currentFrame = frameB && t > 0 ? frameB : frameA

  // Draw structures (blue squares)
  ctx.fillStyle = '#3b82f6'
  for (const structure of currentFrame.structures) {
    const x = structure.position.x * 0.5
    const y = structure.position.y * 0.5
    ctx.fillRect(x - 10, y - 10, 20, 20)
    ctx.strokeStyle = '#60a5fa'
    ctx.strokeRect(x - 10, y - 10, 20, 20)
  }

  // Draw gates (green rectangles)
  ctx.fillStyle = '#22c55e'
  for (const gate of currentFrame.gates) {
    let x = 300
    let y = 300
    const offset = 280
    switch (gate.position) {
      case 'north': y -= offset; break
      case 'south': y += offset; break
      case 'east': x += offset; break
      case 'west': x -= offset; break
    }
    ctx.fillRect(x - 15, y - 15, 30, 30)
    ctx.strokeStyle = '#4ade80'
    ctx.strokeRect(x - 15, y - 15, 30, 30)
  }

  // Draw zombies (gray triangles) - with interpolation
  ctx.fillStyle = '#6b7280'
  for (let i = 0; i < currentFrame.zombies.length; i++) {
    const zombie = currentFrame.zombies[i]
    let x = zombie.position.x * 0.5
    let y = zombie.position.y * 0.5

    // Interpolate position if we have two frames
    if (frameB && t > 0 && frameA) {
      const zombieA = frameA.zombies.find(z => z.id === zombie.id)
      if (zombieA) {
        const interpolated = interpolatePosition(zombieA.position, zombie.position, t)
        x = interpolated.x * 0.5
        y = interpolated.y * 0.5
      }
    }

    // Draw triangle pointing in direction of movement
    ctx.beginPath()
    ctx.moveTo(x, y - 8)
    ctx.lineTo(x - 6, y + 6)
    ctx.lineTo(x + 6, y + 6)
    ctx.closePath()
    ctx.fill()

    // Health bar
    const healthPercent = zombie.health / zombie.maxHealth
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(x - 8, y - 14, 16, 3)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(x - 8, y - 14, 16 * healthPercent, 3)
  }

  // Draw players (colored circles based on class) - with interpolation
  for (let i = 0; i < currentFrame.players.length; i++) {
    const player = currentFrame.players[i]
    let x = player.position.x * 0.5
    let y = player.position.y * 0.5

    // Interpolate position if we have two frames
    if (frameB && t > 0 && frameA) {
      const playerA = frameA.players.find(p => p.id === player.id)
      if (playerA) {
        const interpolated = interpolatePosition(playerA.position, player.position, t)
        x = interpolated.x * 0.5
        y = interpolated.y * 0.5
      }
    }

    const color = classColors[player.classType] || '#6b7280'

    // Draw circle
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw name
    ctx.fillStyle = '#fff'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(player.name.substring(0, 6), x, y - 15)

    // Health bar
    const healthPercent = player.health / player.maxHealth
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(x - 10, y - 20, 20, 4)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(x - 10, y - 20, 20 * healthPercent, 4)
  }

  // Draw resource points
  for (const point of currentFrame.resourcePoints) {
    if (point.isDepleted) continue

    let color = '#fbbf24'
    switch (point.type) {
      case 'ammo': color = '#ef4444'; break
      case 'medkit': color = '#22c55e'; break
      case 'wood': color = '#92400e'; break
      case 'iron': color = '#6b7280'; break
    }

    const x = point.position.x * 0.5
    const y = point.position.y * 0.5

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  // Draw day/night indicator and current frame info
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(10, 10, 150, 50)

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(`第 ${currentFrame.day} 天`, 20, 30)
  ctx.fillText(currentFrame.timeOfDay === 'day' ? '☀️ 白天' : '🌙 夜晚', 20, 48)
}

function gameLoop(timestamp: number) {
  if (!isPlaying.value) return

  if (lastFrameTime === 0) {
    lastFrameTime = timestamp
  }

  const deltaTime = timestamp - lastFrameTime
  lastFrameTime = timestamp

  currentTime.value += deltaTime * playbackSpeed.value

  // Montage mode transition handling
  if (isMontageMode.value && currentHighlightIndex.value >= 0) {
    const highlights = sortedHighlights.value
    const transitionDuration = 500 // 0.5 seconds for fade in/out
    
    // Check if transitioning
    if (isTransitioning.value) {
      const elapsed = timestamp - transitionStart.value
      if (elapsed >= transitionDuration) {
        isTransitioning.value = false
        transitionOpacity.value = 1
      } else {
        // Fade in
        transitionOpacity.value = elapsed / transitionDuration
      }
    } else {
      // Check if approaching end of segment
      const timeToEnd = montageEndTime.value - currentTime.value
      if (timeToEnd <= transitionDuration && timeToEnd > 0) {
        // Fade out
        transitionOpacity.value = timeToEnd / transitionDuration
      } else if (currentTime.value >= montageEndTime.value) {
        // Move to next highlight
        currentHighlightIndex.value++
        if (currentHighlightIndex.value >= highlights.length) {
          // End of montage
          isMontageMode.value = false
          currentHighlightIndex.value = -1
          isPlaying.value = false
          currentTime.value = totalTime.value
          transitionOpacity.value = 1
          return
        }
        // Start transition to next segment
        isTransitioning.value = true
        transitionStart.value = timestamp
        setupMontageSegment()
      }
    }
  }

  if (currentTime.value >= totalTime.value) {
    currentTime.value = totalTime.value
    isPlaying.value = false
    if (!isMontageMode.value) {
      replayEnded.value = true
    }
  }

  renderFrame(currentTime.value)

  // Draw transition overlay if transitioning
  if (transitionOpacity.value < 1) {
    const canvas = canvasRef.value
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - transitionOpacity.value})`
        ctx.fillRect(0, 0, 600, 600)
      }
    }
  }

  if (isPlaying.value) {
    animationFrameId = requestAnimationFrame(gameLoop)
  }
}

function setupMontageSegment() {
  const highlights = sortedHighlights.value
  if (currentHighlightIndex.value < 0 || currentHighlightIndex.value >= highlights.length) return

  const highlight = highlights[currentHighlightIndex.value]
  // Play 2 seconds before and 2 seconds after the highlight
  montageStartTime.value = Math.max(0, highlight.timestamp - 2000)
  montageEndTime.value = Math.min(totalTime.value, highlight.timestamp + 2000)
  currentTime.value = montageStartTime.value

  renderFrame(currentTime.value)
}

function togglePlay() {
  if (replayEnded.value && !isMontageMode.value) {
    currentTime.value = 0
    replayEnded.value = false
  }

  isPlaying.value = !isPlaying.value

  if (isPlaying.value) {
    lastFrameTime = 0
    animationFrameId = requestAnimationFrame(gameLoop)
  } else {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
}

function handleSeek(event: Event) {
  const target = event.target as HTMLInputElement
  currentTime.value = parseInt(target.value, 10)
  renderFrame(currentTime.value)
}

function setSpeed(speed: number) {
  playbackSpeed.value = speed
}

function jumpToHighlight(highlight: HighlightMoment) {
  currentTime.value = highlight.timestamp
  renderFrame(currentTime.value)
  if (!isPlaying.value) {
    // Optionally auto-play from this point
  }
}

function toggleMontageMode() {
  isMontageMode.value = !isMontageMode.value
  if (isMontageMode.value) {
    // Enter montage mode, start from first highlight
    currentHighlightIndex.value = 0
    setupMontageSegment()
    // Auto-play
    isPlaying.value = true
    lastFrameTime = 0
    animationFrameId = requestAnimationFrame(gameLoop)
  } else {
    // Exit montage mode
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isPlaying.value = false
    currentHighlightIndex.value = -1
  }
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '00:00'
  return formatTime(ms)
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return ''
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
}

function handleClose() {
  isPlaying.value = false
  isMontageMode.value = false
  currentHighlightIndex.value = -1
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  setShowReplayPlayer(false)
  setReplayData(null)
}

function handleReplayEnd() {
  replayEnded.value = false
  currentTime.value = 0
  renderFrame(0)
}

watch(show, (newVal) => {
  if (newVal) {
    currentTime.value = 0
    isPlaying.value = false
    playbackSpeed.value = 1
    replayEnded.value = false
    isMontageMode.value = false
    currentHighlightIndex.value = -1
    lastFrameTime = 0
    showHighlightsPanel.value = true
    renderFrame(0)
  }
})

onMounted(() => {
  if (show.value) {
    renderFrame(0)
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>
