import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    role: {
      type: String,
      enum: ["assistant", "user"],
    },
    content: String,
    images: {
      type: Array,
      default: [],
    },
    artifacts: {
      type: Array,
      default: [],
    },
    thoughtSteps: {
      type: Array,
      default: [],
    },
    executionTrace: {
      type: Array,
      default: [],
    },
    telemetry: {
      type: Object,
      default: {},
    },
    isDeepResearch: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
