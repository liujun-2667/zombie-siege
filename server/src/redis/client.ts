import { createClient } from 'redis'

// Mock data for fallback when Redis is not available
const mockReplayData = new Map<string, { data: string; expiresAt: number }>()
const REPLAY_TTL_MS = 60 * 60 * 1000

let redisClient: ReturnType<typeof createClient> | null = null
let isConnected = false

// Clean up expired mock replay data
function cleanExpiredReplayData() {
  const now = Date.now()
  for (const [key, value] of mockReplayData.entries()) {
    if (value.expiresAt <= now) {
      mockReplayData.delete(key)
    }
  }
}

export async function connectRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('Redis connection failed, using in-memory fallback')
            return false
          }
          return Math.min(retries * 100, 1000)
        }
      }
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
      isConnected = false
    })

    redisClient.on('connect', () => {
      console.log('Redis connected successfully')
      isConnected = true
    })

    await redisClient.connect()
    isConnected = true
    console.log('Redis connected:', redisUrl)
  } catch (error) {
    console.log('Failed to connect to Redis, using in-memory fallback:', error)
    isConnected = false
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isConnected = false
  }
}

// Real Redis implementations
export async function setReplay(roomId: string, data: string): Promise<void> {
  const key = `replay:${roomId}`
  
  if (isConnected && redisClient) {
    try {
      // Use SET with EX for TTL (1 hour = 3600 seconds)
      await redisClient.set(key, data, { EX: 3600 })
      console.log(`Replay saved to Redis: ${key}`)
      return
    } catch (error) {
      console.error('Failed to save replay to Redis:', error)
    }
  }
  
  // Fallback to in-memory with TTL
  cleanExpiredReplayData()
  mockReplayData.set(key, {
    data,
    expiresAt: Date.now() + REPLAY_TTL_MS,
  })
  console.log(`Replay saved to memory (fallback): ${key}`)
}

export async function getReplay(roomId: string): Promise<string | null> {
  const key = `replay:${roomId}`
  
  if (isConnected && redisClient) {
    try {
      const data = await redisClient.get(key)
      if (data) {
        console.log(`Replay retrieved from Redis: ${key}`)
        return data
      }
      return null
    } catch (error) {
      console.error('Failed to get replay from Redis:', error)
    }
  }
  
  // Fallback to in-memory
  cleanExpiredReplayData()
  const entry = mockReplayData.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    mockReplayData.delete(key)
    return null
  }
  console.log(`Replay retrieved from memory (fallback): ${key}`)
  return entry.data
}

// Also export the original redis client interface for other uses
export { redisClient as getRedisClient, isConnected as isRedisConnected }
