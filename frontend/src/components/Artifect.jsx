import React, { useState, useMemo, useEffect } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import {
  Code2,
  Copy,
  Check,
  Download,
  Eye,
  PanelRightClose,
  Maximize2,
  Minimize2,
  Terminal,
  FileCode,
  Sparkles,
  Play,
  Layers,
  RotateCcw,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Cpu,
  FileText,
  Printer,
  BookOpen,
  CheckCircle2,
  Presentation,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const getPrismLanguage = (filenameOrLang = "") => {
  const normalized = filenameOrLang.toLowerCase().trim();
  if (normalized.endsWith(".cpp") || normalized.endsWith(".cc") || normalized.endsWith(".h") || normalized.endsWith(".hpp") || normalized === "cpp" || normalized === "c++") return "cpp";
  if (normalized.endsWith(".c") || normalized === "c") return "c";
  if (normalized.endsWith(".py") || normalized === "python" || normalized === "py") return "python";
  if (normalized.endsWith(".java") || normalized === "java") return "java";
  if (normalized.endsWith(".rs") || normalized === "rust") return "rust";
  if (normalized.endsWith(".go") || normalized === "go" || normalized === "golang") return "go";
  if (normalized.endsWith(".cs") || normalized === "csharp" || normalized === "c#") return "csharp";
  if (normalized.endsWith(".html") || normalized === "html" || normalized === "markup") return "markup";
  if (normalized.endsWith(".css") || normalized === "css") return "css";
  if (normalized.endsWith(".js") || normalized === "javascript" || normalized === "js") return "javascript";
  if (normalized.endsWith(".jsx") || normalized === "jsx" || normalized === "react") return "jsx";
  if (normalized.endsWith(".ts") || normalized === "typescript" || normalized === "ts") return "typescript";
  if (normalized.endsWith(".tsx") || normalized === "tsx") return "tsx";
  if (normalized.endsWith(".json") || normalized === "json") return "json";
  if (normalized.endsWith(".sh") || normalized === "bash" || normalized === "shell") return "bash";
  if (normalized.endsWith(".sql") || normalized === "sql") return "sql";
  if (normalized.endsWith(".md") || normalized === "markdown" || normalized === "pdf" || normalized === "ppt" || normalized === "pptx") return "markup";
  return "javascript";
};

const isNativeLanguage = (langOrFiles) => {
  if (typeof langOrFiles === "string") {
    const l = langOrFiles.toLowerCase();
    return ["cpp", "c++", "c", "python", "py", "java", "rust", "go", "csharp", "c#", "sql"].includes(l);
  }
  if (Array.isArray(langOrFiles)) {
    return langOrFiles.some((f) => {
      const name = (f.name || "").toLowerCase();
      return (
        name.endsWith(".cpp") ||
        name.endsWith(".c") ||
        name.endsWith(".h") ||
        name.endsWith(".py") ||
        name.endsWith(".java") ||
        name.endsWith(".rs") ||
        name.endsWith(".go") ||
        name.endsWith(".cs") ||
        name.endsWith(".sql")
      );
    });
  }
  return false;
};

const cleanCodeContent = (raw) => {
  if (!raw) return "";
  let text = String(raw).trim();
  text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
  text = text.replace(/\n?```$/, "");
  text = text.replace(/^<!--\s*(?:index\.html|app|html)[\s\S]*?-->\n?/i, "");
  text = text.replace(/^\/\/\s*(?:script\.js|javascript|js)[\s\S]*?\n/i, "");
  text = text.replace(/^\/\*\s*(?:style\.css|css)[\s\S]*?\*\/\n?/i, "");
  return text.trim();
};

const parseMarkdownDocData = (content = "", defaultTitle = "Document Report") => {
  if (!content || typeof content !== "string") return null;
  const lines = content.split("\n");
  let title = defaultTitle;
  let subtitle = "";
  let summary = "";
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("# ") && title === defaultTitle) {
      title = line.replace(/^#\s*(?:📄\s*)?/, "").trim();
    } else if (line.startsWith("*") && line.endsWith("*") && !subtitle) {
      subtitle = line.replace(/^\*+|\*+$/g, "").trim();
    } else if (line.startsWith("> ") && !summary) {
      summary = line.replace(/^>\s*(?:\*\*[^*]+\*\*:?\s*)?/, "").trim();
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: line.replace(/^#+\s*(?:\d+\.\s*)?/, "").trim(),
        content: "",
        bulletPoints: [],
      };
    } else if (currentSection) {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        currentSection.bulletPoints.push(line.replace(/^[-*]\s*/, "").trim());
      } else if (line && !line.startsWith("|") && !line.startsWith("---")) {
        currentSection.content = currentSection.content ? `${currentSection.content}\n${line}` : line;
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    title: title || defaultTitle,
    subtitle: subtitle || "Generated by AgentMesh Autonomous AI",
    author: "AgentMesh PDF Agent",
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    summary: summary || "Comprehensive intelligence synthesis and structured report.",
    sections: sections.length > 0 ? sections : [
      {
        heading: "Overview",
        content: content.slice(0, 500),
        bulletPoints: ["Document compiled and structured", "Ready for preview and export"],
      },
    ],
  };
};

const parseMarkdownPptSlides = (content = "") => {
  if (!content || typeof content !== "string") return [];
  const lines = content.split("\n");
  const slides = [];
  let currentSlide = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("### Slide") || line.startsWith("### ") || line.startsWith("## ")) {
      if (currentSlide) {
        slides.push(currentSlide);
      }
      currentSlide = {
        title: line.replace(/^#+\s*(?:Slide\s*\d+:?\s*)?/, "").trim(),
        points: [],
      };
    } else if (currentSlide) {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        currentSlide.points.push(line.replace(/^[-*]\s*/, "").trim());
      }
    }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

  return slides;
};

const Artifect = ({ activeArtifact, isArtifactOpen, onToggleArtifact }) => {
  const [activeTab, setActiveTab] = useState("preview");
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceMode, setDeviceMode] = useState("desktop");
  const [pdfViewMode, setPdfViewMode] = useState("reader"); // "reader" | "embed"
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPpt, setDownloadingPpt] = useState(false);
  const [blobPdfUrl, setBlobPdfUrl] = useState(null);
  const [blobPptUrl, setBlobPptUrl] = useState(null);

  const isPdf = useMemo(() => {
    if (!activeArtifact) return false;
    const type = (activeArtifact.type || "").toLowerCase();
    const lang = (activeArtifact.language || "").toLowerCase();
    const url = (activeArtifact.url || "").toLowerCase();
    const fileName = (activeArtifact.fileName || activeArtifact.title || "").toLowerCase();
    return (
      type === "pdf" ||
      type === "document" ||
      lang === "pdf" ||
      url.startsWith("data:application/pdf") ||
      url.endsWith(".pdf") ||
      fileName.endsWith(".pdf")
    );
  }, [activeArtifact]);

  const isPpt = useMemo(() => {
    if (!activeArtifact) return false;
    const type = (activeArtifact.type || "").toLowerCase();
    const lang = (activeArtifact.language || "").toLowerCase();
    const url = (activeArtifact.url || "").toLowerCase();
    const fileName = (activeArtifact.fileName || activeArtifact.title || "").toLowerCase();
    return (
      type === "ppt" ||
      type === "pptx" ||
      type === "presentation" ||
      lang === "ppt" ||
      lang === "pptx" ||
      url.includes("presentationml") ||
      url.endsWith(".pptx") ||
      fileName.endsWith(".pptx")
    );
  }, [activeArtifact]);

  const rawPdfUrl = useMemo(() => {
    if (!isPdf || !activeArtifact) return null;
    return (
      activeArtifact.url ||
      activeArtifact.pdfUrl ||
      activeArtifact.downloadUrl ||
      (activeArtifact.base64 ? `data:application/pdf;base64,${activeArtifact.base64}` : null)
    );
  }, [isPdf, activeArtifact]);

  const rawPptUrl = useMemo(() => {
    if (!isPpt || !activeArtifact) return null;
    return (
      activeArtifact.url ||
      activeArtifact.pptUrl ||
      activeArtifact.downloadUrl ||
      null
    );
  }, [isPpt, activeArtifact]);

  // Convert base64 data URIs to Blob URLs to avoid browser iframe CSP restrictions
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (rawPdfUrl) {
      if (rawPdfUrl.startsWith("data:")) {
        try {
          fetch(rawPdfUrl)
            .then((res) => res.blob())
            .then((blob) => {
              if (active) {
                createdUrl = URL.createObjectURL(blob);
                setBlobPdfUrl(createdUrl);
              }
            })
            .catch(() => {
              if (active) setBlobPdfUrl(rawPdfUrl);
            });
        } catch {
          setBlobPdfUrl(rawPdfUrl);
        }
      } else {
        setBlobPdfUrl(rawPdfUrl);
      }
    } else {
      setBlobPdfUrl(null);
    }

    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith("blob:")) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [rawPdfUrl]);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (rawPptUrl) {
      if (rawPptUrl.startsWith("data:")) {
        try {
          fetch(rawPptUrl)
            .then((res) => res.blob())
            .then((blob) => {
              if (active) {
                createdUrl = URL.createObjectURL(blob);
                setBlobPptUrl(createdUrl);
              }
            })
            .catch(() => {
              if (active) setBlobPptUrl(rawPptUrl);
            });
        } catch {
          setBlobPptUrl(rawPptUrl);
        }
      } else {
        setBlobPptUrl(rawPptUrl);
      }
    } else {
      setBlobPptUrl(null);
    }

    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith("blob:")) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [rawPptUrl]);

  const docData = useMemo(() => {
    if (activeArtifact?.docData && typeof activeArtifact.docData === "object") {
      return activeArtifact.docData;
    }
    if (isPdf && activeArtifact?.content) {
      return parseMarkdownDocData(activeArtifact.content, activeArtifact.title?.replace(".pdf", ""));
    }
    return null;
  }, [activeArtifact, isPdf]);

  const pptSlides = useMemo(() => {
    if (Array.isArray(activeArtifact?.slides) && activeArtifact.slides.length > 0) {
      return activeArtifact.slides;
    }
    if (Array.isArray(docData?.slides) && docData.slides.length > 0) {
      return docData.slides;
    }
    if (isPpt && activeArtifact?.content) {
      const parsed = parseMarkdownPptSlides(activeArtifact.content);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, [activeArtifact, docData, isPpt]);

  const totalDeckLength = useMemo(() => {
    return Math.max(pptSlides.length + 2, 3);
  }, [pptSlides]);

  // Reset tab to preview whenever a new artifact is set
  useEffect(() => {
    setActiveTab("preview");
    setCurrentSlideIndex(0);
    setActiveFileIndex(0);
    setReloadKey((prev) => prev + 1);
  }, [activeArtifact?._ts, activeArtifact?.id]);

  // Keyboard navigation for presentation slides
  useEffect(() => {
    if (!isPpt || activeTab !== "preview") return;
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, totalDeckLength - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPpt, activeTab, totalDeckLength]);

  const files = useMemo(() => {
    let list = [];
    if (activeArtifact?.files && Array.isArray(activeArtifact.files) && activeArtifact.files.length > 0) {
      list = activeArtifact.files;
    } else if (activeArtifact?.data && Array.isArray(activeArtifact.data) && activeArtifact.data.length > 0) {
      list = activeArtifact.data;
    } else if (activeArtifact?.content && (isPdf || isPpt)) {
      list = [
        {
          name: activeArtifact.fileName || `${activeArtifact.title || "document"}.md`,
          content: activeArtifact.content,
        },
      ];
    } else if (activeArtifact?.code) {
      list = [
        {
          name: activeArtifact.title || `artifact.${activeArtifact.language || "js"}`,
          content: activeArtifact.code,
        },
      ];
    } else if (activeArtifact?.content) {
      list = [
        {
          name: "output.txt",
          content: activeArtifact.content,
        },
      ];
    }
    return list;
  }, [activeArtifact, isPdf, isPpt]);

  const activeFile = files[activeFileIndex] || files[0] || null;
  const rawCode = activeFile ? cleanCodeContent(activeFile.content) : "";

  const isNative = useMemo(() => {
    if (isPdf || isPpt) return false;
    if (activeArtifact?.language && isNativeLanguage(activeArtifact.language)) return true;
    return isNativeLanguage(files);
  }, [activeArtifact, files, isPdf, isPpt]);

  const nativeLanguage = useMemo(() => {
    if (isPdf) return "pdf";
    if (isPpt) return "ppt";
    if (activeArtifact?.language) {
      const l = activeArtifact.language.toLowerCase();
      if (["cpp", "c++", "c"].includes(l)) return "cpp";
      if (["python", "py"].includes(l)) return "python";
      if (["java"].includes(l)) return "java";
      if (["rust", "rs"].includes(l)) return "rust";
      if (["go", "golang"].includes(l)) return "go";
      if (["csharp", "c#"].includes(l)) return "csharp";
      if (["sql"].includes(l)) return "sql";
    }
    if (activeFile) {
      const name = (activeFile.name || "").toLowerCase();
      if (name.endsWith(".cpp") || name.endsWith(".c") || name.endsWith(".h")) return "cpp";
      if (name.endsWith(".py")) return "python";
      if (name.endsWith(".java")) return "java";
      if (name.endsWith(".rs")) return "rust";
      if (name.endsWith(".go")) return "go";
      if (name.endsWith(".cs")) return "csharp";
      if (name.endsWith(".sql")) return "sql";
    }
    return "cpp";
  }, [activeArtifact, activeFile, isPdf, isPpt]);

  const langKey = getPrismLanguage(activeFile?.name || activeArtifact?.language || "javascript");

  const codeLines = useMemo(() => {
    return rawCode.split("\n");
  }, [rawCode]);

  // Line-by-line syntax highlighting for pristine alignment
  const highlightedLines = useMemo(() => {
    if (!rawCode) return [];
    const lines = rawCode.split("\n");
    const grammar = Prism.languages[langKey] || Prism.languages.javascript;
    return lines.map((line) => {
      try {
        return Prism.highlight(line || " ", grammar, langKey);
      } catch {
        return (line || " ")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }
    });
  }, [rawCode, langKey]);

  // Live Web Sandbox compilation (HTML + CSS + JavaScript)
  const combinedLivePreview = useMemo(() => {
    if (files.length === 0 || isNative || isPdf || isPpt) return null;

    const htmlFile = files.find((f) => (f.name || "").endsWith(".html") || f.name === "index.html");
    const cssFile = files.find((f) => (f.name || "").endsWith(".css") || f.name === "style.css");
    const jsFile = files.find((f) => (f.name || "").endsWith(".js") || f.name === "script.js" || f.name === "app.js");

    let cleanHtml = htmlFile ? cleanCodeContent(htmlFile.content) : "";
    const cleanCss = cssFile ? cleanCodeContent(cssFile.content) : "";
    const cleanJs = jsFile ? cleanCodeContent(jsFile.content) : "";

    if (!cleanHtml && (cleanCss || cleanJs)) {
      cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandbox Preview</title>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
  <div id="root" class="w-full"></div>
  <div id="app" class="w-full"></div>
</body>
</html>`;
    }

    if (cleanHtml && !cleanHtml.includes("<html") && !cleanHtml.includes("<!DOCTYPE")) {
      cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandbox Preview</title>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 p-4">
  ${cleanHtml}
</body>
</html>`;
    }

    const cdnHeader = `
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
      </style>
    `;

    let doc = cleanHtml;

    if (doc.includes("</head>")) {
      doc = doc.replace("</head>", `${cdnHeader}\n</head>`);
    } else if (doc.includes("<body")) {
      doc = doc.replace("<body", `<head>${cdnHeader}</head><body`);
    } else {
      doc = `<head>${cdnHeader}</head>${doc}`;
    }

    if (cleanCss) {
      const styleBlock = `<style id="injected-style">\n${cleanCss}\n</style>`;
      const cssRegex = /<link[^>]*href=["']\.\/?[^"']*\.css["'][^>]*>/gi;
      if (cssRegex.test(doc)) {
        doc = doc.replace(cssRegex, styleBlock);
      } else if (doc.includes("</head>")) {
        doc = doc.replace("</head>", `${styleBlock}\n</head>`);
      } else {
        doc = `${styleBlock}\n${doc}`;
      }
    }

    if (cleanJs) {
      // Inject JS directly at global document level before </body>
      const scriptBlock = `<script id="injected-script">\n${cleanJs}\n</script>`;

      const scriptRegex = /<script[^>]*src=["']\.\/?[^"']*\.js["'][^>]*><\/script>/gi;
      if (scriptRegex.test(doc)) {
        doc = doc.replace(scriptRegex, scriptBlock);
      } else if (doc.includes("</body>")) {
        doc = doc.replace("</body>", `${scriptBlock}\n</body>`);
      } else {
        doc = `${doc}\n${scriptBlock}`;
      }
    }

    return doc;
  }, [files, isNative, isPdf, isPpt]);

  if (!isArtifactOpen) {
    return null;
  }

  const handleCopy = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommand = (cmdText) => {
    navigator.clipboard.writeText(cmdText);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleDownloadPdf = async () => {
    const urlToUse = blobPdfUrl || rawPdfUrl;
    if (!urlToUse) return;
    setDownloadingPdf(true);
    try {
      const fileName = activeArtifact?.fileName || `${(activeArtifact?.title || "document").replace(/[^a-z0-9]/gi, "_")}.pdf`;
      const link = document.createElement("a");
      link.href = urlToUse;
      link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(urlToUse, "_blank");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPpt = async () => {
    const urlToUse = blobPptUrl || rawPptUrl;
    if (!urlToUse) return;
    setDownloadingPpt(true);
    try {
      const cleanTitle = (activeArtifact?.title || "presentation").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = activeArtifact?.fileName || `${cleanTitle.slice(0, 35)}.pptx`;
      const link = document.createElement("a");
      link.href = urlToUse;
      link.download = fileName.endsWith(".pptx") ? fileName : `${fileName}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(urlToUse, "_blank");
    } finally {
      setDownloadingPpt(false);
    }
  };

  const handleDownload = () => {
    if (isPdf) {
      handleDownloadPdf();
      return;
    }
    if (isPpt) {
      handleDownloadPpt();
      return;
    }
    if (files.length === 0) return;
    files.forEach((file) => {
      const element = document.createElement("a");
      const blob = new Blob([file.content || ""], { type: "text/plain" });
      element.href = URL.createObjectURL(blob);
      element.download = file.name || "artifact.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    });
  };

  const handleOpenInNewTab = () => {
    if (isPdf && (blobPdfUrl || rawPdfUrl)) {
      window.open(blobPdfUrl || rawPdfUrl, "_blank");
      return;
    }
    if (isPpt && (blobPptUrl || rawPptUrl)) {
      window.open(blobPptUrl || rawPptUrl, "_blank");
      return;
    }
    if (!combinedLivePreview) return;
    const blob = new Blob([combinedLivePreview], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReloadSandbox = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <aside
      className={`h-full flex flex-col titanium-bg border-l border-slate-700/80 transition-all duration-300 relative z-30 shadow-2xl ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen border-l-0"
          : "w-full md:w-[500px] lg:w-[620px] xl:w-[720px]"
      }`}
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-700/80 flex items-center justify-between glass-titanium shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl border ${
              isPdf
                ? "bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400"
                : isPpt
                ? "bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400"
                : isNative
                ? "bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400"
                : "bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {isPdf ? (
              <FileText className="w-4 h-4" />
            ) : isPpt ? (
              <Presentation className="w-4 h-4" />
            ) : isNative ? (
              <Cpu className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate flex items-center gap-2">
              <span>{activeArtifact?.title || (isPdf ? "PDF Document" : isPpt ? "Presentation Deck" : "Interactive Workspace")}</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border ${
                  isPdf
                    ? "bg-amber-950/60 text-amber-300 border-amber-800/40"
                    : isPpt
                    ? "bg-rose-950/60 text-rose-300 border-rose-800/40"
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                }`}
              >
                {isPdf ? "PDF DOCUMENT" : isPpt ? "PRESENTATION DECK" : isNative ? `${nativeLanguage.toUpperCase()} PROGRAM` : "WEB SANDBOX"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isPdf ? "Publication Format" : isPpt ? `${totalDeckLength} Slides` : `${codeLines.length} lines`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "preview"
                  ? isPdf
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                    : isPpt
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-slate-950 shadow-md shadow-rose-500/20"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isPdf ? (
                <Eye className="w-3 h-3" />
              ) : isPpt ? (
                <Presentation className="w-3 h-3" />
              ) : isNative ? (
                <Terminal className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{isPdf ? "Document View" : isPpt ? "Slide Deck" : isNative ? "Run & Compiler" : "Live App"}</span>
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "code"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isPdf || isPpt ? <BookOpen className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
              <span>{isPdf || isPpt ? "Outline & Text" : "Source Code"}</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!rawCode}
            title={isPdf || isPpt ? "Copy Document Outline" : "Copy Current File Code"}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Print Button for PDF */}
          {isPdf && (
            <button
              onClick={handlePrint}
              title="Print Document"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isPdf ? downloadingPdf : isPpt ? downloadingPpt : files.length === 0}
            title={isPdf ? "Download Formatted PDF" : isPpt ? "Download PowerPoint Deck (.pptx)" : "Download Project Files"}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isPdf
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border-amber-500/30"
                : isPpt
                ? "text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border-rose-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
            } disabled:opacity-40`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onToggleArtifact}
            title="Close Artifact Panel"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-file tabs for code projects */}
      {!isPdf && !isPpt && files.length > 1 && (
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[#090e1a] border-b border-slate-800 overflow-x-auto shrink-0">
          {files.map((file, idx) => {
            const isSelected = idx === activeFileIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* PPT Presentation Toolbar */}
      {isPpt && activeTab === "preview" && (
        <div className="px-4 py-2.5 bg-[#0d1527] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentSlideIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer border border-slate-700"
              title="Previous Slide (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-800/40">
              Slide {currentSlideIndex + 1} of {totalDeckLength}
            </span>

            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, totalDeckLength - 1))}
              disabled={currentSlideIndex === totalDeckLength - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer border border-slate-700"
              title="Next Slide (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPpt}
              disabled={downloadingPpt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPpt ? "Exporting..." : "Download .PPTX"}</span>
            </button>
          </div>
        </div>
      )}

      {/* PDF Sub-Toolbar */}
      {isPdf && activeTab === "preview" && (
        <div className="px-4 py-2 bg-[#0d1527] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setPdfViewMode("reader")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                pdfViewMode === "reader"
                  ? "bg-amber-500/20 text-amber-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Executive Reader
            </button>
            <button
              onClick={() => setPdfViewMode("embed")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                pdfViewMode === "embed"
                  ? "bg-amber-500/20 text-amber-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PDF Document
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-amber-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? "Exporting..." : "Download PDF"}</span>
            </button>

            {(blobPdfUrl || rawPdfUrl) && (
              <button
                onClick={handleOpenInNewTab}
                title="Open in Full Browser Tab"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/50 transition-colors cursor-pointer font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-[11px]">Open Full ↗</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Sandbox Toolbar */}
      {!isPdf && !isPpt && activeTab === "preview" && !isNative && (
        <div className="px-4 py-2 bg-[#0d1527] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setDeviceMode("desktop")}
              title="Desktop View (Full Width)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                deviceMode === "desktop" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              title="Tablet View (768px)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                deviceMode === "tablet" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              title="Mobile View (390px)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                deviceMode === "mobile" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReloadSandbox}
              title="Restart Application Sandbox"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-[11px]">Restart</span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              title="Launch in New Browser Tab"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/50 transition-colors cursor-pointer font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="text-[11px]">Open Full ↗</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Viewer Area */}
      <div className="flex-1 overflow-auto bg-[#070c18] flex flex-col items-center justify-center p-3">
        {!activeArtifact ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-transparent">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-sm font-bold text-white">No Active Artifact</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Ask any agent to generate code, documents, or presentations to inspect, preview, and download here.
            </p>
          </div>
        ) : isPpt ? (
          // PPT Slide Deck View
          activeTab === "preview" ? (
            <div className="w-full h-full flex flex-col items-center justify-between p-2 sm:p-4 max-w-4xl mx-auto space-y-4">
              {/* Slide Canvas Container */}
              <div className="w-full flex-1 flex items-center justify-center">
                <div className="w-full aspect-[16/9] max-h-[70vh] rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden relative flex flex-col">
                  {currentSlideIndex === 0 ? (
                    // Cover Slide
                    <div className="w-full h-full bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-6 sm:p-12 flex flex-col justify-between text-white relative">
                      <div className="absolute top-0 left-0 right-0 h-2 bg-blue-400"></div>
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold tracking-widest uppercase border border-blue-400/40">
                          AGENTMESH PRESENTATION
                        </span>
                        <span className="text-xs text-blue-200 font-mono">
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                        </span>
                      </div>

                      <div className="my-auto space-y-3 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                          {docData?.title || activeArtifact.title?.replace(".pptx", "") || "Presentation Title"}
                        </h1>
                        {(docData?.subtitle || activeArtifact.summary) && (
                          <p className="text-sm sm:text-lg text-blue-100 max-w-2xl font-light">
                            {docData?.subtitle || activeArtifact.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-blue-200 border-t border-blue-500/30 pt-3">
                        <span>Author: <strong className="text-white">{docData?.author || "AgentMesh AI"}</strong></span>
                        <span>Slide 1 of {totalDeckLength}</span>
                      </div>
                    </div>
                  ) : currentSlideIndex === totalDeckLength - 1 ? (
                    // Closing / Thank You Slide
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0b1329] to-slate-950 p-8 sm:p-14 flex flex-col items-center justify-center text-center text-white relative">
                      <div className="space-y-4 max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                          <Presentation className="w-8 h-8 text-rose-400" />
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                          Thank You
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          Ready for execution & export into Microsoft PowerPoint (.pptx) and Google Slides.
                        </p>
                        <div className="pt-4">
                          <button
                            onClick={handleDownloadPpt}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-slate-950 font-bold text-xs flex items-center gap-2 mx-auto shadow-xl shadow-rose-500/20 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Full PPTX File</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Content Slide
                    (() => {
                      const slideItem = pptSlides[currentSlideIndex - 1] || {
                        title: `Section ${currentSlideIndex}`,
                        points: ["Key architectural insight", "Implementation requirement", "Next milestone focus"],
                      };
                      return (
                        <div className="w-full h-full bg-white text-slate-900 p-6 sm:p-8 flex flex-col justify-between relative">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h2 className="text-lg sm:text-2xl font-black text-blue-700 tracking-tight">
                                {slideItem.title || `Section ${currentSlideIndex}`}
                              </h2>
                              <span className="text-xs font-mono font-bold text-slate-400">
                                {currentSlideIndex + 1} / {totalDeckLength}
                              </span>
                            </div>
                            <div className="h-0.5 w-full bg-slate-200"></div>
                          </div>

                          <div className="my-auto py-2 space-y-2.5 sm:space-y-3">
                            {Array.isArray(slideItem.points) &&
                              slideItem.points.map((pt, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 shadow-sm hover:border-blue-300 transition-colors"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0 shadow-sm shadow-blue-500/50"></div>
                                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                                    {pt}
                                  </p>
                                </div>
                              ))}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                            <span>AgentMesh AI Presentation Architect</span>
                            <span>Slide {currentSlideIndex + 1} of {totalDeckLength}</span>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Slide Thumbnail Ribbon */}
              <div className="w-full flex items-center justify-center gap-1.5 py-1 overflow-x-auto shrink-0">
                {Array.from({ length: totalDeckLength }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIndex
                        ? "w-8 bg-rose-500 shadow-md shadow-rose-500/40"
                        : "w-2.5 bg-slate-700 hover:bg-slate-500"
                    }`}
                    title={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Outline Tab for PPT
            <div className="w-full h-full p-4 overflow-auto">
              <div className="p-6 rounded-2xl bg-[#090e1a] border border-rose-500/30 text-slate-200 space-y-4">
                <div className="border-b border-slate-700 pb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-rose-400" />
                    <span>{docData?.title || activeArtifact.title || "Presentation Deck Outline"}</span>
                  </h2>
                  <p className="text-xs text-slate-400">{docData?.subtitle || activeArtifact.summary}</p>
                </div>
                <div className="space-y-4 text-xs sm:text-sm font-mono whitespace-pre-wrap text-slate-300">
                  {rawCode || JSON.stringify(pptSlides, null, 2)}
                </div>
              </div>
            </div>
          )
        ) : isPdf ? (
          // PDF Artifact View
          activeTab === "preview" ? (
            pdfViewMode === "embed" && (blobPdfUrl || rawPdfUrl) ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <object
                  key={blobPdfUrl || rawPdfUrl}
                  data={blobPdfUrl || rawPdfUrl}
                  type="application/pdf"
                  title={activeArtifact.title || "PDF Document"}
                  className="w-full h-full rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl"
                >
                  <iframe
                    src={blobPdfUrl || rawPdfUrl}
                    title={activeArtifact.title || "PDF Document"}
                    className="w-full h-full rounded-2xl bg-[#0f172a] border-0"
                  />
                </object>
              </div>
            ) : (
              // Styled Executive Reader View (Publication Ready)
              <div className="w-full h-full overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-200">
                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#090e1a] border border-amber-500/30 shadow-2xl space-y-6">
                  {/* Document Cover Header */}
                  <div className="border-b border-slate-700/80 pb-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                        AGENTMESH PUBLICATION
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {docData?.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      {docData?.title || activeArtifact.title || "Intelligence Document"}
                    </h1>

                    {docData?.subtitle && (
                      <p className="text-sm text-slate-300 font-medium">
                        {docData.subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                      <span>Author: <strong className="text-slate-200">{docData?.author || "AgentMesh PDF Agent"}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Export
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  {(docData?.summary || activeArtifact.summary) && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border-l-4 border-amber-500 border-y border-r border-amber-500/20 space-y-1">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                        Executive Summary
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {docData?.summary || activeArtifact.summary}
                      </p>
                    </div>
                  )}

                  {/* Sections */}
                  {Array.isArray(docData?.sections) && docData.sections.length > 0 ? (
                    <div className="space-y-6 pt-2">
                      {docData.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          {section.heading && (
                            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              <span>{sIdx + 1}. {section.heading}</span>
                            </h3>
                          )}

                          {section.content && (
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {section.content}
                            </p>
                          )}

                          {Array.isArray(section.bulletPoints) && section.bulletPoints.length > 0 && (
                            <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-400 text-xs sm:text-sm text-slate-300">
                              {section.bulletPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="leading-relaxed">{pt}</li>
                              ))}
                            </ul>
                          )}

                          {section.table && Array.isArray(section.table.headers) && (
                            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90 shadow-md">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-800 text-amber-300 font-semibold">
                                  <tr>
                                    {section.table.headers.map((h, hIdx) => (
                                      <th key={hIdx} className="px-3 py-2 border-b border-slate-700">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.isArray(section.table.rows) &&
                                    section.table.rows.map((r, rIdx) => (
                                      <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-slate-900/50" : "bg-slate-800/30"}>
                                        {Array.isArray(r) &&
                                          r.map((c, cIdx) => (
                                            <td key={cIdx} className="px-3 py-2 border-b border-slate-800/60 text-slate-300">{c}</td>
                                          ))}
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          ) : (
            // Outline Tab for PDF
            <div className="w-full h-full p-4 overflow-auto">
              <div className="p-6 rounded-2xl bg-[#090e1a] border border-amber-500/30 text-slate-200 space-y-4">
                <div className="border-b border-slate-700 pb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    <span>{docData?.title || activeArtifact.title || "Document Source Outline"}</span>
                  </h2>
                  <p className="text-xs text-slate-400">{docData?.subtitle || activeArtifact.summary}</p>
                </div>
                <div className="space-y-4 text-xs sm:text-sm font-mono whitespace-pre-wrap text-slate-300">
                  {rawCode}
                </div>
              </div>
            </div>
          )
        ) : activeTab === "preview" ? (
          isNative ? (
            // Native Language Compiler & Terminal Run View
            <div className="w-full h-full flex flex-col p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                    <Cpu className="w-4 h-4 text-teal-400" />
                    <span>Native {nativeLanguage.toUpperCase()} Program Environment</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono border border-teal-500/30">
                    Ready to compile
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This is a standalone <strong>{nativeLanguage.toUpperCase()}</strong> program. Copy the code into your IDE or use the command below to compile & run it locally.
                </p>
              </div>

              {/* Terminal instructions */}
              <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-teal-400" />
                    <span>Compile & Run Command</span>
                  </span>
                  <button
                    onClick={() => {
                      const cmd =
                        nativeLanguage === "cpp"
                          ? "g++ -O3 main.cpp -o main && ./main"
                          : nativeLanguage === "python"
                          ? "python main.py"
                          : nativeLanguage === "java"
                          ? "javac Main.java && java Main"
                          : nativeLanguage === "rust"
                          ? "rustc main.rs && ./main"
                          : nativeLanguage === "go"
                          ? "go run main.go"
                          : "npm start";
                      handleCopyCommand(cmd);
                    }}
                    className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 cursor-pointer"
                  >
                    {copiedCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCommand ? "Copied" : "Copy Command"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto select-all">
                  {nativeLanguage === "cpp" && "$ g++ -O3 main.cpp -o main && ./main"}
                  {nativeLanguage === "python" && "$ python main.py"}
                  {nativeLanguage === "java" && "$ javac Main.java && java Main"}
                  {nativeLanguage === "rust" && "$ rustc main.rs && ./main"}
                  {nativeLanguage === "go" && "$ go run main.go"}
                  {!["cpp", "python", "java", "rust", "go"].includes(nativeLanguage) && "$ npm start"}
                </div>
              </div>

              {/* Source Quick View with Line-by-Line Highlight */}
              <div className="flex-1 rounded-2xl bg-[#070d1a] border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-[#0a1122] border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 font-semibold">{activeFile?.name || `main.${nativeLanguage}`}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-slate-300 hover:text-white text-xs cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-xs">
                  <table className="w-full border-collapse">
                    <tbody>
                      {highlightedLines.map((htmlLine, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="w-10 pr-3 text-right select-none text-slate-600 font-mono text-[11px] align-top py-0.5 border-r border-slate-800/80 group-hover:text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="pl-3 whitespace-pre text-slate-200 font-mono text-xs align-top py-0.5 overflow-x-auto">
                            <code dangerouslySetInnerHTML={{ __html: htmlLine }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // Web Sandbox Iframe View
            <div
              className={`h-full transition-all duration-300 mx-auto flex items-center justify-center ${
                deviceMode === "mobile"
                  ? "w-[390px] max-w-full shadow-2xl rounded-3xl overflow-hidden border-4 border-slate-700"
                  : deviceMode === "tablet"
                  ? "w-[768px] max-w-full shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-700"
                  : "w-full shadow-inner rounded-xl overflow-hidden"
              }`}
            >
              {combinedLivePreview ? (
                <iframe
                  key={reloadKey}
                  srcDoc={combinedLivePreview}
                  title="Interactive Web Sandbox Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
                  className="w-full h-full bg-white border-0"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Code2 className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs">No previewable HTML/CSS/JS file detected.</p>
                </div>
              )}
            </div>
          )
        ) : (
          // Source Code Tab (VS Code Grade Viewer with Line-by-Line Highlighting)
          <div className="w-full h-full flex flex-col bg-[#070d1a] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
            {/* File Info Bar */}
            <div className="px-4 py-2.5 bg-[#0a1122] border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-slate-200 text-xs truncate">
                  {activeFile?.name || "source_code"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                  {langKey.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono shrink-0">
                <span>{codeLines.length} lines</span>
                <span>•</span>
                <span>{(rawCode.length / 1024).toFixed(1)} KB</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer ml-1 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>

            {/* Line-by-Line Code Display */}
            <div className="flex-1 overflow-auto p-2 sm:p-4 font-mono text-xs leading-relaxed selection:bg-emerald-500/30 selection:text-white">
              <table className="w-full border-collapse">
                <tbody>
                  {highlightedLines.map((htmlLine, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="w-12 pr-4 text-right select-none text-slate-600 font-mono text-[11px] align-top py-0.5 border-r border-slate-800/80 group-hover:text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="pl-4 whitespace-pre text-slate-200 font-mono text-xs align-top py-0.5 overflow-x-auto">
                        <code dangerouslySetInnerHTML={{ __html: htmlLine }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Artifect;
