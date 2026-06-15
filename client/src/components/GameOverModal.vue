<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl p-8 w-full max-w-lg border border-gray text-center">
      <div class="text-6xl mb-4">
        {{ result === 'victory' ? '🏆' : '💀' }}
      </div>
      
      <h2 class="text-3xl font-bold mb-2" :class="result === 'victory' ? 'text-yellow-400' : 'text-red-400'">
        {{ result === 'victory' ? '胜利!' : '失败' }}
      </h2>
      
      <p class="text-gray mb-6">
        {{ result === 'victory' ? '你们成功坚守到了第10个夜晚的黎明!' : '据点被僵尸攻陷了...' }}
      </p>
      
      <div class="bg-dark rounded-lg p-4 mb-6">
        <h3 class="text-lg font-semibold text-light mb-3">战斗统计</h3>
        
        <div class="grid grid-cols-2 gap-4">
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
import { ref, watch } from 'vue'
import { gameStore } from '../stores/gameStore'

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
</script>
