// require('dotenv').config()
import dotenv from "dotenv"
import connectDB from './src/db/index.js'
import app from './src/app.js'
dotenv.config({
    path:'./env'
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>
    {
        console.log(`Server is running at the port ${process.env.PORT || 8000}`);
    })
})
.catch((error)=>{//can use arrow function
    console.log('An error ocuured',error);
})
