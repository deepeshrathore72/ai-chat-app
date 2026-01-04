import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: {
      shareToken: token,
      isShared: true,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  if (!conversation) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {conversation.title}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Shared by {conversation.user.name || "Anonymous"}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Start Your Own Chat
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.role === "user"
                  ? "bg-slate-900/50"
                  : "bg-transparent"
              }`}
            >
              <div className="flex gap-4 px-4 py-6">
                <div className="shrink-0">
                  {message.role === "assistant" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                      <svg
                        className="h-5 w-5 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 overflow-hidden">
                  <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">
                    {message.content}
                  </div>
                  {message.isEdited && (
                    <p className="text-xs text-slate-500">(edited)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto max-w-3xl text-center text-sm text-slate-400">
          This is a shared conversation. Sign in to start your own chat.
        </div>
      </div>
    </div>
  );
}
