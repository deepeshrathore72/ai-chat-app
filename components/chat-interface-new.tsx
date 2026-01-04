"use client";

import { useState, useEffect, useRef } from "react";
import { SignOut } from "./sign-out";
import { User } from "next-auth";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt?: Date;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
}

interface ChatInterfaceProps {
  user: User;
  initialConversations: Conversation[];
}

export default function ChatInterface({
  user,
  initialConversations,
}: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(
    initialConversations
  );
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "New Chat" }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      const newConversation = await response.json();
      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
      setMessages([]);
      return newConversation.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error("Failed to load conversation");

      const conversation = await response.json();
      setCurrentConversationId(conversationId);
      setMessages(
        conversation.messages.map((msg: Message) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        }))
      );

      const updatedConversations = await fetch("/api/conversations").then((r) =>
        r.json()
      );
      setConversations(updatedConversations);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      setConversations(conversations.filter((c) => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let conversationId = currentConversationId;

    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      const assistantMessageId = Date.now().toString() + "-assistant";
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }

      const updatedConversations = await fetch("/api/conversations").then((r) =>
        r.json()
      );
      setConversations(updatedConversations);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar - Narrower like ChatGPT */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300`}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                  />
                )}
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
              </div>
              <SignOut />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={createNewConversation}
                className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Chat
                </div>
              </button>

              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative flex items-center justify-between rounded-lg p-2.5 transition-colors ${
                      currentConversationId === conversation.id
                        ? "bg-slate-800"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(conversation.id)}
                      className="flex-1 truncate text-left text-sm text-slate-200"
                    >
                      {conversation.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="ml-2 rounded p-1 opacity-0 transition-opacity hover:bg-slate-700 group-hover:opacity-100"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area - Wider like ChatGPT */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-slate-300">
            {currentConversationId
              ? conversations.find((c) => c.id === currentConversationId)
                  ?.title || "Chat"
              : "New Chat"}
          </h1>
          <div className="w-9" />
        </div>

        {/* Messages - Full width container like ChatGPT */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <svg
                  className="h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-white">
                  How can I help you today?
                </h2>
                <p className="text-slate-400">
                  Ask me anything to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full px-4 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-8 ${
                    message.role === "user"
                      ? "bg-slate-900/50"
                      : "bg-transparent"
                  }`}
                >
                  <div className="mx-auto flex max-w-3xl gap-4 px-4 py-6">
                    <div className="flex-shrink-0">
                      {message.role === "assistant" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                          <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="message-content whitespace-pre-wrap text-[15px] leading-7 text-slate-100">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-8">
                  <div className="mx-auto flex max-w-3xl gap-4 px-4 py-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 pt-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 animation-delay-200"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 animation-delay-400"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - Wider container like ChatGPT */}
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl bg-slate-800 p-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI..."
                className="flex-1 bg-transparent px-3 py-2 text-[15px] text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isLoading ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
