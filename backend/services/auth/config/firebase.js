import admin, { cert, initializeApp } from "firebase-admin" 
import serviceAccount from "../serviceAccountKey.json" with {type : "json"} 

// const a = cert

export const app = initializeApp({
  credential: cert(serviceAccount)
})

 