 ////////USING PROMISES/////
 const asyncHoldler=(requestHandler)=>(req,res,next)=>{
    Promise.resolve(requestHandler(req,res,next))
    .catch((err)=>next(err));
 }

 export {asyncHoldler};



/////////USING TRY CATCH/////////
// const asyncHoldler=(fun)=>async(req,res,next)=>{
//     try{
//         await fun(req,res,next);
//     }
//     catch(error)
//     {
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
//export default asyncHoldler;