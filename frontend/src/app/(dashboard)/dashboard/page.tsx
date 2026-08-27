"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicUser, UserProfileDTO } from "@fashion-platform/shared";

interface MeResponse extends PublicUser {
  profile: UserProfileDTO | null;
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api.get<MeResponse>("/users/me").then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Your wardrobe dashboard</h1>
      <p className="mt-2 text-brand-700">
        This is the foundation screen. Wardrobe upload, style analysis, and outfit recommendations plug
        in here next.
      </p>

      {me && (
        <div className="mt-6 rounded-lg border border-brand-100 bg-white p-4 text-sm">
          <p>
            <span className="font-medium">Name:</span> {me.name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {me.email}
          </p>
          <p>
            <span className="font-medium">Style preferences:</span>{" "}
            {me.profile?.stylePreferences.length ? me.profile.stylePreferences.join(", ") : "None set yet"}
          </p>
        </div>
      )}
    </div>
  );
}
