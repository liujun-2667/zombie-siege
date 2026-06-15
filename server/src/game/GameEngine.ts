import { GameState, PlayerState, ZombieState, StructureState, GateState, ResourcePoint, PlayerClass, ZombieType, TimeOfDay, WeaponType, SkillTreeNode, GameStats, PlayerStats, ThreatGrid, ThreatGridSnapshot, FormationPreset, FormationPosition, DeploymentOrder, ReplayFrame, ReplayData } from '../types'
import { GAME_CONFIG, PLAYER_CLASSES, ZOMBIE_CONFIG, STRUCTURE_CONFIG, WEAPON_CONFIG, SKILL_TREE_CONFIG } from '../config/gameConfig'
import { generateId, getDistance, getRandomSpawnPosition, clamp } from '../utils/helpers'
import { roomManager } from '../managers/roomManager'
import { setReplay } from '../redis/client'

export class GameEngine {
  private gameStates: Map<string, GameState> = new Map()
  private gameLoops: Map<string, number> = new Map()
  private lastUpdate: Map<string, number> = new Map()
  private gameStats: Map<string, GameStats> = new Map()
  private formationPresets: Map<string, FormationPreset[]> = new Map()
  private threatGridUpdates: Map<string, number> = new Map()
  private lastResourceSnapshot: Map<string, { ammo: number; medkit: number; time: number }> = new Map()
  private heatmapSnapshotInterval: Map<string, number> = new Map()
  private lastHeatmapSnapshot: Map<string, number> = new Map()
  private static readonly HEATMAP_SNAPSHOT_INTERVAL = 2000 // 2 seconds
  private static readonly HEATMAP_MAX_SNAPSHOTS = 30 // 30 frames = 60 seconds
  private replayFrames: Map<string, ReplayFrame[]> = new Map()
  private replayStartTime: Map<string, number> = new Map()
  private replayIntervals: Map<string, NodeJS.Timeout> = new Map()
  private static readonly REPLAY_SNAPSHOT_INTERVAL = 200 // 200ms per frame

  createGameState(roomId: string): GameState {
    const centerX = GAME_CONFIG.MAP_WIDTH / 2
    const centerY = GAME_CONFIG.MAP_HEIGHT / 2

    const gates: GateState[] = [
      { id: generateId(), position: 'north', health: GAME_CONFIG.GATE_INITIAL_HP, maxHealth: GAME_CONFIG.GATE_INITIAL_HP },
      { id: generateId(), position: 'south', health: GAME_CONFIG.GATE_INITIAL_HP, maxHealth: GAME_CONFIG.GATE_INITIAL_HP },
      { id: generateId(), position: 'east', health: GAME_CONFIG.GATE_INITIAL_HP, maxHealth: GAME_CONFIG.GATE_INITIAL_HP },
      { id: generateId(), position: 'west', health: GAME_CONFIG.GATE_INITIAL_HP, maxHealth: GAME_CONFIG.GATE_INITIAL_HP },
    ]

    const resourcePoints: ResourcePoint[] = this.generateResourcePoints()

    const structures: StructureState[] = [
      { id: generateId(), type: 'barracks', position: { x: centerX - 60, y: centerY - 60 }, health: 100, maxHealth: 100, level: 1 },
      { id: generateId(), type: 'workshop', position: { x: centerX + 60, y: centerY - 60 }, health: 100, maxHealth: 100, level: 1 },
      { id: generateId(), type: 'medical', position: { x: centerX - 60, y: centerY + 60 }, health: 100, maxHealth: 100, level: 1 },
      { id: generateId(), type: 'command', position: { x: centerX, y: centerY }, health: 100, maxHealth: 100, level: 1 },
    ]

    const threatGrid: ThreatGrid = {
      grid: Array(10).fill(null).map(() => Array(10).fill(0)),
      lastUpdate: Date.now(),
    }

    this.gameStats.set(roomId, {
      playerStats: new Map(),
      damageTimeSeries: [],
      resourceConsumption: { ammoPerMinute: 0, medkitPerMinute: 0 },
      totalZombiesKilled: 0,
      totalResourcesCollected: 0,
    })

    this.formationPresets.set(roomId, [])

    this.lastResourceSnapshot.set(roomId, { ammo: 50, medkit: 10, time: Date.now() })
    this.lastHeatmapSnapshot.set(roomId, 0)

    return {
      roomId,
      day: 1,
      timeOfDay: 'day',
      timeRemaining: GAME_CONFIG.DAY_DURATION,
      currentNight: 0,
      players: [],
      zombies: [],
      structures,
      gates,
      resourcePoints,
      resources: { ammo: 50, wood: 50, iron: 30, medkit: 10 },
      gameOver: false,
      victory: false,
      threatGrid,
      heatmapSnapshots: [],
      currentFormation: null,
      deploymentOrders: [],
    }
  }

