import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-8 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Logo and Title */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-2">
              Same'ly <span className="text-4xl md:text-5xl font-light">(سمعلي)</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Your Quran Memorization & Recitation Companion
            </p>
          </div>

          {/* Hero Section */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 md:p-8 mb-10 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Organize, Track, and Perfect Your Quran Journey
            </h2>
            <p className="text-lg mb-6">
              Same'ly helps you create and manage Halaqas, assign portions for memorization and recitation, 
              track progress, and provide feedback - all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" passHref>
                <Button size="lg" className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/login" passHref>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Team Management</h3>
              <p>Create and organize Halaqas with students and teaching assistants.</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Assignment System</h3>
              <p>Assign specific Quran portions for memorization or recitation practice.</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p>Monitor progress, provide feedback, and grade assignments.</p>
            </div>
          </div>

          {/* Quote */}
          <div className="mb-10">
            <blockquote className="italic text-xl md:text-2xl">
              "وقل رب زدني علماً"
              <span className="block text-lg md:text-xl mt-2 font-normal">
                "And pray, 'My Lord! Increase me in knowledge'" - Taha, 114
              </span>
            </blockquote>
          </div>
        </div>
      </main>
    </div>
  );
}
