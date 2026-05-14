type ComingSoonPanelProps = {
  title?: string;
};

export function ComingSoonPanel({ title }: ComingSoonPanelProps) {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div className="mt-20 text-center font-display text-2xl font-bold text-gray-400">
        {title ?? "This section is coming soon."}
      </div>
    </div>
  );
}
