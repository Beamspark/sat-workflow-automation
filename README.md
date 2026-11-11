# SAT Workflow Automation & CRM Engine

Sistema de automatización y gestión de incidencias de Servicio de Asistencia Técnica (SAT) desarrollado en **Google Apps Script (JavaScript)** para optimizar la trazabilidad de reparaciones y comunicaciones con proveedores en retail.

---

## 🎯 Problema a Resolver

La gestión manual de partes de servicio técnico en múltiples secciones (herramientas, ferretería, fontanería, electricidad) provocaba:
* Dispersión de información entre formularios y bandejas de correo individuales.
* Errores en la selección de proveedores y formularios de tramitación.
* Falta de seguimiento temporal en garantías y reparaciones estancadas.

---

## ⚙️ Arquitectura y Funcionalidades

1. **Enrutamiento Automático Multidepartamental:**
   * Ingesta automática mediante triggers de formulario (`onFormSubmit`).
   * Creación dinámica de bases de datos por sección y prevención de duplicados por número de SAT.

2. **Gestión Transaccional de Correos y Adjuntos:**
   * Localización relacional del proveedor y sus correos de contacto.
   * Extracción de tickets y fotografías de placas técnicas desde Google Drive en formato binario (`Blob`) para enviarlos como adjuntos reales.
   * Paginación en copia (`CC`) a toda la plantilla de la sección para visibilidad compartida.

3. **Manejo de Excepciones Operativas:**
   * Detección de proveedores que requieren portal externo ("formulario especial") o carecen de correo, enviando una alerta inmediata al solicitante con instrucciones de actuación.

4. **Auditoría de Estados y Marcas Temporales:**
   * Trazabilidad de estados: `Pendiente`, `Enviado`, `Recibido`, `Avisado` y `Entregado`.
   * Estampado automático de fechas de salida y retorno al cambiar de estado.

5. **Monitorización Preventiva (SLA):**
   * Cron job (`verificarSATsPendientes`) que analiza registros diarios y alerta por correo exclusivamente a responsables (Jefes de Sector / Mandos) sobre equipos con más de 20 días sin resolución.

---

## 🛠️ Tecnologías Utilizadas

* **Lenguaje:** JavaScript (Google Apps Script).
* **Servicios Google Workspace:** SpreadsheetApp, GmailApp, DriveApp, HtmlService.
