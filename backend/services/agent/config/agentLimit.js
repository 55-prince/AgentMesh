import redis from "../../../shared/redis.js";

const limits = {
    pdfAgent: 5,
    pdfRagAgent: 5,
    codingAgent: 2,
    imageAgent: 4,
    pptAgent: 2,
    webAgent: 4,
    chatAgent: 20
};

export const checkAgentLimit = async (userId, agentName) => {
    if (!userId) {
        return {
            allowed: true,
            remaining: 999,
            limit: 999
        };
    }

    const agent = agentName || "chatAgent";
    const maxLimit = limits[agent] || limits["chatAgent"];
    const key = `rate:${userId}:${agent}`;

    try {
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, 60);
        }

        const ttl = await redis.ttl(key);
        const remainingTtl = ttl > 0 ? ttl : 60;
        const minutes = Math.floor(remainingTtl / 60);
        const seconds = remainingTtl % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        if (count > maxLimit) {
            const message = `⚠️ **Rate Limit Exceeded**: You have reached the usage limit for **${agent}** (${maxLimit} requests/min). Please try again in **${timeStr}**.`;
            const error = new Error(message);
            error.status = 429;
            error.statusCode = 429;
            error.data = {
                success: false,
                agent,
                limit: maxLimit,
                remainingTime: remainingTtl,
                retryAfter: timeStr,
                message
            };
            throw error;
        }

        return {
            allowed: true,
            remaining: Math.max(0, maxLimit - count),
            limit: maxLimit
        };
    } catch (error) {
        if (error.status === 429 || error.statusCode === 429) {
            throw error;
        }
        console.warn(`[checkAgentLimit] Redis rate limit check error: ${error.message}`);
        return {
            allowed: true,
            remaining: 1,
            limit: maxLimit
        };
    }
};

export default checkAgentLimit;