import "dotenv/config.js"
import express from "express"
import connectDb from "./config/db.js"
import agentRouter from "./routes/agent.routes.js"

const app = express()

const port = process.env.PORT || 5003

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/", agentRouter);
app.get("/" , (req,res) => {
    return res.json({"message" : "Welcome to chat "})
})

app.listen(port , () => {
    console.log(`Server is running at : ${port}`)
    connectDb()
})
