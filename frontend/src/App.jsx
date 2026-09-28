import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "./features/getCurrentUser.js";
import { setUserData } from "./redux/userSlice.js";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import { Bot, Sparkles } from "lucide-react";

const App = () => {
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user?.userData);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      const user = await getCurrentUser();
      if (user) {
        dispatch(setUserData(user));
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [dispatch]);

  // Loading Splash Screen
  if (checkingAuth) {
    return (
      <div className="h-screen w-screen titanium-bg flex flex-col items-center justify-center text-slate-100 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[1.5px] shadow-2xl shadow-emerald-500/20 animate-pulse-glow">
          <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center">
            <Bot className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            AgentMesh
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-400">
            Initializing neural agent mesh...
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render Home workspace; otherwise Login page
  return userData ? <Home /> : <Login />;
};

export default App;