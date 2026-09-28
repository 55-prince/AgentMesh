import { createSlice } from "@reduxjs/toolkit";

export const conversationSlice = createSlice({
  name: "conversation",
  initialState: {
    conversations: [],
    selectedCoversation: null,
    generatingMap: {},
    optimisticMessages: {},
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload || [];
    },
    addConversation: (state, action) => {
      if (!action.payload) return;
      const convId = action.payload._id || action.payload.id;
      const existsIndex = state.conversations.findIndex((c) => (c._id || c.id) === convId);
      if (existsIndex === -1) {
        state.conversations.unshift(action.payload);
      } else {
        state.conversations[existsIndex] = { ...state.conversations[existsIndex], ...action.payload };
      }
    },
    updateConversationTitle: (state, action) => {
      const { id, title } = action.payload;
      const conv = state.conversations.find((c) => (c._id || c.id) === id);
      if (conv) {
        conv.title = title;
      }
      if (state.selectedCoversation && (state.selectedCoversation._id === id || state.selectedCoversation.id === id)) {
        state.selectedCoversation = { ...state.selectedCoversation, title };
      }
    },
    setSelectedCoversation: (state, action) => {
      state.selectedCoversation = action.payload;
    },
    setGeneratingForConv: (state, action) => {
      const { convId, isGenerating } = action.payload;
      if (convId) {
        if (isGenerating) {
          state.generatingMap[convId] = true;
        } else {
          delete state.generatingMap[convId];
        }
      }
    },
    setOptimisticMessages: (state, action) => {
      const { convId, messages } = action.payload;
      if (convId) {
        state.optimisticMessages[convId] = messages;
      }
    },
    clearOptimisticMessages: (state, action) => {
      const { convId } = action.payload;
      if (convId) {
        delete state.optimisticMessages[convId];
      }
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversationTitle,
  setSelectedCoversation,
  setGeneratingForConv,
  setOptimisticMessages,
  clearOptimisticMessages,
} = conversationSlice.actions;

export default conversationSlice.reducer;