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
      
      <div class="flex gap-4">
        <button
          class="flex-1 px-4 py-2 bg-gray hover:bg-gray/80 text-light rounded-lg transition-all"
          @click="$emit('leave')"
        >
          离开房间
        </button>
        <button
          class="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-light font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="playerCount < 1"
          @click="$emit('start')"
        >
          开始游戏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Room } from '../types'

defineProps<{
  room: Room | null
}>()

defineEmits<{
  (e: 'leave'): void
  (e: 'start'): void
}>()

const playerCount = ref(1)
</script>
