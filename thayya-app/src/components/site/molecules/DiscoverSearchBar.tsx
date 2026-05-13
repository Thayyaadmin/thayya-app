import { Search } from "lucide-react";

export function DiscoverSearchBar() {
  return (
    <div
      className="mb-12 flex items-center gap-2 rounded-full p-2"
      style={{
        background: "white",
        border: "1px solid var(--line)",
        boxShadow: "0 4px 16px rgba(10,10,10,0.04)",
      }}
    >
      <Search className="ml-3 h-5 w-5 shrink-0" style={{ color: "var(--ink-muted)" }} />
      <input
        name="q"
        placeholder="Search instructors, styles, or workshops"
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none md:text-base"
      />
      <button
        type="button"
        className="gradient-bg-warm shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white md:px-5"
      >
        Search
      </button>
    </div>
  );
}
