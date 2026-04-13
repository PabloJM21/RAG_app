import { Button } from "@/components/ui/button";
import Link from "next/link";
import HomeBackground from "./home-background";

export default function Home() {
  return (
    <HomeBackground>
      <div className="flex min-h-screen items-end justify-center px-6 pb-24">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-6xl font-bold text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Try RAGain
          </h1>

          <Link href="/login">
            <Button className="px-12 py-6 text-xl font-semibold rounded-full shadow-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 focus:ring-4 focus:ring-blue-300 backdrop-blur-sm">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </HomeBackground>
  );
}