/*************************************************
 * SISTEMA DE GESTIÓN SAT MULTIDEPARTAMENTAL
 * BLOQUE 1 — APPS SCRIPT PRINCIPAL COMPLETO
 * VERSIÓN EMPRESARIAL (PORTFOLIO PÚBLICO)
 *************************************************/


/*************************************************
 * CONFIGURACIÓN GENERAL
 *************************************************/

const CONFIG_SECCIONES = {
  "Herramientas": {
    hojaDestino: "Herramientas",
    hojaColaboradores: "Correos colaboradores herramientas",
    hojaProveedores: "Proveedores Herramientas"
  },

  "Ferretería": {
    hojaDestino: "Ferretería",
    hojaColaboradores: "Correos colaboradores ferretería",
    hojaProveedores: "Proveedores Ferretería"
  },

  "Fontanería": {
    hojaDestino: "Fontanería",
    hojaColaboradores: "Correos colaboradores fontanería",
    hojaProveedores: "Proveedores Fontanería"
  },

  "Electricidad": {
    hojaDestino: "Electricidad",
    hojaColaboradores: "Correos colaboradores electricidad",
    hojaProveedores: "Proveedores Electricidad"
  }
};

const ESTADOS_VALIDOS = [
  "Pendiente",
  "Enviado",
  "Recibido",
  "Avisado",
  "Entregado"
];


/*************************************************
 * MENÚ PRINCIPAL
 *************************************************/

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Gestión SAT")
    .addItem("Cambiar estado SAT", "abrirFormularioEstado")
    .addItem("Verificar sistema", "verificarConfiguracion")
    .addItem("Autorizar sistema", "forzarPermisosUI")
    .addToUi();
}


/*************************************************
 * VERIFICACIÓN AUTOMÁTICA DEL SISTEMA
 *************************************************/

function verificarConfiguracion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let errores = [];

  const hojasObligatorias = [
    "Correos colaboradores herramientas",
    "Correos colaboradores ferretería",
    "Correos colaboradores fontanería",
    "Correos colaboradores electricidad",
    "Proveedores Herramientas",
    "Proveedores Ferretería",
    "Proveedores Fontanería",
    "Proveedores Electricidad"
  ];

  hojasObligatorias.forEach(nombre => {
    if (!ss.getSheetByName(nombre)) {
      errores.push(`Falta la hoja: ${nombre}`);
    }
  });

  if (errores.length > 0) {
    SpreadsheetApp.getUi().alert(
      "ERRORES DE CONFIGURACIÓN:\n\n" + errores.join("\n")
    );
  } else {
    SpreadsheetApp.getUi().alert(
      "Sistema correctamente configurado"
    );
  }
}


/*************************************************
 * ABRIR FORMULARIO HTML
 *************************************************/

function abrirFormularioEstado() {
  const html = HtmlService
    .createHtmlOutputFromFile("formulario")
    .setWidth(420)
    .setHeight(420);

  SpreadsheetApp.getUi()
    .showModalDialog(html, "Gestión SAT");
}


/*************************************************
 * UTILIDAD — EXTRAER ID DE ARCHIVO
 *************************************************/

function extraerFileId(valor) {
  if (!valor) return null;

  try {
    const match = valor.toString().match(/[-\w]{25,}/);
    return match ? match[0] : null;
  } catch (e) {
    return null;
  }
}


/*************************************************
 * UTILIDAD — OBTENER BLOB DE ARCHIVO
 *************************************************/

function obtenerBlobDesdeCampo(valorCampo) {
  try {
    const fileId = extraerFileId(valorCampo);

    if (!fileId) return null;

    const file = DriveApp.getFileById(fileId);
    return file.getBlob();

  } catch (e) {
    Logger.log("Error adjunto: " + e);
    return null;
  }
}


/*************************************************
 * UTILIDAD — SALUDO AUTOMÁTICO
 *************************************************/

function obtenerSaludo() {
  const hour = parseInt(
    Utilities.formatDate(
      new Date(),
      "Europe/Madrid",
      "HH"
    )
  );

  return (hour >= 6 && hour <= 13)
    ? "Buenos días"
    : "Buenas tardes";
}


/*************************************************
 * UTILIDAD — LEER RESPUESTA
 *************************************************/

