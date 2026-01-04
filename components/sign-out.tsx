import { handleSignOut } from "@/lib/actions";

export function SignOut() {
  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
      >
        <svg
          className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </form>
  );
}
