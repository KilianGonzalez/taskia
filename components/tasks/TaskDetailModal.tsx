'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Tag, X, AlertCircle, Loader2, Trash2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  category?: string
  priority?: string
  due_date?: string
  estimated_duration_min?: number
  difficulty?: number
  notes?: string
  completed: boolean
  completed_at?: string
  created_at: string
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-950' },
  media: { label: 'Media', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  baja:  { label: 'Baja',  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950' },
}

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onComplete?: () => void
  onDelete?: () => void
  onEdit?: () => void
  showCompleteButton?: boolean
}

export function TaskDetailModal({ 
  task, 
  onClose, 
  onComplete, 
  onDelete, 
  onEdit, 
  showCompleteButton = true 
}: TaskDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleComplete = async () => {
    if (!onComplete) return
    setLoading(true)
    await onComplete()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    setLoading(true)
    await onDelete()
    setLoading(false)
  }

  const priority = priorityConfig[String(task.priority ?? '')] || priorityConfig.baja

  // Separar la descripción de los metadatos
  const parseTaskNotes = (notes?: string) => {
    if (!notes) return { description: '', metadata: [] }
    
    const lines = notes.split('\n').filter(line => line.trim())
    const metadata: string[] = []
    let description = ''
    
    lines.forEach(line => {
      // Patrones para identificar metadatos
      const isMetadata = 
        line.includes('Creada por IA') || 
        line.includes('Goal ID:') || 
        line.includes('objetivo') || 
        line.includes('Focus:') || 
        line.includes('Reason:') || 
        line.includes('Orden sugerido') ||
        line.includes('source:') ||
        line.includes('ID de objetivo') ||
        line.includes('Sesión') ||
        line.includes('session') ||
        line.includes('IA desde') ||
        line.includes('generada por') ||
        // Patrones más específicos
        /^Creada por IA/.test(line) ||
        /^Goal ID:/.test(line) ||
        /^source:/.test(line) ||
        line.match(/^\d+\./) // Líneas que empiezan con número (ej: "1. ", "2. ")
      
      if (isMetadata) {
        metadata.push(line.trim())
      } else {
        description += line.trim() + ' '
      }
    })
    
    return {
      description: description.trim(),
      metadata: metadata
    }
  }

  const { description, metadata } = parseTaskNotes(task.notes)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Header con gradiente */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e2d5e 0%, #2d4a8a 100%)' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Detalles de la tarea</h2>
              <p className="text-sm text-blue-100 mt-1">Revisa y gestiona esta tarea</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tarjeta principal de la tarea */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Título y badges */}
              <div>
                <h3 className="font-bold text-lg text-[#0f172a] dark:text-white">{task.title}</h3>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {task.category && (
                    <span className="flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Tag className="w-3.5 h-3.5" />{task.category}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${priority.bg} ${priority.color} border-current/20`}>
                    {priority.label}
                  </span>
                </div>
              </div>

              {/* Metadatos */}
              <div className="space-y-2">
                {task.due_date && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{new Date(task.due_date).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}</span>
                  </div>
                )}
                {task.estimated_duration_min && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>{task.estimated_duration_min} minutos estimados</span>
                  </div>
                )}
              </div>

              {(description || metadata.length > 0) && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  {/* Descripción principal */}
                  {description && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded-lg">
                        {description}
                      </p>
                    </div>
                  )}
                  
                  {/* Metadatos */}
                  {metadata.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Información adicional:</p>
                      <div className="space-y-1">
                        {metadata.map((meta, index) => {
                          // Extraer etiqueta y valor para mejor formato
                          const [label, ...valueParts] = meta.split(':')
                          const value = valueParts.join(':').trim()
                          
                          if (label && value && label.includes(':')) {
                            return (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-0">
                                  {label}:
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500 flex-1 break-words">
                                  {value}
                                </span>
                              </div>
                            )
                          }
                          
                          return (
                            <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
                              {meta}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Acciones principales */}
          <div className="grid grid-cols-2 gap-3">
            {onEdit && (
              <button 
                onClick={onEdit}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900 transition-all border border-blue-200 dark:border-blue-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            )}
            
            {onDelete && (
              <button 
                onClick={handleDelete}
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-3 px-4 font-medium rounded-xl transition-all border ${
                  showDeleteConfirm 
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                    : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900'
                }`}
              >
                {showDeleteConfirm ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Confirmar eliminar
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            )}
          </div>

          {/* Sección de completación */}
          {showCompleteButton && !task.completed && onComplete && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    ¿Completar esta tarea?
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    Marcará como completada y la moverá a tu historial de tareas finalizadas.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleComplete} 
                disabled={loading}
                className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? 'Completando...' : 'Marcar como completada'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
