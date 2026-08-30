"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PublicUser, UserProfileDTO } from "@fashion-platform/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface MeResponse extends PublicUser {
  profile: UserProfileDTO | null;
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    api.get<MeResponse>("/users/me").then((data) => {
      setMe(data);
      setName(data.name);
    });
  }, []);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === me?.name) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updated = await api.patch<PublicUser>("/users/me", { name: name.trim() });
      setMe((current) => (current ? { ...current, name: updated.name } : current));
      setSaveMessage({ text: "Saved.", isError: false });
    } catch (err) {
      setSaveMessage({ text: err instanceof Error ? err.message : "Couldn't save. Try again.", isError: true });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="font-mono text-xs uppercase tracking-widest text-brass-600">Account</p>
      <h1 className="mt-1 font-display text-3xl text-ink">Settings</h1>

      <form onSubmit={handleSaveName} className="mt-8 flex flex-col gap-4 rounded-sm border border-stone bg-white p-6">
        <Input label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <label className="font-mono text-[11px] uppercase tracking-wide text-ink/60">Email</label>
          <p className="mt-1.5 rounded-sm border border-stone bg-stone/20 px-3.5 py-2.5 text-sm text-ink/60">
            {me?.email ?? "—"}
          </p>
          <p className="mt-1.5 text-xs text-ink/40">Email can't be changed from here yet.</p>
        </div>

        {saveMessage && (
          <p className={`text-sm ${saveMessage.isError ? "text-clay" : "text-moss"}`} role="status">
            {saveMessage.text}
          </p>
        )}

        <Button type="submit" isLoading={isSaving} disabled={!name.trim() || name.trim() === me?.name} className="self-start">
          Save changes
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between rounded-sm border border-stone bg-white p-6">
        <div>
          <p className="font-display text-lg text-ink">Sign out</p>
          <p className="mt-1 text-sm text-ink/60">You'll need to sign in again to access your wardrobe.</p>
        </div>
        <Button variant="secondary" onClick={() => logout()}>
          Log out
        </Button>
      </div>
    </div>
  );
}