function getValor(headers, fila, nombreCampo) {
  const idx = headers.indexOf(nombreCampo);
  return idx !== -1 ? fila[idx] : "";
}


/*************************************************
 * CREAR HOJA SI NO EXISTE
 *************************************************/

function asegurarHojaDestino(nombreHoja, headersOriginales) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(nombreHoja);

  // Crear hoja si no existe
  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
  }

  const datos = hoja.getDataRange().getValues();

  // Si no hay encabezados o están incompletos → reconstruir
  if (datos.length === 0 || datos[0].length < headersOriginales.length) {

    hoja.clear();

    hoja.appendRow([
      ...headersOriginales,
      "Fecha de salida",
      "Agencia",
      "Fecha de retorno",
      "Estado"
    ]);
  }

  return hoja;
}


/*************************************************
 * COPIAR SAT A SU HOJA DE SECCIÓN
 *************************************************/

function guardarEnHojaSeccion(
  seccion,
  filaDatos,
  headers
) {
  const config = CONFIG_SECCIONES[seccion];
  if (!config) return;

  const hoja = asegurarHojaDestino(
    config.hojaDestino,
    headers
  );

  const idxSAT = headers.indexOf("Número de SAT");
  const numeroSAT = filaDatos[idxSAT];

  const existentes = hoja
    .getDataRange()
    .getValues();

  const duplicado = existentes.some((row, i) =>
    i > 0 &&
    String(row[idxSAT]).trim() === String(numeroSAT).trim()
  );

  if (duplicado) return;

  const nuevaFila = hoja.getLastRow() + 1;

  hoja.getRange(nuevaFila, 1, 1, filaDatos.length + 4)
    .setValues([[
      ...filaDatos,
      "",
      "",
      "",
      "Pendiente"
    ]]);
}


/*************************************************
 * OBTENER EMAILS DE COLABORADORES
 *************************************************/

function obtenerCorreosColaboradores(seccion) {
  const config = CONFIG_SECCIONES[seccion];
  if (!config) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(config.hojaColaboradores);

  if (!hoja) return [];

  const data = hoja.getDataRange().getValues();

  let emails = [];

  for (let i = 1; i < data.length; i++) {
    const email = data[i][1];

    if (email) {
      emails.push(email.toString().trim());
    }
  }

  return emails;
}


/*************************************************
 * OBTENER JS + RC (MANDOS / RESPONSABLES)
 *************************************************/

function obtenerCorreosMandos(seccion) {
  const config = CONFIG_SECCIONES[seccion];
  if (!config) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(config.hojaColaboradores);

  if (!hoja) return [];

  const data = hoja.getDataRange().getValues();

  let emails = [];

  for (let i = 1; i < data.length; i++) {
    const email = data[i][1];
    const cargo = data[i][2];

    if (
      email &&
      (
        cargo === "JS" ||
        cargo === "RC"
      )
    ) {
      emails.push(email.toString().trim());
    }
  }

  return emails;
}


/*************************************************
 * BLOQUE 2 — FUNCIÓN PRINCIPAL onFormSubmit()
 *************************************************/

