"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CalendarClock,
  Split,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  Target,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TasksClient } from "@/app/(dashboard)/dashboard/tasks/tasks-client";
import {
  prioritizeTask,
  splitTaskWithAI,
  createTasksFromSplitTask,
  distributeWeeklyTasks,
} from "@/app/actions";
import {
  isHighTaskPriority,
  toTaskPriorityLabel,
  type TaskPriorityLabel,
} from "@/lib/tasks/priority";

type Task = {
  id: string;
  title: string;
  category?: string;
  priority?: string;
  due_date?: string;
  estimated_duration_min?: number;
  difficulty?: number;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
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

type SuggestedSplitSession = {
  title: string;
  durationMin: number;
  focus: string;
  reason: string;
  suggestedTime?: string;
};

type SuggestedSplitPlan = {
  summary: string;
  sessions: SuggestedSplitSession[];
};

const taskPriorityColors: Record<TaskPriorityLabel, string> = {
  baja: "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  media: "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  alta: "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
};

const taskPriorityLabels: Record<TaskPriorityLabel, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractQuotedText(value: string) {
  const match = value.match(/["']([^"']+)["']/);
  return match?.[1]?.trim() ?? null;
}

function findTaskByPrompt(prompt: string, tasks: Task[]) {
  const normalizedPrompt = normalizeSearchText(prompt);
  const quotedTaskTitle = extractQuotedText(prompt);

  if (quotedTaskTitle) {
    const normalizedQuotedTitle = normalizeSearchText(quotedTaskTitle);
    const exactMatch =
      tasks.find(
        (task) => normalizeSearchText(task.title) === normalizedQuotedTitle
      ) ??
      tasks.find((task) =>
        normalizeSearchText(task.title).includes(normalizedQuotedTitle)
      );

    if (exactMatch) {
      return exactMatch;
    }
  }

  return tasks.find((task) =>
    normalizedPrompt.includes(normalizeSearchText(task.title))
  );
}

export function TasksAiShell({ initialTasks }: TasksAiShellProps) {
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [prioritizeModalOpen, setPrioritizeModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitPlanOpen, setSplitPlanOpen] = useState(false);
  const [selectedSplitTask, setSelectedSplitTask] = useState<Task | null>(null);
  const [suggestedSplit, setSuggestedSplit] = useState<SuggestedSplitPlan | null>(
    null
  );
  const [savingSplitTasks, setSavingSplitTasks] = useState(false);

  const pendingTasks = useMemo(
    () => initialTasks.filter((task) => !task.completed),
    [initialTasks]
  );

  const highPriorityTasks = useMemo(
    () => pendingTasks.filter((task) => isHighTaskPriority(task.priority)),
    [pendingTasks]
  );

  const longTasks = useMemo(
    () => pendingTasks.filter((task) => (task.estimated_duration_min ?? 0) >= 90),
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
        title: "Llevalas al calendario",
        description:
          "Puedes convertir tareas pendientes en bloques planificados para la semana.",
        tone: "info",
      };
    }

    return {
      id: "done",
      title: "Todo esta al dia",
      description:
        "No tienes tareas pendientes ahora mismo. Buen momento para preparar la siguiente semana.",
      tone: "info",
    };
  }, [highPriorityTasks.length, longTasks.length, pendingTasks.length]);

  const toneStyles = {
    info: "border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
    focus: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    urgent: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  };

  function showSuccess(message: string) {
    setSaveSuccess(message);
    setTimeout(() => setSaveSuccess(""), 3000);
  }

  async function handlePrioritizeTasks() {
    setAiError("");

    if (pendingTasks.length === 0) {
      setAiError("No tienes tareas pendientes para priorizar.");
      return;
    }

    setPrioritizeModalOpen(true);
  }

  async function handleSelectTaskToPrioritize(
    taskId: string,
    action?: "up" | "down" | "auto"
  ) {
    setAiLoading(true);
    setPrioritizeModalOpen(false);

    try {
      const res = await prioritizeTask(taskId, action);
      setAiLoading(false);

      if (res?.error) {
        setAiError(res.error);
        return;
      }

      showSuccess(res.message || "Tarea priorizada correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error priorizando tarea:", error);
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
        const selectedTask = pendingTasks.find((task) => task.id === taskId);
        setSelectedSplitTask(selectedTask ?? null);
        setSuggestedSplit(res.data);
        setSplitPlanOpen(true);
      }
    } catch (error) {
      console.error("Error dividiendo tarea:", error);
      setAiError("Error al dividir tarea.");
      setAiLoading(false);
    }
  }

  async function handleSaveSplitTasks() {
    if (!suggestedSplit?.sessions?.length) {
      setAiError("No hay sesiones para guardar.");
      return;
    }

    if (!selectedSplitTask) {
      setAiError("No se encontro la tarea original.");
      return;
    }

    setAiError("");
    setSaveSuccess("");
    setSavingSplitTasks(true);

    const res = await createTasksFromSplitTask({
      originalTaskId: selectedSplitTask.id,
      originalTaskTitle: selectedSplitTask.title,
      sessions: suggestedSplit.sessions,
    });

    setSavingSplitTasks(false);

    if (res?.error) {
      setAiError(res.error);
      return;
    }

    showSuccess(
      `${res.created || suggestedSplit.sessions.length} tareas creadas correctamente. La tarea original fue archivada.`
    );
    setSplitPlanOpen(false);
    router.refresh();
  }

  async function handleScheduleTasks() {
    setAiError("");
    setAiLoading(true);

    try {
      const res = await distributeWeeklyTasks();
      setAiLoading(false);

      if (res?.error) {
        setAiError(res.error);
        return;
      }

      showSuccess(res.message || "Tareas repartidas correctamente en la semana.");
      router.refresh();
    } catch (error) {
      console.error("Error repartiendo tareas:", error);
      setAiError("Error al llevar las tareas al calendario.");
      setAiLoading(false);
    }
  }

  async function handleCommandAction() {
    const trimmedCommand = command.trim();
    if (!trimmedCommand || aiLoading) {
      return;
    }

    setAiError("");
    setSaveSuccess("");

    const normalizedCommand = normalizeSearchText(trimmedCommand);
    const matchedTask = findTaskByPrompt(trimmedCommand, pendingTasks);

    if (
      normalizedCommand.includes("divid") ||
      normalizedCommand.includes("troce") ||
      normalizedCommand.includes("sesion")
    ) {
      setCommand("");
      if (matchedTask) {
        await handleSelectTaskToSplit(matchedTask.id);
        return;
      }

      await handleSplitTasks();
      return;
    }

    if (
      normalizedCommand.includes("prioriz") ||
      normalizedCommand.includes("importante") ||
      normalizedCommand.includes("urgente")
    ) {
      setCommand("");
      if (matchedTask) {
        await handleSelectTaskToPrioritize(matchedTask.id, "auto");
        return;
      }

      await handlePrioritizeTasks();
      return;
    }

    if (
      normalizedCommand.includes("calendario") ||
      normalizedCommand.includes("agenda") ||
      normalizedCommand.includes("planifica") ||
      normalizedCommand.includes("programa")
    ) {
      setCommand("");
      await handleScheduleTasks();
      return;
    }

    setAiError(
      'Prueba con algo como "Divide \'Trabajo final\'" o "Lleva mis tareas al calendario".'
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Tareas</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gestiona tus tareas flexibles y deja que la IA te ayude a priorizarlas
        </p>
      </div>

      <div className="app-card p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr_1.35fr] gap-4 xl:items-center">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Asistente IA</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Comandos rapidos para organizar tus tareas
              </p>

              <div className={`rounded-xl border px-3 py-2.5 ${toneStyles[suggestion.tone]}`}>
                <p className="text-sm font-semibold">{suggestion.title}</p>
                <p className="text-xs mt-0.5 opacity-90">{suggestion.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-[520px] w-full justify-self-center">
            <button
              type="button"
              onClick={handleSplitTasks}
              disabled={aiLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={() => void handleScheduleTasks()}
              disabled={aiLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarClock className="w-4 h-4" />
              )}
              {aiLoading ? "Repartiendo..." : "Al calendario"}
            </button>
          </div>

          <div className="w-full xl:max-w-[620px] xl:justify-self-end">
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCommandAction();
                  }
                }}
                placeholder='Ej. "Divide matematicas en 3 sesiones"'
                className="app-input h-12 px-4"
              />
              <button
                type="button"
                onClick={() => void handleCommandAction()}
                disabled={aiLoading || !command.trim()}
                className="app-button-gradient h-12 shrink-0 px-6"
                
              >
                Probar
              </button>
            </div>
          </div>
        </div>
      </div>

      {aiError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{aiError}</p>
        </div>
      ) : null}

      {saveSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <p className="text-sm font-medium">{saveSuccess}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <Circle className="w-4 h-4" />
            <span className="text-sm font-medium">Pendientes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{pendingTasks.length}</p>
        </div>

        <div className="app-card p-4">
          <div className="flex items-center gap-2 text-rose-500">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Alta prioridad</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{highPriorityTasks.length}</p>
        </div>

        <div className="app-card p-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completadas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{completedTasks.length}</p>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden">
        <TasksClient initialTasks={initialTasks} />
      </div>

      {prioritizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPrioritizeModalOpen(false)}
          />
          <div className="app-modal relative w-full max-w-2xl space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Ajustar prioridad de tareas
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Elige una tarea y ajusta su prioridad
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrioritizeModalOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingTasks.map((task) => {
                const currentPriority = toTaskPriorityLabel(task.priority);

                return (
                  <div
                    key={task.id}
                    className="w-full rounded-2xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${taskPriorityColors[currentPriority]}`}
                          >
                            {taskPriorityLabels[currentPriority]}
                          </span>
                          {task.estimated_duration_min && (
                            <span className="text-xs text-muted-foreground">
                              {task.estimated_duration_min} min
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSelectTaskToPrioritize(task.id, "up")}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        <Target className="w-3 h-3" />
                        Subir
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSelectTaskToPrioritize(task.id, "down")}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-all disabled:opacity-50"
                      >
                        <Target className="w-3 h-3" />
                        Bajar
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSelectTaskToPrioritize(task.id, "auto")}
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
                <p className="text-sm text-muted-foreground">
                  No tienes tareas pendientes para priorizar
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {splitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSplitModalOpen(false)}
          />
          <div className="app-modal relative w-full max-w-2xl space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Dividir tarea</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Elige una tarea para que la IA la divida en sesiones mas pequenas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSplitModalOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingTasks.map((task) => {
                const currentPriority = toTaskPriorityLabel(task.priority);

                return (
                  <div
                    key={task.id}
                    className="w-full cursor-pointer rounded-2xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-card"
                    onClick={() => void handleSelectTaskToSplit(task.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${taskPriorityColors[currentPriority]}`}
                          >
                            {taskPriorityLabels[currentPriority]}
                          </span>
                          {task.estimated_duration_min && (
                            <span className="text-xs text-muted-foreground">
                              {task.estimated_duration_min} min
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                  No tienes tareas pendientes para dividir
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {splitPlanOpen && suggestedSplit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSplitPlanOpen(false)}
          />
          <div className="app-modal relative w-full max-w-2xl space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Tarea dividida</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{selectedSplitTask?.title}</p>
              </div>

              <button
                type="button"
                onClick={() => setSplitPlanOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
              <p className="text-sm font-semibold text-purple-700">Resumen</p>
              <p className="text-sm text-purple-600 mt-1">{suggestedSplit.summary}</p>
            </div>

            <div className="space-y-3">
              {suggestedSplit.sessions.map((session, index) => (
                <div
                  key={`${session.title}-${index}`}
                  className="rounded-2xl border border-border bg-muted/35 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{session.focus}</p>
                      {session.suggestedTime && (
                        <p className="text-xs text-purple-600 mt-2">
                          Sugerido: {new Date(session.suggestedTime).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {session.durationMin} min
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">{session.reason}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSplitPlanOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveSplitTasks}
                disabled={savingSplitTasks}
                className="brand-gradient px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
                
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

