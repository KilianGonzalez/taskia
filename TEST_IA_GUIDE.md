# 🤖 Guía de Prueba de Funcionalidades IA

## 📋 Requisitos Previos

1. **Usuario autenticado** con objetivos académicos
2. **Tareas flexibles** creadas para probar el calendario
3. **Conexión a Supabase** configurada correctamente

---

## 🧪 Funcionalidades a Probar

### 1. 📅 CalendarAiShell - Comandos de Calendario

#### **Comandos Soportados:**
```
✅ MOVER TAREAS:
"Mueve tarea 'Estudiar matemáticas' a las 15:30"
"Mover tarea 'Revisar proyecto' a las 10:00"

✅ CREAR TAREAS:
"Crear tarea 'Estudiar física' a las 09:00 por 90 minutos"
"Crea nueva tarea 'Preparar presentación' a las 14:00"

✅ DIVIDIR TAREAS:
"Divide tarea 'Estudiar para examen final'"
"Dividir tarea 'Proyecto final' en sesiones más pequeñas"

✅ AÑADIR DESCANSOS:
"Añadir descanso de 15 minutos"
"Añadir pausa de 30 minutos entre bloques"

✅ REPLANIFICAR DÍA:
"Replanifica el día"
"Reorganiza mi horario"
"Optimizar mi semana"
```

#### **Pruebas Sugeridas:**
1. **Prueba de sintaxis**: Escribe comandos con errores para ver cómo los maneja
2. **Extracción de datos**: Verifica que extrae correctamente tareas, horas y duraciones
3. **Generación de cambios**: Confirma que los cambios aparecen en el panel derecho
4. **Aplicación**: Prueba el botón "Aplicar plan" para simular la aplicación

---

### 2. 🎯 GoalsAiShell - Objetivos Académicos

#### **Flujo de Prueba:**
1. **Crear objetivo académico**:
   - Título: "Preparar examen matemáticas"
   - Categoría: "academic"
   - Target: 100
   - Unit: "puntos"
   - Due date: fecha futura

2. **Probar sugerencias de sesiones**:
   - Click en "Crear sesiones"
   - Verificar que se genera el modal con sesiones sugeridas
   - Probar el botón "Guardar como tareas"

3. **Verificar integración**:
   - Las tareas creadas deben aparecer en:
     * Lista de tareas (`/dashboard/tasks`)
     * Calendario (`/dashboard/calendar`)

---

### 3. 📊 AiPlannerPanel - Panel de Planificación

#### **Datos Actualizados (más realistas):**
```
Horas libres: 2
Tareas pendientes: 8
Objetivos urgentes: 1

Sugerencias:
- "Optimizar horario de estudio" (medio impacto)
- "Añadir descanso entre sesiones" (bajo impacto)

Conflictos:
- "Solapamiento de horarios" (alto impacto)
  - "Reunión equipo" a las 14:00
  - "Estudio Física" a las 14:30
```

#### **Pruebas del Panel:**
1. **Botón "Replanificar Día"**: Debe generar nuevas sugerencias
2. **Botón "Aplicar Plan**: Debe procesar cambios propuestos
3. **Aceptar Sugerencias**: Click en sugerencias para añadirlas a cambios propuestos
4. **Descartar Cambios**: Limpia la lista de cambios propuestos

---

## 🛠️ Pasos para Probar

### Paso 1: Configurar Datos de Prueba
```sql
-- Crear objetivo académico de prueba
INSERT INTO goals (user_id, title, description, category, current_value, target_value, unit, due_date, status, streak, created_at)
VALUES (
  'user_id_placeholder',
  'Preparar examen matemáticas',
  'Estudiar cálculo, álgebra y geometría para examen final',
  'academic',
  0,  -- current_value
  100,  -- target_value
  'puntos',
  '2024-12-15',  -- due_date (2 semanas)
  'active',
  0,  -- streak
  NOW()  -- created_at
);

-- Crear tareas flexibles de prueba
INSERT INTO flexible_tasks (user_id, title, category, priority, due_date, estimated_duration_min, difficulty, notes, completed, created_at)
VALUES (
  'user_id_placeholder',
  'Estudiar matemáticas',
  'study',
  'alta',
  '2024-12-15 09:00:00',
  60,
  3,
  'Repasar capítulos 1-3',
  false,
  NOW()
);

-- Crear bloques programados de prueba
INSERT INTO scheduled_blocks (user_id, title, type, days, start_time, end_time, created_at)
VALUES (
  'user_id_placeholder',
  'Reunión equipo',
  'activity',
  '[1, 3, 5]',  -- lunes, miércoles, viernes
  '14:00:00',
  '15:30:00',
  NOW()
);
```

