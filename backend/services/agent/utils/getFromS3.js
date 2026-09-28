import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3 } from "../config/s3.js"
import { GetObjectCommand } from "@aws-sdk/client-s3"


export const getFromS3 = async (fileName, expiresIn = 600) => {
    const bucket = s3

    const data = await getSignedUrl(
        bucket,
        new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName
        }),
        { expiresIn }
    )

    return data
}