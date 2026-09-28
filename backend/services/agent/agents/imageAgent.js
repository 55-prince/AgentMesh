import "dotenv/config";
import axios from "axios";
import { getModel } from "../config/llmModels.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { checkAgentLimit } from "../config/agentLimit.js";

export const imageAgent = async (state) => {
  try {
    const llm = getModel("image");
    await checkAgentLimit(state.userId, "imageAgent");

    const imagePrompt = `You are an elite AI image prompt engineer.
Convert the user request into a highly detailed image generation prompt with cinematic lighting, professional composition, and 8K photorealistic quality.

Return only the refined image prompt string.

User Request:
${state.prompt}`;

    const res = await llm.invoke(imagePrompt);
    const prompt = (res?.content || "").trim();
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

    let downloadUrl = imageUrl;

    const hasS3Config =
      process.env.AWS_BUCKET_NAME &&
      process.env.AWS_ACCESS_KEY;

    if (hasS3Config) {
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 7000,
        });

        const buffer = Buffer.from(imageResponse.data);
        const fileName = `image-${Date.now()}.png`;

        await uploadToS3(fileName, buffer, "image/png");
        downloadUrl = await getFromS3(fileName, 24 * 60 * 60);
      } catch (s3Error) {
        downloadUrl = imageUrl;
      }
    }

    return {
      ...state,
      images: [downloadUrl],
      aiResponse: `![Generated Image](${downloadUrl})\n\n📥 [Download Image](${downloadUrl})`,
    };
  } catch (error) {
    console.error(`Error in imageAgent: ${error.message}`);
    return {
      ...state,
      images: [],
      aiResponse: `⚠️ Failed to generate image: ${error?.message || "Unknown error"}`,
    };
  }
};

export default imageAgent;