### Paso 2: Probar Funcionalidades

#### **A. Probar CalendarAiShell:**
1. **Abrir** `/dashboard/calendar`
2. **Escribir comandos** en la barra de IA:
   ```
   "Mueve tarea 'Estudiar matemáticas' a las 16:00"
   "Crear tarea 'Revisar proyecto' a las 11:00 por 45 minutos"
   "Añadir descanso de 20 minutos"
   ```
3. **Verificar** que los cambios aparecen en el panel derecho
4. **Probar** el botón "Aplicar plan"

#### **B. Probar GoalsAiShell:**
1. **Abrir** `/dashboard/goals`
2. **Seleccionar** el objetivo académico creado
3. **Click** en "Crear sesiones"
4. **Verificar** que aparece el modal con sesiones sugeridas
5. **Probar** el botón "Guardar como tareas"
6. **Verificar** que las tareas aparecen en `/dashboard/tasks`

#### **C. Probar AiPlannerPanel:**
1. **Verificar** que los datos del panel son correctos
2. **Probar** el botón "Replanificar Día"
3. **Aceptar** sugerencias para ver si se añaden a cambios propuestos
4. **Probar** el botón "Aplicar Plan"

---

## 🔍 Verificación y Depuración

### **Console Logs Esperados:**
```
CalendarAiShell:
- "Procesando comando: 'Mover tarea X a las YY:ZZ'"
- "Evento creado para 'Tarea X': { start, end, isFromAI }"
- "Eventos del calendario: { initialEvents, taskEvents, total }"

GoalsAiShell:
- "Sesiones sugeridas: { summary, sessions }"
- "Tareas creadas: X tareas creadas correctamente"

AiPlannerPanel:
- "Replanificando día..."
- "Aplicando cambios propuestos: [array de cambios]"
```

### **Errores Comunes y Soluciones:**

#### **Error: "No tienes ningún objetivo académico activo"**
- **Causa**: No hay objetivos con categoría 'academic'
- **Solución**: Crear objetivo académico de prueba

#### **Error: "La IA no devolvió sesiones válidas"**
- **Causa**: Formato inválido en respuesta de IA
- **Solución**: Verificar configuración de API de IA

#### **Error: "Tarea no encontrada"**
- **Causa**: ID de tarea no existe
- **Solución**: Verificar que las tareas existen en la base de datos

---

## 🎯 Checklist de Validación

- [ ] **Comandos de calendario** procesan correctamente
- [ ] **Cambios propuestos** se generan y aplican
- [ ] **Sugerencias de IA** aparecen en el panel
- [ ] **Sesiones desde objetivos** se crean correctamente
- [ ] **Tareas creadas** aparecen en lista y calendario
- [ ] **Integración completa** entre todos los componentes

---

## 📞 Notas Adicionales

1. **Datos de ejemplo eliminados**: Ya no hay datos de prueba estáticos
2. **API Keys configuradas**: Verificar que GROQ_API_KEY y variables de Supabase están configuradas
3. **Logs habilitados**: Los console.log están activos para depuración
4. **Base de datos real**: Los cambios afectan datos reales del usuario

---

## 🚀 Comandos Rápidos para Pruebas

```bash
# Probar comando de mover
"Mueve tarea 'Revisar notas' a las 17:00"

# Probar comando de crear
"Crear tarea 'Estudiar química' a las 10:00 por 90 minutos"

# Probar comando de dividir
"Divide tarea 'Estudiar para examen final'"

# Probar comando de descanso
"Añadir descanso de 25 minutos"

# Probar replanificación
"Replanifica mi día"
```

**¡Inicia las pruebas y verifica que todas las funcionalidades de IA funcionen correctamente!**
