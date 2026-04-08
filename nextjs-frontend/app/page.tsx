import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">

      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/images/Homepage.png')] bg-contain bg-center bg-no-repeat" />

      {/* Subtle vignette overlay for focus */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom content */}
      <div className="relative z-10 flex min-h-screen items-end justify-center px-6 pb-24">
        <div className="flex flex-col items-center gap-8">

          {/* Tool name */}
          <h1 className="text-6xl font-bold text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            RAGain
          </h1>

          {/* Login button */}
          <Link href="/login">
            <Button className="px-12 py-6 text-xl font-semibold rounded-full shadow-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 focus:ring-4 focus:ring-blue-300 backdrop-blur-sm">
              Login
            </Button>
          </Link>

        </div>
      </div>

    </main>
  );
}