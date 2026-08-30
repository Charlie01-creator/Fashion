"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { clothingApi } from "@/lib/clothing-api";
import { outfitApi } from "@/lib/outfit-api";
import { styleApi } from "@/lib/style-api";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

interface DashboardStats {
  wardrobeCount: number;
  looksGenerated: number;
  styleProfileReady: boolean;
}

const ONBOARDING_KEY_PREFIX = "fashion-platform:onboarding-complete:";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadStats = useCallback(async () => {
    const [wardrobe, outfits, profileStatus] = await Promise.all([
      clothingApi.listItems().catch(() => ({ items: [], pagination: { total: 0 } }) as any),
      outfitApi.listOutfits(1, 1).catch(() => ({ items: [], pagination: { total: 0 } }) as any),
      styleApi
        .getProfile()
        .then(() => true)
        .catch(() => false),
    ]);

    setStats({
      wardrobeCount: wardrobe.pagination?.total ?? wardrobe.items.length,
      looksGenerated: outfits.pagination?.total ?? outfits.items.length,
      styleProfileReady: profileStatus,
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Onboarding shows once per account (not per device — keyed by user id so
  // a second person logging in on the same browser still sees their own
  // first-run experience), and only for someone who genuinely hasn't
  // started yet, not just someone who dismissed it before stats loaded.
  useEffect(() => {
    if (!user || !stats) return;
    const key = `${ONBOARDING_KEY_PREFIX}${user.id}`;
    const alreadyHandled = localStorage.getItem(key);
    const isGenuinelyNew = stats.wardrobeCount === 0 && stats.looksGenerated === 0;
    if (!alreadyHandled && isGenuinelyNew) {
      setShowOnboarding(true);
    }
  }, [user, stats]);

  function dismissOnboarding() {
    if (user) localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${user.id}`, "1");
    setShowOnboarding(false);
    loadStats();
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div>
      {showOnboarding && <OnboardingFlow onComplete={dismissOnboarding} onSkip={dismissOnboarding} />}

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-sm border border-stone bg-ink px-6 py-10 text-bone sm:px-10 sm:py-14"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-brass-400">Welcome back, {firstName}</p>
        <h1 className="mt-3 max-w-lg font-display text-3xl leading-tight sm:text-4xl">
          Your AI Fashion Stylist
        </h1>
        <p className="mt-3 max-w-md text-sm text-bone/70">
          Transform your wardrobe into personalized outfits.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="rounded-full bg-brass-500 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-brass-400"
          >
            Upload clothing
          </Link>
          <Link
            href="/ai-stylist"
            className="rounded-full border border-bone/30 px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-bone transition-colors hover:border-bone/60"
          >
            Create outfit
          </Link>
        </div>
      </motion.div>

      {/* Stat cards — garment-label motif (corner brackets, mono eyebrow, big serif number). */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Wardrobe"
          value={stats ? stats.wardrobeCount : "—"}
          detail={stats && stats.wardrobeCount === 0 ? "Nothing added yet" : "pieces catalogued"}
          href="/wardrobe"
        />
        <StatCard
          label="AI Looks Generated"
          value={stats ? stats.looksGenerated : "—"}
          detail={stats && stats.looksGenerated === 0 ? "None yet" : "outfits created"}
          href="/ai-stylist"
        />
        <StatCard
          label="Style Profile"
          value={stats ? (stats.styleProfileReady ? "Ready" : "Not yet") : "—"}
          detail={stats?.styleProfileReady ? "Generated from your wardrobe" : "Add pieces, then generate"}
          href="/style-profile"
          isTextValue
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  href,
  isTextValue,
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  isTextValue?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className="label-corners h-full rounded-sm border border-stone bg-white p-5 transition-colors group-hover:border-brass-400/60">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50">{label}</p>
        <p
          className={`mt-2 font-display text-ink ${isTextValue ? "text-2xl" : "text-4xl"}`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-ink/50">{detail}</p>
      </div>
    </Link>
  );
}
