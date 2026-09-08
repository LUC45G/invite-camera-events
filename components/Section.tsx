export function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm border border-ink/15 bg-ivory p-6 sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}
