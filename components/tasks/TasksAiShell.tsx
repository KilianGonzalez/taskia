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
  Target,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TasksClient } from "@/app/(dashboard)/dashboard/tasks/tasks-client";
import { prioritizeTask, splitTaskWithAI, createTasksFromSplitTask } from "@/app/actions";

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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [prioritizeModalOpen, setPrioritizeModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitPlanOpen, setSplitPlanOpen] = useState(false);
  const [splitTaskTitle, setSplitTaskTitle] = useState("");
  const [suggestedSplit, setSuggestedSplit] = useState<any>(null);
  const [savingSplitTasks, setSavingSplitTasks] = useState(false);

  const pendingTasks = useMemo(
    () => initialTasks.filter((task) => !task.completed),
    [initialTasks]
  );

  const highPriorityTasks = useMemo(
    () =>
      pendingTasks.filter((task) =>
        ["alta", "high", "urgent"].includes(String(task.priority ?? "").toLowerCase())
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

  async function handlePrioritizeTasks() {
    setAiError("");

    if (pendingTasks.length === 0) {
      setAiError("No tienes tareas pendientes para priorizar.");
      return;
    }

    setPrioritizeModalOpen(true);
  }

  async function handleSelectTaskToPrioritize(taskId: string, action?: 'up' | 'down' | 'auto') {
    setAiLoading(true);
    setPrioritizeModalOpen(false);

    try {
      const res = await prioritizeTask(taskId, action);
      setAiLoading(false);

      if (res?.error) {
        setAiError(res.error);
        return;
      }

      setSaveSuccess(res.message || "Tarea priorizada correctamente.");
      
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setSaveSuccess(""), 3000);
      
    } catch (error) {
      console.error('Error priorizando tarea:', error);
      setAiError("Error al priorizar tarea.");
      setAiLoading(false);
    }
  }

  async function handleSplitTasks() {
    setAiError("");

    if (pendingTasks.length === 0) {
      setAiError("No tienes tareas pendientes para dividir.");
      return;
    }

    setSplitModalOpen(true);
  }

  async function handleSelectTaskToSplit(taskId: string) {
    setAiLoading(true);
    setSplitModalOpen(false);

    try {
      const res = await splitTaskWithAI(taskId);
      setAiLoading(false);

      if (res?.error) {
        setAiError(res.error);
        return;
      }

      if (res?.data) {
        console.log('Sesiones divididas:', res.data);
        const selectedTask = pendingTasks.find(t => t.id === taskId);
        setSplitTaskTitle(selectedTask?.title || '');
        setSuggestedSplit(res.data);
        setSplitPlanOpen(true);
      }
    } catch (error) {
      console.error('Error dividiendo tarea:', error);
      setAiError("Error al dividir tarea.");
      setAiLoading(false);
    }
  }

  async function handleSaveSplitTasks() {
    if (!suggestedSplit?.sessions?.length) {
      setAiError("No hay sesiones para guardar.");
      return;
    }

    const selectedTask = pendingTasks.find(t => t.title === splitTaskTitle);
    if (!selectedTask) {
      setAiError("No se encontró la tarea original.");
      return;
    }

    setAiError("");
    setSaveSuccess("");
    setSavingSplitTasks(true);

    const res = await createTasksFromSplitTask({
      originalTaskId: selectedTask.id,
      originalTaskTitle: selectedTask.title,
      sessions: suggestedSplit.sessions,
    });

    setSavingSplitTasks(false);

    if (res?.error) {
      setAiError(res.error);
      return;
    }

    setSaveSuccess(`${res.created || suggestedSplit.sessions.length} tareas creadas correctamente. La tarea original fue archivada.`);
    setSplitPlanOpen(false);
    
    // Limpiar el mensaje de éxito después de 3 segundos
    setTimeout(() => setSaveSuccess(""), 3000);
  }

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
                onClick={handleSplitTasks}
                disabled={aiLoading}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Split className="w-4 h-4" />
                )}
                {aiLoading ? "Dividiendo..." : "Dividir"}
              </button>

              <button
                type="button"
                onClick={handlePrioritizeTasks}
                disabled={aiLoading}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4" />
                )}
                {aiLoading ? "Priorizando..." : "Priorizar"}
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

      {aiError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start gap-2 text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{aiError}</p>
        </div>
      ) : null}

      {saveSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700">
          <p className="text-sm font-medium">{saveSuccess}</p>
        </div>
      ) : null}

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

      {/* Modal de Priorización de Tareas */}
      {prioritizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPrioritizeModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f172a]">
                  Ajustar prioridad de tareas
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Elige una tarea y ajusta su prioridad
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrioritizeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingTasks.map((task) => {
                const priorityColors = {
                  low: "bg-gray-100 text-gray-600 border-gray-300",
                  medium: "bg-blue-100 text-blue-600 border-blue-300",
                  high: "bg-red-100 text-red-600 border-red-300"
                };

                const priorityLabels = {
                  low: "Baja",
                  medium: "Media",
                  high: "Alta"
                };

                const currentPriority = (task.priority as 'low' | 'medium' | 'high') || 'medium';

                return (
                  <div
                    key={task.id}
                    className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] p-4 hover:bg-white hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0f172a] truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityColors[currentPriority]}`}>
                            {priorityLabels[currentPriority]}
                          </span>
                          {task.estimated_duration_min && (
                            <span className="text-xs text-gray-500">
                              {task.estimated_duration_min} min
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-gray-500">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTaskToPrioritize(task.id, 'up')}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        <Target className="w-3 h-3" />
                        Subir
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTaskToPrioritize(task.id, 'down')}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
                      >
                        <Target className="w-3 h-3" />
                        Bajar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTaskToPrioritize(task.id, 'auto')}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-all disabled:opacity-50"
                      >
                        <Target className="w-3 h-3" />
                        Auto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {pendingTasks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  No tienes tareas pendientes para priorizar
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Selección de Tarea para Dividir */}
      {splitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSplitModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f172a]">
                  Dividir tarea
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Elige una tarea para que la IA la divida en sesiones más pequeñas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSplitModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingTasks.map((task) => {
                const priorityColors = {
                  low: "bg-gray-100 text-gray-600 border-gray-300",
                  medium: "bg-blue-100 text-blue-600 border-blue-300",
                  high: "bg-red-100 text-red-600 border-red-300"
                };

                const priorityLabels = {
                  low: "Baja",
                  medium: "Media",
                  high: "Alta"
                };

                const currentPriority = (task.priority as 'low' | 'medium' | 'high') || 'medium';

                return (
                  <div
                    key={task.id}
                    className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] p-4 hover:bg-white hover:border-purple-300 transition-all cursor-pointer"
                    onClick={() => handleSelectTaskToSplit(task.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0f172a] truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityColors[currentPriority]}`}>
                            {priorityLabels[currentPriority]}
                          </span>
                          {task.estimated_duration_min && (
                            <span className="text-xs text-gray-500">
                              {task.estimated_duration_min} min
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-gray-500">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                          <Split className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pendingTasks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  No tienes tareas pendientes para dividir
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Resultados de División */}
      {splitPlanOpen && suggestedSplit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSplitPlanOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f172a]">
                  Tarea dividida
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">{splitTaskTitle}</p>
              </div>

              <button
                type="button"
                onClick={() => setSplitPlanOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
              <p className="text-sm font-semibold text-purple-700">Resumen</p>
              <p className="text-sm text-purple-600 mt-1">{suggestedSplit.summary}</p>
            </div>

            <div className="space-y-3">
              {suggestedSplit.sessions.map((session: any, index: number) => (
                <div
                  key={`${session.title}-${index}`}
                  className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{session.focus}</p>
                      {session.suggestedTime && (
                        <p className="text-xs text-purple-600 mt-2">
                          Sugerido: {new Date(session.suggestedTime).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {session.durationMin} min
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-3">{session.reason}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSplitPlanOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveSplitTasks}
                disabled={savingSplitTasks}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                style={{ background: "linear-gradient(90deg, #8b5cf6, #7c3aed)" }}
              >
                {savingSplitTasks ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {savingSplitTasks ? "Guardando..." : "Crear tareas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
