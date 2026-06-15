<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl p-6 w-full max-w-md border border-gray">
      <h2 class="text-xl font-bold text-light mb-4">加入房间</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray mb-2">你的名字</label>
          <input
            v-model="playerName"
            type="text"
            placeholder="输入你的名字"
            class="w-full bg-dark border border-gray rounded-lg px-4 py-2 text-light placeholder-gray focus:outline-none focus:border-primary"
          />
        </div>

        <div class="bg-dark rounded-lg p-3">
          <div class="text-sm text-gray mb-1">房间名称</div>
          <div class="text-light font-semibold">{{ room?.name }}</div>
        </div>

        <button
          class="w-full bg-primary hover:bg-primary-dark text-light font-semibold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!playerName"
          @click="handleJoin"
        >
          加入房间
        </button>

        <button
          class="w-full bg-gray hover:bg-gray/80 text-light py-2 rounded-lg transition-all"
          @click="$emit('close')"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Room } from '../types'

defineProps<{
  show: boolean
  room: Room | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'join', roomId: string, playerName: string): void
}>()

const playerName = ref('')

const handleJoin = () => {
  if (playerName.value) {
    emit('join', '', playerName.value)
    playerName.value = ''
  }
}
</script>
