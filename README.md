# 🛠️ SAT Workflow Automation & CRM Engine

Sistema de gestión interna y automatización de incidencias técnicas (SAT) multidepartamental desarrollado en **Google Apps Script** y **JavaScript/HTML5**. Conecta formularios de captura, bases de datos en hojas de cálculo, almacenamiento en la nube y correo transaccional, integrando además una interfaz modal interactiva para los operadores de tienda.

---

## 🎯 Problema de Negocio Resuelto

En entornos de gran distribución retail, la tramitación manual de garantías y reparaciones técnicas presenta puntos críticos:
* Dispersión de partes entre formularios desconectados y bandejas de entrada individuales.
* Errores en la asignación de canales de comunicación según el proveedor o tipo de garantía.
* Pérdida de trazabilidad temporal y demoras excesivas en equipos enviados a fábrica.

Esta herramienta centraliza la operativa en una arquitectura unificada que automatiza el enrutado, la comunicación externa e interna y la auditoría de plazos.

---

## 🏗️ Arquitectura del Sistema

El proyecto implementa una arquitectura desacoplada cliente-servidor:

```text
┌────────────────────────────────────────────────────────┐
│                        FRONTEND                        │
│   formulario.html (HTML5, CSS3, DOM Events)            │
│   - Diálogo modal embebido en Google Sheets            │
│   - Captura y saneamiento de entradas                  │
└───────────────────────────┬────────────────────────────┘
                            │
              google.script.run (RPC Asíncrono)
              [withSuccessHandler / withFailureHandler]
                            │
┌───────────────────────────▼────────────────────────────┐
│                        BACKEND                         │
│   Code.js (Google Apps Script Engine)                  │
│   - Enrutador por departamento                         │
│   - Procesador binario de adjuntos (Google Drive)      │
│   - Motor de mailing transaccional (Gmail API)         │
│   - Cron Job de auditoría SLA                          │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Funcionalidades Clave

### 1. Ingesta y enrutamiento departamental (`onFormSubmit`)
* Captura respuestas del formulario madre y las copia a la hoja de su sección (*Herramientas, Ferretería, Fontanería o Electricidad*).
* Verificación de duplicados para evitar registros redundantes de un mismo número de SAT.
* Inicialización de trazabilidad en estado `Pendiente`.

### 2. Notificaciones transaccionales inteligentes
* **Resolución relacional:** Cruza el proveedor seleccionado con la base de datos de contactos técnicos.
* **Gestión de incidencias operativas:** Si el proveedor requiere plataforma externa (*formulario especial*) o carece de email, notifica de inmediato al solicitante con instrucciones de actuación.
* **Tratamiento de adjuntos en memoria:** Extrae tickets de compra y fotografías de placas técnicas desde Google Drive y los convierte en objetos binarios (`Blob`) para enviarlos como archivos adjuntos reales por correo.
* **Difusión interna:** Envía el correo al servicio técnico oficial y copia automáticamente en `CC` a todos los colaboradores de la sección.

### 3. Interfaz de usuario y llamadas asíncronas (UI/Modal)
* Formulario modal integrado en la hoja mediante `HtmlService`.
* **Flujo en dos pasos con confirmación interactiva:**
  1. Consulta asíncrona al servidor para identificar la sección del SAT (`obtenerSeccionPorSAT`).
  2. Confirmación visual con el usuario antes de persistir los cambios.
  3. Ejecución de la actualización (`actualizarEstadoSAT`).
* Manejo estructurado de respuestas con `.withSuccessHandler()` y control de fallos con `.withFailureHandler()`.

### 4. Ciclo de vida y auditoría de tiempos (SLA)
* **Marcas temporales automáticas:** Registra la *Fecha de salida* al pasar a `Enviado` y la *Fecha de retorno* al pasar a `Recibido` o `Entregado`.
* **Monitorización preventiva (+20 días):** Tarea programada (`verificarSATsPendientes`) que analiza incidencias abiertas, calcula los días transcurridos y escala alertas automáticas por correo exclusivamente a los mandos responsables (`JS` / `RC`).

---

## 📁 Estructura del Repositorio

```text
sat-workflow-automation/
├── .gitignore
├── LICENSE
├── README.md
└── src/
    ├── Code.js            # Lógica de backend, triggers y APIs de Google
    └── formulario.html    # Frontend del modal de control de estados
```

---

## 💻 Stack Tecnológico

* **Lenguajes:** JavaScript (ES6+), HTML5, CSS3.
* **Plataforma:** Google Apps Script.
* **Servicios e integraciones:**
  * `SpreadsheetApp` (Bases de datos tabulares y control transaccional).
  * `GmailApp` (Mailing transaccional dinámico con CC y adjuntos).
  * `DriveApp` (Extracción y parseo de archivos binarios).
  * `HtmlService` (Renderizado de interfaces modales interactivas).
