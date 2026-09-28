import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import { getMessages } from "../features/getMessages.js";
import { sendMessage } from "../features/sendMessage.js";
import { createConversation } from "../features/createConversation.js";
import { updateConversation } from "../features/updateConversation.js";
import { deleteConversation as apiDeleteConversation } from "../features/deleteConversation.js";
import ThoughtInspector from "./thoughtInspector.jsx";
import {
  setConversations,
  addConversation,
  updateConversationTitle,
  setSelectedCoversation,
  setGeneratingForConv,
  setOptimisticMessages,
  clearOptimisticMessages,
} from "../redux/conversationSlice.js";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Code2,
  Copy,
  Check,
  PanelLeft,
  PanelRight,
  ChevronDown,
  Terminal,
  Cpu,
  Globe,
  FileText,
  Presentation,
  Image as ImageIcon,
  Trash2,
  Zap,
  Play,
  Layers,
  Download,
  Eye,
  Maximize2,
  X,
  BookOpen,
  Paperclip,
} from "lucide-react";

const AGENT_OPTIONS = [
  { id: "auto", name: "Auto Router", icon: Sparkles, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400", desc: "Intelligent automatic task routing" },
  { id: "pdfRagAgent", name: "PDF RAG Agent", icon: BookOpen, color: "text-violet-400 border-violet-500/30 bg-violet-500/10", dot: "bg-violet-400", desc: "Chat & query uploaded PDF documents with vector retrieval" },
  { id: "pdfAgent", name: "PDF Agent", icon: FileText, color: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "bg-amber-400", desc: "AI structured PDF & document generator" },
  { id: "imageAgent", name: "Image Agent", icon: ImageIcon, color: "text-sky-400 border-sky-500/30 bg-sky-500/10", dot: "bg-sky-400", desc: "AI visual concept generation & S3 storage" },
  { id: "codingAgent", name: "Coding Agent", icon: Code2, color: "text-teal-400 border-teal-500/30 bg-teal-500/10", dot: "bg-teal-400", desc: "Multi-file apps & live sandboxes" },
  { id: "webAgent", name: "Web Search", icon: Globe, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10", dot: "bg-cyan-400", desc: "Live web search & fresh news lookup" },
  { id: "chatAgent", name: "Chat Agent", icon: Bot, color: "text-slate-300 border-slate-600/40 bg-slate-800/40", dot: "bg-slate-400", desc: "General conversation & logic" },
  { id: "pptAgent", name: "PPT Agent", icon: Presentation, color: "text-rose-400 border-rose-500/30 bg-rose-500/10", dot: "bg-rose-400", desc: "Presentation deck generator" },
];

const SUGGESTED_PROMPTS = [
  {
    title: "Chat & Query PDF Documents",
    prompt: "Analyze the attached PDF document, outline its core themes, and answer questions with source citations",
    agent: "pdfRagAgent",
    icon: BookOpen,
    tag: "PDF RAG",
  },
  {
    title: "Create Presentation Deck",
    prompt: "Create a 6-slide executive pitch deck on Multi-Agent AI Architectures with market vision, core pillars, and roadmap",
    agent: "pptAgent",
    icon: Presentation,
    tag: "Slide Deck",
  },
  {
    title: "Generate PDF Research Report",
    prompt: "Generate a comprehensive structured PDF report on the Future of Autonomous AI Agents with executive summary, key trends, and comparison tables",
    agent: "pdfAgent",
    icon: FileText,
    tag: "PDF Doc",
  },
  {
    title: "Generate Cyberpunk Artwork",
    prompt: "Generate an ultra-realistic 8K image of a futuristic cyberpunk city with neon lighting, rain reflections, and flying vehicles",
    agent: "imageAgent",
    icon: ImageIcon,
    tag: "AI Image",
  },
  {
    title: "Build Glassmorphic Calculator",
    prompt: "Create a modern animated glassmorphism scientific calculator in HTML, CSS, and JavaScript",
    agent: "codingAgent",
    icon: Code2,
    tag: "Web Project",
  },
  {
    title: "Live Web & News Lookup",
    prompt: "What are the latest breakthroughs in space exploration today?",
    agent: "webAgent",
    icon: Globe,
    tag: "Real-time",
  },
  {
    title: "Explain Multi-Agent Routing",
    prompt: "How does LangGraph conditional routing work in AgentMesh for multiple agents?",
    agent: "chatAgent",
    icon: Cpu,
    tag: "Architecture",
  },
];

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const generateSmartTitle = (promptText) => {
  if (!promptText) return "New Chat";
  const cleaned = promptText
    .replace(/^(can\s+u|please|create|generate|make|build|write|tell\s+me\s+about|what\s+is|how\s+to|what\s+are)\s+/i, "")
    .replace(/^[#\s\-*📄📊🎨]+/, "")
    .replace(/^(a\s+|an\s+|the\s+)/i, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return capitalized.length > 32 ? capitalized.slice(0, 32) + "..." : capitalized || "New Chat";
};

const getPrismLang = (lang = "") => {
  const norm = lang.toLowerCase().trim();
  if (norm === "js" || norm === "javascript") return "javascript";
  if (norm === "jsx" || norm === "react") return "jsx";
  if (norm === "ts" || norm === "typescript") return "typescript";
  if (norm === "tsx") return "tsx";
  if (norm === "py" || norm === "python") return "python";
  if (norm === "cpp" || norm === "c++") return "cpp";
  if (norm === "c") return "c";
  if (norm === "css") return "css";
  if (norm === "json") return "json";
  if (norm === "bash" || norm === "sh") return "bash";
  if (norm === "sql") return "sql";
  if (norm === "html" || norm === "markup") return "markup";
  return "javascript";
};

const extractArtifactsFromContent = (content) => {
  if (!content || typeof content !== "string") return [];
  const text = content.trim();

  // 1. PDF Detection
  const pdfMatch =
    text.match(/\[(?:📥\s*)?(?:Download\s+)?(?:Formatted\s+)?PDF(?:\s+Document)?\]\(([^)]+)\)/i) ||
    text.match(/\((data:application\/pdf;base64,[^)]+)\)/i) ||
    text.match(/\[([^\]]*\.pdf)\]\(([^)]+)\)/i);

  if (pdfMatch) {
    const url = pdfMatch[1] || pdfMatch[2];
    const titleMatch = text.match(/#+\s*(?:📄\s*)?([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Generated PDF Document";
    return [
      {
        id: Date.now(),
        type: "pdf",
        language: "pdf",
        title: title.endsWith(".pdf") ? title : `${title}.pdf`,
        url,
        content: text,
      },
    ];
  }

  // 2. PPT Presentation Detection
  const pptMatch =
    text.match(/\[(?:📥\s*)?(?:Download\s+)?(?:Presentation|PowerPoint|PPT|Deck)(?:\s+Deck)?\]\(([^)]+)\)/i) ||
    text.match(/\((data:application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation;base64,[^)]+)\)/i) ||
    text.match(/\[([^\]]*\.pptx)\]\(([^)]+)\)/i);

  if (pptMatch) {
    const url = pptMatch[1] || pptMatch[2];
    const titleMatch = text.match(/#+\s*(?:📊\s*)?([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Generated Presentation Deck";
    return [
      {
        id: Date.now(),
        type: "ppt",
        language: "ppt",
        title: title.endsWith(".pptx") ? title : `${title}.pptx`,
        url,
        content: text,
      },
    ];
  }

  // 3. Multi-file Web and Programming Code Blocks
  const htmlMatch = text.match(/```(?:html|xml|markup)\s*([\s\S]*?)```/i);
  const cssMatch = text.match(/```(?:css)\s*([\s\S]*?)```/i);
  const jsMatch = text.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);

  const cppMatch = text.match(/```(?:cpp|c\+\+|c)\s*([\s\S]*?)```/i);
  const pyMatch = text.match(/```(?:python|py)\s*([\s\S]*?)```/i);
  const javaMatch = text.match(/```(?:java)\s*([\s\S]*?)```/i);
  const rustMatch = text.match(/```(?:rust|rs)\s*([\s\S]*?)```/i);
  const goMatch = text.match(/```(?:go|golang)\s*([\s\S]*?)```/i);
  const sqlMatch = text.match(/```(?:sql)\s*([\s\S]*?)```/i);

  const files = [];
  if (htmlMatch) files.push({ name: "index.html", content: htmlMatch[1].trim() });
  if (cssMatch) files.push({ name: "style.css", content: cssMatch[1].trim() });
  if (jsMatch && (htmlMatch || cssMatch)) files.push({ name: "script.js", content: jsMatch[1].trim() });

  if (files.length > 0) {
    return [
      {
        id: Date.now(),
        type: "Project",
        language: "web",
        title: "Interactive Web Project",
        files,
      },
    ];
  }

  if (htmlMatch) {
    return [{ id: Date.now(), type: "Project", language: "web", title: "HTML Web Project", files: [{ name: "index.html", content: htmlMatch[1].trim() }] }];
  }
  if (cppMatch) {
    return [{ id: Date.now(), type: "Project", language: "cpp", title: "C++ Program", files: [{ name: "main.cpp", content: cppMatch[1].trim() }] }];
  }
  if (pyMatch) {
    return [{ id: Date.now(), type: "Project", language: "python", title: "Python Program", files: [{ name: "main.py", content: pyMatch[1].trim() }] }];
  }
  if (javaMatch) {
    return [{ id: Date.now(), type: "Project", language: "java", title: "Java Program", files: [{ name: "Main.java", content: javaMatch[1].trim() }] }];
  }
  if (rustMatch) {
    return [{ id: Date.now(), type: "Project", language: "rust", title: "Rust Program", files: [{ name: "main.rs", content: rustMatch[1].trim() }] }];
  }
  if (goMatch) {
    return [{ id: Date.now(), type: "Project", language: "go", title: "Go Program", files: [{ name: "main.go", content: goMatch[1].trim() }] }];
  }
  if (jsMatch) {
    return [{ id: Date.now(), type: "Project", language: "javascript", title: "JavaScript Script", files: [{ name: "script.js", content: jsMatch[1].trim() }] }];
  }
  if (cssMatch) {
    return [{ id: Date.now(), type: "Project", language: "css", title: "Stylesheet", files: [{ name: "style.css", content: cssMatch[1].trim() }] }];
  }
  if (sqlMatch) {
    return [{ id: Date.now(), type: "Project", language: "sql", title: "SQL Query", files: [{ name: "schema.sql", content: sqlMatch[1].trim() }] }];
  }

  return [];
};

