// src/components/profile/ProfileScreen.tsx
"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, LogOut, User, Calendar, Bell, Moon, HelpCircle, Shield, CheckCircle, TrendingUp, Target } from "lucide-react";

export default function ProfileScreen({ user, profile }: any) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.preferences?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.preferences?.notifications ?? true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(profile?.preferences?.darkMode ?? false);

  const stats = [
    { icon: CheckCircle, number: 47, label: "Tareas completadas", gradient: "from-[#4EC4A9] to-[#20589A]" },
    { icon: TrendingUp, number: 12, label: "Racha actual", gradient: "from-[#20589A] to-[#1D2155]" },
    { icon: Target, number: 8, label: "Objetivos logrados", gradient: "from-pink-400 to-[#4EC4A9]" }
  ];

  const handleSave = async () => {
    setSaving(true);
    const newPreferences = {
      ...profile?.preferences,
      avatar_url: avatarUrl,
      notifications: notificationsEnabled,
      darkMode: darkModeEnabled,
    };

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName,
      timezone,
      preferences: newPreferences,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (!error) alert("Perfil actualizado");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1D2155] via-[#20589A] to-[#4EC4A9] p-4 pb-20 lg:pb-4">
      {/* Header con gradiente */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block">
            <Button variant="ghost" className="bg-white/20 text-white hover:bg-white/30">
              Settings
            </Button>
          </div>
        </div>

        {/* Avatar y datos */}
        <div className="flex flex-col items-center gap-4 mb-20 lg:mb-24">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center shadow-2xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {displayName ? displayName.split(' ').map((n: any[]) => n[0]).join('') : 'MG'}
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-[#4EC4A9] p-2 rounded-full border-4 border-white shadow-lg cursor-pointer group-hover:scale-110 transition-all duration-200">
              <Camera className="h-4 w-4 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          
          <div className="text-center text-white">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-1">
              {displayName || user.fullName || 'María González'}
            </h1>
            <p className="text-lg opacity-90">{user.email}</p>
            <p className="text-sm opacity-70 mt-1">Miembro desde Feb 2026</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-16 lg:-mt-24 mb-8 z-10 relative">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-white/50 animate-in slide-in-from-bottom-4 fade-in duration-500"
            style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.gradient} p-px`}>
              <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-[#1D2155]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1D2155] mb-1">{stat.number}</div>
            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Sections */}
      <div className="space-y-6 mb-8">
        {/* Cuenta */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-6 flex items-center gap-2">
            <User className="h-4 w-4" /> Cuenta
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">Información personal</div>
                <div className="text-sm text-gray-500">Nombre, email y foto</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">Preferencias de horario</div>
                <div className="text-sm text-gray-500">Zona horaria y días de estudio</div>
              </div>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/Madrid"
                className="ml-auto w-32 bg-white border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-6 flex items-center gap-2">
            Configuración
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <Bell className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Notificaciones</div>
                  <div className="text-sm text-gray-500">Gestiona tus alertas</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#4EC4A9] peer-checked:to-[#20589A]`}></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <Moon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Modo oscuro</div>
                  <div className="text-sm text-gray-500">Tema de la aplicación</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={darkModeEnabled}
                  onChange={(e) => setDarkModeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#4EC4A9] peer-checked:to-[#20589A]`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Soporte */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-6 flex items-center gap-2">
            Soporte
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">Centro de ayuda</div>
                <div className="text-sm text-gray-500">Tutoriales y FAQ</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">Privacidad y seguridad</div>
                <div className="text-sm text-gray-500">Gestiona tus datos</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200">
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="w-full flex items-center justify-center gap-3 text-red-600 font-semibold py-3 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-white/20">
        <p className="text-sm text-white/70">TaskIA v1.0 • Hecho con 💚 para estudiantes</p>
      </div>

      {/* Save Button (floating) */}
      <Button 
        onClick={handleSave}
        disabled={saving || uploading}
        className="fixed bottom-6 left-6 right-6 lg:static lg:w-auto bg-gradient-to-r from-[#1D2155] to-[#20589A] text-white shadow-2xl hover:from-[#4EC4A9] hover:to-[#20589A] lg:mt-6 z-20"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  );
}
