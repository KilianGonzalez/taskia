"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  CalendarClock,
  Split,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  Brain,
} from "lucide-react";
import { TasksClient } from "@/app/(dashboard)/dashboard/tasks/tasks-client";

type Task = {
  id: string;
  title: string;
  category?: string;
  priority?: string;
  due_date?: string;
  estimated_duration_min?: number;
  difficulty?: number;
  notes?: string;
  completed?: boolean;
  completed_at?: string;
  created_at?: string;
};

type TasksAiShellProps = {
  initialTasks: Task[];
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  tone: "info" | "focus" | "urgent";
};

export function TasksAiShell({ initialTasks }: TasksAiShellProps) {
  const [command, setCommand] = useState("");

  const pendingTasks = useMemo(
    () => initialTasks.filter((task) => !task.completed),
    [initialTasks]
  );

  const highPriorityTasks = useMemo(
    () =>
      pendingTasks.filter((task) =>
        ["alta", "high", "urgent"].includes((task.priority ?? "").toLowerCase())
      ),
    [pendingTasks]
  );

  const longTasks = useMemo(
    () =>
      pendingTasks.filter(
        (task) => (task.estimated_duration_min ?? 0) >= 90
      ),
    [pendingTasks]
  );

  const completedTasks = useMemo(
    () => initialTasks.filter((task) => task.completed),
    [initialTasks]
  );

  const suggestion: Suggestion = useMemo(() => {
    if (highPriorityTasks.length > 0) {
      return {
        id: "priority",
        title: "Prioriza lo importante hoy",
        description: `Tienes ${highPriorityTasks.length} tarea${highPriorityTasks.length === 1 ? "" : "s"} de prioridad alta pendiente${highPriorityTasks.length === 1 ? "" : "s"}.`,
        tone: "urgent",
      };
    }

    if (longTasks.length > 0) {
      return {
        id: "split",
        title: "Divide las tareas largas",
        description: `Hay ${longTasks.length} tarea${longTasks.length === 1 ? "" : "s"} larga${longTasks.length === 1 ? "" : "s"} que conviene repartir en sesiones.`,
        tone: "focus",
      };
    }

    if (pendingTasks.length > 0) {
      return {
        id: "calendar",
        title: "Llévalas al calendario",
        description: "Puedes convertir tareas pendientes en bloques planificados para la semana.",
        tone: "info",
      };
    }

    return {
      id: "done",
      title: "Todo está al día",
      description: "No tienes tareas pendientes ahora mismo. Buen momento para preparar la siguiente semana.",
      tone: "info",
    };
  }, [highPriorityTasks.length, longTasks.length, pendingTasks.length]);

  const toneStyles = {
    info: "bg-sky-50 border-sky-100 text-sky-700",
    focus: "bg-amber-50 border-amber-100 text-amber-700",
    urgent: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Mis Tareas</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Gestiona tus tareas flexibles y deja que la IA te ayude a priorizarlas
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0f172a]">Asistente IA</p>
              <p className="text-xs text-gray-400 mb-2">
                Comandos rápidos para organizar tus tareas
              </p>

              <div className={`rounded-xl border px-3 py-2.5 ${toneStyles[suggestion.tone]}`}>
                <p className="text-sm font-semibold">{suggestion.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{suggestion.description}</p>
              </div>
            </div>
          </div>

          <div className="xl:w-[520px] w-full flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='Ej. "Divide matemáticas en 3 sesiones"'
                className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                className="h-11 px-4 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(90deg, #1e2d5e, #2d4a8a)" }}
              >
                Probar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Split className="w-4 h-4" />
                Dividir
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Priorizar
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <CalendarClock className="w-4 h-4" />
                Al calendario
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Brain className="w-4 h-4" />
                Repartir semana
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#1e2d5e]">
            <Circle className="w-4 h-4" />
            <span className="text-sm font-medium">Pendientes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{pendingTasks.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Alta prioridad</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{highPriorityTasks.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completadas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{completedTasks.length}</p>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden">
        <TasksClient initialTasks={initialTasks as any} />
      </div>
    </div>
  );
}
