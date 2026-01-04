import { auth } from "@/auth";
import { SignIn } from "@/components/sign-in";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/chat");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
      
      <main className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-8 py-16 animate-fadeIn">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-75 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
            <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-5 shadow-2xl">
              <svg
                className="h-12 w-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent">
              AI Chat
            </h1>
            <p className="text-lg font-medium text-gray-300">
              Experience the power of AI conversation
            </p>
            <p className="text-sm text-gray-400">
              Powered by advanced language models
            </p>
          </div>
        </div>
        <SignIn />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Secure authentication via GitHub</span>
        </div>
      </main>
    </div>
  );
}