function onFormSubmit(e) {
  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaMadre = ss.getSheetByName("Respuestas del formulario 1");

    const fila = hojaMadre.getLastRow();
    const col = hojaMadre.getLastColumn();

    const filaDatos = hojaMadre
      .getRange(fila, 1, 1, col)
      .getDisplayValues()[0];

    const headers = hojaMadre
      .getRange(1, 1, 1, col)
      .getValues()[0];

    /*************************************************
     * LECTURA DE CAMPOS DEL FORMULARIO
     *************************************************/

    const emailSolicitante = getValor(
      headers,
      filaDatos,
      "Email Address"
    );

    const numeroSAT = getValor(
      headers,
      filaDatos,
      "Número de SAT"
    );

    const producto = getValor(
      headers,
      filaDatos,
      "Designación del producto"
    );

    const causaSAT = getValor(
      headers,
      filaDatos,
      "Causa del SAT"
    );

    const ticketSAT = getValor(
      headers,
      filaDatos,
      "Ticket del SAT"
    );

    const seccion = getValor(
      headers,
      filaDatos,
      "Sección"
    );

    const tipoServicio = getValor(
      headers,
      filaDatos,
      "Indica qué servicio solicitamos"
    );

    const fotoPlaca = getValor(
      headers,
      filaDatos,
      "Foto de la placa"
    );

    /*************************************************
     * DETECTAR PROVEEDOR SEGÚN SECCIÓN
     *************************************************/

    let nombreCampoProveedor = "";

    switch (seccion) {
      case "Herramientas":
        nombreCampoProveedor = "Proveedor Herramientas";
        break;

      case "Ferretería":
        nombreCampoProveedor = "Proveedor Ferretería";
        break;

      case "Fontanería":
        nombreCampoProveedor = "Proveedor Fontanería";
        break;

      case "Electricidad":
        nombreCampoProveedor = "Proveedor Electricidad";
        break;

      default:
        Logger.log("Sección no válida");
        return;
    }

    const proveedor = getValor(
      headers,
      filaDatos,
      nombreCampoProveedor
    );

    /*************************************************
     * GUARDAR EN HOJA DE SECCIÓN (CRM)
     *************************************************/

    guardarEnHojaSeccion(
      seccion,
      filaDatos,
      headers
    );

    /*************************************************
     * OBTENER EMAIL DEL PROVEEDOR
     *************************************************/

    const config = CONFIG_SECCIONES[seccion];

    if (!config) {
      Logger.log("No existe configuración");
      return;
    }

    const hojaProv = ss.getSheetByName(
      config.hojaProveedores
    );

    if (!hojaProv) {
      GmailApp.sendEmail(
        emailSolicitante,
        `Error SAT ${numeroSAT}`,
        `No existe la hoja de proveedores para ${seccion}`
      );
      return;
    }

    const dataProv = hojaProv
      .getDataRange()
      .getValues();

    let emailProveedor = null;

    for (let i = 1; i < dataProv.length; i++) {
      const proveedorExcel = dataProv[i][0];

      if (
        proveedorExcel &&
        proveedorExcel.toString().trim().toLowerCase() === proveedor.toString().trim().toLowerCase()
      ) {
        emailProveedor = dataProv[i][1];
        break;
      }
    }

    /*************************************************
     * FORMULARIO ESPECIAL
     *************************************************/

    if (
      emailProveedor &&
      emailProveedor.toString()
        .toLowerCase()
        .trim() === "formulario especial"
    ) {
      GmailApp.sendEmail(
        emailSolicitante,
        `Formulario especial SAT ${numeroSAT}`,
        `Este proveedor no tiene correo asociado y requiere de un formulario especial, por favor, recuerde realizarlo, gracias`
      );
      return;
    }

    /*************************************************
     * PROVEEDOR SIN CORREO
     *************************************************/

    if (
      !emailProveedor ||
      !emailProveedor.toString().includes("@")
    ) {
      GmailApp.sendEmail(
        emailSolicitante,
        `Proveedor sin correo SAT ${numeroSAT}`,
        `Este proveedor no tiene un correo asociado, recuerde realizar los pasos necesarios para el SAT, y de ser necesario, avisar a su mando para cumplimentar el correo del proveedor, gracias`
      );
      return;
    }

    /*************************************************
     * ADJUNTOS
     *************************************************/

    let attachments = [];

    const blobTicket = obtenerBlobDesdeCampo(ticketSAT);
    if (blobTicket) {
      attachments.push(blobTicket);
    }

    const blobFotoPlaca = obtenerBlobDesdeCampo(fotoPlaca);
    if (blobFotoPlaca) {
      attachments.push(blobFotoPlaca);
    }

    /*************************************************
     * DESTINATARIOS
     *************************************************/

    const emailsProveedor = emailProveedor
      .toString()
      .split(";")
      .map(e => e.trim())
      .filter(e => e);

    const to = emailsProveedor[0];

    let cc = [];

    if (emailsProveedor.length > 1) {
      cc = cc.concat(
        emailsProveedor.slice(1)
      );
    }

    const colaboradores = obtenerCorreosColaboradores(
      seccion
    );

    colaboradores.forEach(email => {
      if (
        email &&
        !cc.includes(email) &&
        email !== to
      ) {
        cc.push(email);
      }
    });

    /*************************************************
     * CUERPO DEL MENSAJE (DATOS ANONIMIZADOS)
     *************************************************/

    const saludo = obtenerSaludo();

    let body = "";

    if (
      tipoServicio === "Envío propio"
    ) {
      body =
        `${saludo}, procedemos con el envío del SAT "${numeroSAT}", ${producto} a sus instalaciones para su reparación.\n\n` +
        `${causaSAT}\n\n` +
        `Gracias.\n\n` +
        `[Centro de Distribución / Tienda]\n` +
        `[Dirección del Almacén]\n` +
        `[Código Postal, Localidad]`;
    }
    else {
      body =
        `${saludo}, solicito recogida del SAT "${numeroSAT}" en [Centro de Distribución / Tienda], ${producto}, ${proveedor}.\n\n` +
        `${causaSAT}\n\n` +
        `[Centro de Distribución / Tienda]\n` +
        `[Dirección del Almacén]\n` +
        `[Código Postal, Localidad]`;
    }

    /*************************************************
     * ENVÍO DEL CORREO
     *************************************************/

    GmailApp.sendEmail(
      to,
      `SAT ${numeroSAT}`,
      body,
      {
        cc: cc.join(","),
        attachments: attachments,
        name: "Gestión SAT"
      }
    );

    Logger.log(
      `Correo enviado SAT ${numeroSAT}`
    );

  } catch (error) {
    Logger.log(
      "Error en onFormSubmit: " +
      error.toString()
    );
  }
}