  private generateResourcePoints(): ResourcePoint[] {
    const points: ResourcePoint[] = []
    const resourceTypes: Array<'ammo' | 'wood' | 'iron' | 'medkit'> = ['ammo', 'wood', 'iron', 'medkit']
    
    for (let i = 0; i < 12; i++) {
      const margin = 150
      const x = margin + Math.random() * (GAME_CONFIG.MAP_WIDTH - margin * 2)
      const y = margin + Math.random() * (GAME_CONFIG.MAP_HEIGHT - margin * 2)
      
      points.push({
        id: generateId(),
        type: resourceTypes[i % 4],
        position: { x, y },
        isDepleted: false,
        respawnTime: 0,
      })
    }
    
    return points
  }

  private initializeSkillTree(classType: PlayerClass): SkillTreeNode[] {
    const config = SKILL_TREE_CONFIG[classType]
    const nodes: SkillTreeNode[] = []
    
    config.tiers.forEach((tier, tierIndex) => {
      tier.forEach(skill => {
        nodes.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          level: tierIndex + 1,
          isUnlocked: tierIndex === 0,
          isSelected: false,
        })
      })
    })
    
    return nodes
  }

  addPlayer(roomId: string, playerId: string, playerName: string, classType: PlayerClass): PlayerState {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) throw new Error('Game state not found')

    const classConfig = PLAYER_CLASSES[classType]
    const centerX = GAME_CONFIG.MAP_WIDTH / 2
    const centerY = GAME_CONFIG.MAP_HEIGHT / 2

    const pistolConfig = WEAPON_CONFIG.pistol
    const player: PlayerState = {
      id: playerId,
      name: playerName,
      classType,
      position: { x: centerX + (Math.random() - 0.5) * 50, y: centerY + (Math.random() - 0.5) * 50 },
      health: classConfig.health,
      maxHealth: classConfig.health,
      armor: classConfig.armor,
      speed: GAME_CONFIG.PLAYER_BASE_SPEED * classConfig.speed,
      skills: [
        { name: classConfig.skill.active.name, cooldown: 0, maxCooldown: classConfig.skill.active.cooldown },
      ],
      skillPoints: 0,
      skillTree: this.initializeSkillTree(classType),
      weapon: {
        type: 'pistol',
        level: 0,
        damage: pistolConfig.baseDamage,
        fireRate: pistolConfig.baseFireRate,
        range: pistolConfig.baseRange,
      },
      isDead: false,
      deathTime: 0,
      kills: 0,
      zombieKills: 0,
      specialZombieKills: 0,
      resourcesCollected: 0,
    }

    const stats = this.gameStats.get(roomId)
    if (stats) {
      stats.playerStats.set(playerId, {
        playerId,
        playerName,
        classType,
        totalDamage: 0,
        kills: { normal: 0, special: 0, boss: 0 },
        damageTaken: 0,
        healingDone: 0,
        structuresBuilt: 0,
        deaths: 0,
        maxKillStreak: 0,
        currentKillStreak: 0,
        dpsHistory: [],
      })
    }

    const gameStats = this.gameStats.get(roomId)
    if (gameStats) {
      const playerStats = gameStats.playerStats.get(playerId)
      if (playerStats) {
        playerStats.playerName = playerName
        playerStats.classType = classType
      }
    }

    gameState.players.push(player)
    return player
  }

  removePlayer(roomId: string, playerId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    gameState.players = gameState.players.filter(p => p.id !== playerId)
  }

  movePlayer(roomId: string, playerId: string, targetX: number, targetY: number): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return

    const dx = targetX - player.position.x
    const dy = targetY - player.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < player.speed) {
      player.position.x = targetX
      player.position.y = targetY
    } else {
      player.position.x += (dx / distance) * player.speed
      player.position.y += (dy / distance) * player.speed
    }

    player.position.x = clamp(player.position.x, 0, GAME_CONFIG.MAP_WIDTH)
    player.position.y = clamp(player.position.y, 0, GAME_CONFIG.MAP_HEIGHT)
  }

  shoot(roomId: string, playerId: string, targetX: number, targetY: number): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return

    if (gameState.resources.ammo <= 0) return

    gameState.resources.ammo -= 1

    const classConfig = PLAYER_CLASSES[player.classType]
    let damage = player.weapon.damage * classConfig.damage

    const critSkill = player.skillTree.find(s => s.id === 'assault_1b' && s.isSelected)
    if (critSkill && Math.random() < 0.2) {
      damage *= 2
    }

    const pierceSkill = player.skillTree.find(s => s.id === 'assault_2a' && s.isSelected)
    const pierceCount = pierceSkill ? 2 : 0
    const hitZombies: ZombieState[] = []

    const zombiesInRange = gameState.zombies.filter(z => {
      const dist = getDistance(z.position, player.position)
      return dist <= player.weapon.range
    }).sort((a, b) => {
      const distA = getDistance(a.position, player.position)
      const distB = getDistance(b.position, player.position)
      return distA - distB
    })

    const angle = Math.atan2(targetY - player.position.y, targetX - player.position.x)
    
    for (const zombie of zombiesInRange) {
      const zombieAngle = Math.atan2(zombie.position.y - player.position.y, zombie.position.x - player.position.x)
      const angleDiff = Math.abs(angle - zombieAngle)

      if (angleDiff < 0.5 || hitZombies.length > 0 && pierceCount > 0) {
        hitZombies.push(zombie)
        zombie.health -= damage
        
        const now = Date.now()
        const stats = this.gameStats.get(roomId)
        if (stats) {
          const playerStats = stats.playerStats.get(playerId)
          if (playerStats) {
            playerStats.totalDamage += damage
            playerStats.dpsHistory.push({ time: now, damage })
          }
        }

        const burnSkill = player.skillTree.find(s => s.id === 'assault_2b' && s.isSelected)
        if (burnSkill) {
          zombie.health -= 5
          if (stats) {
            const playerStats = stats.playerStats.get(playerId)
            if (playerStats) {
              playerStats.totalDamage += 5
              playerStats.dpsHistory.push({ time: now, damage: 5 })
            }
          }
        }

        if (zombie.health <= 0) {
          this.killZombie(roomId, zombie.id, playerId)
          player.kills += 1
        }

        if (hitZombies.length > pierceCount) break
      }
    }
  }

  upgradeWeapon(roomId: string, playerId: string, targetType: WeaponType): boolean {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return false

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return false

    if (targetType === 'pistol') return false

    const barracks = gameState.structures.find(s => s.type === 'barracks')
    if (!barracks) return false

    const weaponConfig = WEAPON_CONFIG[targetType]
    if (!weaponConfig || !weaponConfig.upgradeCosts) return false

    let targetLevel = 0
    let cost = 0

    if (player.weapon.type === targetType) {
      if (player.weapon.level >= 3) return false
      targetLevel = player.weapon.level + 1
      cost = weaponConfig.upgradeCosts[player.weapon.level]
    } else {
      targetLevel = 1
      cost = weaponConfig.upgradeCosts[0]
    }

    if (gameState.resources.iron < cost) return false

    gameState.resources.iron -= cost

    const bonus = weaponConfig.levelBonuses[targetLevel - 1]
    player.weapon = {
      type: targetType,
      level: targetLevel,
      damage: bonus.damage,
      fireRate: bonus.fireRate,
      range: bonus.range,
    }

    return true
  }

  selectSkill(roomId: string, playerId: string, skillId: string): boolean {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return false

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return false

    if (player.skillPoints <= 0) return false

    const skill = player.skillTree.find(s => s.id === skillId)
    if (!skill || !skill.isUnlocked || skill.isSelected) return false

    const tierSkills = player.skillTree.filter(s => s.level === skill.level)
    tierSkills.forEach(s => {
      s.isSelected = s.id === skillId
    })

    player.skillPoints -= 1

    const nextTier = player.skillTree.filter(s => s.level === skill.level + 1)
    nextTier.forEach(s => {
      s.isUnlocked = true
    })

    return true
  }

  private killZombie(roomId: string, zombieId: string, killerId?: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const zombie = gameState.zombies.find(z => z.id === zombieId)
    if (!zombie) return

    const reward = ZOMBIE_CONFIG[zombie.type].reward
    gameState.resources.ammo += reward.ammo
    gameState.resources.wood += reward.wood
    gameState.resources.iron += reward.iron
    gameState.resources.medkit += reward.medkit

    const stats = this.gameStats.get(roomId)
    if (stats) {
      stats.totalZombiesKilled += 1
    }

    if (killerId) {
      const killer = gameState.players.find(p => p.id === killerId)
      if (killer) {
        const isSpecial = zombie.type !== 'normal'
        const isBoss = zombie.type === 'boss'
        
        if (stats) {
          const playerStats = stats.playerStats.get(killerId)
          if (playerStats) {
            if (isBoss) {
              playerStats.kills.boss += 1
            } else if (isSpecial) {
              playerStats.kills.special += 1
            } else {
              playerStats.kills.normal += 1
            }
            playerStats.currentKillStreak += 1
            if (playerStats.currentKillStreak > playerStats.maxKillStreak) {
              playerStats.maxKillStreak = playerStats.currentKillStreak
            }
          }
        }

        if (isSpecial) {
          killer.specialZombieKills += 1
          killer.skillPoints += 1
        } else {
          killer.zombieKills += 1
          if (killer.zombieKills % 10 === 0) {
            killer.skillPoints += 1
          }
        }
        
        const ammoRefundSkill = killer.skillTree.find(s => s.id === 'assault_1a' && s.isSelected)
        if (ammoRefundSkill) {
          gameState.resources.ammo += Math.floor(reward.ammo * 0.3)
        }
      }
    }

    gameState.zombies = gameState.zombies.filter(z => z.id !== zombieId)
  }

  scavenge(roomId: string, playerId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return

    for (const point of gameState.resourcePoints) {
      if (!point.isDepleted && getDistance(player.position, point.position) < 30) {
        point.isDepleted = true
        point.respawnTime = Date.now() + 3 * GAME_CONFIG.DAY_DURATION * 1000

        const amount = Math.floor(Math.random() * 5) + 3
        switch (point.type) {
          case 'ammo': gameState.resources.ammo += amount; break
          case 'wood': gameState.resources.wood += amount; break
          case 'iron': gameState.resources.iron += amount; break
          case 'medkit': gameState.resources.medkit += amount; break
        }

        player.resourcesCollected += amount

        const stats = this.gameStats.get(roomId)
        if (stats) {
          stats.totalResourcesCollected += amount
        }
        break
      }
    }
  }

  buildStructure(roomId: string, playerId: string, type: string, x: number, y: number): boolean {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return false

    const player = gameState.players.find(p => p.id === playerId)
    if (!player || player.isDead) return false

    const config = STRUCTURE_CONFIG[type as keyof typeof STRUCTURE_CONFIG]
    if (!config) return false

    const cost = config.cost
    if (
      gameState.resources.ammo < cost.ammo ||
      gameState.resources.wood < cost.wood ||
      gameState.resources.iron < cost.iron
    ) {
      return false
    }

    gameState.resources.ammo -= cost.ammo
    gameState.resources.wood -= cost.wood
    gameState.resources.iron -= cost.iron

    const structure: StructureState = {
      id: generateId(),
      type: type as any,
      position: { x, y },
      health: 'maxHealth' in config ? config.maxHealth : 100,
      maxHealth: 'maxHealth' in config ? config.maxHealth : 100,
      level: 1,
    }

    gameState.structures.push(structure)

    const stats = this.gameStats.get(roomId)
    if (stats) {
      const playerStats = stats.playerStats.get(playerId)
      if (playerStats) {
        playerStats.structuresBuilt += 1
      }
    }

    return true
  }

  startGame(roomId: string): void {
    const gameState = this.createGameState(roomId)
    this.gameStates.set(roomId, gameState)
    this.lastUpdate.set(roomId, Date.now())

    // Initialize replay recording
    this.replayFrames.set(roomId, [])
    this.replayStartTime.set(roomId, Date.now())

    this.startGameLoop(roomId)
    this.startReplayRecording(roomId)
  }

  private startReplayRecording(roomId: string): void {
    const interval = setInterval(() => {
      this.captureReplaySnapshot(roomId)
    }, GameEngine.REPLAY_SNAPSHOT_INTERVAL)

    this.replayIntervals.set(roomId, interval)
  }

  private captureReplaySnapshot(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    const frames = this.replayFrames.get(roomId)
    const startTime = this.replayStartTime.get(roomId)

    if (!gameState || !frames || !startTime) return

    const snapshot: ReplayFrame = {
      timestamp: Date.now() - startTime,
      players: gameState.players.map(p => ({
        ...p,
        skillTree: [], // Skip skill tree to reduce size
        skills: [],
      })),
      zombies: gameState.zombies.map(z => ({ ...z })),
      structures: gameState.structures.map(s => ({ ...s })),
      gates: gameState.gates.map(g => ({ ...g })),
      resourcePoints: gameState.resourcePoints.map(r => ({ ...r })),
      resources: { ...gameState.resources },
      day: gameState.day,
      timeOfDay: gameState.timeOfDay,
      currentNight: gameState.currentNight,
    }

    frames.push(snapshot)
  }

  private startGameLoop(roomId: string): void {
    const loop = setInterval(() => {
      this.update(roomId)
    }, 100) as unknown as number

    this.gameLoops.set(roomId, loop)
  }

  private update(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const now = Date.now()
    const deltaTime = (now - this.lastUpdate.get(roomId)!) / 1000
    this.lastUpdate.set(roomId, now)

    gameState.timeRemaining -= deltaTime

    if (gameState.timeRemaining <= 0) {
      this.switchTimeOfDay(roomId)
    }

    this.updateResourcePoints(roomId)
    this.updatePlayers(roomId)
    this.updateZombies(roomId)
    this.updateTurrets(roomId)
    
    this.updateThreatGrid(roomId)
    this.updateResourceConsumption(roomId)
    this.updateDeploymentOrders(roomId)
    this.cleanupDpsHistory(roomId, now)

    this.checkGameOver(roomId)
  }

  private cleanupDpsHistory(roomId: string, now: number): void {
    const stats = this.gameStats.get(roomId)
    if (!stats) return

    const windowMs = 5000
    stats.playerStats.forEach((playerStats) => {
      playerStats.dpsHistory = playerStats.dpsHistory.filter(
        event => now - event.time < windowMs
      )
    })
  }

  private switchTimeOfDay(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const stats = this.gameStats.get(roomId)
    if (stats) {
      const period = gameState.timeOfDay === 'day' ? 'night' : 'day'
      const dayNum = gameState.timeOfDay === 'day' ? gameState.day : gameState.day - 1
      let totalDamage = 0
      const perPlayer: Record<string, number> = {}
      stats.playerStats.forEach((ps, id) => {
        const damage = ps.totalDamage
        totalDamage += damage
        perPlayer[id] = Math.round(damage)
      })
      stats.damageTimeSeries.push({
        period: `第${dayNum}天${period === 'day' ? '白天' : '夜晚'}`,
        day: dayNum,
        isNight: period === 'night',
        damage: Math.round(totalDamage),
        perPlayer,
      })
    }

    if (gameState.timeOfDay === 'day') {
      gameState.timeOfDay = 'night'
      gameState.timeRemaining = GAME_CONFIG.NIGHT_DURATION
      gameState.currentNight = gameState.day
      this.spawnZombies(roomId)
    } else {
      gameState.timeOfDay = 'day'
      gameState.timeRemaining = GAME_CONFIG.DAY_DURATION
      gameState.day += 1

      if (gameState.day > 10) {
        gameState.gameOver = true
        gameState.victory = true
        this.stopGame(roomId)
        return
      }

      for (const gate of gameState.gates) {
        gate.health = Math.min(gate.maxHealth, gate.health + gate.maxHealth * 0.5)
      }
    }
  }

  private spawnZombies(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const room = roomManager.getRoom(roomId)
    if (!room) return

    const difficultyConfig = roomManager.getDifficultyConfig(room.difficulty)
    const night = gameState.currentNight

    let totalZombies = GAME_CONFIG.ZOMBIE_BASE_COUNT + night * GAME_CONFIG.ZOMBIE_INCREMENT_PER_NIGHT
    totalZombies = Math.floor(totalZombies * difficultyConfig.zombieMultiplier)

    let specialRatio: number
    if (night <= 1) {
      specialRatio = GAME_CONFIG.SPECIAL_ZOMBIE_RATIO_START
    } else if (night <= 5) {
      specialRatio = GAME_CONFIG.SPECIAL_ZOMBIE_RATIO_MID
    } else {
      specialRatio = GAME_CONFIG.SPECIAL_ZOMBIE_RATIO_END
    }

    const specialCount = Math.floor(totalZombies * specialRatio)
    const normalCount = totalZombies - specialCount

    for (let i = 0; i < normalCount; i++) {
      this.spawnZombie(roomId, 'normal')
    }

    const specialTypes: ZombieType[] = ['runner', 'tank', 'bomber', 'spitter', 'summoner']
    for (let i = 0; i < specialCount; i++) {
      const type = specialTypes[Math.floor(Math.random() * specialTypes.length)]
      this.spawnZombie(roomId, type)
    }

    if (night === 5 || night === 10) {
      this.spawnZombie(roomId, 'boss')
    }
  }

  private spawnZombie(roomId: string, type: ZombieType): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const config = ZOMBIE_CONFIG[type]
    const zombie: ZombieState = {
      id: generateId(),
      type,
      position: getRandomSpawnPosition(),
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      damage: config.damage,
      targetId: null,
    }

    gameState.zombies.push(zombie)
  }

  private updateResourcePoints(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const room = roomManager.getRoom(roomId)
    if (!room) return

    const difficultyConfig = roomManager.getDifficultyConfig(room.difficulty)

    for (const point of gameState.resourcePoints) {
      if (point.isDepleted && Date.now() >= point.respawnTime / difficultyConfig.resourceRefreshSpeed) {
        point.isDepleted = false
        point.respawnTime = 0
      }
    }
  }

  private updatePlayers(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    for (const player of gameState.players) {
      if (player.isDead) {
        const respawnTime = gameState.timeOfDay === 'day' ? GAME_CONFIG.RESPAWN_TIME_DAY : GAME_CONFIG.RESPAWN_TIME_NIGHT
        const medics = gameState.players.filter(p => p.classType === 'medic' && !p.isDead)
        
        let actualRespawnTime = respawnTime
        if (medics.length > 0) {
          actualRespawnTime /= 2
        }

        if (Date.now() - player.deathTime >= actualRespawnTime * 1000) {
          player.isDead = false
          player.health = player.maxHealth
          player.position = { x: GAME_CONFIG.MAP_WIDTH / 2, y: GAME_CONFIG.MAP_HEIGHT / 2 }
        }
      }

      for (const skill of player.skills) {
        if (skill.cooldown > 0) {
          skill.cooldown -= 0.1
        }
      }
    }
  }

  private updateZombies(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const centerX = GAME_CONFIG.MAP_WIDTH / 2
    const centerY = GAME_CONFIG.MAP_HEIGHT / 2

    for (const zombie of gameState.zombies) {
      let targetX = centerX
      let targetY = centerY

      const closestPlayer = this.findClosestPlayer(roomId, zombie.position)
      if (closestPlayer && getDistance(zombie.position, closestPlayer.position) < 100) {
        targetX = closestPlayer.position.x
        targetY = closestPlayer.position.y
      } else {
        const closestGate = this.findClosestGate(roomId, zombie.position)
        if (closestGate) {
          switch (closestGate.position) {
            case 'north': targetY = centerY - GAME_CONFIG.BASE_SIZE / 2; break
            case 'south': targetY = centerY + GAME_CONFIG.BASE_SIZE / 2; break
            case 'east': targetX = centerX + GAME_CONFIG.BASE_SIZE / 2; break
            case 'west': targetX = centerX - GAME_CONFIG.BASE_SIZE / 2; break
          }
        }
      }

      const dx = targetX - zombie.position.x
      const dy = targetY - zombie.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0) {
        zombie.position.x += (dx / distance) * zombie.speed
        zombie.position.y += (dy / distance) * zombie.speed
      }

      this.checkZombieCollisions(roomId, zombie)
    }
  }

  private findClosestPlayer(roomId: string, position: { x: number; y: number }): PlayerState | null {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return null

    let closest: PlayerState | null = null
    let closestDist = Infinity

    for (const player of gameState.players) {
      if (!player.isDead) {
        const dist = getDistance(position, player.position)
        if (dist < closestDist) {
          closest = player
          closestDist = dist
        }
      }
    }

    return closest
  }

  private findClosestGate(roomId: string, position: { x: number; y: number }): GateState | null {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return null

    let closest: GateState | null = null
    let closestDist = Infinity
    const centerX = GAME_CONFIG.MAP_WIDTH / 2
    const centerY = GAME_CONFIG.MAP_HEIGHT / 2

    for (const gate of gameState.gates) {
      if (gate.health <= 0) continue

      let gateX = centerX
      let gateY = centerY

      switch (gate.position) {
        case 'north': gateY = centerY - GAME_CONFIG.BASE_SIZE / 2; break
        case 'south': gateY = centerY + GAME_CONFIG.BASE_SIZE / 2; break
        case 'east': gateX = centerX + GAME_CONFIG.BASE_SIZE / 2; break
        case 'west': gateX = centerX - GAME_CONFIG.BASE_SIZE / 2; break
      }

      const dist = getDistance(position, { x: gateX, y: gateY })
      if (dist < closestDist) {
        closest = gate
        closestDist = dist
      }
    }

    return closest
  }

  private checkZombieCollisions(roomId: string, zombie: ZombieState): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const centerX = GAME_CONFIG.MAP_WIDTH / 2
    const centerY = GAME_CONFIG.MAP_HEIGHT / 2

    for (const player of gameState.players) {
      if (!player.isDead && getDistance(zombie.position, player.position) < 20) {
        const damage = zombie.damage * (1 - player.armor)
        player.health -= damage

        const stats = this.gameStats.get(roomId)
        if (stats) {
          const playerStats = stats.playerStats.get(player.id)
          if (playerStats) {
            playerStats.damageTaken += damage
            if (player.health <= 0) {
              playerStats.deaths += 1
              playerStats.currentKillStreak = 0
            }
          }
        }

        if (player.health <= 0) {
          player.isDead = true
          player.deathTime = Date.now()
        }
        return
      }
    }

    for (const gate of gameState.gates) {
      let gateX = centerX
      let gateY = centerY

      switch (gate.position) {
        case 'north': gateY = centerY - GAME_CONFIG.BASE_SIZE / 2; break
        case 'south': gateY = centerY + GAME_CONFIG.BASE_SIZE / 2; break
        case 'east': gateX = centerX + GAME_CONFIG.BASE_SIZE / 2; break
        case 'west': gateX = centerX - GAME_CONFIG.BASE_SIZE / 2; break
      }

      if (getDistance(zombie.position, { x: gateX, y: gateY }) < 25) {
        gate.health -= zombie.damage
        return
      }
    }

    for (const structure of gameState.structures) {
      if (structure.type === 'wall' && getDistance(zombie.position, structure.position) < 20) {
        structure.health -= zombie.damage
        if (structure.health <= 0) {
          gameState.structures = gameState.structures.filter(s => s.id !== structure.id)
        }
        return
      }
    }
  }

  private updateTurrets(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    for (const structure of gameState.structures) {
      if (structure.type !== 'turret') continue
      if (gameState.resources.ammo <= 0) continue

      const config = STRUCTURE_CONFIG.turret
      const levelBonus = config.levelBonus[structure.level as 1 | 2 | 3]
      const range = levelBonus.range

      let closestZombie: ZombieState | null = null
      let closestDist = Infinity

      for (const zombie of gameState.zombies) {
        const dist = getDistance(structure.position, zombie.position)
        if (dist < range && dist < closestDist) {
          closestZombie = zombie
          closestDist = dist
        }
      }

      if (closestZombie) {
        gameState.resources.ammo -= config.ammoConsumption
        const damage = levelBonus.damage || config.damage
        closestZombie.health -= damage

        if (closestZombie.health <= 0) {
          this.killZombie(roomId, closestZombie.id)
        }
      }
    }
  }

  private checkGameOver(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const commandTower = gameState.structures.find(s => s.type === 'command')
    if (!commandTower || commandTower.health <= 0) {
      gameState.gameOver = true
      gameState.victory = false
      this.stopGame(roomId)
    }
  }

  private stopGame(roomId: string): void {
    const loop = this.gameLoops.get(roomId)
    if (loop) {
      clearInterval(loop)
      this.gameLoops.delete(roomId)
    }

    // Stop replay recording
    const replayInterval = this.replayIntervals.get(roomId)
    if (replayInterval) {
      clearInterval(replayInterval)
      this.replayIntervals.delete(roomId)
    }

    // Save replay to Redis
    this.saveReplay(roomId)
  }

  private async saveReplay(roomId: string): Promise<void> {
    const frames = this.replayFrames.get(roomId)
    const startTime = this.replayStartTime.get(roomId)
    const gameState = this.gameStates.get(roomId)

    if (!frames || !startTime || !gameState) return

    const endTime = Date.now()
    const replayData: ReplayData = {
      roomId,
      startTime,
      endTime,
      duration: endTime - startTime,
      victory: gameState.victory,
      frames,
    }

    try {
      await setReplay(roomId, JSON.stringify(replayData))
      console.log(`Replay saved for room ${roomId} with ${frames.length} frames`)
    } catch (error) {
      console.error(`Failed to save replay for room ${roomId}:`, error)
    }

    // Clean up replay data
    this.replayFrames.delete(roomId)
    this.replayStartTime.delete(roomId)
  }

  getGameState(roomId: string): GameState | undefined {
    return this.gameStates.get(roomId)
  }

  getGameStats(roomId: string): GameStats | undefined {
    return this.gameStats.get(roomId)
  }

  private updateThreatGrid(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const now = Date.now()
    const lastUpdate = this.threatGridUpdates.get(roomId) || 0
    if (now - lastUpdate < 1000) return

    this.threatGridUpdates.set(roomId, now)

    const gridSize = 80
    const grid: number[][] = Array(10).fill(null).map(() => Array(10).fill(0))

    for (const zombie of gameState.zombies) {
      const gridX = Math.floor(zombie.position.x / gridSize)
      const gridY = Math.floor(zombie.position.y / gridSize)

      if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
        let threatValue = 0
        switch (zombie.type) {
          case 'normal': threatValue = 1; break
          case 'runner': threatValue = 2; break
          case 'tank': threatValue = 5; break
          case 'bomber': threatValue = 3; break
          case 'spitter': threatValue = 3; break
          case 'summoner': threatValue = 4; break
          case 'boss': threatValue = 10; break
        }
        grid[gridY][gridX] += threatValue
      }
    }

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        grid[y][x] = Math.min(100, Math.max(0, grid[y][x]))
      }
    }

    gameState.threatGrid = { grid, lastUpdate: now }

    // Save heatmap snapshot every 2 seconds
    const lastSnapshot = this.lastHeatmapSnapshot.get(roomId) || 0
    if (now - lastSnapshot >= GameEngine.HEATMAP_SNAPSHOT_INTERVAL) {
      this.lastHeatmapSnapshot.set(roomId, now)

      // Create snapshot (deep copy the grid)
      const snapshot: ThreatGridSnapshot = {
        grid: grid.map(row => [...row]),
        timestamp: now,
      }

      // Ring buffer: add new snapshot, remove oldest if at capacity
      if (gameState.heatmapSnapshots.length >= GameEngine.HEATMAP_MAX_SNAPSHOTS) {
        gameState.heatmapSnapshots.shift()
      }
      gameState.heatmapSnapshots.push(snapshot)
    }
  }

  private updateResourceConsumption(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    const stats = this.gameStats.get(roomId)
    if (!stats) return

    const snapshot = this.lastResourceSnapshot.get(roomId)
    if (!snapshot) return

    const now = Date.now()
    const elapsedMinutes = (now - snapshot.time) / 60000

    if (elapsedMinutes >= 1) {
      const ammoDiff = snapshot.ammo - gameState.resources.ammo
      const medkitDiff = snapshot.medkit - gameState.resources.medkit

      stats.resourceConsumption.ammoPerMinute = Math.max(0, ammoDiff / elapsedMinutes)
      stats.resourceConsumption.medkitPerMinute = Math.max(0, medkitDiff / elapsedMinutes)

      this.lastResourceSnapshot.set(roomId, {
        ammo: gameState.resources.ammo,
        medkit: gameState.resources.medkit,
        time: now,
      })
    }
  }

  private updateDeploymentOrders(roomId: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    gameState.deploymentOrders = gameState.deploymentOrders.filter(order => {
      const player = gameState.players.find(p => p.id === order.playerId)
      if (!player || player.isDead) return false

      const dx = order.targetX - player.position.x
      const dy = order.targetY - player.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      return distance > 10
    })
  }

  deployFormation(roomId: string, positions: FormationPosition[]): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    gameState.currentFormation = positions

    const orders: DeploymentOrder[] = []
    for (const pos of positions) {
      const player = gameState.players.find(p => p.id === pos.playerId)
      if (player && !player.isDead) {
        orders.push({
          playerId: pos.playerId,
          targetX: pos.x,
          targetY: pos.y,
          active: true,
        })
      }
    }
    gameState.deploymentOrders = orders
  }

  saveFormationPreset(roomId: string, name: string, positions: FormationPosition[]): boolean {
    const presets = this.formationPresets.get(roomId)
    if (!presets) return false

    if (presets.length >= 3) return false

    presets.push({
      id: generateId(),
      name,
      positions: [...positions],
    })
    return true
  }

  loadFormationPreset(roomId: string, presetId: string): FormationPosition[] | null {
    const presets = this.formationPresets.get(roomId)
    if (!presets) return null

    const preset = presets.find(p => p.id === presetId)
    return preset ? [...preset.positions] : null
  }

  getFormationPresets(roomId: string): FormationPreset[] {
    return this.formationPresets.get(roomId) || []
  }

  deleteFormationPreset(roomId: string, presetId: string): boolean {
    const presets = this.formationPresets.get(roomId)
    if (!presets) return false

    const initialLength = presets.length
    this.formationPresets.set(roomId, presets.filter(p => p.id !== presetId))
    return presets.length < initialLength
  }

  cancelDeployment(roomId: string, playerId?: string): void {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return

    if (playerId) {
      gameState.deploymentOrders = gameState.deploymentOrders.filter(o => o.playerId !== playerId)
    } else {
      gameState.deploymentOrders = []
    }
  }

  destroyGameState(roomId: string): void {
    this.stopGame(roomId)
    this.gameStates.delete(roomId)
    this.gameStats.delete(roomId)
    this.formationPresets.delete(roomId)
    this.threatGridUpdates.delete(roomId)
    this.lastResourceSnapshot.delete(roomId)
    this.heatmapSnapshotInterval.delete(roomId)
    this.lastHeatmapSnapshot.delete(roomId)
    this.replayFrames.delete(roomId)
    this.replayStartTime.delete(roomId)
  }
}

export const gameEngine = new GameEngine()
