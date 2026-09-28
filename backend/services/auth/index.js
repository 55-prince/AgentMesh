import dotenv from "dotenv"
import express from "express"
import connectDb from "./config/db.js"
import cookieParser from "cookie-parser"
import router from "./router/auth.routes.js"
dotenv.config()

const app = express()

const port = process.env.PORT || 5001


app.use(express.json())
app.use(cookieParser())

app.use("/" , router)


app.get("/" , (req,res) => {
    return res.json({"message" : "Welcome to auth "})
})

app.listen(port , () => {
    console.log(`Server is running at : ${port}`)
    connectDb()
})
