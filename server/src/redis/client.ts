const mockRedisData = new Map<string, Record<string, string>>()
const mockRedisSets = new Map<string, Set<string>>()
const mockReplayData = new Map<string, { data: string; expiresAt: number }>()

// TTL for replay data: 1 hour in milliseconds
const REPLAY_TTL_MS = 60 * 60 * 1000

export const redisClient = {
  on: (event: string, callback: (err: any) => void) => {},
  
  connect: async () => {
    console.log('Mock Redis connected')
  },
  
  disconnect: async () => {},
  
  hSet: async (key: string, values: Record<string, string>) => {
    if (!mockRedisData.has(key)) {
      mockRedisData.set(key, {})
    }
    const data = mockRedisData.get(key)!
    Object.assign(data, values)
    return 1
  },
  
  hGetAll: async (key: string) => {
    return mockRedisData.get(key) || {}
  },
  
  sAdd: async (key: string, value: string) => {
    if (!mockRedisSets.has(key)) {
      mockRedisSets.set(key, new Set())
    }
    const set = mockRedisSets.get(key)!
    set.add(value)
    return 1
  },
  
  sRem: async (key: string, value: string) => {
    const set = mockRedisSets.get(key)
    if (set) {
      set.delete(value)
    }
    return 1
  },
  
  sMembers: async (key: string) => {
    const set = mockRedisSets.get(key)
    return set ? Array.from(set) : []
  },
  
  del: async (key: string) => {
    mockRedisData.delete(key)
    mockRedisSets.delete(key)
    mockReplayData.delete(key)
    return 1
  },
  
  keys: async (pattern: string) => {
    const keys: string[] = []
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of mockRedisSets.keys()) {
      if (regex.test(key)) {
        keys.push(key)
      }
    }
    return keys
  },
}

// Clean up expired replay data
function cleanExpiredReplayData() {
  const now = Date.now()
  for (const [key, value] of mockReplayData.entries()) {
    if (value.expiresAt <= now) {
      mockReplayData.delete(key)
    }
  }
}

export async function setReplay(roomId: string, data: string): Promise<void> {
  cleanExpiredReplayData()
  mockReplayData.set(`replay:${roomId}`, {
    data,
    expiresAt: Date.now() + REPLAY_TTL_MS,
  })
}

export async function getReplay(roomId: string): Promise<string | null> {
  cleanExpiredReplayData()
  const entry = mockReplayData.get(`replay:${roomId}`)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    mockReplayData.delete(`replay:${roomId}`)
    return null
  }
  return entry.data
}

export async function connectRedis(): Promise<void> {
  await redisClient.connect()
  console.log('Mock Redis connected successfully')
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.disconnect()
}
