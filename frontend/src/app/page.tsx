"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl"
      >
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your wardrobe, understood by AI
        </h1>
        <p className="mt-4 text-brand-700">
          Upload your clothes, build a digital wardrobe, and get outfit recommendations tailored to your
          style.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register">
            <Button variant="primary">Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
