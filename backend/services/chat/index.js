import dotenv from "dotenv"
import express from "express"
import connectDb from "./config/db.js"

import chatRouter from "./routes/chat.routes.js"
dotenv.config()

const app = express()

const port = process.env.PORT || 5002


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/", chatRouter);




app.get("/" , (req,res) => {
    return res.json({"message" : "Welcome to chat "})
})

app.listen(port , () => {
    console.log(`Server is running at : ${port}`)
    connectDb()
})
