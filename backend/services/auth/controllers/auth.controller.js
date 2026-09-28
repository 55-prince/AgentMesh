
import { getAuth } from "firebase-admin/auth"
import { app } from "../config/firebase.js"
import User, {} from "../model/user.model.js"
import redis from "../../../shared/redis.js"

export const login = async (req , res ) => {
    try {
        const {token} = req.body 

        const decoded = await getAuth(app).verifyIdToken(token)

        let user = await User.findOne({
            firebaseUid : decoded.uid
        })

        if(!user){
            user = await User.create({
                firebaseUid : decoded.uid,
                name : decoded.name ,
                email : decoded.email,
                avatar : decoded.picture
            })
        }

        const sessionId = crypto.randomUUID()

        res.cookie("session" , sessionId , {
            httpOnly : true ,
            secure : false,
            sameSite : "strict",
            maxAge : 7*24*60*60*1000
        })
        // console.log(user.firebaseUid)

        await redis.set(`session-${sessionId}` , JSON.stringify({
            userId : user._id,
            name : user.name,
            email : user.email,
            avatar : user.avatar
        }) , "EX" , 7*24*60*60)


        return res.status(200).json({
            user,    
        })

    } catch (error) {
        console.log(`Problem in login controller ${error}`)
        return res.status(500).json(error)
    }

}

export const logout = async (req , res ) => {
    try {
        const sessionId = req.cookies.session
    
        await redis.del( `session-${sessionId}` )
    
        res.clearCookie("session")
    
        return res.status(200).json({
            message : "User Logout Successfully"
        })
    } catch (error) {
        console.log( `Error in logout controller ${error}`)
        return res.status(500).json(error)
    }
}