/*************************************************
 * BLOQUE 3 — GESTIÓN SAT (ACTUALIZAR ESTADO)
 *************************************************/

function actualizarEstadoSAT(numeroSAT, nuevoEstado) {
  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const hojas = [
      "Herramientas",
      "Ferretería",
      "Fontanería",
      "Electricidad"
    ];

    let encontrado = false;

    hojas.forEach(nombreHoja => {

      const hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) return;

      const datos = hoja.getDataRange().getValues();
      if (!datos || datos.length === 0) return;

      const headers = datos[0];

      const idxSAT = headers.indexOf("Número de SAT");
      const idxEstado = headers.indexOf("Estado");
      const idxSalida = headers.indexOf("Fecha de salida");
      const idxRetorno = headers.indexOf("Fecha de retorno");

      // Validación crítica
      if (idxSAT === -1 || idxEstado === -1) return;

      for (let i = 1; i < datos.length; i++) {

        if (
          String(datos[i][idxSAT]).trim() ===
          String(numeroSAT).trim()
        ) {

          encontrado = true;

          hoja.getRange(i + 1, idxEstado + 1)
            .setValue(nuevoEstado);

          const hoy = new Date();

          if (nuevoEstado === "Enviado" && idxSalida !== -1) {
            hoja.getRange(i + 1, idxSalida + 1)
              .setValue(hoy);
          }

          if (
            (nuevoEstado === "Recibido" || nuevoEstado === "Entregado") &&
            idxRetorno !== -1
          ) {
            hoja.getRange(i + 1, idxRetorno + 1)
              .setValue(hoy);
          }

        }
      }
    });

    return encontrado;

  } catch (error) {
    Logger.log("ERROR actualizarEstadoSAT: " + error);
    return false;
  }
}


/*************************************************
 * FUNCIÓN AUXILIAR PARA OBTENER SECCIÓN
 *************************************************/

function obtenerSeccionPorSAT(numeroSAT) {
  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const hojas = [
      "Herramientas",
      "Ferretería",
      "Fontanería",
      "Electricidad"
    ];

    for (let nombre of hojas) {

      const hoja = ss.getSheetByName(nombre);
      if (!hoja) continue;

      const datos = hoja.getDataRange().getValues();
      if (!datos || datos.length === 0) continue;

      const headers = datos[0];
      const idxSAT = headers.indexOf("Número de SAT");

      if (idxSAT === -1) continue;

      for (let i = 1; i < datos.length; i++) {

        if (
          String(datos[i][idxSAT]).trim() ===
          String(numeroSAT).trim()
        ) {
          return nombre;
        }
      }
    }

    return null;

  } catch (error) {
    Logger.log("ERROR obtenerSeccionPorSAT: " + error);
    return null;
  }
}


/*************************************************
 * BLOQUE 5 — ALERTAS SAT +20 DÍAS (AUDITORÍA SLA)
 *************************************************/

