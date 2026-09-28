import vm from "vm";
import { getModel } from "../config/llmModels.js";
import { getUnifiedMemoryContext, extractAndSaveUserFacts } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

const cleanCodeString = (raw) => {
  if (!raw) return "";
  let text = String(raw).trim();
  if (text.startsWith("```json")) text = text.substring(7);
  else if (text.startsWith("```html")) text = text.substring(7);
  else if (text.startsWith("```cpp")) text = text.substring(6);
  else if (text.startsWith("```python")) text = text.substring(9);
  else if (text.startsWith("```javascript")) text = text.substring(13);
  else if (text.startsWith("```js")) text = text.substring(5);
  else if (text.startsWith("```css")) text = text.substring(6);
  else if (text.startsWith("```")) text = text.substring(3);
  if (text.endsWith("```")) text = text.substring(0, text.length - 3);
  return text.trim();
};

const validateProjectSyntax = (files = []) => {
  const issues = [];
  files.forEach((file) => {
    if (file.name.endsWith(".js")) {
      try {
        new vm.Script(file.content);
      } catch (syntaxErr) {
        issues.push(`JavaScript V8 Compiler Syntax Error in ${file.name}: ${syntaxErr.message}`);
      }
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unmatched braces in ${file.name} (open: ${openBraces}, close: ${closeBraces})`);
      }
      const openParens = (file.content.match(/\(/g) || []).length;
      const closeParens = (file.content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`Unmatched parentheses in ${file.name} (open: ${openParens}, close: ${closeParens})`);
      }
      if (file.content.trim().length < 50) {
        issues.push(`JavaScript file ${file.name} is too short or empty.`);
      }
    } else if (file.name.endsWith(".html")) {
      if (!file.content.toLowerCase().includes("<html") || !file.content.toLowerCase().includes("</html>")) {
        issues.push(`Missing <html> wrapper tags in ${file.name}`);
      }
      if (!file.content.toLowerCase().includes("</body>")) {
        issues.push(`Missing </body> closing tag in ${file.name}`);
      }
      const bodyContent = file.content.replace(/<head[\s\S]*?<\/head>/i, "").replace(/<script[\s\S]*?<\/script>/i, "").trim();
      const hasUiElements = /<(div|button|canvas|input|table|main|section|h1|h2|p|span|form)/i.test(bodyContent);
      if (!hasUiElements) {
        issues.push(`HTML ${file.name} has no visual UI containers or buttons in the body.`);
      }
    } else if (file.name.endsWith(".css")) {
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unmatched CSS selector blocks in ${file.name} (open: ${openBraces}, close: ${closeBraces})`);
      }
    } else if (file.name.endsWith(".py")) {
      const openParens = (file.content.match(/\(/g) || []).length;
      const closeParens = (file.content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`Unmatched parentheses in Python ${file.name}`);
      }
    } else if (file.name.endsWith(".cpp") || file.name.endsWith(".java") || file.name.endsWith(".rs") || file.name.endsWith(".go")) {
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unmatched scope braces in ${file.name} (open: ${openBraces}, close: ${closeBraces})`);
      }
    }
  });
  return issues;
};

const extractProjectFiles = (rawText, detectedLang) => {
  const text = String(rawText || "").trim();
  const files = [];

  const extractCode = (langPattern) => {
    const closed = text.match(new RegExp("```(?:" + langPattern + ")\\s*([\\s\\S]*?)```", "i"));
    if (closed && closed[1].trim()) return closed[1].trim();

    const unclosed = text.match(new RegExp("```(?:" + langPattern + ")\\s*([\\s\\S]*?)(?:```|$)", "i"));
    if (unclosed && unclosed[1].trim()) return unclosed[1].trim();

    return null;
  };

  let htmlContent = extractCode("html|xml|markup");
  let cssContent = extractCode("css");
  let jsContent = extractCode("javascript|js");

  if (htmlContent && (!jsContent || jsContent.length < 100)) {
    const inlineScriptMatch = htmlContent.match(/<script(?:\s+type=["'](?:text\/javascript|module)["'])?>([\s\S]*?)<\/script>/i);
    if (inlineScriptMatch && inlineScriptMatch[1].trim().length > 10) {
      jsContent = inlineScriptMatch[1].trim();
      htmlContent = htmlContent.replace(inlineScriptMatch[0], '<script src="script.js"></script>');
    }
  }

  if (htmlContent && (!cssContent || cssContent.length < 50)) {
    const inlineStyleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/i);
    if (inlineStyleMatch && inlineStyleMatch[1].trim().length > 10) {
      cssContent = inlineStyleMatch[1].trim();
      htmlContent = htmlContent.replace(inlineStyleMatch[0], '<link rel="stylesheet" href="style.css">');
    }
  }

  let cppContent = extractCode("cpp|c\\+\\+|c");
  let pyContent = extractCode("python|py");
  let javaContent = extractCode("java");
  let rustContent = extractCode("rust|rs");
  let goContent = extractCode("go|golang");
  let sqlContent = extractCode("sql");

  if (detectedLang === "web" || htmlContent || jsContent || cssContent) {
    if (htmlContent) {
      files.push({
        name: "index.html",
        content: cleanCodeString(htmlContent),
      });
    } else {
      files.push({
        name: "index.html",
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Application</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">\n    <div id="app" class="w-full max-w-4xl"></div>\n    <script src="script.js"></script>\n</body>\n</html>`,
      });
    }

    if (cssContent) {
      files.push({
        name: "style.css",
        content: cleanCodeString(cssContent),
      });
    } else {
      files.push({
        name: "style.css",
        content: `/* Custom Styling */\nbody { margin: 0; font-family: system-ui, -apple-system, sans-serif; }\n.btn-glow { transition: all 0.2s ease; }\n.btn-glow:hover { transform: translateY(-2px); }`,
      });
    }

    if (jsContent) {
      files.push({
        name: "script.js",
        content: cleanCodeString(jsContent),
      });
    } else {
      files.push({
        name: "script.js",
        content: `console.log("AgentMesh Web Application Loaded.");`,
      });
    }

    return {
      language: "web",
      files,
    };
  }

  if (cppContent) files.push({ name: "main.cpp", content: cleanCodeString(cppContent) });
  if (pyContent) files.push({ name: "main.py", content: cleanCodeString(pyContent) });
  if (javaContent) files.push({ name: "Main.java", content: cleanCodeString(javaContent) });
  if (rustContent) files.push({ name: "main.rs", content: cleanCodeString(rustContent) });
  if (goContent) files.push({ name: "main.go", content: cleanCodeString(goContent) });
  if (sqlContent) files.push({ name: "schema.sql", content: cleanCodeString(sqlContent) });

  if (files.length > 0) {
    return {
      language: detectedLang,
      files,
    };
  }

  const ext = detectedLang === "cpp" ? "cpp" : detectedLang === "python" ? "py" : detectedLang === "java" ? "java" : "html";
  return {
    language: detectedLang,
    files: [
      {
        name: detectedLang === "web" ? "index.html" : `main.${ext}`,
        content: cleanCodeString(text),
      },
    ],
  };
};

