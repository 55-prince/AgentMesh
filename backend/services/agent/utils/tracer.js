export const createTraceContext = (initialState = {}) => {
  const startTime = Date.now();
  const thoughtSteps = Array.isArray(initialState.thoughtSteps) ? [...initialState.thoughtSteps] : [];
  const executionTrace = Array.isArray(initialState.executionTrace) ? [...initialState.executionTrace] : [];

  return {
    startTime,
    thoughtSteps,
    executionTrace,
  };
};

export const appendThought = (state, title, detail = "", type = "info", durationMs = 0) => {
  const existing = Array.isArray(state.thoughtSteps) ? [...state.thoughtSteps] : [];
  existing.push({
    id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title,
    detail,
    type,
    timestamp: new Date().toLocaleTimeString(),
    durationMs,
  });
  return existing;
};

export const appendTraceNode = (state, {
  nodeName,
  agent,
  model = "None",
  durationMs = 0,
  inTokens = 0,
  outTokens = 0,
  a2aHops = [],
  status = "success",
}) => {
  const existing = Array.isArray(state.executionTrace) ? [...state.executionTrace] : [];
  existing.push({
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nodeName,
    agent,
    model,
    durationMs,
    inTokens,
    outTokens,
    a2aHops,
    status,
    timestamp: new Date().toLocaleTimeString(),
  });
  return existing;
};

export const finalizeTelemetry = (state, startTime) => {
  const totalDurationMs = Date.now() - startTime;
  const traces = Array.isArray(state.executionTrace) ? state.executionTrace : [];
  const totalInTokens = traces.reduce((acc, t) => acc + (typeof t.inTokens === "number" ? t.inTokens : 0), 0);
  const totalOutTokens = traces.reduce((acc, t) => acc + (typeof t.outTokens === "number" ? t.outTokens : 0), 0);

  return {
    totalDurationMs,
    totalDurationSec: (totalDurationMs / 1000).toFixed(2),
    nodeCount: traces.length,
    totalTokens: totalInTokens + totalOutTokens,
    totalInTokens,
    totalOutTokens,
    timestamp: new Date().toISOString(),
  };
};

export default {
  createTraceContext,
  appendThought,
  appendTraceNode,
  finalizeTelemetry,
};
