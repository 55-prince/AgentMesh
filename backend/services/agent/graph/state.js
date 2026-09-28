import { Annotation } from "@langchain/langgraph";

export const agentState = Annotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation(),
    agent: Annotation(),
    conversationId: Annotation(),
    searchResults: Annotation(),
    images: Annotation(),
    artifacts: Annotation(),
    pdfAttachment: Annotation(),
    file: Annotation(),
    userId: Annotation(),
    isDeepResearch: Annotation(),
    thoughtSteps: Annotation({
        reducer: (curr, next) => next ?? curr ?? [],
        default: () => [],
    }),
    executionTrace: Annotation({
        reducer: (curr, next) => next ?? curr ?? [],
        default: () => [],
    }),
    telemetry: Annotation({
        reducer: (curr, next) => next ?? curr ?? {},
        default: () => ({}),
    }),
});