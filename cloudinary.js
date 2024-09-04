//This component of code can be used at any other project, keep it safe and try to understand it as much possible
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"//file system , inbuilt in nodejs


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull

        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)//once the file gets uploaded, remove its link from the server, its like deleting that file from the server
     console.log("response : ",response);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export {uploadOnCloudinary}