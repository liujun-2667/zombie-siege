<template>
  <div class="room-list">
    <h2 class="text-xl font-bold mb-4 text-light">房间列表</h2>
    <div class="grid gap-3">
      <div
        v-for="room in gameStore.rooms"
        :key="room.id"
        class="bg-dark-light rounded-lg p-4 border border-gray hover:border-primary transition-all cursor-pointer"
        @click="handleJoinRoom(room)"
      >
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-light">{{ room.name }}</h3>
            <p class="text-sm text-gray">难度: {{ difficultyText[room.difficulty] }}</p>
          </div>
          <div class="text-right">
            <span class="text-sm text-gray">{{ room.currentNight }}/10 夜</span>
            <div class="flex items-center gap-1 mt-1">
              <div
                v-for="i in room.maxPlayers"
                :key="i"
                class="w-3 h-3 rounded-full"
                :class="i <= getPlayerCount(room.id) ? 'bg-primary' : 'bg-gray'"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="gameStore.rooms.length === 0" class="text-center text-gray py-8">
      暂无房间，创建一个新房间吧！
    </div>
  </div>
</template>

<script setup lang="ts">
import { gameStore } from '../stores/gameStore'
import type { Room } from '../types'

const emit = defineEmits<{
  (e: 'join', room: Room): void
}>()

const difficultyText: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

const playerCounts: Record<string, number> = {}

const getPlayerCount = (roomId: string): number => {
  return playerCounts[roomId] || 1
}

const handleJoinRoom = (room: Room) => {
  emit('join', room)
}
</script>
