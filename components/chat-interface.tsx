"use client";

import { useState, useEffect, useRef } from "react";
import { SignOut } from "./sign-out";
import { User } from "next-auth";
import { MessageActions } from "./message-actions";
import { ShareDialog } from "./share-dialog";
import { SearchBar } from "./search-bar";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt?: Date;
  isEdited?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
  isShared?: boolean;
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showMetadataEdit, setShowMetadataEdit] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
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
          isEdited: msg.isEdited,
        }))
      );

      // Update conversation list
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

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Edit message error:", response.status, errorData);
        throw new Error(errorData.error || `Failed to edit message (${response.status})`);
      }

      const updatedMessage = await response.json();
      
      // Find the index of the edited message
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      
      // Remove all messages after the edited one (including AI response)
      const updatedMessages = messages.slice(0, messageIndex);
      updatedMessages.push({
        id: messageId,
        role: "user",
        content: newContent,
        isEdited: true,
      });
      
      setMessages(updatedMessages);
      setIsLoading(true);

      // Regenerate AI response
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId: currentConversationId,
        }),
      });

      if (!chatResponse.ok) throw new Error("Failed to regenerate response");

      const reader = chatResponse.body?.getReader();
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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
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
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error editing message:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete message");

      // Find the index of the deleted message
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      const deletedMessage = messages[messageIndex];
      
      // If deleting a user message, also delete the next assistant message if it exists
      if (deletedMessage.role === "user" && messageIndex < messages.length - 1) {
        const nextMessage = messages[messageIndex + 1];
        if (nextMessage.role === "assistant") {
          // Delete the assistant message too
          await fetch(`/api/messages/${nextMessage.id}`, {
            method: "DELETE",
          }).catch(console.error);
          
          // Remove both messages from state
          setMessages((prev) => 
            prev.filter((msg) => msg.id !== messageId && msg.id !== nextMessage.id)
          );
          return;
        }
      }
      
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      
      const results = await response.json();
      setSearchResults(results);
      setSearchQuery(query);
    } catch (error) {
      console.error("Error searching:", error);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUpdateMetadata = async () => {
    if (!currentConversationId || !editingTitle.trim()) return;

    try {
      const response = await fetch(`/api/conversations/${currentConversationId}/metadata`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: editingTitle }),
      });

      if (!response.ok) throw new Error("Failed to update title");

      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId ? { ...c, title: editingTitle } : c
        )
      );
      setShowMetadataEdit(false);
    } catch (error) {
      console.error("Error updating metadata:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let conversationId = currentConversationId;

    // Create a new conversation if none is selected
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
        
        // Show rate limit error in chat
        if (response.status === 429) {
          const resetDate = errorData.resetTime ? new Date(errorData.resetTime) : null;
          const resetMessage = resetDate 
            ? ` You can try again at ${resetDate.toLocaleTimeString()}.`
            : " Please try again later.";
          
          const errorMessageId = Date.now().toString() + "-error";
          setMessages((prev) => [
            ...prev,
            {
              id: errorMessageId,
              role: "assistant",
              content: `⚠️ Rate limit exceeded. ${errorData.error || "Too many requests."}${resetMessage}`,
            },
          ]);
          setIsLoading(false);
          return;
        }
        
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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
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
      }

      // Refresh conversations to update titles
      const updatedConversations = await fetch("/api/conversations").then((r) =>
        r.json()
      );
      setConversations(updatedConversations);
      
      // Reload the conversation to get real message IDs from database
      if (conversationId) {
        await loadConversation(conversationId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex flex-col border-r border-slate-800/50 bg-slate-900 transition-all duration-300`}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 p-3">
              <div className="flex items-center gap-2.5">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                </div>
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

              <div className="mb-2">
                <SearchBar onSearch={handleSearch} />
              </div>

              {searchQuery && (
                <div className="mb-2 space-y-1">
                  <div className="rounded-lg bg-blue-900/20 border border-blue-700/50 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-400">Searching: "{searchQuery}"</span>
                      <button onClick={clearSearch} className="text-xs text-slate-400 hover:text-white">
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">{searchResults.length} result(s) found</div>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {searchResults.map((result: any) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            loadConversation(result.conversation.id);
                            clearSearch();
                          }}
                          className="w-full text-left rounded-lg bg-slate-800/50 p-2 hover:bg-slate-800 transition-colors"
                        >
                          <div className="text-xs font-medium text-slate-300 truncate">
                            {result.conversation.title}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {result.content.substring(0, 60)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

      {/* Main Chat Area */}
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
          {showMetadataEdit && currentConversationId ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateMetadata();
                  if (e.key === 'Escape') setShowMetadataEdit(false);
                }}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={handleUpdateMetadata} className="text-green-400 hover:text-green-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={() => setShowMetadataEdit(false)} className="text-slate-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <h1 className="text-sm font-medium text-slate-300">
              {currentConversationId
                ? conversations.find((c) => c.id === currentConversationId)
                    ?.title || "Chat"
                : "New Chat"}
            </h1>
          )}
          <div className="flex items-center gap-1">
            {currentConversationId && (
              <>
                <button
                  onClick={() => {
                    setEditingTitle(conversations.find((c) => c.id === currentConversationId)?.title || "");
                    setShowMetadataEdit(true);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  title="Edit title"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  title="Share conversation"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
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
            <div className="mx-auto max-w-5xl px-4 py-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex animate-fadeIn ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={`group relative max-w-[85%] rounded-2xl px-5 py-4 shadow-lg transition-all duration-200 hover:shadow-xl ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                        : "bg-slate-800/90 text-slate-100 border border-slate-700/50 backdrop-blur-sm"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="absolute -left-3 -top-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 p-2 shadow-lg">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z\" />
                        </svg>
                      </div>
                    )}
                    <div className="message-content whitespace-pre-wrap">
                      {message.content}
                    </div>                    {message.isEdited && (
                      <div className="mt-1 text-xs opacity-60">(edited)</div>
                    )}
                    {message.role === "user" && (
                      <div className="mt-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions
                          messageId={message.id}
                          role={message.role}
                          content={message.content}
                          isEdited={message.isEdited || false}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                        />
                      </div>
                    )}                  </div>
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

        {/* Input */}
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-5xl">
            <div className="flex items-end gap-2 rounded-2xl bg-slate-800 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder="Message AI..."
                rows={1}
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
                disabled={isLoading}
                style={{ height: 'auto', minHeight: '24px' }}
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

      {/* Share Dialog */}
      {showShareDialog && currentConversationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ShareDialog
            conversationId={currentConversationId}
            isShared={conversations.find((c) => c.id === currentConversationId)?.isShared || false}
            onClose={() => setShowShareDialog(false)}
          />
        </div>
      )}
    </div>
  );
}
