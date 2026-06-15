<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div class="bg-dark-light rounded-xl p-6 w-full max-w-4xl border border-gray">
      <h2 class="text-2xl font-bold text-light mb-6 text-center">选择你的职业</h2>
      
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="classInfo in classes"
          :key="classInfo.id"
          class="bg-dark rounded-lg p-4 border-2 transition-all cursor-pointer"
          :class="selectedClass === classInfo.id ? 'border-primary glow-primary' : 'border-gray hover:border-primary'"
          @click="selectedClass = classInfo.id"
        >
          <div class="text-center mb-3">
            <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl" :class="classInfo.bgClass">
              {{ classInfo.icon }}
            </div>
            <h3 class="font-bold text-light mt-2">{{ classInfo.name }}</h3>
          </div>
          
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray">生命值</span>
              <span :class="getHealthColor(classInfo.health)">{{ classInfo.health }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray">护甲</span>
              <span class="text-blue-400">{{ (classInfo.armor * 100).toFixed(0) }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray">速度</span>
              <span class="text-green-400">{{ classInfo.speed.toFixed(1) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray">伤害</span>
              <span class="text-red-400">{{ classInfo.damage.toFixed(1) }}</span>
            </div>
          </div>
          
          <div class="mt-3 pt-3 border-t border-gray">
            <div class="text-xs text-gray mb-1">主动技能</div>
            <div class="text-sm text-yellow-400">{{ classInfo.activeSkill }}</div>
            <div class="text-xs text-gray mt-1">被动技能</div>
            <div class="text-sm text-green-400">{{ classInfo.passiveSkill }}</div>
          </div>
        </div>
      </div>
      
      <div class="mt-6 flex justify-center">
        <button
          class="bg-primary hover:bg-primary-dark text-light font-semibold py-3 px-8 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedClass"
          @click="handleSelect"
        >
          确认选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PlayerClass } from '../types'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'select', classType: PlayerClass): void
}>()

const selectedClass = ref<PlayerClass | null>(null)

const classes = [
  {
    id: 'assault' as PlayerClass,
    name: '突击手',
    icon: '⚔️',
    bgClass: 'bg-red-900',
    health: 100,
    armor: 0.1,
    speed: 1.2,
    damage: 1.5,
    activeSkill: '狂暴射击 - 连续射击5次',
    passiveSkill: '暴击率+15%',
  },
  {
    id: 'engineer' as PlayerClass,
    name: '工程师',
    icon: '🔧',
    bgClass: 'bg-yellow-900',
    health: 100,
    armor: 0.2,
    speed: 0.9,
    damage: 0.8,
    activeSkill: '快速建造 - 立即完成一个建造',
    passiveSkill: '建造速度翻倍',
  },
  {
    id: 'medic' as PlayerClass,
    name: '医疗兵',
    icon: '💉',
    bgClass: 'bg-green-900',
    health: 80,
    armor: 0.1,
    speed: 1.0,
    damage: 0.7,
    activeSkill: '范围治疗 - 治疗周围队友',
    passiveSkill: '复活速度+100%',
  },
  {
    id: 'commander' as PlayerClass,
    name: '指挥官',
    icon: '🎖️',
    bgClass: 'bg-blue-900',
    health: 90,
    armor: 0.15,
    speed: 1.0,
    damage: 1.0,
    activeSkill: '全局减速 - 所有敌人减速50%',
    passiveSkill: '队友伤害+10%',
  },
]

const getHealthColor = (health: number): string => {
  if (health >= 100) return 'text-green-400'
  if (health >= 80) return 'text-yellow-400'
  return 'text-red-400'
}

const handleSelect = () => {
  if (selectedClass.value) {
    emit('select', selectedClass.value)
    selectedClass.value = null
  }
}
</script>
