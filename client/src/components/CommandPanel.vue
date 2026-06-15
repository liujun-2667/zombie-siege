<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 class="text-2xl font-bold text-white">战术指挥台</h2>
        <button
          class="text-gray-400 hover:text-white text-2xl font-bold"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="flex border-b border-gray-700">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex-1 py-3 px-4 text-sm font-medium transition-all"
          :class="activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <div v-show="activeTab === 'situation'" class="h-full">
          <div class="flex gap-4 h-full">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-3">威胁热力图</h3>
              <canvas
                ref="heatmapCanvas"
                class="w-full border border-gray-600 rounded-lg"
                :width="400"
                :height="400"
              ></canvas>
              <div class="mt-2 flex justify-between text-sm text-gray-400">
                <span>低威胁</span>
                <span>高威胁</span>
              </div>
              <div class="h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"></div>
            </div>

            <div class="w-80">
              <h3 class="text-lg font-semibold text-white mb-3">战场数据</h3>

              <div class="space-y-4">
                <div class="bg-gray-800 rounded-lg p-3">
                  <div class="text-gray-400 text-sm mb-2">DPS 统计 (最近5秒)</div>
                  <div class="space-y-1">
                    <div v-for="player in dpsData" :key="player.playerId" class="flex justify-between text-sm">
                      <span :style="{ color: getClassColor(player.classType) }">{{ player.playerName }}</span>
                      <span class="text-yellow-400">{{ player.dps.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-800 rounded-lg p-3">
                  <div class="text-gray-400 text-sm mb-2">资源消耗速率</div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-yellow-400">弹药</span>
                      <span>{{ resourceConsumption.ammoPerMinute.toFixed(1) }}/分钟</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-red-400">医疗包</span>
                      <span>{{ resourceConsumption.medkitPerMinute.toFixed(1) }}/分钟</span>
                    </div>
                  </div>
                </div>

                <div class="bg-gray-800 rounded-lg p-3">
                  <div class="text-gray-400 text-sm mb-2">预计存活回合</div>
                  <div class="text-2xl font-bold text-green-400">
                    {{ estimatedRounds }} 回合
                  </div>
                </div>

                <div class="bg-gray-800 rounded-lg p-3">
                  <div class="text-gray-400 text-sm mb-2">当前资源</div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-yellow-400">弹药</span>
                      <span>{{ resources.ammo }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-orange-400">木材</span>
                      <span>{{ resources.wood }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-300">铁矿</span>
                      <span>{{ resources.iron }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-red-400">医疗包</span>
                      <span>{{ resources.medkit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'formation'" class="h-full">
          <div class="flex gap-4 h-full">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-white">阵型编辑器</h3>
                <button
                  class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all"
                  @click="handleDeployFormation"
                >
                  部署阵型
                </button>
              </div>

              <canvas
                ref="formationCanvas"
                class="w-full border-2 border-dashed border-gray-600 rounded-lg cursor-crosshair"
                :width="400"
                :height="400"
                @mousedown="handleCanvasMouseDown"
                @mousemove="handleCanvasMouseMove"
                @mouseup="handleCanvasMouseUp"
                @mouseleave="handleCanvasMouseUp"
              ></canvas>

              <div class="mt-2 flex gap-2 flex-wrap">
                <div
                  v-for="player in players"
                  :key="player.id"
                  class="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full"
                >
                  <div
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: getClassColor(player.classType) }"
                  ></div>
                  <span class="text-sm text-gray-300">{{ player.name }}</span>
                </div>
              </div>
            </div>

            <div class="w-64">
              <h3 class="text-lg font-semibold text-white mb-3">阵型预设</h3>

              <div class="space-y-2">
                <div
                  v-for="preset in presets"
                  :key="preset.id"
                  class="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                >
                  <span class="text-white">{{ preset.name }}</span>
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 bg-primary hover:bg-primary-dark text-white text-sm rounded transition-all"
                      @click="handleLoadPreset(preset.id)"
                    >
                      加载
                    </button>
                    <button
                      class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-all"
                      @click="handleDeletePreset(preset.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div v-if="presets.length === 0" class="text-gray-500 text-sm text-center py-4">
                  暂无预设阵型
                </div>
              </div>

              <div v-if="presets.length < 3" class="mt-4">
                <input
                  v-model="presetName"
                  type="text"
                  placeholder="预设名称"
                  class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <button
                  class="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all"
                  @click="handleSavePreset"
                  :disabled="!presetName.trim()"
                >
                  保存当前阵型
                </button>
              </div>

              <div class="mt-4">
                <button
                  class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all"
                  @click="handleClearFormation"
                >
                  清空阵型
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'stats'" class="h-full overflow-auto">
          <div v-if="gameStats" class="space-y-6">
            <h3 class="text-xl font-semibold text-white">战斗统计</h3>

            <div class="grid grid-cols-4 gap-4">
              <div class="bg-gray-800 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-yellow-400">{{ gameStats.totalZombiesKilled }}</div>
                <div class="text-gray-400 text-sm">总击杀</div>
              </div>
              <div class="bg-gray-800 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-green-400">{{ gameStats.totalResourcesCollected }}</div>
                <div class="text-gray-400 text-sm">资源收集</div>
              </div>
              <div class="bg-gray-800 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-red-400">{{ totalDamage }}</div>
                <div class="text-gray-400 text-sm">总伤害</div>
              </div>
              <div class="bg-gray-800 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-blue-400">{{ gameStats.playerStats.length }}</div>
                <div class="text-gray-400 text-sm">存活玩家</div>
              </div>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-white mb-3">玩家详细数据</h4>
              <div class="space-y-4">
                <div
                  v-for="player in gameStats.playerStats"
                  :key="player.playerId"
                  class="bg-gray-800 rounded-lg p-4"
                >
                  <div class="flex items-center gap-3 mb-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      :style="{ backgroundColor: getClassColor(player.classType) }"
                    >
                      {{ getClassIcon(player.classType) }}
                    </div>
                    <span class="text-white font-semibold">{{ player.playerName }}</span>
                  </div>

                  <div class="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div class="text-gray-400">总伤害</div>
                      <div class="text-yellow-400 font-bold">{{ player.totalDamage.toFixed(0) }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">击杀数</div>
                      <div class="text-green-400 font-bold">
                        {{ player.kills.normal }}/{{ player.kills.special }}/{{ player.kills.boss }}
                      </div>
                    </div>
                    <div>
                      <div class="text-gray-400">承受伤害</div>
                      <div class="text-red-400 font-bold">{{ player.damageTaken.toFixed(0) }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">死亡次数</div>
                      <div class="text-orange-400 font-bold">{{ player.deaths }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">治疗量</div>
                      <div class="text-teal-400 font-bold">{{ player.healingDone }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">建造数量</div>
                      <div class="text-blue-400 font-bold">{{ player.structuresBuilt }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">最高连杀</div>
                      <div class="text-purple-400 font-bold">{{ player.maxKillStreak }}</div>
                    </div>
                    <div>
                      <div class="text-gray-400">职业</div>
                      <div class="text-white font-bold">{{ getClassName(player.classType) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-lg font-semibold text-white mb-3">伤害输出趋势 (按玩家)</h4>
              <canvas
                ref="damageChartCanvas"
                class="w-full border border-gray-600 rounded-lg"
                :width="800"
                :height="300"
              ></canvas>
            </div>
          </div>

          <div v-else class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <div class="text-4xl mb-4">📊</div>
              <div>暂无统计数据</div>
              <div class="text-sm">游戏结束后将显示战斗统计</div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-700 text-center text-gray-500 text-sm">
        按 F 键关闭指挥台
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { GameState, PlayerState, PlayerClass, FormationPreset, FormationPosition, GameStats, PlayerStats } from '../types'

const props = defineProps<{
  visible: boolean
  gameState: GameState | null
  presets: FormationPreset[]
  gameStats: GameStats | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'deployFormation', positions: FormationPosition[]): void
  (e: 'savePreset', name: string, positions: FormationPosition[]): void
  (e: 'loadPreset', presetId: string): void
  (e: 'deletePreset', presetId: string): void
}>()

const activeTab = ref<'situation' | 'formation' | 'stats'>(gameStore.commandPanelTab)

// 同步store中的tab到本地
watch(() => gameStore.commandPanelTab, (newTab) => {
  activeTab.value = newTab
})

// 本地tab变化时同步到store
watch(activeTab, (newTab) => {
  if (gameStore.commandPanelTab !== newTab) {
    gameStore.commandPanelTab = newTab
  }
})

const tabs = [
  { id: 'situation' as const, name: '战场态势' },
  { id: 'formation' as const, name: '编队阵型' },
  { id: 'stats' as const, name: '战斗统计' },
]

const heatmapCanvas = ref<HTMLCanvasElement | null>(null)
const formationCanvas = ref<HTMLCanvasElement | null>(null)
const damageChartCanvas = ref<HTMLCanvasElement | null>(null)
const presetName = ref('')
const formationPositions = ref<Map<string, { x: number; y: number }>>(new Map())
const draggingPlayer = ref<string | null>(null)
const playerColors: Record<string, string> = {
  assault: '#ef4444',
  engineer: '#eab308',
  medic: '#22c55e',
  commander: '#3b82f6',
}

const players = computed(() => props.gameState?.players || [])
const resources = computed(() => props.gameState?.resources || { ammo: 0, wood: 0, iron: 0, medkit: 0 })
const resourceConsumption = computed(() => props.gameStats?.resourceConsumption || { ammoPerMinute: 0, medkitPerMinute: 0 })

// DPS计算:服务端已清理5秒外数据,直接累加5秒内伤害除以5
const dpsData = computed(() => {
  if (!props.gameStats) return []
  return props.gameStats.playerStats.map(player => {
    const totalDamageInWindow = player.dpsHistory.reduce((sum, event) => sum + event.damage, 0)
    const dps = totalDamageInWindow / 5
    return {
      ...player,
      dps,
    }
  })
})

const estimatedRounds = computed(() => {
  const ammoRate = resourceConsumption.value.ammoPerMinute
  const medkitRate = resourceConsumption.value.medkitPerMinute
  if (ammoRate <= 0 && medkitRate <= 0) return 999
  const ammoRounds = ammoRate > 0 ? Math.floor(resources.value.ammo / ammoRate * (90 + 120) / 60) : 999
  const medkitRounds = medkitRate > 0 ? Math.floor(resources.value.medkit / medkitRate * (90 + 120) / 60) : 999
  return Math.min(ammoRounds, medkitRounds, 10)
})

const totalDamage = computed(() => {
  if (!props.gameStats) return 0
  return props.gameStats.playerStats.reduce((sum, p) => sum + p.totalDamage, 0).toFixed(0)
})

const getClassColor = (classType: PlayerClass): string => {
  return playerColors[classType] || '#6b7280'
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

const getClassName = (classType: PlayerClass): string => {
  switch (classType) {
    case 'assault': return '突击手'
    case 'engineer': return '工程师'
    case 'medic': return '医疗兵'
    case 'commander': return '指挥官'
    default: return '未知'
  }
}

const drawHeatmap = () => {
  const canvas = heatmapCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const grid = props.gameState?.threatGrid.grid || Array(10).fill(null).map(() => Array(10).fill(0))
  const cellSize = 40
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, 400, 400)
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const threat = grid[y][x]
      const ratio = threat / 100
      const r = Math.floor(0 + ratio * 255)
      const g = Math.floor(255 - ratio * 255)
      const b = 50
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1)
      if (threat > 0) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(threat.toString(), x * cellSize + cellSize / 2, y * cellSize + cellSize / 2)
      }
    }
  }
}

const drawFormationEditor = () => {
  const canvas = formationCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, 400, 400)
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  for (let x = 0; x <= 400; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 400)
    ctx.stroke()
  }
  for (let y = 0; y <= 400; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(400, y)
    ctx.stroke()
  }
  const centerX = 200
  const centerY = 200
  const baseSize = 100
  ctx.strokeStyle = '#2d5a3d'
  ctx.lineWidth = 2
  ctx.strokeRect(centerX - baseSize / 2, centerY - baseSize / 2, baseSize, baseSize)
  for (const player of players.value) {
    const pos = formationPositions.value.get(player.id)
    const x = pos?.x ?? player.position.x / 2
    const y = pos?.y ?? player.position.y / 2
    ctx.fillStyle = getClassColor(player.classType)
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.name.charAt(0), x, y)
  }
}

// 折线图：按玩家分颜色
const drawDamageChart = () => {
  const canvas = damageChartCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const data = props.gameStats?.damageTimeSeries || []

  if (data.length === 0) {
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, 800, 300)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('暂无数据', 400, 150)
    return
  }

  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, 800, 300)

  const padding = { top: 40, right: 140, bottom: 60, left: 60 }
  const chartWidth = 800 - padding.left - padding.right
  const chartHeight = 300 - padding.top - padding.bottom

  let maxDamage = 0
  const playerIds = new Set<string>()
  data.forEach(point => {
    if (point.perPlayer) {
      Object.entries(point.perPlayer).forEach(([pid, dmg]) => {
        playerIds.add(pid)
        if (dmg > maxDamage) maxDamage = dmg
      })
    }
  })
  if (maxDamage === 0) maxDamage = 100

  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(800 - padding.right, y)
    ctx.stroke()
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(Math.round(maxDamage - (maxDamage / 5) * i).toString(), padding.left - 5, y + 4)
  }

  const xStep = data.length > 0 ? chartWidth / data.length : 0
  for (let i = 0; i < data.length; i++) {
    if (data[i].isNight) {
      ctx.fillStyle = 'rgba(75, 85, 99, 0.3)'
      ctx.fillRect(padding.left + i * xStep, padding.top, xStep, chartHeight)
    }
  }

  const playerDataMap: Record<string, Array<{ x: number; y: number; damage: number }>> = {}
  playerIds.forEach(pid => {
    playerDataMap[pid] = []
  })

  for (let i = 0; i < data.length; i++) {
    const point = data[i]
    const x = padding.left + (i + 0.5) * xStep
    if (point.perPlayer) {
      playerIds.forEach(pid => {
        const damage = point.perPlayer[pid] || 0
        const y = padding.top + chartHeight - (damage / maxDamage) * chartHeight
        if (playerDataMap[pid]) {
          playerDataMap[pid].push({ x, y, damage })
        }
      })
    }
  }

  const playerInfo: Record<string, { name: string; classType: PlayerClass }> = {}
  if (props.gameStats) {
    props.gameStats.playerStats.forEach(ps => {
      playerInfo[ps.playerId] = { name: ps.playerName, classType: ps.classType }
    })
  }

  playerIds.forEach(pid => {
    const points = playerDataMap[pid]
    if (!points || points.length === 0) return
    const color = playerColors[playerInfo[pid]?.classType || ''] || '#9ca3af'

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    ctx.fillStyle = color
    points.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()
    })
  })

  ctx.fillStyle = '#9ca3af'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  let lastDay = -1
  for (let i = 0; i < data.length; i++) {
    if (data[i].day !== lastDay) {
      const labelX = padding.left + (i + 0.5) * xStep
      ctx.fillText(`第${data[i].day}天`, labelX, 280)
      lastDay = data[i].day
    }
  }
  ctx.font = '9px Arial'
  for (let i = 0; i < data.length; i++) {
    const labelX = padding.left + (i + 0.5) * xStep
    ctx.fillText(data[i].isNight ? '夜' : '昼', labelX, 292)
  }

  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('伤害输出', 10, 20)

  const legendX = 800 - padding.right + 10
  ctx.font = '11px Arial'
  ctx.textAlign = 'left'
  let legendY = padding.top
  playerIds.forEach(pid => {
    const info = playerInfo[pid]
    if (!info) return
    const color = playerColors[info.classType] || '#9ca3af'
    ctx.fillStyle = color
    ctx.fillRect(legendX, legendY - 6, 14, 3)
    ctx.beginPath()
    ctx.arc(legendX + 7, legendY - 4, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(info.name, legendX + 22, legendY)
    legendY += 18
  })
}

const handleCanvasMouseDown = (e: MouseEvent) => {
  const canvas = formationCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  for (const player of players.value) {
    const pos = formationPositions.value.get(player.id)
    const playerX = pos?.x ?? player.position.x / 2
    const playerY = pos?.y ?? player.position.y / 2
    const dist = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2)
    if (dist < 15) {
      draggingPlayer.value = player.id
      break
    }
  }
}

