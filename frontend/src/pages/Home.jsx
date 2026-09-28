import React, { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import ChatArea from "../components/chatArea.jsx";
import Artifect from "../components/Artifect.jsx";

const Home = () => {
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSetActiveArtifact = (artifact, shouldOpen = true) => {
    if (!artifact) {
      setActiveArtifact(null);
      return;
    }
    setActiveArtifact({ ...artifact, _ts: Date.now() });
    if (shouldOpen) {
      setIsArtifactOpen(true);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-900 text-slate-100 font-sans">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Center Chat Area */}
      <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <ChatArea
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isArtifactOpen={isArtifactOpen}
          onToggleArtifact={() => setIsArtifactOpen((prev) => !prev)}
          activeArtifact={activeArtifact}
          onSetActiveArtifact={handleSetActiveArtifact}
        />
      </main>

      {/* Collapsible Right Artifact Panel */}
      <Artifect
        activeArtifact={activeArtifact}
        isArtifactOpen={isArtifactOpen}
        onToggleArtifact={() => setIsArtifactOpen((prev) => !prev)}
      />
    </div>
  );
};

export default Home;
