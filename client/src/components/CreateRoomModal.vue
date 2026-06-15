<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl p-6 w-full max-w-md border border-gray">
      <h2 class="text-xl font-bold text-light mb-4">创建房间</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray mb-2">房间名称</label>
          <input
            v-model="roomName"
            type="text"
            placeholder="输入房间名称"
            class="w-full bg-dark border border-gray rounded-lg px-4 py-2 text-light placeholder-gray focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm text-gray mb-2">你的名字</label>
          <input
            v-model="playerName"
            type="text"
            placeholder="输入你的名字"
            class="w-full bg-dark border border-gray rounded-lg px-4 py-2 text-light placeholder-gray focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm text-gray mb-2">难度选择</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="diff in difficulties"
              :key="diff.value"
              class="px-3 py-2 rounded-lg border transition-all"
              :class="difficulty === diff.value ? 'bg-primary border-primary text-light' : 'bg-dark border-gray text-gray hover:border-primary'"
              @click="difficulty = diff.value"
            >
              {{ diff.label }}
            </button>
          </div>
        </div>

        <button
          class="w-full bg-primary hover:bg-primary-dark text-light font-semibold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!roomName || !playerName"
          @click="handleCreate"
        >
          创建房间
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

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', roomName: string, difficulty: string, playerName: string): void
}>()

const roomName = ref('')
const playerName = ref('')
const difficulty = ref('normal')

const difficulties = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
]

const handleCreate = () => {
  if (roomName.value && playerName.value) {
    emit('create', roomName.value, difficulty.value, playerName.value)
    roomName.value = ''
    playerName.value = ''
  }
}
</script>
