const mockRedisData = new Map<string, Record<string, string>>()
const mockRedisSets = new Map<string, Set<string>>()

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

export async function connectRedis(): Promise<void> {
  await redisClient.connect()
  console.log('Mock Redis connected successfully')
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.disconnect()
}
