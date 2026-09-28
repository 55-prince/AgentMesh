import { createSlice } from "@reduxjs/toolkit";


export const userSlice = createSlice({
    name : "user",
    initialState : {
        userData : null
    },
    reducers : {
        setUserData : (state , action ) => {
            state.userData = action.payload
        },
        removeUser : (state ,action) =>{
            state.userData = null 
        }
    }
})

export const {setUserData , removeUser}  = userSlice.actions
export default userSlice.reducer