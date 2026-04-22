"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import {
  createFixedCommitment,
  deleteFixedCommitment,
  updateFixedCommitment,
} from "@/app/actions"

const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

type CommitmentType = "clase" | "actividad" | "otro"

export type Commitment = {
  id: string
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
  color: string
  fixedCommitmentIds: string[]
  blockIds: string[]
  createdAt?: string | null
  source: "fixed_commitment" | "legacy_scheduled_block"
}

type CommitmentFormValues = {
  title: string
  type: CommitmentType
  days: number[]
  startTime: string
  endTime: string
}

const typeOptions = [
  { key: "clase" as const, label: "Clase", icon: BookOpen },
  { key: "actividad" as const, label: "Actividad", icon: Activity },
  { key: "otro" as const, label: "Otro", icon: MoreHorizontal },
]

function sortCommitments(items: Commitment[]) {
  return [...items].sort((a, b) => {
    if (a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime)
    }

    return a.title.localeCompare(b.title, "es")
  })
}

function formatDays(days: number[]) {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => DAYS[day] ?? "")
    .filter(Boolean)
    .join(", ")
}

function CommitmentModal({
  commitment,
  onClose,
  onSaved,
}: {
  commitment?: Commitment | null
  onClose: () => void
  onSaved: (commitment: Commitment) => void
}) {
  const [form, setForm] = useState<CommitmentFormValues>({
    title: commitment?.title ?? "",
    type: commitment?.type ?? "clase",
    days: commitment?.days ?? [0, 1, 2, 3, 4],
    startTime: commitment?.startTime ?? "08:00",
    endTime: commitment?.endTime ?? "09:00",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const toggleDay = (dayIndex: number) => {
    setForm((current) => {
      const nextDays = current.days.includes(dayIndex)
        ? current.days.filter((day) => day !== dayIndex)
        : [...current.days, dayIndex].sort((a, b) => a - b)

      return { ...current, days: nextDays }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!form.title.trim()) {
      setError("El titulo es obligatorio.")
      return
    }

    if (form.days.length === 0) {
      setError("Selecciona al menos un dia.")
      return
    }

    if (form.endTime <= form.startTime) {
      setError("La hora de fin debe ser posterior a la de inicio.")
      return
    }

    setLoading(true)

    const response = commitment
      ? await updateFixedCommitment({
          id: commitment.id,
          title: form.title.trim(),
          type: form.type,
          days: form.days,
          startTime: form.startTime,
          endTime: form.endTime,
          fixedCommitmentIds: commitment.fixedCommitmentIds,
          blockIds: commitment.blockIds,
        })
      : await createFixedCommitment({
          title: form.title.trim(),
          type: form.type,
          days: form.days,
          startTime: form.startTime,
          endTime: form.endTime,
        })

    setLoading(false)

    if (response?.error) {
      setError(response.error)
      return
    }

    if (response?.commitment) {
      onSaved(response.commitment as Commitment)
      onClose()
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">
              {commitment ? "Editar compromiso" : "Nuevo compromiso fijo"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Estos bloques se reflejan en tu calendario semanal.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className={labelClass}>Titulo</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Ej. Clase de matematicas"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Tipo</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {typeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = form.type === option.key

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, type: option.key }))
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-teal-300 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>Dias</label>
            <div className="mt-1 grid grid-cols-7 gap-2">
              {DAYS.map((day, index) => {
                const selected = form.days.includes(index)

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                      selected
                        ? "bg-gradient-to-b from-teal-400 to-teal-600 text-white shadow-md shadow-teal-200"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {day[0]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Inicio</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #1e2d5e, #2d4a8a)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading
                ? "Guardando..."
                : commitment
                ? "Guardar cambios"
                : "Crear compromiso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FixedCommitmentsClient({
  initialCommitments,
}: {
  initialCommitments: Commitment[]
}) {
  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments)
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(
    null
  )
  const [showNewModal, setShowNewModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalWeeklyBlocks = useMemo(
    () => commitments.reduce((sum, commitment) => sum + commitment.days.length, 0),
    [commitments]
  )

  const legacyCount = useMemo(
    () =>
      commitments.filter(
        (commitment) => commitment.source === "legacy_scheduled_block"
      ).length,
    [commitments]
  )

  const handleDelete = async (commitment: Commitment) => {
    const confirmed = window.confirm(
      `Se eliminara "${commitment.title}" y sus bloques recurrentes del calendario.`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(commitment.id)

    const response = await deleteFixedCommitment({
      id: commitment.id,
      fixedCommitmentIds: commitment.fixedCommitmentIds,
      blockIds: commitment.blockIds,
    })

    setDeletingId(null)

    if (response?.error) {
      window.alert(response.error)
      return
    }

    setCommitments((current) =>
      current.filter((item) => item.id !== commitment.id)
    )
  }

  const handleCreated = (commitment: Commitment) => {
    setCommitments((current) => sortCommitments([commitment, ...current]))
  }

  const handleUpdated = (commitment: Commitment) => {
    setCommitments((current) =>
      sortCommitments(
        current.map((item) => (item.id === commitment.id ? commitment : item))
      )
    )
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">
      {showNewModal ? (
        <CommitmentModal
          onClose={() => setShowNewModal(false)}
          onSaved={handleCreated}
        />
      ) : null}

      {editingCommitment ? (
        <CommitmentModal
          commitment={editingCommitment}
          onClose={() => setEditingCommitment(null)}
          onSaved={handleUpdated}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">
            Compromisos fijos
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Gestiona clases, actividades y bloques recurrentes creados desde tu
            onboarding.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(90deg, #1e2d5e, #2d4a8a)" }}
        >
          <Plus className="h-4 w-4" />
          Nuevo compromiso
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#1e2d5e]">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-medium">Compromisos activos</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">
            {commitments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm font-medium">Bloques por semana</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">
            {totalWeeklyBlocks}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Pendientes de migrar</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">
            {legacyCount}
          </p>
        </div>
      </div>

      {commitments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-gray-200" />
          <p className="mt-4 text-base font-semibold text-gray-600">
            Aun no tienes compromisos fijos registrados.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Puedes anadir clases o actividades recurrentes para que TaskIA las
            tenga en cuenta al planificar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {commitments.map((commitment) => {
            const Icon =
              commitment.type === "clase"
                ? BookOpen
                : commitment.type === "actividad"
                ? Activity
                : MoreHorizontal

            const deleting = deletingId === commitment.id

            return (
              <div
                key={commitment.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: commitment.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-[#0f172a]">
                        {commitment.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatDays(commitment.days)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-600">
                          {commitment.type}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          {commitment.startTime} - {commitment.endTime}
                        </span>
                        {commitment.source === "legacy_scheduled_block" ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                            Importado del registro
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCommitment(commitment)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#1e2d5e]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(commitment)}
                      disabled={deleting}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
