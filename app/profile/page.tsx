"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getProfile, saveProfile, type UserProfile } from "@/lib/local-store";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  if (!profile) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-sm text-gray-400">Loading…</div>
      </AppShell>
    );
  }

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile({ ...profile, [key]: value });
    setSaved(false);
  };

  const onSave = () => {
    saveProfile(profile);
    setSaved(true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8 md:px-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-300" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{profile.displayName}</h1>
            <p className="text-sm text-gray-500">
              {profile.school}, {profile.city}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <Field label="Display name" value={profile.displayName} onChange={(v) => update("displayName", v)} />
          <Field label="School" value={profile.school} onChange={(v) => update("school", v)} />
          <Field label="City" value={profile.city} onChange={(v) => update("city", v)} />
          <Field label="Email" value={profile.email} onChange={(v) => update("email", v)} />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={profile.notifyJobReady}
              onChange={(e) => update("notifyJobReady", e.target.checked)}
            />
            Notify when mapping job is ready
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={profile.notifyGrading}
              onChange={(e) => update("notifyGrading", e.target.checked)}
            />
            Notify when grading completes
          </label>

          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Save preferences
          </button>
          {saved && <p className="text-xs text-emerald-600">Saved to this browser.</p>}
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
      />
    </label>
  );
}
