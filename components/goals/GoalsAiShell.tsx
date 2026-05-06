"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    suggestGoalSessions,
    createTasksFromSuggestedSessions,
    prioritizeGoal,
    distributeWeeklyTasks,
} from "@/app/actions";
import {
    Sparkles,
    BookOpen,
    Target,
    TrendingUp,
    Trophy,
    Flame,
    X,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { GoalsClient } from "@/app/(dashboard)/dashboard/goals/goals-client";

type Goal = {
    id: string;
    title: string;
    description?: string | null;
    category: "academic" | "personal" | "habit";
    current_value: number;
    target_value: number;
    unit: string;
    due_date?: string | null;
    status: "active" | "completed" | "paused";
    streak?: number;
    created_at: string;
    priority?: 'low' | 'medium' | 'high';
};

type SuggestedSession = {
    title: string;
    durationMin: number;
    focus: string;
    reason: string;
};

type GoalPlanResult = {
    summary: string;
    sessions: SuggestedSession[];
};

type GoalsAiShellProps = {
    initialGoals: Goal[];
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

function findGoalByPrompt(prompt: string, goals: Goal[], category?: Goal["category"]) {
    const normalizedPrompt = normalizeSearchText(prompt);
    const quotedGoalTitle = extractQuotedText(prompt);
    const candidateGoals = category
        ? goals.filter((goal) => goal.category === category)
        : goals;

    if (quotedGoalTitle) {
        const normalizedQuotedTitle = normalizeSearchText(quotedGoalTitle);
        const exactMatch =
            candidateGoals.find(
                (goal) => normalizeSearchText(goal.title) === normalizedQuotedTitle
            ) ??
            candidateGoals.find((goal) =>
                normalizeSearchText(goal.title).includes(normalizedQuotedTitle)
            );

        if (exactMatch) {
            return exactMatch;
        }
    }

    return candidateGoals.find((goal) =>
        normalizedPrompt.includes(normalizeSearchText(goal.title))
    );
}

export function GoalsAiShell({ initialGoals }: GoalsAiShellProps) {
    const router = useRouter();
    const [command, setCommand] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [planOpen, setPlanOpen] = useState(false);
    const [planGoalTitle, setPlanGoalTitle] = useState("");
    const [selectedPlanGoal, setSelectedPlanGoal] = useState<Goal | null>(null);
    const [suggestedPlan, setSuggestedPlan] = useState<GoalPlanResult | null>(null);
    const [savingTasks, setSavingTasks] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState("");
    const [prioritizeModalOpen, setPrioritizeModalOpen] = useState(false);
    const [sessionsModalOpen, setSessionsModalOpen] = useState(false);

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
                    goal.target_value > 0
                        ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
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
                text: `Tienes ${academicGoals.length} objetivo${academicGoals.length === 1 ? "" : "s"
                    } acadÃ©mico${academicGoals.length === 1 ? "" : "s"
                    } activo${academicGoals.length === 1 ? "" : "s"} listo${academicGoals.length === 1 ? "" : "s"
                    } para planificar.`,
                style: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
            };
        }

        if (activeGoals.length > 0) {
            return {
                title: "MantÃ©n el seguimiento",
                text: "Actualiza el progreso de tus objetivos para que la IA pueda priorizar mejor tu semana.",
                style: "border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
            };
        }

        return {
            title: "Empieza por tu prÃ³ximo hito",
            text: "Crea tu primer objetivo para que TaskIA pueda ayudarte a convertirlo en progreso real.",
            style: "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300",
        };
    }, [academicGoals.length, activeGoals.length]);

    function showSuccess(message: string) {
        setSaveSuccess(message);
        setTimeout(() => setSaveSuccess(""), 3000);
    }

    async function handleSuggestSessions() {
        setAiError("");

        if (academicGoals.length === 0) {
            setAiError("No tienes ningÃºn objetivo acadÃ©mico activo.");
            return;
        }

        setSessionsModalOpen(true);
    }

    async function handleSelectGoalForSessions(goalId: string) {
        setAiLoading(true);
        setSessionsModalOpen(false);

        try {
            const res = (await suggestGoalSessions(goalId)) as {
                error?: string;
                data?: GoalPlanResult;
            };

            setAiLoading(false);

            if (res?.error) {
                setAiError(res.error);
                return;
            }

            if (res?.data) {
                console.log('Sesiones sugeridas:', res.data);
                const selectedGoal = academicGoals.find((goal) => goal.id === goalId);
                setSelectedPlanGoal(selectedGoal ?? null);
                setPlanGoalTitle(selectedGoal?.title || '');
                setSuggestedPlan(res.data);
                setPlanOpen(true);
            }
        } catch (error) {
            console.error('Error obteniendo sugerencias:', error);
            setAiError("Error al obtener sugerencias de sesiones.");
            setAiLoading(false);
        }
    }

    async function handleSaveSuggestedSessions() {
        if (!selectedPlanGoal || !suggestedPlan?.sessions?.length) {
            setAiError("No hay sesiones para guardar.");
            return;
        }

        setAiError("");
        setSaveSuccess("");
        setSavingTasks(true);

        const res = await createTasksFromSuggestedSessions({
            goalId: selectedPlanGoal.id,
            goalTitle: selectedPlanGoal.title,
            sessions: suggestedPlan.sessions,
        });

        setSavingTasks(false);

        if (res?.error) {
            setAiError(res.error);
            return;
        }

        showSuccess(`${res.created ?? suggestedPlan.sessions.length} tareas creadas correctamente.`);
        setPlanOpen(false);
        router.refresh();
    }

    async function handlePrioritizeGoals() {
        setAiError("");

        if (activeGoals.length === 0) {
            setAiError("No tienes objetivos activos para priorizar.");
            return;
        }

        setPrioritizeModalOpen(true);
    }

    async function handleSelectGoalToPrioritize(goalId: string, action?: 'up' | 'down' | 'auto') {
        setAiLoading(true);
        setPrioritizeModalOpen(false);

        try {
            const res = await prioritizeGoal(goalId, action);
            setAiLoading(false);

            if (res?.error) {
                setAiError(res.error);
                return;
            }

            showSuccess(res.message || "Objetivo priorizado correctamente.");
            router.refresh();
            
            // Limpiar el mensaje de Ã©xito despuÃ©s de 3 segundos
            setTimeout(() => setSaveSuccess(""), 3000);
            
        } catch (error) {
            console.error('Error priorizando objetivo:', error);
            setAiError("Error al priorizar objetivo.");
            setAiLoading(false);
        }
    }

    async function handleDistributeWeeklyTasks() {
        setAiError("");
        setAiLoading(true);

        try {
            const res = await distributeWeeklyTasks();
            setAiLoading(false);

            if (res?.error) {
                setAiError(res.error);
                return;
            }

            showSuccess(res.message || "Tareas repartidas correctamente.");
            router.refresh();
            
            // Limpiar el mensaje de Ã©xito despuÃ©s de 3 segundos
            setTimeout(() => setSaveSuccess(""), 3000);
            
        } catch (error) {
            console.error('Error repartiendo tareas semanales:', error);
            setAiError("Error al repartir tareas semanales.");
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
        const matchedAcademicGoal = findGoalByPrompt(trimmedCommand, academicGoals, "academic");
        const matchedActiveGoal = findGoalByPrompt(trimmedCommand, activeGoals);

        if (
            normalizedCommand.includes("sesion") ||
            normalizedCommand.includes("planifica") ||
            normalizedCommand.includes("divide") ||
            normalizedCommand.includes("estudio")
        ) {
            setCommand("");

            if (matchedAcademicGoal) {
                await handleSelectGoalForSessions(matchedAcademicGoal.id);
                return;
            }

            await handleSuggestSessions();
            return;
        }

        if (
            normalizedCommand.includes("prioriz") ||
            normalizedCommand.includes("urgente") ||
            normalizedCommand.includes("importante")
        ) {
            setCommand("");

            if (matchedActiveGoal) {
                await handleSelectGoalToPrioritize(matchedActiveGoal.id, "auto");
                return;
            }

            await handlePrioritizeGoals();
            return;
        }

        if (
            normalizedCommand.includes("reparte") ||
            normalizedCommand.includes("distribu") ||
            normalizedCommand.includes("semana") ||
            normalizedCommand.includes("calendario") ||
            normalizedCommand.includes("tareas")
        ) {
            setCommand("");
            await handleDistributeWeeklyTasks();
            return;
        }

        setAiError(
            'Prueba con algo como "Crea sesiones para \'Examen de historia\'" o "Prioriza mi objetivo de ingles".'
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Mis Objetivos</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Sigue tu progreso y deja que la IA te ayude a convertir metas en sesiones
                </p>
            </div>

            <div className="app-card p-4">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr_1.35fr] gap-4 xl:items-center">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">Asistente IA</p>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Sugerencias rÃ¡pidas para tus objetivos
                            </p>

                            <div className={`rounded-xl border px-3 py-2.5 ${suggestion.style}`}>
                                <p className="text-sm font-semibold">{suggestion.title}</p>
                                <p className="text-xs mt-0.5 opacity-90">{suggestion.text}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-w-[520px] w-full justify-self-center">
                        <button
                            type="button"
                            onClick={handleSuggestSessions}
                            disabled={aiLoading || academicGoals.length === 0}
                            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <BookOpen className="w-4 h-4" />
                            )}
                            {aiLoading ? "Generando..." : "Crear sesiones"}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrioritizeGoals}
                            disabled={aiLoading}
                            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Target className="w-4 h-4" />
                            )}
                            {aiLoading ? "Priorizando..." : "Priorizar"}
                        </button>

                        <button
                            type="button"
                            onClick={handleDistributeWeeklyTasks}
                            disabled={aiLoading}
                            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {aiLoading ? "Repartiendo..." : "Repartir"}
                        </button>
                    </div>

                    <div className="w-full xl:max-w-[620px] xl:justify-self-end">
                        <div className="flex gap-2">
                            <input
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void handleCommandAction();
                                    }
                                }}
                                placeholder='Ej. "Divide historia en 4 sesiones antes del viernes"'
                                className="app-input h-12 px-4"
                            />
                            <button
                                type="button"
                                onClick={() => void handleCommandAction()}
                                disabled={aiLoading || !command.trim()}
                                className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-6 text-sm font-semibold text-white transition-all hover:brightness-110"
                                
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="app-card p-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Progreso medio</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{avgProgress}%</p>
                </div>

                <div className="app-card p-4">
                    <div className="flex items-center gap-2 text-orange-500">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm font-medium">Mejor racha</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{maxStreak}</p>
                </div>

                <div className="app-card p-4">
                    <div className="flex items-center gap-2 text-violet-600">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-medium">Completados</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{completedGoals.length}</p>
                </div>

                <div className="app-card p-4">
                    <div className="flex items-center gap-2 text-sky-600">
                        <Target className="w-4 h-4" />
                        <span className="text-sm font-medium">Activos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{activeGoals.length}</p>
                </div>
            </div>

            {planOpen && suggestedPlan ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setPlanOpen(false)}
                    />
                    <div className="app-modal relative w-full max-w-2xl space-y-5 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    Sesiones sugeridas
                                </h3>
                                <p className="mt-0.5 text-sm text-muted-foreground">{planGoalTitle}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPlanOpen(false)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <p className="text-sm font-semibold text-emerald-700">Resumen</p>
                            <p className="text-sm text-emerald-600 mt-1">{suggestedPlan.summary}</p>
                        </div>

                        <div className="space-y-3">
                            {suggestedPlan.sessions.map((session, index) => (
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
                                onClick={() => setPlanOpen(false)}
                                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                            >
                                Cerrar
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveSuggestedSessions}
                                disabled={savingTasks}
                                className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                                
                            >
                                {savingTasks ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {savingTasks ? "Guardando..." : "Guardar como tareas"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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
                                    Ajustar prioridad de objetivos
                                </h3>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Elige un objetivo y ajusta su prioridad
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
                            {activeGoals.map((goal) => {
                                const progress = goal.target_value > 0 
                                    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                                    : 0;
                                
                                const categoryColors = {
                                    academic: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                    personal: "bg-blue-100 text-blue-700 border-blue-200",
                                    habit: "bg-purple-100 text-purple-700 border-purple-200"
                                };

                                const priorityColors = {
                                    low: "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
                                    medium: "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                                    high: "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                                };

                                const priorityLabels = {
                                    low: "Baja",
                                    medium: "Media",
                                    high: "Alta"
                                };

                                const categoryLabels = {
                                    academic: "AcadÃ©mico",
                                    personal: "Personal",
                                    habit: "HÃ¡bito"
                                };

                                const currentPriority = goal.priority || 'medium';

                                return (
                                    <div
                                        key={goal.id}
                                        className="w-full rounded-2xl border border-border bg-muted/30 p-4 transition-all hover:border-emerald-400/60 hover:bg-card"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="truncate text-sm font-semibold text-foreground">
                                                        {goal.title}
                                                    </h4>
                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium border ${categoryColors[goal.category || 'personal']}`}>
                                                        {categoryLabels[goal.category || 'personal']}
                                                    </span>
                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium border ${priorityColors[currentPriority]}`}>
                                                        {priorityLabels[currentPriority]}
                                                    </span>
                                                </div>
                                                
                                                {goal.description && (
                                                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                                                        {goal.description}
                                                    </p>
                                                )}

                                                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>
                                                        Progreso: {goal.current_value}/{goal.target_value} {goal.unit}
                                                    </span>
                                                    <span>
                                                        {progress}% completado
                                                    </span>
                                                    {goal.due_date && (
                                                        <span>
                                                            LÃ­mite: {new Date(goal.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSelectGoalToPrioritize(goal.id, 'down')}
                                                        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                                                    >
                                                        <span className="mr-1">-</span> Bajar
                                                    </button>
                                                    <button
                                                        onClick={() => handleSelectGoalToPrioritize(goal.id, 'auto')}
                                                        className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-all"
                                                    >
                                                        <span className="mr-1">Auto</span> IA
                                                    </button>
                                                    <button
                                                        onClick={() => handleSelectGoalToPrioritize(goal.id, 'up')}
                                                        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                                                    >
                                                        <span className="mr-1">+</span> Subir
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                                                    <Target className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setPrioritizeModalOpen(false)}
                                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sessionsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSessionsModalOpen(false)}
                    />
                    <div className="app-modal relative w-full max-w-2xl space-y-5 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    Seleccionar objetivo para sesiones
                                </h3>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Elige quÃ© objetivo acadÃ©mico quieres convertir en sesiones de estudio
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSessionsModalOpen(false)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {academicGoals.map((goal) => {
                                const progress = goal.target_value > 0 
                                    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                                    : 0;
                                
                                const priorityColors = {
                                    low: "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
                                    medium: "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                                    high: "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                                };

                                const priorityLabels = {
                                    low: "Baja",
                                    medium: "Media",
                                    high: "Alta"
                                };

                                const currentPriority = goal.priority || 'medium';

                                return (
                                    <button
                                        key={goal.id}
                                        onClick={() => handleSelectGoalForSessions(goal.id)}
                                        className="w-full rounded-2xl border border-border bg-muted/30 p-4 text-left transition-all hover:border-emerald-400/60 hover:bg-card"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="truncate text-sm font-semibold text-foreground">
                                                        {goal.title}
                                                    </h4>
                                                    <span className="shrink-0 rounded-full px-2 py-1 text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-200">
                                                        AcadÃ©mico
                                                    </span>
                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium border ${priorityColors[currentPriority]}`}>
                                                        {priorityLabels[currentPriority]}
                                                    </span>
                                                </div>
                                                
                                                {goal.description && (
                                                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                                                        {goal.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>
                                                        Progreso: {goal.current_value}/{goal.target_value} {goal.unit}
                                                    </span>
                                                    <span>
                                                        {progress}% completado
                                                    </span>
                                                    {goal.due_date && (
                                                        <span>
                                                            LÃ­mite: {new Date(goal.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setSessionsModalOpen(false)}
                                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <GoalsClient
                    initialGoals={initialGoals.map((goal) => ({
                        ...goal,
                        description: goal.description ?? undefined,
                        due_date: goal.due_date ?? undefined,
                    }))}
                />
            </div>
        </div>
    );
}

