"use client";

import { useMemo, useState } from "react";
import {
    suggestGoalSessions,
    createTasksFromSuggestedSessions,
    prioritizeGoal,
    distributeWeeklyTasks,
} from "@/app/actions";
import {
    Sparkles,
    BookOpen,
    CalendarClock,
    Target,
    TrendingUp,
    Trophy,
    Flame,
    Brain,
    X,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { GoalsClient } from "@/app/(dashboard)/dashboard/goals/goals-client";

type Goal = {
    id: string;
    title: string;
    description?: string;
    category?: "academic" | "personal" | "habit";
    current_value: number;
    target_value: number;
    unit: string;
    due_date?: string;
    status?: "active" | "completed" | "paused";
    streak?: number;
    created_at?: string;
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

export function GoalsAiShell({ initialGoals }: GoalsAiShellProps) {
    const [command, setCommand] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [planOpen, setPlanOpen] = useState(false);
    const [planGoalTitle, setPlanGoalTitle] = useState("");
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

    const selectedAcademicGoal = useMemo(() => {
        return activeGoals.find((goal) => goal.category === "academic") ?? null;
    }, [activeGoals]);

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
                    } académico${academicGoals.length === 1 ? "" : "s"
                    } activo${academicGoals.length === 1 ? "" : "s"} listo${academicGoals.length === 1 ? "" : "s"
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

    async function handleSuggestSessions() {
        setAiError("");

        if (academicGoals.length === 0) {
            setAiError("No tienes ningún objetivo académico activo.");
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
                const selectedGoal = academicGoals.find(g => g.id === goalId);
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
        if (!selectedAcademicGoal || !suggestedPlan?.sessions?.length) {
            setAiError("No hay sesiones para guardar.");
            return;
        }

        setAiError("");
        setSaveSuccess("");
        setSavingTasks(true);

        const res = await createTasksFromSuggestedSessions({
            goalId: selectedAcademicGoal.id,
            goalTitle: selectedAcademicGoal.title,
            sessions: suggestedPlan.sessions,
        });

        setSavingTasks(false);

        if (res?.error) {
            setAiError(res.error);
            return;
        }

        setSaveSuccess(`${res.created ?? suggestedPlan.sessions.length} tareas creadas correctamente.`);
        setPlanOpen(false);
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

            setSaveSuccess(res.message || "Objetivo priorizado correctamente.");
            
            // Limpiar el mensaje de éxito después de 3 segundos
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

            setSaveSuccess(res.message || "Tareas repartidas correctamente.");
            
            // Limpiar el mensaje de éxito después de 3 segundos
            setTimeout(() => setSaveSuccess(""), 3000);
            
        } catch (error) {
            console.error('Error repartiendo tareas semanales:', error);
            setAiError("Error al repartir tareas semanales.");
            setAiLoading(false);
        }
    }

    return (
        <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f172a]">Mis Objetivos</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    Sigue tu progreso y deja que la IA te ayude a convertir metas en sesiones
                </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr_1.35fr] gap-4 xl:items-center">
                    <div className="flex items-start gap-3 min-w-0">
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
                            onClick={handleSuggestSessions}
                            disabled={aiLoading || academicGoals.length === 0}
                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Target className="w-4 h-4" />
                            )}
                            {aiLoading ? "Priorizando..." : "Priorizar"}
                        </button>
                    </div>

                    <div className="w-full xl:max-w-[620px] xl:justify-self-end">
                        <div className="flex gap-2">
                            <input
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder='Ej. "Divide historia en 4 sesiones antes del viernes"'
                                className="flex-1 h-12 rounded-xl border border-gray-200 px-4 text-sm text-gray-700 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                            />
                            <button
                                type="button"
                                className="h-12 px-6 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shrink-0"
                                style={{ background: "linear-gradient(90deg, #10b981, #059669)" }}
                            >
                                Probar
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

            {planOpen && suggestedPlan ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setPlanOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0f172a]">
                                    Sesiones sugeridas
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">{planGoalTitle}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPlanOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                                    className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#0f172a]">
                                                {session.title}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{session.focus}</p>
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
                                onClick={() => setPlanOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                Cerrar
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveSuggestedSessions}
                                disabled={savingTasks}
                                className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                                style={{ background: "linear-gradient(90deg, #10b981, #059669)" }}
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
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0f172a]">
                                    Ajustar prioridad de objetivos
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    Elige un objetivo y ajusta su prioridad
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
                                    low: "bg-gray-100 text-gray-600 border-gray-300",
                                    medium: "bg-blue-100 text-blue-600 border-blue-300",
                                    high: "bg-red-100 text-red-600 border-red-300"
                                };

                                const priorityLabels = {
                                    low: "Baja",
                                    medium: "Media",
                                    high: "Alta"
                                };

                                const categoryLabels = {
                                    academic: "Académico",
                                    personal: "Personal",
                                    habit: "Hábito"
                                };

                                const currentPriority = goal.priority || 'medium';

                                return (
                                    <div
                                        key={goal.id}
                                        className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] p-4 hover:bg-white hover:border-emerald-300 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-sm font-semibold text-[#0f172a] truncate">
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
                                                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                                        {goal.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                                    <span>
                                                        Progreso: {goal.current_value}/{goal.target_value} {goal.unit}
                                                    </span>
                                                    <span>
                                                        {progress}% completado
                                                    </span>
                                                    {goal.due_date && (
                                                        <span>
                                                            Límite: {new Date(goal.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSelectGoalToPrioritize(goal.id, 'down')}
                                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
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
                                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
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
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
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
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0f172a]">
                                    Seleccionar objetivo para sesiones
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    Elige qué objetivo académico quieres convertir en sesiones de estudio
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSessionsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                                    low: "bg-gray-100 text-gray-600 border-gray-300",
                                    medium: "bg-blue-100 text-blue-600 border-blue-300",
                                    high: "bg-red-100 text-red-600 border-red-300"
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
                                        className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] p-4 hover:bg-white hover:border-emerald-300 transition-all text-left"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-sm font-semibold text-[#0f172a] truncate">
                                                        {goal.title}
                                                    </h4>
                                                    <span className="shrink-0 rounded-full px-2 py-1 text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-200">
                                                        Académico
                                                    </span>
                                                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium border ${priorityColors[currentPriority]}`}>
                                                        {priorityLabels[currentPriority]}
                                                    </span>
                                                </div>
                                                
                                                {goal.description && (
                                                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                                        {goal.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                                    <span>
                                                        Progreso: {goal.current_value}/{goal.target_value} {goal.unit}
                                                    </span>
                                                    <span>
                                                        {progress}% completado
                                                    </span>
                                                    {goal.due_date && (
                                                        <span>
                                                            Límite: {new Date(goal.due_date).toLocaleDateString()}
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
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-3xl overflow-hidden">
                <GoalsClient initialGoals={initialGoals as any} />
            </div>
        </div>
    );
}