import { api } from "../../utils/axios.js";

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/api/getMe");
    return response.data;
  } catch (error) {
    console.error("Error fetching current user:", error?.response?.data || error.message);
    return null;
  }
};