import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-1";

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});