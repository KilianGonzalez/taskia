# lockdown Reglas de Edición del Calendario - Implementadas

## **Reglas de Edición Implementadas** 

### **Regla Principal: Solo tareas del usuario son editables**

#### **Permisos por Tipo de Evento:**

| Tipo de Evento | Icono | Color | ¿Editable? | ¿Movable? | ¿Redimensionable? |
|---------------|-------|-------|------------|-----------|-------------------|
| **Tareas de Usuario** | `Tarea creada manualmente` | `#FEF3C7` (amarillo) | `editable: true` | `startEditable: true` | `durationEditable: true` |
| **Tareas de IA** | `Sesión creada por IA` | `#5f5ef1` (azul) | `editable: true` | `startEditable: true` | `durationEditable: true` |
| **Google Calendar** | `Evento externo` | `#d1fae5` (verde) | `editable: false` | `startEditable: false` | `durationEditable: false` |
| **Eventos Programados** | `Bloque programado` | `#EEF2FF` (morado) | `editable: false` | `startEditable: false` | `durationEditable: false` |

---

## **Implementación Técnica**

### **1. Tareas del Usuario (flexible_tasks)**
```javascript
// En taskEvents (tareas del usuario y de IA)
return {
  id: `task_${task.id}`,
  title: task.title,
  // ... otras propiedades
  editable: true,              // Permite edición
  durationEditable: true,      // Permite cambiar duración
  startEditable: true,         // Permite mover hora de inicio
  extendedProps: {
    source: 'flexible_task',   // Identificador de origen
    // ...
  }
}
```

### **2. Eventos Externos (Google Calendar + Programados)**
```javascript
// En allEvents (eventos iniciales)
const nonEditableInitialEvents = initialEvents.map(event => ({
  ...event,
  editable: false,            // Bloquea edición completa
  durationEditable: false,     // Bloquea cambio de duración
  startEditable: false         // Bloquea movimiento
}))
```

---

## **Comportamiento del Usuario**

### **Lo que el usuario PUEDE hacer:**

#### **Tareas de Usuario (amarillo)**
- [x] **Arrastrar** a otra hora
- [x] **Redimensionar** para cambiar duración
- [x] **Ver detalles** al hacer clic
- [x] **Mover** entre días

#### **Tareas de IA (azul)**
- [x] **Arrastrar** a otra hora
- [x] **Redimensionar** para cambiar duración
- [x] **Ver detalles** al hacer clic
- [x] **Mover** entre días

### **Lo que el usuario NO PUEDE hacer:**

#### **Google Calendar (verde)**
- [ ] **Arrastrar** a otra hora
- [ ] **Redimensionar** para cambiar duración
- [ ] **Mover** entre días
- [x] **Ver detalles** al hacer clic (solo lectura)

#### **Eventos Programados (morado)**
- [ ] **Arrastrar** a otra hora
- [ ] **Redimensionar** para cambiar duración
- [ ] **Mover** entre días
- [x] **Ver detalles** al hacer clic (solo lectura)

---

## **Validación en Manejadores**

### **handleEventDrop - Solo tareas flexibles**
```javascript
const handleEventDrop = async (dropInfo: any) => {
  const event = dropInfo.event
  const isTask = event.extendedProps?.source === 'flexible_task'
  
  // Solo procesar si es una tarea del usuario/IA
  if (isTask && event.extendedProps?.taskId) {
    // Lógica de actualización en base de datos
    const result = await updateFlexibleTask(taskId, {
      due_date: newStart.toISOString()
    })
  }
  // Google Calendar y eventos programados no llegan aquí
}
```

### **handleEventResize - Solo tareas flexibles**
```javascript
const handleEventResize = async (resizeInfo: any) => {
  const event = resizeInfo.event
  const isTask = event.extendedProps?.source === 'flexible_task'
  
  // Solo procesar si es una tarea del usuario/IA
  if (isTask && event.extendedProps?.taskId) {
    // Lógica de actualización en base de datos
    const result = await updateFlexibleTask(taskId, {
      due_date: newStart.toISOString(),
      estimated_duration_min: Math.round(duration)
    })
  }
  // Google Calendar y eventos programados no llegan aquí
}
```

---

## **Feedback Visual**

### **Cursor y Comportamiento**
- **Tareas editables**: Cursor de movimiento al hover
- **Eventos no editables**: Cursor normal, no se puede arrastrar
- **Redimensionamiento**: Solo visible en tareas editables

### **Iconos Diferenciadores**
- `Tareas de Usuario`: `Tarea creada manualmente` `Tarea creada manualmente`
- `Tareas de IA`: `Sesión creada por IA` `Sesión creada por IA`
- `Google Calendar`: `Evento externo` `Evento externo`
- `Eventos Programados`: `Bloque programado` `Bloque programado`

---

## **Escenarios de Uso**

### **Escenario 1: Usuario intenta mover evento de Google Calendar**
1. **Intenta arrastrar** evento verde (Google Calendar)
2. **Resultado**: No se puede mover, cursor normal
3. **Comportamiento**: Evento permanece en su lugar
4. **Feedback**: Ningún error, simplemente no permite la acción

### **Escenario 2: Usuario mueve tarea de IA**
1. **Arrastra** evento azul (tarea de IA)
2. **Resultado**: Se mueve a nueva posición
3. **Comportamiento**: Se guarda en base de datos
4. **Feedback**: "Tarea movida exitosamente" en consola

### **Escenario 3: Usuario redimensiona tarea propia**
1. **Redimensiona** evento amarillo (tarea propia)
2. **Resultado**: Cambia duración
3. **Comportamiento**: Se guarda en base de datos
4. **Feedback**: "Duración cambiada exitosamente" en consola

---

## **Seguridad y Datos**

### **Protección de Datos Externos**
- **Google Calendar**: Solo lectura, nunca se modifica
- **Eventos Programados**: Solo lectura, nunca se modifica
- **Base de Datos**: Solo se actualizan tareas del usuario

### **Validación Backend**
- **updateFlexibleTask()**: Solo actualiza tareas del usuario autenticado
- **Verificación de user_id**: Impide modificar tareas de otros usuarios
- **Validación de permisos**: Cada acción verifica el origen del evento

---

## **Resumen de Reglas**

### **Regla de Oro:**
> **Solo las tareas creadas por el usuario (incluyendo las generadas por IA) pueden ser editadas. Los eventos externos como Google Calendar son de solo lectura.**

### **Jerarquía de Permisos:**
1. **Tareas de Usuario** - Edición completa
2. **Tareas de IA** - Edición completa  
3. **Google Calendar** - Solo lectura
4. **Eventos Programados** - Solo lectura

### **Implementación:**
- **Frontend**: Propiedades `editable` en eventos
- **Backend**: Validación en manejadores
- **Base de Datos**: Solo actualiza tareas flexibles
- **UI**: Feedback visual claro

---

## **Estado Final**

**lockdown Todas las reglas de edición están implementadas y funcionando correctamente:**

- [x] **Tareas del usuario**: Editables y movibles
- [x] **Tareas de IA**: Editables y movibles
- [x] **Google Calendar**: Solo lectura, no movibles
- [x] **Eventos programados**: Solo lectura, no movibles
- [x] **Validación**: En frontend y backend
- [x] **Feedback**: Visual y en consola
- [x] **Seguridad**: Protección de datos externos

**El calendario ahora tiene un sistema de permisos robusto que protege los datos externos mientras permite flexibilidad en las tareas del usuario.**
