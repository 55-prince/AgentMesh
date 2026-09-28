import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import { getMe } from "./controllers/user.controller.js"
import { protect } from "./middleware/protect.middleware.js"
import cookieParser from "cookie-parser"
import { applyProxyWithHeaders } from "./utils/proxyWithHeaders.js"
dotenv.config()

const app = express()

const port = process.env.PORT || 5000
app.use(cookieParser())
app.use(cors({
    origin : process.env.FRONTEND_PATH,
    credentials : true
}))

app.use( "/api/auth" , applyProxyWithHeaders(process.env.AUTH_PATH))
app.use( "/api/chat" ,protect ,  applyProxyWithHeaders(process.env.CHAT_PATH))
app.use( "/api/agent" ,protect ,  applyProxyWithHeaders(process.env.AGENT_PATH))

app.get("/api/getMe" , protect , getMe)

app.get("/" , (req,res) => {
    return res.json({message : "Welcome to gateway"})
})

app.listen(port , () => {
    console.log(`Server is running at : ${port}`)
})
