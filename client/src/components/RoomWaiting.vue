<template>
  <div class="min-h-screen bg-dark flex items-center justify-center">
    <div class="bg-dark-light rounded-xl p-8 w-full max-w-lg border border-gray">
      <h2 class="text-2xl font-bold text-light mb-2 text-center">{{ room?.name }}</h2>
      <p class="text-gray text-center mb-6">等待其他玩家加入...</p>
      
      <div class="bg-dark rounded-lg p-4 mb-6">
        <h3 class="text-sm text-gray mb-3">房间玩家</h3>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="i in 4"
            :key="i"
            class="aspect-square rounded-lg flex items-center justify-center text-2xl"
            :class="i <= playerCount ? 'bg-primary' : 'bg-gray'"
          >
            {{ i <= playerCount ? '👤' : '?' }}
          </div>
        </div>
      </div>
      
      <div class="bg-dark rounded-lg p-4 mb-6">
        <h3 class="text-sm text-gray mb-3">选择职业</h3>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="classInfo in classes"
            :key="classInfo.id"
            class="p-2 rounded-lg text-center cursor-pointer transition-all"
            :class="selectedClass === classInfo.id ? 'bg-primary border-2 border-accent' : 'bg-gray hover:bg-gray/80 border-2 border-transparent'"
            @click="selectedClass = classInfo.id"
          >
            <div class="text-xl">{{ classInfo.icon }}</div>
            <div class="text-xs text-light mt-1">{{ classInfo.name }}</div>
          </div>
        </div>
      </div>
      
      <div class="flex gap-4">
        <button
          class="flex-1 px-4 py-2 bg-gray hover:bg-gray/80 text-light rounded-lg transition-all"
          @click="$emit('leave')"
        >
          离开房间
        </button>
        <button
          class="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-light font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="playerCount < 1 || !selectedClass"
          @click="handleStart"
        >
          开始游戏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Room, PlayerClass } from '../types'

const props = defineProps<{
  room: Room | null
}>()

const emit = defineEmits<{
  (e: 'leave'): void
  (e: 'start', classType: PlayerClass): void
}>()

const playerCount = ref(1)
const selectedClass = ref<PlayerClass | null>(null)

const classes = [
  { id: 'assault' as PlayerClass, name: '突击手', icon: '⚔️' },
  { id: 'engineer' as PlayerClass, name: '工程师', icon: '🔧' },
  { id: 'medic' as PlayerClass, name: '医疗兵', icon: '💉' },
  { id: 'commander' as PlayerClass, name: '指挥官', icon: '🎖️' },
]

const handleStart = () => {
  if (selectedClass.value) {
    emit('start', selectedClass.value)
  }
}
</script>