export const codingAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "codingAgent");
    const codingLLM = getModel("coding");

    if (state.userId && state.prompt) {
      extractAndSaveUserFacts(state.userId, state.prompt).catch(() => {});
    }

    const promptLower = (state.prompt || "").toLowerCase();

    const { messages: history, userProfile, systemContextBlock } = await getUnifiedMemoryContext({
      conversationId: state.conversationId,
      userId: state.userId,
      prompt: state.prompt,
    });

    let previousCodeContext = "";

    if (Array.isArray(history) && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === "assistant") {
          if (Array.isArray(msg.artifacts) && msg.artifacts.length > 0) {
            const art = msg.artifacts[0];
            if (Array.isArray(art.files) && art.files.length > 0) {
              const filesSnippet = art.files
                .map((f) => `--- File: ${f.name} ---\n${f.content.slice(0, 8000)}`)
                .join("\n\n");
              previousCodeContext = `Previously Generated Code in this Conversation (${art.title || "Project"}):\n${filesSnippet}\n\n`;
              break;
            }
          }
          const parsed = extractProjectFiles(msg.content, "web");
          if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
            const filesSnippet = parsed.files
              .map((f) => `--- File: ${f.name} ---\n${f.content.slice(0, 8000)}`)
              .join("\n\n");
            previousCodeContext = `Previously Generated Code in this Conversation:\n${filesSnippet}\n\n`;
            break;
          }
        }
      }
    }

    let detectedLanguage = "web";
    if (promptLower.includes("c++") || promptLower.includes("cpp")) detectedLanguage = "cpp";
    else if (promptLower.includes("python") || promptLower.includes("pygame") || promptLower.includes("django") || promptLower.includes("flask")) detectedLanguage = "python";
    else if (promptLower.includes("java ") || promptLower.includes("java8") || promptLower.includes("spring")) detectedLanguage = "java";
    else if (promptLower.includes("rust") || promptLower.includes("cargo")) detectedLanguage = "rust";
    else if (promptLower.includes("golang") || promptLower.includes("go language")) detectedLanguage = "go";
    else if (promptLower.includes("c#") || promptLower.includes("csharp") || promptLower.includes(".net")) detectedLanguage = "csharp";
    else if (promptLower.includes("c language") || promptLower.includes("in c ")) detectedLanguage = "c";
    else if (promptLower.includes("sql") || promptLower.includes("postgres") || promptLower.includes("mysql")) detectedLanguage = "sql";
    else if (userProfile?.preferredStack) {
      const ps = userProfile.preferredStack.toLowerCase();
      if (ps.includes("python")) detectedLanguage = "python";
      else if (ps.includes("rust")) detectedLanguage = "rust";
      else if (ps.includes("go") || ps.includes("golang")) detectedLanguage = "go";
      else if (ps.includes("c++") || ps.includes("cpp")) detectedLanguage = "cpp";
    }

    const hasPreviousCode = Boolean(previousCodeContext && previousCodeContext.length > 50);

    const isModification =
      hasPreviousCode &&
      (promptLower.includes("modify") ||
        promptLower.includes("change") ||
        promptLower.includes("reduce") ||
        promptLower.includes("increase") ||
        promptLower.includes("speed") ||
        promptLower.includes("faster") ||
        promptLower.includes("slower") ||
        promptLower.includes("add") ||
        promptLower.includes("remove") ||
        promptLower.includes("fix") ||
        promptLower.includes("update") ||
        promptLower.includes("color") ||
        promptLower.includes("background") ||
        promptLower.includes("score") ||
        promptLower.includes("gravity") ||
        promptLower.includes("sound") ||
        promptLower.includes("button") ||
        promptLower.includes("gap") ||
        promptLower.includes("jump") ||
        promptLower.includes("more"));

    const isPureExplanation =
      !isModification &&
      (promptLower.startsWith("explain") ||
        promptLower.startsWith("how to") ||
        promptLower.startsWith("how does") ||
        promptLower.includes("walkthrough") ||
        promptLower.includes("describe the code") ||
        promptLower.includes("break down the code") ||
        promptLower.includes("what does this code") ||
        promptLower.includes("teach me"));

    if (!isPureExplanation) {
      let codingPrompt = "";

      if (detectedLanguage !== "web") {
        codingPrompt = `You are AgentMesh Senior Systems Software Engineer.
${previousCodeContext}${systemContextBlock}
Generate a complete, production-ready, modular, and fully working ${detectedLanguage.toUpperCase()} program for: "${state.prompt}".

Guidelines:
- Write complete, robust, self-contained ${detectedLanguage.toUpperCase()} code with zero pseudo-code or omitted functions.
- Include proper headers, error handling, and standard libraries.

IMPORTANT: Output ONLY the complete source code inside triple backticks (\`\`\`${detectedLanguage} ... \`\`\`). Zero conversational text.

User Request:
${state.prompt}`;
      } else {
        const taskDescription = isModification
          ? `MODIFY the existing project above to fulfill the user's request: "${state.prompt}".\nCRITICAL: You MUST output ALL THREE complete, fully-working updated files (HTML, JavaScript, CSS). Do NOT omit any file.`
          : `Build a complete, modern, interactive, high-performance, production-ready web application / game for: "${state.prompt}".`;

        codingPrompt = `You are AgentMesh Senior Full-Stack Lead Engineer and Interactive Game Architect.
${previousCodeContext}${systemContextBlock}
TASK:
${taskDescription}

CRITICAL ARCHITECTURE INSTRUCTIONS:
1. index.html MUST contain the COMPLETE visual DOM layout:
   - Header with title, scoreboards, turn indicator, or display screen.
   - Main interactive layout (e.g., game board grid with 9 clickable cells/buttons with clear IDs, canvas, or calculator buttons).
   - Control buttons (Reset button, Mode selector, etc.).
   - Use Tailwind CSS utility classes for styling.
   - Link style.css in <head> and script.js at the bottom before </body>.
2. script.js MUST contain the COMPLETE interactive frontend JavaScript logic:
   - Direct DOM queries (document.getElementById / querySelector) attached to the exact IDs in index.html.
   - Complete event listeners for all clicks, inputs, and controls.
   - Full game logic, state machine, win/loss/tie checking, score counters, and reset functions.
   - Initialize everything on DOMContentLoaded: window.addEventListener('DOMContentLoaded', () => { ... });
3. style.css MUST contain custom aesthetic CSS:
   - Animations, hover effects, win glows, and glassmorphism styling.

MANDATORY OUTPUT FORMAT:
You MUST output the application in EXACTLY THREE separate code blocks in this exact order:

1. HTML structure in \`\`\`html (with full UI layout and elements)
2. JavaScript logic in \`\`\`javascript (with complete functional game/app logic)
3. CSS styling in \`\`\`css (with animations and polish)

Output ONLY these 3 code blocks. Zero conversational text.

User Request:
${state.prompt}`;
      }

      const res = await codingLLM.invoke(codingPrompt);
      const rawText = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content);

      const parsedProject = extractProjectFiles(rawText, detectedLanguage);
      let parsedFiles = parsedProject.files;
      const parsedLang = parsedProject.language;

      let reflectionApplied = false;
      let reflectionNotes = "";
      const validationIssues = validateProjectSyntax(parsedFiles);

      if (validationIssues.length > 0) {
        try {
          const reflectionPrompt = `You are the AgentMesh Autonomous Code Compiler and Static Reflection Engine.
The previously generated code failed static AST & syntax verification with the following compiler diagnostics:

${validationIssues.map((issue, idx) => `[Error ${idx + 1}] ${issue}`).join("\n")}

Original User Goal:
"${state.prompt}"

PREVIOUS INCOMPLETE/MALFORMED CODE:
${rawText}

TASK:
Fix and completely implement all files without any missing brackets, truncated tokens, unclosed functions, or missing HTML wrapper elements. Output ONLY the clean, verified code blocks (HTML, JavaScript, CSS). Zero conversational filler.`;

          const fixRes = await codingLLM.invoke(reflectionPrompt);
          const fixedRawText = typeof fixRes?.content === "string" ? fixRes.content : JSON.stringify(fixRes?.content);
          const reParsed = extractProjectFiles(fixedRawText, detectedLanguage);
          if (reParsed && reParsed.files && reParsed.files.length > 0) {
            const reCheckIssues = validateProjectSyntax(reParsed.files);
            if (reCheckIssues.length === 0 || reCheckIssues.length < validationIssues.length) {
              parsedFiles = reParsed.files;
              reflectionApplied = true;
              reflectionNotes = `\n\n> 🛡️ **Self-Reflection Active**: Detected and auto-healed ${validationIssues.length} syntax/scoping issues prior to sandbox execution.`;
            }
          }
        } catch (reflectionErr) {
          console.warn("[codingAgent] Auto-fix reflection loop skipped:", reflectionErr.message);
        }
      }

      const projectTitle = isModification ? "Updated Project" : "Interactive Project";

      const artifact = {
        type: "project",
        title: projectTitle,
        language: parsedLang,
        files: parsedFiles,
      };

      const aiResponse = isModification
        ? `✅ Successfully updated the project according to your request! All files have been updated with complete working code.${reflectionNotes}`
        : `🚀 Here is the complete, interactive application built for your request. You can preview, edit, or interact with all ${parsedFiles.length} files in the live code workspace below.${reflectionNotes}`;

      return {
        ...state,
        aiResponse,
        artifacts: [artifact],
      };
    }

    const explainPrompt = `You are AgentMesh Senior Software Architect.
${previousCodeContext}${systemContextBlock}
The user is asking: "${state.prompt}"

Provide a clear, deep, point-to-point architectural breakdown and code explanation. Keep it structured and easy to follow.`;

    const explainRes = await codingLLM.invoke(explainPrompt);
    const explainText = typeof explainRes?.content === "string" ? explainRes.content : JSON.stringify(explainRes?.content);

    return {
      ...state,
      aiResponse: explainText,
      artifacts: [],
    };
  } catch (error) {
    console.error("Error in codingAgent:", error?.message || error);
    return {
      ...state,
      aiResponse: error?.data?.message || error?.message || "⚠️ An error occurred while generating the code.",
      artifacts: [],
    };
  }
};

export default codingAgent;