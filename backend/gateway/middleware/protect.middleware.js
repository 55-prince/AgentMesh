import redis from "../../shared/redis.js";

export const protect = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;
        if (!sessionId) {
            return res.status(401).json({ message: "Unauthorized user: No active session." });
        }
        const session = await redis.get(`session-${sessionId}`);
        if (!session) {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }
        const data = JSON.parse(session);
        req.user = data;
        next();
    } catch (error) {
        console.error(`Error in protect middleware: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal server error in authorization." });
    }
};