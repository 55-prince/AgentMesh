import axios from "axios";

export const isValidImageBuffer = (buf) => {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 100) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return isJpeg || isPng;
};

export const fetchImageSafe = async (imageUrl, timeoutMs = 3500) => {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
    return null;
  }
  try {
    const res = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: timeoutMs,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (res?.data) {
      const buf = Buffer.from(res.data);
      if (isValidImageBuffer(buf)) {
        const isPng = buf[0] === 0x89 && buf[1] === 0x50;
        const mime = isPng ? "image/png" : "image/jpeg";
        const base64 = `data:${mime};base64,${buf.toString("base64")}`;
        return {
          url: imageUrl,
          buffer: buf,
          base64,
          mime,
        };
      }
    }
  } catch (err) {
    return null;
  }
  return null;
};

export const getFallbackVisualUrl = (topic) => {
  const cleanTopic = encodeURIComponent(
    (topic || "concept").slice(0, 100).replace(/[^a-zA-Z0-9\s]/g, " ")
  );
  return `https://image.pollinations.ai/prompt/high%20resolution%20professional%20photograph%20of%20${cleanTopic}%2C%208k%20cinematic%20lighting%2C%20detailed?width=800&height=600&nologo=true`;
};

export const resolveDocumentImages = async ({
  candidateUrls = [],
  topic = "",
  isImageRequested = false,
  maxImages = 4,
}) => {
  try {
    const usable = [];
    const candidateList = Array.isArray(candidateUrls)
      ? Array.from(new Set(candidateUrls.filter((u) => typeof u === "string" && u.startsWith("http"))))
      : [];

    if (candidateList.length > 0) {
      const downloadPromises = candidateList.slice(0, 6).map((url) => fetchImageSafe(url, 3000));
      const results = await Promise.all(downloadPromises);
      results.forEach((item) => {
        if (item) usable.push(item);
      });
    }

    if ((isImageRequested || candidateList.length > 0) && usable.length === 0 && topic) {
      const fallbackUrl1 = getFallbackVisualUrl(`${topic} feature`);
      const fallbackUrl2 = getFallbackVisualUrl(`${topic} overview`);

      const [img1, img2] = await Promise.all([
        fetchImageSafe(fallbackUrl1, 5000),
        fetchImageSafe(fallbackUrl2, 5000),
      ]);

      if (img1) usable.push(img1);
      if (img2) usable.push(img2);
    }

    return usable.slice(0, maxImages);
  } catch (error) {
    console.error(`[imageResolver] Error resolving images: ${error.message}`);
    return [];
  }
};

export default {
  isValidImageBuffer,
  fetchImageSafe,
  getFallbackVisualUrl,
  resolveDocumentImages,
};
