import type { Result } from "ioredis";
import { redisConnection } from "../jobs";
declare module "ioredis" {
    interface RedisCommander<Context> {
        rateLimiterTokenBucket(
            key: string,
            ...args: number[]
        ): Result<number[], Context>
    }
}
redisConnection.defineCommand("rateLimiterTokenBucket", {
    numberOfKeys: 1,
    lua: `
    local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET' , KEYS[1] , 'tokens' , 'last_refil')
local tokens = tonumber(bucket[1])
local last_refil = tonumber(bucket[2])

if tokens == nil then
    tokens = capacity
    last_refil = now
else
    local elapsed_time = now - last_refil
    if elapsed_time > 0 then
        tokens = math.min(capacity , tokens + (elapsed_time*refill_rate))
        last_refil = now
    end
end

if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', KEYS[1] ,'tokens' , tokens , 'last_refil' , last_refil )
    redis.call('PEXPIRE' , KEYS[1] , math.ceil((capacity / refill_rate)*1000))
    return {1 }
else
    return {0 }
end

`
})
