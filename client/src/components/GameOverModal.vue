<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl p-8 w-full max-w-4xl border border-gray text-center max-h-[90vh] overflow-auto">
      <div class="text-6xl mb-4">
        {{ result === 'victory' ? '🏆' : '💀' }}
      </div>

      <h2 class="text-3xl font-bold mb-2" :class="result === 'victory' ? 'text-yellow-400' : 'text-red-400'">
        {{ result === 'victory' ? '胜利!' : '失败' }}
      </h2>

      <p class="text-gray mb-6">
        {{ result === 'victory' ? '你们成功坚守到了第10个夜晚的黎明!' : '据点被僵尸攻陷了...' }}
      </p>

      <!-- MVP Card -->
      <div v-if="mvpPlayer" class="mb-6">
        <div class="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 rounded-lg p-1">
          <div class="bg-dark rounded-lg p-4">
            <div class="flex items-center justify-center gap-4">
              <div class="text-4xl">👑</div>
              <div class="text-left">
                <div class="text-yellow-400 text-sm font-semibold">MVP</div>
                <div class="text-white text-xl font-bold">{{ mvpPlayer.playerName }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    :style="{ backgroundColor: getClassColor(mvpPlayer.classType) }"
                  >
                    {{ getClassIcon(mvpPlayer.classType) }}
                  </span>
                  <span class="text-gray text-sm">{{ getClassName(mvpPlayer.classType) }}</span>
                </div>
              </div>
              <div class="text-yellow-400 text-3xl font-bold ml-4">
                {{ mvpPlayer.mvpScore.toFixed(0) }}
              </div>
              <div class="text-yellow-400 text-sm">分</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Stats -->
      <div class="bg-dark rounded-lg p-4 mb-6">
        <h3 class="text-lg font-semibold text-light mb-3">战斗统计</h3>

        <div class="grid grid-cols-4 gap-4">
          <div class="bg-dark-light rounded-lg p-3">
            <div class="text-2xl font-bold text-yellow-400">{{ stats.night }}</div>
            <div class="text-sm text-gray">存活夜数</div>
          </div>
          <div class="bg-dark-light rounded-lg p-3">
            <div class="text-2xl font-bold text-red-400">{{ stats.kills }}</div>
            <div class="text-sm text-gray">击杀僵尸</div>
          </div>
          <div class="bg-dark-light rounded-lg p-3">
            <div class="text-2xl font-bold text-green-400">{{ stats.resources }}</div>
            <div class="text-sm text-gray">资源收集</div>
          </div>
          <div class="bg-dark-light rounded-lg p-3">
            <div class="text-2xl font-bold text-blue-400">{{ stats.classType }}</div>
            <div class="text-sm text-gray">职业</div>
          </div>
        </div>
      </div>

      <!-- Player Detailed Stats with Comparison Mode -->
      <div v-if="postMatchStats && postMatchStats.playerStats.length > 0" class="bg-dark rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-light">玩家详细数据</h3>
          <div class="flex items-center gap-2">
            <span class="text-gray text-sm">对比模式</span>
            <button
              class="w-12 h-6 rounded-full transition-all relative"
              :class="comparisonMode ? 'bg-primary' : 'bg-gray-600'"
              @click="toggleComparisonMode"
            >
              <div
                class="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
                :class="comparisonMode ? 'left-6.5' : 'left-0.5'"
              ></div>
            </button>
          </div>
        </div>

        <!-- Radar Chart for Comparison -->
        <div v-if="comparisonMode && selectedPlayers.length === 2" class="mb-4">
          <canvas
            ref="radarCanvas"
            class="w-full max-w-md mx-auto"
            width="400"
            height="400"
          ></canvas>
        </div>

        <!-- Player Selection for Comparison -->
        <div v-if="comparisonMode" class="mb-4 flex flex-wrap gap-2 justify-center">
          <div
            v-for="player in postMatchStats.playerStats"
            :key="player.playerId"
            class="flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all"
            :class="isPlayerSelected(player.playerId) ? 'bg-primary' : 'bg-dark-light hover:bg-gray-700'"
            @click="togglePlayerSelection(player.playerId)"
          >
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              :style="{ backgroundColor: getClassColor(player.classType) }"
            >
              {{ getClassIcon(player.classType) }}
            </div>
            <span class="text-white text-sm">{{ player.playerName }}</span>
            <span v-if="isPlayerSelected(player.playerId)" class="text-yellow-400">✓</span>
          </div>
          <div v-if="selectedPlayers.length > 0" class="w-full text-center text-gray text-sm mt-2">
            已选择 {{ selectedPlayers.length }}/2 名玩家
          </div>
        </div>

        <!-- Player Stats Grid -->
        <div class="space-y-4">
          <div
            v-for="player in postMatchStats.playerStats"
            :key="player.playerId"
            class="bg-dark-light rounded-lg p-4"
            :class="{ 'ring-2 ring-yellow-400': mvpPlayer && player.playerId === mvpPlayer.playerId }"
          >
            <div class="flex items-center gap-3 mb-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                :style="{ backgroundColor: getClassColor(player.classType) }"
              >
                {{ getClassIcon(player.classType) }}
              </div>
              <span class="text-white font-semibold">{{ player.playerName }}</span>
              <span v-if="mvpPlayer && player.playerId === mvpPlayer.playerId" class="text-yellow-400 text-sm">👑 MVP</span>
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

      <div class="flex gap-4 justify-center">
        <button
          class="px-6 py-3 bg-primary hover:bg-primary-dark text-light font-semibold rounded-lg transition-all"
          @click="$emit('restart')"
        >
          再来一局
        </button>
        <button
          class="px-6 py-3 bg-gray hover:bg-gray/80 text-light font-semibold rounded-lg transition-all"
          @click="$emit('home')"
        >
          返回大厅
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { gameStore } from '../stores/gameStore'
import type { PlayerStats, PlayerClass } from '../types'

interface PlayerStatsWithMvp extends PlayerStats {
  mvpScore: number
}

defineProps<{
  show: boolean
  result: 'victory' | 'defeat' | null
}>()

defineEmits<{
  (e: 'restart'): void
  (e: 'home'): void
}>()

const stats = ref({
  night: 1,
  kills: 0,
  resources: 0,
  classType: '',
})

const comparisonMode = ref(false)
const selectedPlayers = ref<string[]>([])
const radarCanvas = ref<HTMLCanvasElement | null>(null)

const postMatchStats = computed(() => gameStore.postMatchStats)

// Calculate MVP score: totalDamage*0.4 + kills*30*0.3 + (damageTaken-deaths*100)*0.2 + healingDone*0.1
const calculateMvpScore = (player: PlayerStats): number => {
  const totalKills = player.kills.normal + player.kills.special + player.kills.boss
  const score = player.totalDamage * 0.4 +
    totalKills * 30 * 0.3 +
    (player.damageTaken - player.deaths * 100) * 0.2 +
    player.healingDone * 0.1
  return Math.max(0, score)
}

const mvpPlayer = computed((): PlayerStatsWithMvp | null => {
  if (!postMatchStats.value || postMatchStats.value.playerStats.length === 0) {
    return null
  }

  let maxScore = -1
  let mvp: PlayerStatsWithMvp | null = null

  for (const player of postMatchStats.value.playerStats) {
    const score = calculateMvpScore(player)
    if (score > maxScore) {
      maxScore = score
      mvp = { ...player, mvpScore: score }
    }
  }

  return mvp
})

const getClassColor = (classType: PlayerClass): string => {
  const colors: Record<PlayerClass, string> = {
    assault: '#ef4444',
    engineer: '#eab308',
    medic: '#22c55e',
    commander: '#3b82f6',
  }
  return colors[classType] || '#6b7280'
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

const toggleComparisonMode = () => {
  comparisonMode.value = !comparisonMode.value
  if (!comparisonMode.value) {
    selectedPlayers.value = []
  } else {
    drawRadarChart()
  }
}

const isPlayerSelected = (playerId: string): boolean => {
  return selectedPlayers.value.includes(playerId)
}

const togglePlayerSelection = (playerId: string) => {
  const index = selectedPlayers.value.indexOf(playerId)
  if (index > -1) {
    selectedPlayers.value.splice(index, 1)
  } else {
    if (selectedPlayers.value.length < 2) {
      selectedPlayers.value.push(playerId)
    }
  }
  drawRadarChart()
}

const drawRadarChart = () => {
  const canvas = radarCanvas.value
  if (!canvas || !postMatchStats.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (selectedPlayers.value.length !== 2) {
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, 400, 400)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('请选择两名玩家进行对比', 200, 200)
    return
  }

  const players = postMatchStats.value.playerStats.filter(p => selectedPlayers.value.includes(p.playerId))
  if (players.length !== 2) return

  // Calculate normalized values (0-1) for each dimension
  const dimensions = ['damage', 'kills', 'damageTaken', 'healing', 'structures', 'killStreak'] as const
  const dimensionLabels = ['伤害', '击杀', '承受', '治疗', '建造', '连杀']
  const dimensionKeys = ['totalDamage', 'totalKills', 'damageTaken', 'healingDone', 'structuresBuilt', 'maxKillStreak'] as const

  // Calculate totals for normalization
  const totals = dimensionKeys.map((key, idx) => {
    if (key === 'totalKills') {
      return Math.max(1, ...players.map(p => p.kills.normal + p.kills.special + p.kills.boss))
    }
    return Math.max(1, ...players.map(p => {
      const val = p[key as keyof PlayerStats]
      return typeof val === 'number' ? val : 0
    }))
  })

  const data = players.map(player => {
    const totalKills = player.kills.normal + player.kills.special + player.kills.boss
    return [
      player.totalDamage / totals[0],
      totalKills / totals[1],
      player.damageTaken / totals[2],
      player.healingDone / totals[3],
      player.structuresBuilt / totals[4],
      player.maxKillStreak / totals[5],
    ]
  })

  const colors = [getClassColor(players[0].classType), getClassColor(players[1].classType)]

  const centerX = 200
  const centerY = 200
  const radius = 150

  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, 400, 400)

  // Draw background grid
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1

  // Draw concentric hexagons
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i
    ctx.beginPath()
    for (let j = 0; j < 6; j++) {
      const angle = (Math.PI / 3) * j - Math.PI / 2
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      if (j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // Draw spokes
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
    ctx.stroke()
  }

  // Draw dimension labels
  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const x = centerX + (radius + 25) * Math.cos(angle)
    const y = centerY + (radius + 25) * Math.sin(angle)
    ctx.fillText(dimensionLabels[i], x, y + 4)
  }

  // Draw player data polygons
  for (let p = 0; p < 2; p++) {
    ctx.strokeStyle = colors[p]
    ctx.lineWidth = 2
    ctx.fillStyle = colors[p] + '40'
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const r = data[p][i] * radius
      const angle = (Math.PI / 3) * i - Math.PI / 2
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw data points
    ctx.fillStyle = colors[p]
    for (let i = 0; i < 6; i++) {
      const r = data[p][i] * radius
      const angle = (Math.PI / 3) * i - Math.PI / 2
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Draw legend
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = colors[i]
    ctx.fillRect(20, 360 + i * 20, 12, 12)
    ctx.fillStyle = '#fff'
    ctx.fillText(players[i].playerName, 38, 370 + i * 20)
  }
}

watch(
  () => gameStore.gameState,
  (state) => {
    if (state) {
      stats.value.night = state.day - 1

      const player = state.players[0]
      if (player) {
        stats.value.kills = player.kills
        stats.value.resources = player.resourcesCollected

        const classNames: Record<string, string> = {
          assault: '突击手',
          engineer: '工程师',
          medic: '医疗兵',
          commander: '指挥官',
        }
        stats.value.classType = classNames[player.classType] || player.classType
      }
    }
  },
  { deep: true }
)

watch(comparisonMode, (newVal) => {
  if (newVal) {
    setTimeout(drawRadarChart, 100)
  }
})

watch(selectedPlayers, () => {
  if (comparisonMode.value) {
    drawRadarChart()
  }
}, { deep: true })

onMounted(() => {
  if (comparisonMode.value) {
    drawRadarChart()
  }
})
</script>
