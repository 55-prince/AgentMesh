import dotenv from "dotenv";
dotenv.config();
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";

export const vectorStore = async (docs = [], collectionName = "default") => {
  const documents = Array.isArray(docs) ? docs : [];

  const hasQdrant =
    process.env.QDRANT_URL &&
    process.env.QDRANT_URL.trim().length > 0 &&
    process.env.QDRANT_API_KEY &&
    process.env.QDRANT_API_KEY.trim().length > 0;

  if (hasQdrant) {
    try {
      return await QdrantVectorStore.fromDocuments(documents, embeddings, {
        url: process.env.QDRANT_URL,
        collectionName: collectionName,
        apiKey: process.env.QDRANT_API_KEY,
      });
    } catch (err) {
      console.warn(`[vectorDb] Qdrant initialization failed, using in-memory store.`);
    }
  }

  return {
    documents,
    similaritySearch: async (query = "", k = 5) => {
      if (!query || documents.length === 0) {
        return documents.slice(0, k);
      }

      const queryTerms = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1);

      const scored = documents.map((doc) => {
        const text = typeof doc === "string" ? doc : doc.pageContent || "";
        const lowerText = text.toLowerCase();
        let score = 0;

        queryTerms.forEach((term) => {
          if (lowerText.includes(term)) {
            const occurrences = lowerText.split(term).length - 1;
            score += occurrences * (term.length > 3 ? 2 : 1);
          }
        });

        return {
          doc: typeof doc === "string" ? { pageContent: doc } : doc,
          score,
        };
      });

      scored.sort((a, b) => b.score - a.score);

      const matched = scored.filter((s) => s.score > 0).slice(0, k).map((s) => s.doc);
      return matched.length > 0 ? matched : documents.slice(0, k);
    },
  };
};

export default vectorStore;