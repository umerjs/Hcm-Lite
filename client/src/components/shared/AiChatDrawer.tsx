import React, { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, X, Send, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { http, extractErrorMessage } from "../../api/http";
import AiBadge from "./AiBadge";
import type { AiChatResponse } from "../../types/api";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  isAiGenerated?: boolean;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Hello! I am your Saylani HCM AI Assistant. I can help you check your remaining leave balance, assist with leave applications, and answer questions about company policies and working hours. How can I assist you today?",
    timestamp: "Just now",
    isAiGenerated: true,
  },
];

const SUGGESTED_PROMPTS = [
  "Who is on leave today?",
  "Calculate payroll cost",
  "How many leaves do I have left?",
];

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await http.post<AiChatResponse>("/ai/chat", {
        message: textToSend,
      });

      const responseText =
        res.data.response ||
        res.data.message ||
        "I have processed your query with the HCM database.";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolsUsed: res.data.toolsUsed,
        isAiGenerated: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setErrorMsg("Rate limit exceeded: max 20 AI queries per hour. Please try again later.");
      } else {
        const errorText = extractErrorMessage(
          err,
          "Failed to get a response from the AI assistant. Please try again.",
        );
        setErrorMsg(errorText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages(INITIAL_MESSAGES);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md sm:w-105 h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">HCM AI Assistant</h3>
                <AiBadge label="Online" />
              </div>
              <p className="text-[11px] text-muted-foreground">OpenAI & HCM Tool Calling</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {msg.role === "assistant" && (
                  <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                )}
                <span className="text-[10px] text-muted-foreground font-medium">
                  {msg.role === "user" ? "You" : "HCM AI"} • {msg.timestamp}
                </span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs"
                    : "bg-muted/70 text-foreground border border-border rounded-tl-xs shadow-xs"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                    {msg.toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono font-medium border border-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2 animate-in fade-in">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-muted/70 text-foreground border border-border rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px] text-muted-foreground">
                  Assistant is querying...
                </span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        {messages.length <= 3 && !isLoading && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
              Suggested prompts:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] text-left px-2.5 py-1 rounded-full bg-card border border-border text-foreground hover:bg-muted hover:border-emerald-600/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about leave, policies, attendance..."
              disabled={isLoading}
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI actions comply with organizational leave quota and security rules.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiChatDrawer;
