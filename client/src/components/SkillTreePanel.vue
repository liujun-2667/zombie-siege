<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">{{ className }}技能树</h2>
        <button
          class="text-gray-400 hover:text-white text-2xl font-bold"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center gap-2">
          <span class="text-gray-400">技能点:</span>
          <span class="text-yellow-400 font-bold text-xl">{{ skillPoints }}</span>
        </div>
        <div class="text-gray-500 text-sm">按 Tab 键关闭</div>
      </div>

      <div class="space-y-8">
        <div v-for="(tier, tierIndex) in tiers" :key="tierIndex" class="space-y-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {{ tierIndex + 1 }}
            </div>
            <span class="text-gray-400">第{{ tierIndex + 1 }}层</span>
          </div>

          <div class="flex gap-4">
            <div
              v-for="skill in tier"
              :key="skill.id"
              class="flex-1 relative"
            >
              <div
                class="p-4 rounded-lg border-2 transition-all cursor-pointer"
                :class="getSkillClass(skill)"
                @click="selectSkill(skill)"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-white">{{ skill.name }}</span>
                  <span v-if="skill.isSelected" class="text-green-400 text-sm">✓</span>
                </div>
                <p class="text-gray-400 text-sm">{{ skill.description }}</p>
                
                <div
                  v-if="!skill.isUnlocked && !skill.isSelected"
                  class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center"
                >
                  <span class="text-gray-500 text-sm">未解锁</span>
                </div>

                <div
                  v-if="skill.isUnlocked && !skill.isSelected && skillPoints > 0"
                  class="absolute inset-0 border-2 border-yellow-500 rounded-lg animate-pulse pointer-events-none"
                ></div>
              </div>
            </div>
          </div>

          <div
            v-if="tierIndex < 2"
            class="flex justify-center"
          >
            <div class="w-0.5 h-8 bg-gray-600"></div>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-gray-700">
        <div class="text-gray-500 text-sm space-y-1">
          <p>• 每击杀10只普通僵尸或1只特殊僵尸获得1点技能点</p>
          <p>• 每层只能选择一个技能</p>
          <p>• 选择技能后立即生效</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SkillTreeNode, PlayerClass } from '../types'

const props = defineProps<{
  visible: boolean
  skillTree: SkillTreeNode[]
  skillPoints: number
  classType: PlayerClass
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', skillId: string): void
}>()

const className = computed(() => {
  const names: Record<PlayerClass, string> = {
    assault: '突击手',
    engineer: '工程师',
    medic: '医疗兵',
    commander: '指挥官',
  }
  return names[props.classType]
})

const tiers = computed(() => {
  const result: SkillTreeNode[][] = [[], [], []]
  props.skillTree.forEach(skill => {
    if (skill.level >= 1 && skill.level <= 3) {
      result[skill.level - 1].push(skill)
    }
  })
  return result
})

const getSkillClass = (skill: SkillTreeNode) => {
  if (skill.isSelected) {
    return 'bg-green-900/30 border-green-500'
  }
  if (!skill.isUnlocked) {
    return 'bg-gray-800 border-gray-700 opacity-60'
  }
  if (props.skillPoints > 0) {
    return 'bg-gray-800 border-primary hover:border-primary-light hover:bg-gray-700'
  }
  return 'bg-gray-800 border-gray-600'
}

const selectSkill = (skill: SkillTreeNode) => {
  if (skill.isUnlocked && !skill.isSelected && props.skillPoints > 0) {
    emit('select', skill.id)
  }
}
</script>