const handleCanvasMouseMove = (e: MouseEvent) => {
  if (!draggingPlayer.value) return
  const canvas = formationCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.max(0, Math.min(400, e.clientX - rect.left))
  const y = Math.max(0, Math.min(400, e.clientY - rect.top))
  formationPositions.value.set(draggingPlayer.value, { x, y })
  drawFormationEditor()
}

const handleCanvasMouseUp = () => {
  draggingPlayer.value = null
}

const handleDeployFormation = () => {
  const positions: FormationPosition[] = []
  formationPositions.value.forEach((pos, playerId) => {
    positions.push({
      playerId,
      x: pos.x * 2,
      y: pos.y * 2,
    })
  })
  emit('deployFormation', positions)
}

const handleSavePreset = () => {
  if (!presetName.value.trim()) return
  const positions: FormationPosition[] = []
  formationPositions.value.forEach((pos, playerId) => {
    positions.push({
      playerId,
      x: pos.x * 2,
      y: pos.y * 2,
    })
  })
  emit('savePreset', presetName.value.trim(), positions)
  presetName.value = ''
}

const handleLoadPreset = (presetId: string) => {
  const preset = props.presets.find(p => p.id === presetId)
  if (!preset) return
  formationPositions.value.clear()
  for (const pos of preset.positions) {
    formationPositions.value.set(pos.playerId, { x: pos.x / 2, y: pos.y / 2 })
  }
  drawFormationEditor()
}

