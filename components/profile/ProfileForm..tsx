"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  user: { id: string; email?: string | null };
  profile: {
    id: string;
    display_name?: string | null;
    timezone?: string | null;
    onboarding_completed?: boolean | null;
    preferences?: any | null;
  } | null;
};

export default function ProfileForm({ user, profile }: ProfileFormProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.preferences?.avatar_url ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const newPreferences = {
      ...(profile?.preferences ?? {}),
      avatar_url: avatarUrl || null,
    };

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName || null,
      timezone: timezone || null,
      onboarding_completed: profile?.onboarding_completed ?? false,
      preferences: newPreferences,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("Perfil actualizado");
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars") // nombre del bucket
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert("Error al subir la imagen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-16 w-16 rounded-full object-cover border"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
            Sin foto
          </div>
        )}

        <div className="space-y-1">
          <Input type="file" accept="image/*" onChange={handleAvatarChange} />
          <p className="text-xs text-gray-500">
            {uploading ? "Subiendo..." : "Sube una nueva foto de perfil"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input value={user.email ?? ""} disabled />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre para mostrar</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Tu nombre"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Zona horaria</label>
        <Input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="Ej: Europe/Madrid"
        />
      </div>

      <Button onClick={handleSave} disabled={saving || uploading}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  );
}