function verificarSATsPendientes() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoy = new Date();

  const hojas = [
    "Herramientas",
    "Ferretería",
    "Fontanería",
    "Electricidad"
  ];

  hojas.forEach(seccion => {

    const hoja = ss.getSheetByName(seccion);
    if (!hoja) return;

    const datos = hoja.getDataRange().getValues();
    const headers = datos[0];

    const idxSAT = headers.indexOf("Número de SAT");
    const idxEstado = headers.indexOf("Estado");
    const idxFecha = headers.indexOf("Timestamp");

    if (idxFecha === -1) return;

    let listaSAT = [];

    for (let i = 1; i < datos.length; i++) {

      const numeroSAT = datos[i][idxSAT];
      const estado = datos[i][idxEstado];
      const fecha = new Date(datos[i][idxFecha]);

      const diffDias = Math.floor(
        (hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (
        diffDias > 20 &&
        estado !== "Entregado"
      ) {
        listaSAT.push(
          `SAT: ${numeroSAT} | Estado: ${estado} | Entrada: ${Utilities.formatDate(fecha, "Europe/Madrid", "dd/MM/yyyy")}`
        );
      }
    }

    if (listaSAT.length > 0) {

      const destinatarios = obtenerCorreosMandos(seccion);

      if (destinatarios.length === 0) return;

      const body =
        `Aviso: SATs pendientes con más de 20 días de antigüedad:\n\n` +
        listaSAT.join("\n");

      GmailApp.sendEmail(
        destinatarios.join(","),
        `Alerta SAT +20 días - Sección: ${seccion}`,
        body
      );
    }

  });

}


/*************************************************
 * TEST Y PERMISOS
 *************************************************/

function testPermisos() {
  Logger.log("Test permisos OK");
  const res = obtenerSeccionPorSAT("1212");
  Logger.log(res);
}

function forzarPermisos() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets();
  GmailApp.getAliases();
}

function forzarPermisosUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert("Permisos concedidos correctamente");
}


/*************************************************
 * ACTUALIZACIÓN DIRECTA DESDE HOJA DE CONTROL
 *************************************************/

function actualizarSATDesdeHoja() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaControl = ss.getSheetByName("CONTROL");

  const numeroSAT = hojaControl.getRange("A2").getValue();
  const nuevoEstado = hojaControl.getRange("B2").getValue();

  if (!numeroSAT) {
    SpreadsheetApp.getUi().alert("Introduce un número de SAT");
    return;
  }

  if (!nuevoEstado) {
    SpreadsheetApp.getUi().alert("Selecciona un estado");
    return;
  }

  const hojas = [
    "Herramientas",
    "Ferretería",
    "Fontanería",
    "Electricidad"
  ];

  let encontrado = false;
  let seccionEncontrada = "";

  hojas.forEach(nombreHoja => {

    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;

    const datos = hoja.getDataRange().getValues();
    if (!datos || datos.length === 0) return;

    const headers = datos[0];

    const idxSAT = headers.indexOf("Número de SAT");
    const idxEstado = headers.indexOf("Estado");
    const idxSalida = headers.indexOf("Fecha de salida");
    const idxRetorno = headers.indexOf("Fecha de retorno");

    if (idxSAT === -1 || idxEstado === -1) return;

    for (let i = 1; i < datos.length; i++) {

      if (String(datos[i][idxSAT]).trim() === String(numeroSAT).trim()) {

        encontrado = true;
        seccionEncontrada = nombreHoja;

        const mensaje = `¿Cambiar SAT "${numeroSAT}" (${nombreHoja}) a "${nuevoEstado}"?`;

        const confirmacion = SpreadsheetApp.getUi().alert(
          "Confirmación",
          mensaje,
          SpreadsheetApp.getUi().ButtonSet.YES_NO
        );

        if (confirmacion !== SpreadsheetApp.getUi().Button.YES) return;

        hoja.getRange(i + 1, idxEstado + 1).setValue(nuevoEstado);

        const hoy = new Date();

        if (nuevoEstado === "Enviado" && idxSalida !== -1) {
          hoja.getRange(i + 1, idxSalida + 1).setValue(hoy);
        }

        if (
          (nuevoEstado === "Recibido" || nuevoEstado === "Entregado") &&
          idxRetorno !== -1
        ) {
          hoja.getRange(i + 1, idxRetorno + 1).setValue(hoy);
        }

        SpreadsheetApp.getUi().alert("Estado actualizado correctamente");
      }
    }
  });

  if (!encontrado) {
    SpreadsheetApp.getUi().alert("SAT no encontrado");
  }
}
