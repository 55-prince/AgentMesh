import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase.js";
import { api } from "../../utils/axios.js";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice.js";
import {
  Sparkles,
  Cpu,
  Code2,
  Layers,
  ShieldCheck,
  Bot,
  Zap,
  Globe,
} from "lucide-react";

const Login = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (token) => {
    try {
      const response = await api.post("/api/auth/login", { token });
      if (response?.data?.user) {
        dispatch(setUserData(response?.data?.user));
      } else {
        throw new Error("Invalid response from auth server");
      }
    } catch (error) {
      console.error("Login failed on backend", error);
      const msg = error?.response?.data?.message || "Failed to authenticate with backend";
      setErrorMsg(msg);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await signInWithPopup(auth, googleProvider);
      const token = await data.user.getIdToken();
      await handleLogin(token);
    } catch (error) {
      console.error("Google login failed", error);
      setErrorMsg(error?.message || "Google sign-in was cancelled or failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
      title: "Intelligent Mesh Routing",
      desc: "LangGraph dynamically routes queries to specialized neural agents.",
    },
    {
      icon: <Globe className="w-5 h-5 text-teal-400" />,
      title: "Real-Time Web Intelligence",
      desc: "Live search, up-to-the-minute news, financial tickers, and web photo embeds.",
    },
    {
      icon: <Code2 className="w-5 h-5 text-cyan-400" />,
      title: "Coding Agent & Artifacts",
      desc: "Full code generation with side-by-side inspection, preview, and copy.",
    },
  ];

  return (
    <div className="min-h-screen titanium-bg text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Decorative Glow Orbs */}
      <div className="absolute top-[-100px] left-[15%] w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[15%] w-[500px] h-[400px] bg-teal-500/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-[1px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">
              AgentMesh
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium glass-titanium px-3.5 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Mesh Network Online</span>
        </div>
      </header>

      {/* Main Hero & Auth Card */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        {/* Left Side: Brand Value Proposition */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Next-Gen Multi-Agent Workspace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Orchestrate AI with{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              AgentMesh
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            Connect seamlessly with specialized AI agents for real-time live search, coding, visual asset creation, and graph workflows in one calm, unified interface.
          </p>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-3 gap-4 pt-4">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="glass-card-titanium p-4 rounded-2xl text-left space-y-2 hover:border-emerald-500/40 transition-all duration-300 group"
              >
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 w-fit group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <h2 className="text-xs font-bold text-slate-200">{f.title}</h2>
                <p className="text-[11px] text-slate-400 leading-normal">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-md">
          <div className="glass-titanium p-8 sm:p-10 rounded-3xl shadow-2xl relative border border-slate-700">
            <div className="text-center space-y-2 mb-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[1.5px] shadow-xl shadow-emerald-500/20 mb-4">
                <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center">
                  <Zap className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome to AgentMesh
              </h2>
              <p className="text-sm text-slate-400">
                Sign in to access your agents, memory, and coding workspace
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={googleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3.5 py-3.5 px-4 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60 transition-all duration-200 shadow-lg shadow-white/10 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Mesh...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-center gap-6 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Secure Session Auth
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-teal-400" />
                  Redis State Cached
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        AgentMesh Intelligent Multi-Agent System &copy; {new Date().getFullYear()}. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
