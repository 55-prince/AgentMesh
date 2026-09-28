import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getConversation } from "../features/getConversation.js";
import { createConversation } from "../features/createConversation.js";
import { updateConversation } from "../features/updateConversation.js";
import { deleteConversation as apiDeleteConversation } from "../features/deleteConversation.js";
import {
  setConversations,
  addConversation,
  setSelectedCoversation,
} from "../redux/conversationSlice.js";
import { removeUser } from "../redux/userSlice.js";
import { api } from "../../utils/axios.js";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase.js";
import {
  Plus,
  MessageSquare,
  Search,
  LogOut,
  PanelLeftClose,
  Edit2,
  Trash2,
  Check,
  X,
  Bot,
  Sparkles,
  Loader2,
} from "lucide-react";

const Sidebar = ({ isSidebarOpen, onToggleSidebar }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.userData);
  const conversations = useSelector((state) => state.conversation?.conversations || []);
  const generatingMap = useSelector((state) => state.conversation?.generatingMap || {});
  const selectedCoversation = useSelector(
    (state) => state.conversation?.selectedCoversation
  );

  const activeConversationId =
    selectedCoversation
      ? typeof selectedCoversation === "object"
        ? selectedCoversation._id || selectedCoversation.id
        : selectedCoversation
      : null;

  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchConvs = async () => {
      setLoadingList(true);
      const data = await getConversation();
      if (Array.isArray(data)) {
        dispatch(setConversations(data));
      }
      setLoadingList(false);
    };
    if (user) {
      fetchConvs();
    }
  }, [dispatch, user]);

  const handleCreateConversation = async () => {
    const newConv = await createConversation();
    if (newConv) {
      dispatch(addConversation(newConv));
      dispatch(setSelectedCoversation(newConv));
    } else {
      dispatch(setSelectedCoversation(null));
    }
  };

  const handleSelectConversation = (conv) => {
    dispatch(setSelectedCoversation(conv));
  };

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditingTitle(conv.title || "New Chat");
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await updateConversation(convId, editingTitle.trim());
      const updatedList = conversations.map((c) =>
        c._id === convId ? { ...c, title: editingTitle.trim() } : c
      );
      dispatch(setConversations(updatedList));
      if (activeConversationId === convId) {
        const current = conversations.find((c) => c._id === convId);
        if (current) {
          dispatch(setSelectedCoversation({ ...current, title: editingTitle.trim() }));
        }
      }
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e, convId) => {
    e.stopPropagation();
    setDeletingId(convId);

    await apiDeleteConversation(convId);

    const remainingConvs = conversations.filter((c) => c._id !== convId);
    dispatch(setConversations(remainingConvs));

    if (activeConversationId === convId) {
      dispatch(setSelectedCoversation(null));
    }

    setDeletingId(null);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.get("/api/auth/logout");
      await signOut(auth);
      dispatch(removeUser());
      dispatch(setSelectedCoversation(null));
      dispatch(setConversations([]));
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const filteredConversations = (conversations || []).filter((c) =>
    (c?.title || "New Chat").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-72 sm:w-80 h-full bg-[#0b1322]/95 border-r border-slate-700/70 flex flex-col justify-between shrink-0 z-30 transition-all duration-300 relative backdrop-blur-2xl">
      <div className="p-4 border-b border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-[1px] shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0f172a] rounded-[11px] flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                AgentMesh
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </span>
            </div>
          </div>

          <button
            onClick={onToggleSidebar}
            title="Collapse Sidebar"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleCreateConversation}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.99] transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>

        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
          <span>Conversations</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400 border border-slate-700 font-mono">
            {filteredConversations.length}
          </span>
        </div>

        {loadingList ? (
          <div className="space-y-2 py-2 px-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-slate-800/40 animate-pulse border border-slate-700/50"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No conversations yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Type a message in the chat to start automatically
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversationId === conv._id;
            const isEditing = editingId === conv._id;
            const isDeleting = deletingId === conv._id;
            const isGeneratingThis = Boolean(generatingMap[conv._id]);

            return (
              <div
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-xs ${
                  isActive
                    ? "bg-emerald-500/15 text-white border border-emerald-500/30 shadow-md shadow-slate-950/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-emerald-400 rounded-r-full shadow-sm shadow-emerald-400" />
                )}

                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                  {isGeneratingThis ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 animate-spin" />
                  ) : (
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"
                      }`}
                    />
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(e, conv._id);
                        if (e.key === "Escape") handleCancelRename(e);
                      }}
                      autoFocus
                      className="w-full bg-slate-900 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                      <span className="truncate font-medium">
                        {conv.title || "New Chat"}
                      </span>
                      {isGeneratingThis && (
                        <span className="shrink-0 text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded-md animate-pulse">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Generating...</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => handleSaveRename(e, conv._id)}
                        className="p-1 hover:text-emerald-400 text-slate-400 cursor-pointer"
                        title="Save title"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleStartRename(e, conv)}
                        title="Rename conversation"
                        className="p-1 hover:text-white text-slate-500 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conv._id)}
                        title="Delete conversation"
                        className="p-1 hover:text-rose-400 text-slate-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-700/60 bg-[#0a101b]/70">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300">
                  {getInitials(user?.name)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950"></span>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || "Anonymous"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || "Signed In"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
