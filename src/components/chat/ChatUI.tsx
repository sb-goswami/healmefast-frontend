"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Camera, Plus, Stethoscope, User, X, PenLine, FileText, Menu, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CameraModal from "./CameraModal";
import { useAuth } from "../auth/AuthContext";
import { LogOut } from "lucide-react";

type Message = {
  role: "user" | "bot";
  text: string;
};

type ChatSession = {
  session_id: string;
  title: string;
  updated_at: string;
};

type BackendMessage = {
  role: string;
  content?: string;
  [key: string]: unknown;
};

export default function ChatUI() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [backendHistory, setBackendHistory] = useState<BackendMessage[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [reportUploaded, setReportUploaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await api.get("/history");
      setChatSessions(res.data.chats || []);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Parse [Option: Text] tags from bot response
  const parseOptions = (text: string) => {
    const optionRegex = /\[Option:\s*(.*?)\]/gi;
    const options: string[] = [];
    let match;
    while ((match = optionRegex.exec(text)) !== null) {
      options.push(match[1].trim());
    }
    const cleanedText = text.replace(/\[Option:\s*.*?\]/gi, "").trim();
    return { cleanedText, options };
  };

  const isOtherOption = (opt: string) => opt.toLowerCase().startsWith("other");

  // Detect raw tool-call JSON leaking into chat (safety filter)
  const isRawToolCall = (text: string) => {
    const trimmed = text.trim();
    return (
      (trimmed.startsWith("{") && trimmed.includes('"name"') && trimmed.includes('"parameters"')) ||
      (trimmed.startsWith("[") && trimmed.includes('"name"'))
    );
  };

  // 📂 File Upload — returns true on success
  const handleFileUpload = async (file: File): Promise<boolean> => {
    const formData = new FormData();
    formData.append("file", file);

    // Show user's "sent file" bubble
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `📎 ${file.name}` },
      { role: "bot", text: "⏳ Uploading and analysing your report, please wait..." },
    ]);

    setLoading(true);

    try {
      const res = await api.post("/upload", formData);
      const analysisText = res.data.analysis || "Report uploaded successfully! You can now ask questions about it.";

      setMessages((prev) => [
        ...prev.slice(0, -1), // remove "uploading..." message
        { role: "bot", text: analysisText },
      ]);
      setReportUploaded(true);
      setLoading(false);
      return true;
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", text: "❌ Upload failed. Please try again." },
      ]);
      setLoading(false);
      return false;
    }
  };

  // 💬 Send message
  const sendMessage = async (textToSend?: string) => {
    if (loading) return;

    const finalText = typeof textToSend === "string" ? textToSend : input.trim();
    const hasFile = !!selectedFile;
    const hasText = !!finalText;

    if (!hasFile && !hasText) return;

    // Clear UI state immediately
    setInput("");
    setSelectedFile(null);
    setShowCustomInput(false);
    setCustomInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Step 1: Upload file first if present
    if (hasFile) {
      await handleFileUpload(selectedFile!);
      // If user also typed something, continue to send the text
      if (!hasText) return;
    }

    // Step 2: Send text message
    setMessages((prev) => [...prev, { role: "user", text: finalText }]);
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        question: finalText,
        history: backendHistory,
        session_id: currentSessionId,
      });

      const answer = res.data.answer || "I'm not sure how to respond to that.";
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);

      if (res.data.history) {
        setBackendHistory(res.data.history);
      }

      if (res.data.session_id && res.data.session_id !== currentSessionId) {
        setCurrentSessionId(res.data.session_id);
        fetchChats(); // Refresh sidebar
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❌ Something went wrong. Please try again." },
      ]);
    }

    setLoading(false);
  };

  // 📷 Camera Capture
  const handleCamera = () => setIsCameraOpen(true);

  // New Chat reset
  const handleNewChat = () => {
    setMessages([]);
    setBackendHistory([]);
    setInput("");
    setSelectedFile(null);
    setShowCustomInput(false);
    setCustomInput("");
    setReportUploaded(false);
    setCurrentSessionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteChat = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      await api.delete(`/history/${sessionId}`);
      setChatSessions((prev) => prev.filter(s => s.session_id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const loadChat = async (sessionId: string) => {
    try {
      const res = await api.get(`/history/${sessionId}`);
      const chat = res.data.chat;
      if (chat) {
        setBackendHistory(chat.messages);
        setCurrentSessionId(sessionId);

        // Reconstruct frontend messages
        const loadedMessages: Message[] = chat.messages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => {
            let text = m.content;
            if (m.role === 'tool') text = `🔧 Used tool: ${m.name}\n\n${m.content}`;
            return {
              role: m.role === 'user' ? 'user' : 'bot',
              text: text || ''
            };
          })
          .filter((m: any) => m.text);

        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {isCameraOpen && (
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onCapture={async (file) => {
            setIsCameraOpen(false);
            setSelectedFile(file);
            await handleFileUpload(file);
            setSelectedFile(null);
          }}
        />
      )}

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col p-6 z-40 shrink-0
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0a66c2]">HealmeFast</h1>
            <Stethoscope className="w-8 h-8 text-[#0a66c2]" />
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="w-full bg-[#0a66c2] hover:bg-[#084e96] transition-colors text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-8 font-medium"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>

        {reportUploaded && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2 text-green-700 text-sm">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="font-medium">Report Loaded</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Recent Chats</h2>
          <div className="flex flex-col gap-1">
            {chatSessions.map((chat) => (
              <div
                key={chat.session_id}
                className={`group flex items-center gap-1 w-full rounded-lg transition-colors text-sm ${currentSessionId === chat.session_id ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
              >
                <button
                  onClick={() => loadChat(chat.session_id)}
                  className={`text-left flex-1 text-slate-600 py-2.5 px-3 truncate ${currentSessionId === chat.session_id ? 'font-semibold' : ''}`}
                  title={chat.title}
                >
                  {chat.title}
                </button>
                <button
                  onClick={(e) => handleDeleteChat(e, chat.session_id)}
                  className="p-2 text-slate-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url('/bg-cells.png')" }}
        />

        {/* Header */}
        <div className="absolute top-4 md:top-6 left-4 md:left-auto right-4 md:right-6 z-20 flex items-center justify-between md:justify-end gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl shadow-sm border border-slate-100 md:hidden text-slate-600"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-sm border border-slate-100">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
            </div>
            <div className="flex flex-col pr-1 md:pr-2">
              <span className="text-xs md:text-sm font-semibold text-slate-800 truncate max-w-[80px] md:max-w-[120px]">
                {user?.full_name || "User"}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] md:text-xs text-green-600 font-medium">Online</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-1 border-l border-slate-100 pl-3"
              title="Log out"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Messages area — scrollable, pushes down before input */}
        <div className="flex-1 overflow-y-auto z-10 px-4 md:px-6 pt-24 pb-36">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/40 backdrop-blur-md border border-white/40 p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-blue-500/10"
              >
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/20 rotate-3">
                  <Stethoscope className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                  HealmeFast <span className="text-blue-600">AI</span>
                </h2>
                <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
                  Your intelligent companion for instant health insights and medical report analysis.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-white/60 rounded-2xl border border-white/60">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Analyze Reports</h3>
                    <p className="text-xs text-slate-500">Upload any lab result or medical PDF for instant explanation.</p>
                  </div>
                  <div className="p-4 bg-white/60 rounded-2xl border border-white/60">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Check Symptoms</h3>
                    <p className="text-xs text-slate-500">Describe how you feel to get a quick triage and advice.</p>
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                  <div className="w-8 h-[1px] bg-slate-200"></div>
                  <span>Start by uploading a file or typing below</span>
                  <div className="w-8 h-[1px] bg-slate-200"></div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              {messages.map((msg, i) => {
                // Safety: skip raw JSON tool calls that leaked into chat
                if (msg.role === "bot" && isRawToolCall(msg.text)) return null;

                const isLastBot = msg.role === "bot" && i === messages.length - 1;
                const { cleanedText, options } = msg.role === "bot"
                  ? parseOptions(msg.text)
                  : { cleanedText: msg.text, options: [] };

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[78%] p-3.5 md:p-4 rounded-2xl shadow-sm ${msg.role === "user"
                        ? "bg-[#0a66c2] text-white rounded-tr-sm"
                        : "bg-white text-slate-800 rounded-tl-sm [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_strong]:font-bold"
                        }`}
                    >
                      {msg.role === "user" ? (
                        <span className="text-sm md:text-base">{cleanedText}</span>
                      ) : (
                        <div className="flex flex-col gap-3 text-sm md:text-base">
                          <ReactMarkdown>{cleanedText}</ReactMarkdown>

                          {/* Options — only on last bot message */}
                          {isLastBot && options.length > 0 && !loading && (
                            <div className="flex flex-col gap-2 mt-2 border-t border-slate-100 pt-3">
                              <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Select an option:</p>
                              {options.map((opt, idx) =>
                                isOtherOption(opt) ? (
                                  <button
                                    key={idx}
                                    onClick={() => setShowCustomInput((v) => !v)}
                                    className="w-full text-left p-2.5 md:p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0a66c2] text-slate-500 hover:text-[#0a66c2] bg-white hover:bg-blue-50/50 transition-all font-medium flex items-center gap-2"
                                  >
                                    <PenLine className="w-4 h-4 shrink-0" />
                                    <span className="text-sm">{opt}</span>
                                  </button>
                                ) : (
                                  <button
                                    key={idx}
                                    onClick={() => sendMessage(opt)}
                                    className="w-full text-left p-2.5 md:p-3 rounded-xl border-2 border-slate-100 hover:border-[#0a66c2] text-slate-700 hover:text-[#0a66c2] bg-slate-50 hover:bg-blue-50/50 transition-all font-medium flex items-center justify-between group"
                                  >
                                    <span className="text-sm">{opt}</span>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-[#0a66c2] transition-colors shrink-0" />
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {/* Custom text input for "Other" */}
                          <AnimatePresence>
                            {isLastBot && showCustomInput && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex gap-2 mt-1 overflow-hidden"
                              >
                                <input
                                  autoFocus
                                  value={customInput}
                                  onChange={(e) => setCustomInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && customInput.trim()) sendMessage(customInput);
                                  }}
                                  placeholder="Describe your answer..."
                                  className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-[#0a66c2] rounded-xl px-4 py-2 text-slate-700 outline-none text-sm transition-colors"
                                />
                                <button
                                  onClick={() => customInput.trim() && sendMessage(customInput)}
                                  disabled={!customInput.trim()}
                                  className="p-2 bg-[#0a66c2] disabled:opacity-40 text-white rounded-xl hover:bg-[#084e96] transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white p-3 md:p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input */}
        <div className="absolute bottom-4 md:bottom-6 left-0 right-0 px-4 md:px-6 z-20">
          <div className="max-w-4xl mx-auto">

            {/* File preview chip above the input */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mb-2 flex"
                >
                  <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-full px-3 md:px-4 py-1.5 md:py-2">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0a66c2]" />
                    <span className="text-xs md:text-sm text-slate-700 font-medium truncate max-w-[150px] md:max-w-[200px]">{selectedFile.name}</span>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                    >
                      <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.10)] p-1.5 md:p-2 flex items-center gap-1 md:gap-2 border border-slate-100">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 md:p-3 text-slate-400 hover:text-[#0a66c2] hover:bg-blue-50 rounded-full transition-colors ml-1 md:ml-2"
                title="Upload report"
              >
                <Paperclip className="w-5 h-5 md:w-[22px] md:h-[22px]" />
              </button>

              <button
                onClick={handleCamera}
                className="hidden sm:block p-2 md:p-3 text-slate-400 hover:text-[#0a66c2] hover:bg-blue-50 rounded-full transition-colors"
                title="Capture image"
              >
                <Camera className="w-5 h-5 md:w-[22px] md:h-[22px]" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !loading) sendMessage(); }}
                placeholder={selectedFile ? "Add a message or just send the file..." : "Ask anything about your health..."}
                className="flex-1 bg-transparent px-3 py-3 outline-none text-slate-700 placeholder:text-slate-400 text-[16px]"
                disabled={loading}
              />

              <button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !selectedFile) || loading}
                className="p-3.5 bg-[#0a66c2] hover:bg-[#084e96] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full transition-all mr-1 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-[22px] h-[22px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}