const ChatImage = React.memo(({ src, alt }) => {
  const [error, setError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `agentmesh-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(src, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="my-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-slate-400">
        <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate max-w-[180px] text-slate-300 font-medium">
          {alt || "Image"}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline font-semibold ml-auto pl-2"
        >
          Open Link ↗
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="my-3 inline-block w-full max-w-lg">
        <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#070d1a] shadow-2xl transition-all group">
          {/* Image Container with uncropped aspect ratio preservation */}
          <div
            className="relative cursor-pointer overflow-hidden bg-[#040711] flex items-center justify-center p-2 min-h-[180px] max-h-[460px]"
            onClick={() => setIsModalOpen(true)}
            title="Click to expand full resolution image"
          >
            <img
              src={src}
              alt={alt || "Generated Image"}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setError(true)}
              className="w-full h-auto max-h-[440px] object-contain rounded-xl block transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 shadow-xl backdrop-blur-md">
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Click to Expand</span>
              </span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-4 py-2.5 bg-[#090e1a] border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[55%]">
              {alt || "AI Generated Visual"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                <Eye className="w-3 h-3 text-sky-400" />
                <span>Expand</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? "Downloading..." : "Download"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen Preview Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] w-full bg-[#0b1120] rounded-2xl border border-slate-700 p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-2 shrink-0">
              <span className="text-slate-200 font-semibold truncate max-w-[70%] text-xs sm:text-sm">
                {alt || "Full Resolution Visual Preview"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-sky-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div className="overflow-auto max-h-[80vh] w-full flex items-center justify-center p-2">
              <img
                src={src}
                alt={alt || "Full resolution"}
                className="max-h-[76vh] max-w-full object-contain rounded-xl block shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
});

const ChatPdfCard = React.memo(({ href, title, onOpenArtifact }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const cleanTitle = (title || "agentmesh-document").replace(/^📥\s*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${cleanTitle.slice(0, 35) || "document"}.pdf`;
      if (href.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(href);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch {
      window.open(href, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenViewer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenArtifact) {
      onOpenArtifact();
    }
  };

  const displayTitle = title ? title.replace(/^📥\s*/, "") : "Download Formatted PDF";

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#0c1220] shadow-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              PDF Document
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
            {displayTitle}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">
            Structured publication format • Ready for print and export
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {onOpenArtifact && (
          <button
            onClick={handleOpenViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Preview</span>
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>
    </div>
  );
});

const ChatPptCard = React.memo(({ href, title, onOpenArtifact }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const cleanTitle = (title || "agentmesh-presentation").replace(/^📥\s*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${cleanTitle.slice(0, 35) || "presentation"}.pptx`;
      if (href.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(href);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch {
      window.open(href, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenViewer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenArtifact) {
      onOpenArtifact();
    }
  };

  const displayTitle = title ? title.replace(/^📥\s*/, "") : "Download Presentation Deck (.pptx)";

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-[#0c1220] shadow-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
          <Presentation className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
              PowerPoint Deck (.pptx)
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
            {displayTitle}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">
            Interactive multi-slide presentation • Ready for Microsoft PowerPoint & Google Slides
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {onOpenArtifact && (
          <button
            onClick={handleOpenViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-rose-400" />
            <span>Preview Deck</span>
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? "Exporting..." : "Download PPTX"}</span>
        </button>
      </div>
    </div>
  );
});

const MarkdownRenderer = React.memo(({ content, msgIndex, onOpenArtifact, onOpenProjectArtifact, onCopyCode, copiedCodeIndex }) => {
  return (
    <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-extrabold text-white mt-5 mb-3 flex items-center gap-2 tracking-tight">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0"></span>
              <span>{children}</span>
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-bold text-emerald-300 mt-4 mb-2.5 pb-1.5 border-b border-slate-700/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold text-teal-200 mt-3.5 mb-2 flex items-center gap-1.5">
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-cyan-300 mt-3 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-slate-200 text-xs sm:text-sm font-normal">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          ),
          a: ({ href, children }) => {
            const textStr = String(children || "");
            const isPdf =
              href &&
              (href.endsWith(".pdf") ||
                href.startsWith("data:application/pdf") ||
                textStr.toLowerCase().includes("pdf") ||
                textStr.toLowerCase().includes("download pdf"));

            if (isPdf) {
              const cleanTitle = textStr.replace(/^📥\s*/, "") || "Generated Document.pdf";
              return (
                <ChatPdfCard
                  href={href}
                  title={textStr}
                  onOpenArtifact={
                    onOpenProjectArtifact
                      ? () =>
                          onOpenProjectArtifact({
                            type: "pdf",
                            title: cleanTitle.endsWith(".pdf") ? cleanTitle : `${cleanTitle}.pdf`,
                            url: href,
                            language: "pdf",
                          })
                      : () => onOpenArtifact(href, "pdf")
                  }
                />
              );
            }

            const isPpt =
              href &&
              (href.endsWith(".pptx") ||
                href.includes("presentationml") ||
                textStr.toLowerCase().includes("presentation") ||
                textStr.toLowerCase().includes("download ppt") ||
                textStr.toLowerCase().includes("download presentation"));

            if (isPpt) {
              const cleanTitle = textStr.replace(/^📥\s*/, "") || "Presentation Deck.pptx";
              return (
                <ChatPptCard
                  href={href}
                  title={textStr}
                  onOpenArtifact={
                    onOpenProjectArtifact
                      ? () =>
                          onOpenProjectArtifact({
                            type: "ppt",
                            title: cleanTitle.endsWith(".pptx") ? cleanTitle : `${cleanTitle}.pptx`,
                            url: href,
                            language: "ppt",
                          })
                      : () => onOpenArtifact(href, "ppt")
                  }
                />
              );
            }

            const isDownloadLink = href && (href.startsWith("http") || href.startsWith("blob"));
            const handleLinkClick = async (e) => {
              if (textStr.toLowerCase().includes("download") && isDownloadLink) {
                e.preventDefault();
                try {
                  const res = await fetch(href);
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `agentmesh-${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch {
                  window.open(href, "_blank");
                }
              }
            };

            return (
              <a
                href={href}
                onClick={handleLinkClick}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/40 hover:decoration-cyan-400 font-medium transition-colors cursor-pointer break-all"
              >
                <span>{children}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </a>
            );
          },
          img: ({ src, alt }) => (
            <ChatImage src={src} alt={alt} />
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 space-y-1.5 pl-5 list-disc marker:text-emerald-400 text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 space-y-1.5 pl-5 list-decimal marker:text-emerald-400 marker:font-bold text-slate-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-xs sm:text-sm">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3.5 pl-4 border-l-2 border-emerald-500 bg-emerald-950/20 py-2 pr-3 rounded-r-xl text-slate-300 italic text-xs sm:text-sm">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-5 border-0 h-[1px] bg-slate-700/80" />
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-slate-700/80 bg-[#0b1322] shadow-lg backdrop-blur-md">
              <table className="w-full text-left border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-800/90 border-b border-slate-700 text-emerald-300 uppercase tracking-wider font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800 font-normal">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-800/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-semibold text-[11px] text-emerald-300 border-r border-slate-800 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-xs text-slate-300 leading-relaxed border-r border-slate-800 last:border-r-0">
              {children}
            </td>
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const rawLang = match ? match[1] : "javascript";
            const langKey = getPrismLang(rawLang);

            if (inline || !match) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300 font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const grammar = Prism.languages[langKey] || Prism.languages.javascript;
            const highlighted = Prism.highlight(codeString, grammar, langKey);
            const isCopied = copiedCodeIndex === `${msgIndex}-${codeString.slice(0, 10)}`;

            return (
              <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-[#0f172a] my-3 shadow-xl">
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0b1120] border-b border-slate-800 text-xs">
                  <span className="font-mono text-[11px] text-emerald-300 uppercase font-semibold flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    {rawLang}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCopyCode(codeString, `${msgIndex}-${codeString.slice(0, 10)}`)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onOpenArtifact(codeString, rawLang)}
                      className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-sm"
                    >
                      <Code2 className="w-3 h-3 text-emerald-400" />
                      <span>Open in Artifact</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-normal selection:bg-emerald-500/30">
                  <code
                    className={`language-${langKey}`}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

const MessageItem = React.memo(({ msg, index, user, onOpenArtifact, onCopyCode, onOpenProjectArtifact, copiedCodeIndex }) => {
  const isUser = msg.role === "user";
  const artifacts = (Array.isArray(msg.artifacts) && msg.artifacts.length > 0)
    ? msg.artifacts
    : extractArtifactsFromContent(msg.content);

  return (
    <div
      className={`flex gap-3.5 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-[1px] shrink-0 shadow-md shadow-emerald-500/20 mt-1">
          <div className="w-full h-full bg-[#0f172a] rounded-[11px] flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      )}

      <div
        className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-5 text-sm shadow-lg transition-all ${
          isUser
            ? "user-bubble-titanium rounded-tr-sm font-normal"
            : "glass-titanium text-slate-200 rounded-tl-sm border border-slate-700/70"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/70 text-[11px] font-semibold text-slate-400">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              AgentMesh
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono">
              {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {isUser ? (
          <div>
            {msg.pdfAttachment && (
              <div className="mb-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/70 border border-violet-500/40 text-xs text-violet-200 shadow-md">
                <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="font-semibold truncate max-w-[220px]">
                  {msg.pdfAttachment.name || "Attached PDF Document"}
                </span>
                {msg.pdfAttachment.size && (
                  <span className="text-[10px] text-violet-400/80 font-mono">
                    ({formatFileSize(msg.pdfAttachment.size)})
                  </span>
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap leading-relaxed text-sm font-normal text-white">
              {msg.content}
            </p>
          </div>
        ) : (
          <>
            <ThoughtInspector
              thoughtSteps={msg.thoughtSteps}
              executionTrace={msg.executionTrace}
              telemetry={msg.telemetry}
              isDeepResearch={msg.isDeepResearch}
              artifacts={artifacts}
            />

            <MarkdownRenderer
              content={msg.content}
              msgIndex={index}
              onOpenArtifact={onOpenArtifact}
              onOpenProjectArtifact={onOpenProjectArtifact}
              onCopyCode={onCopyCode}
              copiedCodeIndex={copiedCodeIndex}
            />

            {Array.isArray(artifacts) && artifacts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-2">
                {artifacts.map((art, artIdx) => {
                  const isPdf =
                    art.type === "pdf" ||
                    art.language === "pdf" ||
                    art.url?.startsWith("data:application/pdf") ||
                    art.url?.endsWith(".pdf") ||
                    art.fileName?.endsWith(".pdf");

                  if (isPdf) {
                    return (
                      <div
                        key={artIdx}
                        onClick={() => onOpenProjectArtifact(art)}
                        className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border border-amber-500/30 hover:border-amber-400/60 transition-all flex items-center justify-between group cursor-pointer shadow-lg shadow-amber-950/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                              <span>{art.title || "Formatted PDF Document"}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                PDF Document
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {art.summary ? (art.summary.slice(0, 85) + "...") : "Click to preview in document reader and download formatted PDF"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProjectArtifact(art);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open Document</span>
                        </button>
                      </div>
                    );
                  }

                  const isPpt =
                    art.type === "ppt" ||
                    art.type === "pptx" ||
                    art.language === "ppt" ||
                    art.language === "pptx" ||
                    art.fileName?.endsWith(".pptx") ||
                    art.url?.includes("presentationml");

                  if (isPpt) {
                    return (
                      <div
                        key={artIdx}
                        onClick={() => onOpenProjectArtifact(art)}
                        className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/40 border border-rose-500/30 hover:border-rose-400/60 transition-all flex items-center justify-between group cursor-pointer shadow-lg shadow-rose-950/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
                            <Presentation className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-2">
                              <span>{art.title || "Presentation Slide Deck"}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                                PPTX Deck
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {art.summary ? (art.summary.slice(0, 85) + "...") : "Click to preview interactive slide deck and download .pptx file"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProjectArtifact(art);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20 shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open Presentation</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={artIdx}
                      onClick={() => onOpenProjectArtifact(art)}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/50 border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex items-center justify-between group cursor-pointer shadow-lg shadow-emerald-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                            <span>{art.title || "Interactive Project Workspace"}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                              {art.files?.length || 1} files
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Click to launch the live sandbox preview and inspect multi-file source code
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProjectArtifact(art);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Open Sandbox</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xs font-bold text-emerald-300 mt-1 shadow-sm">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="User"
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-emerald-300" />
          )}
        </div>
      )}
    </div>
  );
});

const ChatArea = ({
  isSidebarOpen,
  onToggleSidebar,
  isArtifactOpen,
  onToggleArtifact,
  activeArtifact,
  onSetActiveArtifact,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.userData);
  const selectedCoversation = useSelector(
    (state) => state.conversation?.selectedCoversation
  );
  const conversations = useSelector(
    (state) => state.conversation?.conversations || []
  );
  const generatingMap = useSelector(
    (state) => state.conversation?.generatingMap || {}
  );
  const optimisticMessagesMap = useSelector(
    (state) => state.conversation?.optimisticMessages || {}
  );

  const activeConversationId =
    selectedCoversation
      ? typeof selectedCoversation === "object"
        ? selectedCoversation._id || selectedCoversation.id || null
        : selectedCoversation
      : null;

  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [attachedPdf, setAttachedPdf] = useState(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const agentMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please select a valid PDF document (.pdf)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("PDF file size must be less than 25MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result;
      const base64 = typeof dataUri === "string" ? dataUri.split(",")[1] || "" : "";

      setAttachedPdf({
        name: file.name,
        size: file.size,
        type: "application/pdf",
        dataUri,
        base64,
      });

      setSelectedAgent("pdfRagAgent");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const isGeneratingThisChat = Boolean(activeConversationId && generatingMap[activeConversationId]);

  const currentTitle = useMemo(() => {
    if (!activeConversationId) return "New Conversation";
    const found = conversations.find(
      (c) => (c._id || c.id) === activeConversationId
    );
    return found?.title || "AgentMesh Chat";
  }, [activeConversationId, conversations]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target)) {
        setShowAgentMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      if (generatingMap[activeConversationId] && optimisticMessagesMap[activeConversationId]) {
        setMessages(optimisticMessagesMap[activeConversationId]);
        return;
      }

      setLoadingMessages(true);
      try {
        const data = await getMessages(activeConversationId);
        const messageList = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
        setMessages(messageList);

        if (messageList.length > 0) {
          for (let i = messageList.length - 1; i >= 0; i--) {
            const msg = messageList[i];
            if (msg.role === "assistant") {
              const arts = (Array.isArray(msg.artifacts) && msg.artifacts.length > 0)
                ? msg.artifacts
                : extractArtifactsFromContent(msg.content);
              if (arts.length > 0) {
                onSetActiveArtifact(arts[0], false);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
        setTimeout(() => scrollToBottom("auto"), 100);
      }
    };

    fetchChatMessages();
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGeneratingThisChat]);

  const handleCopyCode = useCallback((code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  }, []);

  const handleOpenInArtifact = useCallback((code, lang) => {
    const normLang = (lang || "").toLowerCase().trim();
    const isWeb = normLang === "html" || normLang === "markup" || normLang === "xml";
    const isCss = normLang === "css";
    const isJs = normLang === "js" || normLang === "javascript" || normLang === "jsx";
    const isPy = normLang === "py" || normLang === "python";
    const isCpp = normLang === "cpp" || normLang === "c++" || normLang === "c";
    const isJava = normLang === "java";
    const isRust = normLang === "rust" || normLang === "rs";
    const isGo = normLang === "go" || normLang === "golang";
    const isSql = normLang === "sql";

    const fileName = isWeb
      ? "index.html"
      : isCss
      ? "style.css"
      : isJs
      ? "script.js"
      : isPy
      ? "main.py"
      : isCpp
      ? "main.cpp"
      : isJava
      ? "Main.java"
      : isRust
      ? "main.rs"
      : isGo
      ? "main.go"
      : isSql
      ? "schema.sql"
      : `code.${normLang || "txt"}`;

    const artifactLang = isWeb ? "web" : normLang || "javascript";

    const newArtifact = {
      id: Date.now(),
      title: `${(lang || "Code").toUpperCase()} Program`,
      type: "Project",
      language: artifactLang,
      files: [
        {
          name: fileName,
          content: code,
        },
      ],
    };
    onSetActiveArtifact(newArtifact, true);
  }, [onSetActiveArtifact]);

  const handleOpenProjectArtifact = useCallback((projectArtifact) => {
    if (!projectArtifact) return;
    onSetActiveArtifact(projectArtifact, true);
  }, [onSetActiveArtifact]);

  const handleSend = async (overridePrompt = null) => {
    let textToSend = (overridePrompt || inputPrompt).trim();
    const currentPdf = attachedPdf;

    if (!textToSend && currentPdf) {
      textToSend = `Please analyze and summarize this attached document: ${currentPdf.name}`;
    }

    const currentActiveConv = activeConversationIdRef.current;
    if (!textToSend || (currentActiveConv && generatingMap[currentActiveConv])) return;

    let targetConvId = currentActiveConv;
    let isBrandNewChat = false;

    if (!targetConvId) {
      isBrandNewChat = true;
      try {
        const smartTitle = generateSmartTitle(currentPdf ? `PDF: ${currentPdf.name}` : textToSend);
        const newConv = await createConversation(smartTitle);

        if (newConv && (newConv._id || newConv.id)) {
          targetConvId = newConv._id || newConv.id;
          const formattedConv = {
            ...newConv,
            _id: newConv._id || newConv.id,
            title: smartTitle,
          };
          dispatch(addConversation(formattedConv));
          dispatch(setSelectedCoversation(formattedConv));
          activeConversationIdRef.current = targetConvId;
        } else {
          return;
        }
      } catch (err) {
        return;
      }
    }

    const optimisticUserMsg = {
      _id: `temp-user-${Date.now()}`,
      role: "user",
      content: textToSend,
      pdfAttachment: currentPdf ? { name: currentPdf.name, size: currentPdf.size, dataUri: currentPdf.dataUri } : null,
      createdAt: new Date().toISOString(),
    };

    const updatedOptimisticList = [...messages, optimisticUserMsg];
    setMessages(updatedOptimisticList);
    dispatch(setOptimisticMessages({ convId: targetConvId, messages: updatedOptimisticList }));
    dispatch(setGeneratingForConv({ convId: targetConvId, isGenerating: true }));

    setInputPrompt("");
    setAttachedPdf(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    sendMessage({
      conversationId: targetConvId,
      prompt: textToSend,
      agent: isDeepResearch ? "deepResearchAgent" : selectedAgent,
      isDeepResearch: isDeepResearch,
      userId: user?._id || user?.id || user?.userId || null,
      pdfAttachment: currentPdf ? {
        name: currentPdf.name,
        size: currentPdf.size,
        base64: currentPdf.base64,
        dataUri: currentPdf.dataUri,
      } : null,
    }).then(async (response) => {
      dispatch(setGeneratingForConv({ convId: targetConvId, isGenerating: false }));
      dispatch(clearOptimisticMessages({ convId: targetConvId }));

      const aiText = response?.answer || "No response generated.";
      const rawArtifacts = response?.artifacts || response?.artifects || [];

      const optimisticAiMsg = {
        _id: `temp-ai-${Date.now()}`,
        role: "assistant",
        content: aiText,
        artifacts: rawArtifacts,
        thoughtSteps: response?.thoughtSteps || [],
        executionTrace: response?.executionTrace || [],
        telemetry: response?.telemetry || {},
        isDeepResearch: Boolean(response?.isDeepResearch || isDeepResearch),
        createdAt: new Date().toISOString(),
      };

      if (activeConversationIdRef.current === targetConvId) {
        setMessages((prev) => [...prev, optimisticAiMsg]);
        if (rawArtifacts && rawArtifacts.length > 0) {
          onSetActiveArtifact(rawArtifacts[0]);
        }
      }

      const needsSmartTitle =
        isBrandNewChat ||
        !currentTitle ||
        currentTitle === "New Chat" ||
        currentTitle === "New Conversation" ||
        currentTitle === "AgentMesh Chat";

      if (needsSmartTitle) {
        try {
          const freshTitle = generateSmartTitle(currentPdf ? `PDF: ${currentPdf.name}` : textToSend);
          await updateConversation(targetConvId, freshTitle);
          dispatch(updateConversationTitle({ id: targetConvId, title: freshTitle }));
        } catch (e) {}
      }
    }).catch((error) => {
      dispatch(setGeneratingForConv({ convId: targetConvId, isGenerating: false }));
      dispatch(clearOptimisticMessages({ convId: targetConvId }));
      if (activeConversationIdRef.current === targetConvId) {
        setMessages((prev) => [
          ...prev,
          {
            _id: `temp-err-${Date.now()}`,
            role: "assistant",
            content: "⚠️ **Agent Mesh Error**: Failed to process your request. Please check your connection and retry.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleDeleteCurrentChat = async () => {
    if (!activeConversationId || isDeletingChat) return;
    setIsDeletingChat(true);
    try {
      const convToDelete = activeConversationId;
      await apiDeleteConversation(convToDelete);
      const remaining = conversations.filter((c) => (c._id || c.id) !== convToDelete);
      dispatch(setConversations(remaining));
      dispatch(setSelectedCoversation(null));
      setMessages([]);
      onSetActiveArtifact(null);
    } catch (err) {
      console.error("Failed to delete chat", err);
    } finally {
      setIsDeletingChat(false);
    }
  };

  const activeAgentMeta = AGENT_OPTIONS.find((a) => a.id === selectedAgent) || AGENT_OPTIONS[0];

  return (
    <div className="flex-1 h-full flex flex-col titanium-bg relative overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-4 sm:px-6 border-b border-slate-700/70 flex items-center justify-between shrink-0 glass-titanium z-20">
        <div className="flex items-center gap-3 min-w-0">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              title="Open Sidebar"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60 animate-pulse"></span>
              <span className="truncate">{currentTitle}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleArtifact}
            title={isArtifactOpen ? "Collapse Artifact Panel" : "Expand Artifact Panel"}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isArtifactOpen
                ? "bg-teal-500/20 border-teal-500/40 text-teal-300 shadow-teal-500/10"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <PanelRight className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Artifacts</span>
            {activeArtifact && !isArtifactOpen && (
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            )}
          </button>

          {activeConversationId && (
            <button
              onClick={handleDeleteCurrentChat}
              disabled={isDeletingChat}
              title="Delete this conversation"
              className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {loadingMessages && messages.length === 0 ? (
          <div className="space-y-4 max-w-4xl mx-auto py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl glass-card-titanium animate-pulse"
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-10 sm:py-16 space-y-8 animate-fadeIn">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
                <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse-glow" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                How can <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">AgentMesh</span> assist you?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Empowered with multi-file coding agents, live web lookup, visual creation, and interactive sandboxes.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {SUGGESTED_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedAgent(item.agent);
                      handleSend(item.prompt);
                    }}
                    className="glass-card-titanium p-4 rounded-2xl cursor-pointer transition-all duration-300 group text-left space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 text-slate-200 group-hover:text-emerald-300 transition-colors">
                        <Icon className="w-4 h-4 text-emerald-400" />
                        <span>{item.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors">
                      "{item.prompt}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <MessageItem
                key={msg._id || index}
                msg={msg}
                index={index}
                user={user}
                onOpenArtifact={handleOpenInArtifact}
                onCopyCode={handleCopyCode}
                onOpenProjectArtifact={handleOpenProjectArtifact}
                copiedCodeIndex={copiedCodeIndex}
              />
            ))}

            {isGeneratingThisChat && (
              <div className="flex gap-3.5 justify-start animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-[1px] shrink-0 shadow-md shadow-emerald-500/20 mt-1">
                  <div className="w-full h-full bg-[#0f172a] rounded-[11px] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                  </div>
                </div>

                <div className="rounded-2xl rounded-tl-sm px-4 py-3 glass-titanium text-xs text-slate-300 flex items-center gap-3 border border-emerald-500/30 shadow-xl shadow-emerald-950/30">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                    <span
                      className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    ></span>
                    <span
                      className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    ></span>
                  </div>
                  <span className="font-medium text-emerald-300">
                    AgentMesh evaluating prompt & gathering findings...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Modern Capsule Prompt Box Bar */}
      <div className="shrink-0 p-4 sm:p-5 pt-1 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent z-20">
        <div className="max-w-4xl mx-auto">
          <div className="modern-prompt-box rounded-3xl p-3 sm:p-4">
            <div className="flex flex-col gap-2.5">
              {/* Attached PDF Preview Chip */}
              {attachedPdf && (
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-violet-950/70 via-slate-900 to-violet-950/50 border border-violet-500/40 shadow-lg shadow-violet-950/30 animate-fadeIn">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-violet-500/25 text-violet-300 font-mono">
                          PDF Attached for RAG
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatFileSize(attachedPdf.size)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate mt-0.5">
                        {attachedPdf.name}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAttachedPdf(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border border-transparent hover:border-rose-500/20 shrink-0"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  attachedPdf
                    ? `Ask anything about "${attachedPdf.name}" (or press Send for full summary)...`
                    : "Ask AgentMesh anything (e.g. 'Build a modern timer app', 'space news', attach PDF)..."
                }
                disabled={isGeneratingThisChat}
                className="w-full bg-transparent px-1 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none min-h-[44px] max-h-44 leading-relaxed font-normal"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="relative" ref={agentMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAgentMenu(!showAgentMenu)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${activeAgentMeta.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeAgentMeta.dot} shadow-sm shadow-current animate-pulse`}></span>
                      <activeAgentMeta.icon className="w-3.5 h-3.5" />
                      <span>{activeAgentMeta.name}</span>
                      <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                    </button>

                    {showAgentMenu && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl glass-titanium shadow-2xl p-1.5 z-50 animate-fadeIn border border-slate-700">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Switch Neural Agent
                        </div>
                        {AGENT_OPTIONS.map((agent) => {
                          const Icon = agent.icon;
                          const isSelected = selectedAgent === agent.id;
                          return (
                            <button
                              key={agent.id}
                              onClick={() => {
                                setSelectedAgent(agent.id);
                                setShowAgentMenu(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                                  : "text-slate-300 hover:bg-slate-800/80"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${agent.dot}`}></span>
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{agent.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{agent.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Deep Research Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsDeepResearch(!isDeepResearch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                      isDeepResearch
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20 shadow-sm"
                        : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                    title="Toggle Autonomous Deep Research Planner (Multi-vector decomposition & parallel research)"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isDeepResearch ? "text-amber-400 animate-spin" : "text-slate-400"}`} />
                    <span>Deep Research</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDeepResearch ? "bg-amber-400 animate-pulse shadow-sm shadow-amber-400" : "bg-slate-500"}`}></span>
                  </button>

                  {/* Hidden File Input for PDF Upload */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf,.pdf"
                    className="hidden"
                  />

                  {/* PDF Attachment Trigger Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach PDF document for RAG analysis"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                      attachedPdf
                        ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-violet-500/15"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-violet-400" />
                    <span className="hidden sm:inline">
                      {attachedPdf ? "PDF Attached" : "Attach PDF"}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono select-none">
                    <span>↵</span>
                    <span>Send</span>
                  </span>

                  <button
                    onClick={() => handleSend()}
                    disabled={(!inputPrompt.trim() && !attachedPdf) || isGeneratingThisChat}
                    className="p-2.5 sm:px-4 sm:py-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span className="hidden sm:inline">Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-2 font-mono">
            AgentMesh AI orchestrates specialized neural agents · Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
