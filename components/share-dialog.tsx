"use client";

import { useState } from "react";

interface ShareDialogProps {
  conversationId: string;
  isShared: boolean;
  onClose: () => void;
}

export function ShareDialog({ conversationId, isShared: initialIsShared, onClose }: ShareDialogProps) {
  const [isShared, setIsShared] = useState(initialIsShared);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to share conversation");

      const data = await response.json();
      setShareUrl(data.shareUrl);
      setIsShared(true);
    } catch (error) {
      console.error("Error sharing conversation:", error);
      alert("Failed to share conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!confirm("Are you sure you want to stop sharing this conversation?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to unshare conversation");

      setIsShared(false);
      setShareUrl(null);
    } catch (error) {
      console.error("Error unsharing conversation:", error);
      alert("Failed to unshare conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Share Conversation</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {!isShared ? (
            <>
              <p className="text-sm text-slate-300">
                Share this conversation with anyone. They&apos;ll be able to view the messages but not edit them.
              </p>
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Creating link..." : "Create share link"}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Share link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl || "Generating..."}
                    readOnly
                    className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    {copied ? (
                      <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={handleUnshare}
                disabled={isLoading}
                className="w-full rounded-lg bg-red-600/20 border border-red-600/50 px-4 py-2.5 font-medium text-red-400 transition-colors hover:bg-red-600/30 disabled:opacity-50"
              >
                {isLoading ? "Removing..." : "Stop sharing"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
