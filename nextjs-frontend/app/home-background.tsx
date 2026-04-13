export default function HomeBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/images/Homepage.png')] bg-contain bg-center bg-no-repeat" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Foreground content */}
      <div className="relative z-10 min-h-screen">{children}</div>
    </main>
  );
}