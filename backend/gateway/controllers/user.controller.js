
export const getMe = async (req, res) => {
    try {
        return res.status(200).json(req.user)
    } catch (error) {
        console.log(`Error in getMe controller : ${error}`)
        return res.status(500).json({message : `Internal Server Error : ${error}`})
    }
}