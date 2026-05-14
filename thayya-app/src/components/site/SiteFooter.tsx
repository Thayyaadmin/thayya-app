export function SiteFooter() {
  return (
    <footer
      className="border-t mt-12 py-8"
      style={{ borderColor: "var(--line)", background: "var(--bg-warm)" }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-brush text-3xl gradient-text">Move. Rise. Shine.</span>
        </div>
        <div
          className="text-center text-[11px] tracking-wider uppercase md:text-right"
          style={{ color: "var(--ink-muted)" }}
        >
          © 2026 Thayya · Made in India
        </div>
      </div>
    </footer>
  );
}
