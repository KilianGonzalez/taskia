"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  BookOpen,
  CalendarClock,
  Target,
  TrendingUp,
  Trophy,
  Flame,
  Brain,
} from "lucide-react";
import { GoalsClient } from "@/app/(dashboard)/dashboard/goals/goals-client";

type Goal = {
  id: string;
  title: string;
  description?: string;
  category?: "academic" | "personal" | "habit";
  currentvalue: number;
  targetvalue: number;
  unit: string;
  duedate?: string;
  status?: "active" | "completed" | "paused";
  streak?: number;
  createdat?: string;
};

type GoalsAiShellProps = {
  initialGoals: Goal[];
};

export function GoalsAiShell({ initialGoals }: GoalsAiShellProps) {
  const [command, setCommand] = useState("");

  const activeGoals = useMemo(
    () => initialGoals.filter((goal) => goal.status !== "completed"),
    [initialGoals]
  );

  const completedGoals = useMemo(
    () => initialGoals.filter((goal) => goal.status === "completed"),
    [initialGoals]
  );

  const academicGoals = useMemo(
    () => activeGoals.filter((goal) => goal.category === "academic"),
    [activeGoals]
  );

  const avgProgress = useMemo(() => {
    if (!activeGoals.length) return 0;

    return Math.round(
      activeGoals.reduce((acc, goal) => {
        const progress =
          goal.targetvalue > 0
            ? Math.min(100, Math.round((goal.currentvalue / goal.targetvalue) * 100))
            : 0;

        return acc + progress;
      }, 0) / activeGoals.length
    );
  }, [activeGoals]);

  const maxStreak = useMemo(
    () => initialGoals.reduce((max, goal) => Math.max(max, goal.streak ?? 0), 0),
    [initialGoals]
  );

  const suggestion = useMemo(() => {
    if (academicGoals.length > 0) {
      return {
        title: "Convierte objetivos en sesiones",
        text: `Tienes ${academicGoals.length} objetivo${
          academicGoals.length === 1 ? "" : "s"
        } académico${
          academicGoals.length === 1 ? "" : "s"
        } activo${academicGoals.length === 1 ? "" : "s"} listo${
          academicGoals.length === 1 ? "" : "s"
        } para planificar.`,
        style: "bg-emerald-50 border-emerald-100 text-emerald-700",
      };
    }

    if (activeGoals.length > 0) {
      return {
        title: "Mantén el seguimiento",
        text: "Actualiza el progreso de tus objetivos para que la IA pueda priorizar mejor tu semana.",
        style: "bg-sky-50 border-sky-100 text-sky-700",
      };
    }

    return {
      title: "Empieza por tu próximo hito",
      text: "Crea tu primer objetivo para que TaskIA pueda ayudarte a convertirlo en progreso real.",
      style: "bg-violet-50 border-violet-100 text-violet-700",
    };
  }, [academicGoals.length, activeGoals.length]);

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Mis Objetivos</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Sigue tu progreso y deja que la IA te ayude a convertir metas en sesiones
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr_1.35fr] gap-4 xl:items-center">          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0f172a]">Asistente IA</p>
              <p className="text-xs text-gray-400 mb-2">
                Sugerencias rápidas para tus objetivos
              </p>

              <div className={`rounded-xl border px-3 py-2.5 ${suggestion.style}`}>
                <p className="text-sm font-semibold">{suggestion.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{suggestion.text}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-w-[340px] w-full justify-self-center">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Crear sesiones
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <CalendarClock className="w-4 h-4" />
              Al calendario
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Target className="w-4 h-4" />
              Priorizar
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Brain className="w-4 h-4" />
              Repartir semana
            </button>
          </div>

            <div className="w-full xl:max-w-[620px] xl:justify-self-end">            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='Ej. "Divide historia en 4 sesiones antes del viernes"'
                className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                className="h-11 px-5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shrink-0"
                style={{ background: "linear-gradient(90deg, #10b981, #059669)" }}
              >
                Probar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Progreso medio</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{avgProgress}%</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-medium">Mejor racha</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{maxStreak}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">Completados</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{completedGoals.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sky-600">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Activos</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{activeGoals.length}</p>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden">
        <GoalsClient initialGoals={initialGoals as any} />
      </div>
    </div>
  );
}