const handleDeletePreset = (presetId: string) => {
  emit('deletePreset', presetId)
}

const handleClearFormation = () => {
  formationPositions.value.clear()
  drawFormationEditor()
}

let redrawTimer: number | null = null

watch(() => props.gameState, () => {
  drawHeatmap()
}, { deep: true })

watch(() => props.gameStats, () => {
  drawDamageChart()
}, { deep: true })

watch(() => props.visible, (newVal) => {
  if (newVal) {
    drawHeatmap()
    drawFormationEditor()
    drawDamageChart()
    if (redrawTimer === null) {
      redrawTimer = window.setInterval(() => {
        if (activeTab.value === 'situation') drawHeatmap()
        if (activeTab.value === 'formation') drawFormationEditor()
        if (activeTab.value === 'stats') drawDamageChart()
      }, 200) as unknown as number
    }
  } else {
    if (redrawTimer !== null) {
      clearInterval(redrawTimer)
      redrawTimer = null
    }
  }
})

onMounted(() => {
  for (const player of players.value) {
    formationPositions.value.set(player.id, {
      x: player.position.x / 2,
      y: player.position.y / 2,
    })
  }
  drawHeatmap()
  drawFormationEditor()
  drawDamageChart()
})

onUnmounted(() => {
  if (redrawTimer !== null) {
    clearInterval(redrawTimer)
    redrawTimer = null
  }
})
</script>
