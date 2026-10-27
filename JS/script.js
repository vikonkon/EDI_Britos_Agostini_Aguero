// Front de CuentaClara: se comunica con el servidor Node mediante la API (/api/...)

// Ayudas generales
// Llama al servidor. Si responde con error, lanza un Error con el mensaje.
async function llamarApi(ruta, metodo = "GET", datos = null) {
    const opciones = { method: metodo, headers: { "Content-Type": "application/json" } };
    if (datos) opciones.body = JSON.stringify(datos);
    const respuesta = await fetch(ruta, opciones);
    const contenido = await respuesta.json();
    if (!respuesta.ok) throw new Error(contenido.error || "Error del servidor.");
    return contenido;
}

function formatearMoneda(numero) {
    return "$" + Number(numero).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mostrarAviso(texto) {
    let aviso = document.getElementById("avisoFlotante");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "avisoFlotante";
        aviso.className = "aviso-flotante";
        document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add("aviso-flotante--visible");
    setTimeout(() => aviso.classList.remove("aviso-flotante--visible"), 3000);
}

// Sesión (se guarda quién ingresó)
function obtenerSesion() {
    try { return JSON.parse(localStorage.getItem("sesion")); } catch (error) { return null; }
}
function guardarSesion(datos) { localStorage.setItem("sesion", JSON.stringify(datos)); }

// Las páginas que necesitan usuario mandan a LOGIN si no hay sesión.
function exigirSesion() {
    const sesion = obtenerSesion();
    if (!sesion) { window.location.href = "LOGIN.html"; return null; }
    return sesion;
}

// Ícono de usuario del menú: si hay sesión muestra el nombre y permite salir.
const enlaceSesion = document.getElementById("enlaceSesion");
if (enlaceSesion && obtenerSesion()) {
    document.getElementById("nombreSesion").textContent = obtenerSesion().nombre.split(" ")[0];
    enlaceSesion.title = "Cerrar sesión";
    enlaceSesion.href = "#";
    enlaceSesion.addEventListener("click", (evento) => {
        evento.preventDefault();
        if (confirm("¿Querés cerrar sesión?")) {
            localStorage.removeItem("sesion");
            window.location.href = "index.html";
        }
    });
}

// Panel de la promo (EJEMPLO.html)
let fondos = [];

// Convierte lo que manda la base al formato que usa la pantalla.
async function cargarFondos(idIntegrante) {
    const filas = await llamarApi("/api/fondos/" + idIntegrante);
    fondos = filas.map((fila) => ({
        id: fila.id_fondo,
        proveedor: fila.proveedor,
        concepto: fila.concepto,
        icono: fila.concepto.includes("Viaje") ? "✈️" : "🎉",
        totalCuotas: fila.total_cuotas,
        cuotasPagadas: Number(fila.cuotas_pagadas),
        montoCuota: Number(fila.monto_cuota),
    }));
}

function buscarFondo(id) {
    return fondos.find((fondo) => fondo.id === id) || null;
}

function renderResumenGeneral(resumen) {
    const porcentaje = Math.min((resumen.ingresos / resumen.meta) * 100, 100);
    const falta = Math.max(resumen.meta - resumen.ingresos, 0);

    document.getElementById("fondoTotal").textContent = formatearMoneda(resumen.ingresos);
    document.getElementById("metaObjetivo").textContent = formatearMoneda(resumen.meta);
    document.getElementById("metaFaltan").textContent = formatearMoneda(falta);
    document.getElementById("metaPorcentaje").textContent = porcentaje.toFixed(0) + "% alcanzado";
    document.getElementById("metaBarraFill").style.width = porcentaje + "%";
    document.getElementById("resumenIngresos").textContent = formatearMoneda(resumen.ingresos);
    document.getElementById("resumenGastos").textContent = formatearMoneda(resumen.gastos);
    document.getElementById("resumenSaldo").textContent = formatearMoneda(resumen.saldo);
}

function renderFondos(idIntegrante) {
    const contenedor = document.getElementById("listaFondos");
    contenedor.innerHTML = "";
    if (fondos.length === 0) {
        contenedor.innerHTML = "<p>Tus cuentas aparecen cuando una empresa gana la votación.</p>";
        return;
    }
    fondos.forEach((fondo) => {
        const porcentaje = (fondo.cuotasPagadas / fondo.totalCuotas) * 100;
        const completo = fondo.cuotasPagadas >= fondo.totalCuotas;
        const tarjeta = document.createElement("article");
        tarjeta.className = "fondo-card";
        tarjeta.innerHTML = `
            <div class="fondo-header">
                <span class="fondo-icono">${fondo.icono}</span>
                <div class="fondo-nombre"><h4>${fondo.proveedor}</h4><span>${fondo.concepto}</span></div>
                <span class="fondo-contador">${fondo.cuotasPagadas}/${fondo.totalCuotas} cuotas</span>
            </div>
            <div class="barra-track"><div class="barra-fill" style="width:${porcentaje}%"></div></div>
            <div class="fondo-footer">
                ${completo ? `<span class="pill pill--pagado">Cuotas completas</span>`
                : `<div class="fondo-cuota-info">
                       <span class="cuota-num">Cuota ${fondo.cuotasPagadas + 1}/${fondo.totalCuotas}</span>
                       <span class="cuota-monto">${formatearMoneda(fondo.montoCuota)}</span>
                       <span class="pill pill--pendiente">Pendiente</span>
                   </div>
                   <button class="pagar-btn" data-id="${fondo.id}">Pagar cuota</button>`}
            </div>`;
        contenedor.appendChild(tarjeta);
    });
    document.querySelectorAll(".pagar-btn").forEach((boton) => {
        boton.addEventListener("click", () => pagarCuota(Number(boton.dataset.id), idIntegrante));
    });
}

function renderActividad(movimientos) {
    const lista = document.getElementById("listaActividad");
    lista.innerHTML = "";
    movimientos.slice(0, 6).forEach((mov) => {
        const elemento = document.createElement("li");
        elemento.className = "actividad-item";
        elemento.innerHTML = `
            <span class="actividad-icono">💸</span>
            <div><p>${mov.concepto}</p>
            <span class="actividad-meta">${formatearMoneda(mov.importe)} · ${mov.fecha}</span></div>`;
        lista.appendChild(elemento);
    });
}

async function cargarPanel() {
    const sesion = exigirSesion();
    if (!sesion) return;
    const [resumen, movimientos] = await Promise.all([llamarApi("/api/resumen"), llamarApi("/api/movimientos")]);
    await cargarFondos(sesion.id_integrante);
    renderResumenGeneral(resumen);
    renderFondos(sesion.id_integrante);
    renderActividad(movimientos);
}

// Se ejecuta al tocar "Pagar cuota" (en el panel y en Mis cuotas).
async function pagarCuota(idFondo, idIntegrante) {
    try {
        await llamarApi("/api/cuotas/pagar", "POST", { id_fondo: idFondo, id_integrante: idIntegrante });
        mostrarAviso("Cuota registrada. ¡Gracias!");
        if (document.getElementById("fondoTotal")) await cargarPanel();
        if (document.getElementById("tablaCuotas")) await cargarMisCuotas();
    } catch (error) {
        mostrarAviso(error.message);
    }
}

// Formulario "Registrar movimiento" del panel
const formMovimiento = document.getElementById("formMovimiento");
if (formMovimiento) {
    formMovimiento.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const errorMovimiento = document.getElementById("errorMovimiento");
        const importe = parseFloat(formMovimiento.monto.value);
        try {
            if (!(importe > 0)) throw new Error("El monto debe ser mayor a cero.");
            await llamarApi("/api/movimientos", "POST", {
                tipo: formMovimiento.tipo.value,
                concepto: formMovimiento.concepto.value.trim(),
                importe: importe,
            });
            errorMovimiento.style.display = "none";
            formMovimiento.reset();
            mostrarAviso("Movimiento registrado.");
            await cargarPanel();
        } catch (falla) {
            errorMovimiento.textContent = falla.message;
            errorMovimiento.style.display = "block";
        }
    });
}

// Mis cuotas
let idFondoActivo = null;

async function cargarMisCuotas() {
    const sesion = exigirSesion();
    if (!sesion) return;
    await cargarFondos(sesion.id_integrante);
    const cuerpo = document.getElementById("tablaCuotas");
    const pestanas = document.getElementById("pestanasFondos");

    // Sin cuentas todavía: se muestran los valores en cero y un aviso
    if (fondos.length === 0) {
        if (pestanas) pestanas.innerHTML = "";
        document.getElementById("cuotasPagadasTexto").textContent = "0/0";
        document.getElementById("totalPagadoTexto").textContent = formatearMoneda(0);
        document.getElementById("totalPendienteTexto").textContent = formatearMoneda(0);
        document.getElementById("barraCuotas").style.width = "0%";
        cuerpo.innerHTML = "<tr><td colspan='5'>Tus cuotas aparecen cuando una empresa gana la votación.</td></tr>";
        return;
    }

    // Si no hay una cuenta elegida (o dejó de existir), se elige la primera
    if (!buscarFondo(idFondoActivo)) idFondoActivo = fondos[0].id;
    const fondo = buscarFondo(idFondoActivo);

    // Una pestaña por cada cuenta
    if (pestanas) pestanas.innerHTML = "";
    fondos.forEach((cuenta) => {
        const boton = document.createElement("button");
        boton.className = cuenta.id === idFondoActivo ? "tab-btn tab-btn--activo" : "tab-btn";
        boton.textContent = cuenta.concepto;
        boton.addEventListener("click", () => {
            idFondoActivo = cuenta.id;
            cargarMisCuotas();
        });
        if (pestanas) pestanas.appendChild(boton);
    });

    document.getElementById("tituloFondo").textContent = fondo.proveedor + " · " + fondo.concepto;
    document.getElementById("cuotasPagadasTexto").textContent = fondo.cuotasPagadas + "/" + fondo.totalCuotas;
    document.getElementById("totalPagadoTexto").textContent = formatearMoneda(fondo.cuotasPagadas * fondo.montoCuota);
    document.getElementById("totalPendienteTexto").textContent = formatearMoneda((fondo.totalCuotas - fondo.cuotasPagadas) * fondo.montoCuota);
    document.getElementById("barraCuotas").style.width = (fondo.cuotasPagadas / fondo.totalCuotas) * 100 + "%";

    // Una fila por cada cuota de la cuenta elegida
    cuerpo.innerHTML = "";
    for (let numero = 1; numero <= fondo.totalCuotas; numero++) {
        const estaPagada = numero <= fondo.cuotasPagadas;
        const esLaSiguiente = numero === fondo.cuotasPagadas + 1;
        const fila = document.createElement("tr");
        if (esLaSiguiente) fila.className = "fila-siguiente";
        fila.innerHTML = `
            <td><strong>Cuota ${numero} de ${fondo.totalCuotas}</strong></td>
            <td>${estaPagada ? "Pago registrado" : esLaSiguiente ? "Siguiente cuota a pagar" : "Por pagar"}</td>
            <td><span class="pill ${estaPagada ? "pill--pagado" : "pill--pendiente"}">${estaPagada ? "Pagada" : "Pendiente"}</span></td>
            <td><strong>${formatearMoneda(fondo.montoCuota)}</strong></td>
            <td>${estaPagada ? "Comprobante registrado" : esLaSiguiente ? `<button class="pagar-btn" id="botonPagarCuota">Pagar cuota</button>` : "—"}</td>`;
        cuerpo.appendChild(fila);
    }
    const boton = document.getElementById("botonPagarCuota");
    if (boton) boton.addEventListener("click", () => pagarCuota(fondo.id, sesion.id_integrante));
}

// Votaciones (COMPARAR.html)
let categorias = [];          // encuestas con sus empresas
let misVotos = {};            // { id_encuesta: id_opcion }
let categoriaActiva = null;

async function cargarVotaciones() {
    const sesion = exigirSesion();
    if (!sesion) return;
    const encuestas = await llamarApi("/api/encuestas");
    misVotos = await llamarApi("/api/mis-votos/" + sesion.id_integrante);
    categorias = encuestas.map((e) => ({
        id: e.id, titulo: e.titulo,
        empresas: e.empresas.map((emp) => ({ id_opcion: emp.id_opcion, nombre: emp.nombre, votos: Number(emp.votos) })),
    }));
    if (!categoriaActiva && categorias.length > 0) categoriaActiva = categorias[0].id;
    renderTabs();
    renderEmpresas();
}

function renderTabs() {
    const contenedor = document.getElementById("tabsCategorias");
    contenedor.innerHTML = "";
    categorias.forEach((categoria) => {
        const boton = document.createElement("button");
        boton.className = categoria.id === categoriaActiva ? "tab-btn tab-btn--activo" : "tab-btn";
        boton.textContent = categoria.titulo;
        boton.addEventListener("click", () => {
            categoriaActiva = categoria.id;
            renderTabs();
            renderEmpresas();
        });
        contenedor.appendChild(boton);
    });
}

function renderEmpresas() {
    const categoria = categorias.find((c) => c.id === categoriaActiva);
    const contenedor = document.getElementById("listaEmpresas");
    contenedor.innerHTML = "";
    if (!categoria) return;

    const totalVotos = categoria.empresas.reduce((suma, emp) => suma + emp.votos, 0);
    const opcionElegida = misVotos[categoria.id];
    const yaVoto = Boolean(opcionElegida);

    // Mensaje de estado: sin votos, empate o empresa que va ganando
    const ordenadas = [...categoria.empresas].sort((a, b) => b.votos - a.votos);
    const estadoVotacion = document.getElementById("estadoVotacion");
    if (totalVotos === 0) {
        estadoVotacion.textContent = "Todavía no hay votos en esta encuesta.";
    } else if (ordenadas.length > 1 && ordenadas[0].votos === ordenadas[1].votos) {
        estadoVotacion.textContent = "Hay un empate: se espera un desempate para definir la empresa y empezar a pagar.";
    } else {
        estadoVotacion.textContent = "Va ganando " + ordenadas[0].nombre + ". Las cuotas se arman con esa empresa.";
    }

    categoria.empresas.forEach((empresa) => {
        const porcentaje = totalVotos === 0 ? 0 : (empresa.votos / totalVotos) * 100;
        const tarjeta = document.createElement("article");
        tarjeta.className = "empresa-card";
        tarjeta.innerHTML = `
            <div class="empresa-info"><h4>${empresa.nombre}</h4><span class="empresa-votos">${empresa.votos} votos</span></div>
            <div class="barra-track"><div class="barra-fill barra-fill--voto" style="width:${porcentaje}%"></div></div>
            <div class="empresa-footer">
                <span>${porcentaje.toFixed(0)}%</span>
                <button class="votar-btn" data-encuesta="${categoria.id}" data-opcion="${empresa.id_opcion}" ${yaVoto ? "disabled" : ""}>
                    ${opcionElegida === empresa.id_opcion ? "✓ Tu voto" : "Votar"}</button>
            </div>`;
        contenedor.appendChild(tarjeta);
    });
    document.querySelectorAll(".votar-btn").forEach((boton) => {
        boton.addEventListener("click", () => votar(Number(boton.dataset.encuesta), Number(boton.dataset.opcion)));
    });
}

async function votar(idEncuesta, idOpcion) {
    try {
        await llamarApi("/api/votar", "POST", { id_encuesta: idEncuesta, id_opcion: idOpcion, id_integrante: obtenerSesion().id_integrante });
        mostrarAviso("¡Gracias por votar! Tu elección ya se sumó a los resultados.");
        await cargarVotaciones();
    } catch (error) {
        mostrarAviso(error.message);
    }
}

// Historial
let movimientos = [];

function renderHistorial() {
    const filtroTipo = document.getElementById("filtroTipo").value;
    const textoBusqueda = document.getElementById("buscarMovimiento").value.toLowerCase();
    const cuerpo = document.getElementById("tablaMovimientos");
    cuerpo.innerHTML = "";
    let entradas = 0, salidas = 0, cantidad = 0;

    movimientos.forEach((mov) => {
        if (filtroTipo !== "todos" && mov.tipo !== filtroTipo) return;
        if (!mov.concepto.toLowerCase().includes(textoBusqueda)) return;
        const importe = Number(mov.importe);
        cantidad++;
        if (mov.tipo === "entrada") entradas += importe; else salidas += importe;
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${mov.fecha}</td><td>${mov.concepto}</td><td>${mov.categoria}</td>
            <td><span class="pill ${mov.tipo === "entrada" ? "pill--pagado" : "pill--pendiente"}">${mov.tipo === "entrada" ? "Entrada" : "Salida"}</span></td>
            <td class="${mov.tipo === "entrada" ? "positivo" : "negativo"}"><strong>${mov.tipo === "entrada" ? "+ " : "- "}${formatearMoneda(importe)}</strong></td>`;
        cuerpo.appendChild(fila);
    });
    document.getElementById("pieHistorial").textContent =
        cantidad + " movimientos · Entradas " + formatearMoneda(entradas) + " · Salidas " + formatearMoneda(salidas);
}

// Catálogo
let proveedores = [];
let categoriaCatalogo = "Todas";

function renderCatalogo() {
    const texto = document.getElementById("buscarProveedor").value.toLowerCase();
    const nombresCategorias = ["Todas", ...new Set(proveedores.map((p) => p.categoria))];

    const botones = document.getElementById("botonesCategoria");
    botones.innerHTML = "";
    nombresCategorias.forEach((nombre) => {
        const boton = document.createElement("button");
        boton.className = nombre === categoriaCatalogo ? "tab-btn tab-btn--activo" : "tab-btn";
        boton.textContent = nombre === "Todas" ? "Todas las categorías" : nombre;
        boton.addEventListener("click", () => { categoriaCatalogo = nombre; renderCatalogo(); });
        botones.appendChild(boton);
    });

    const grilla = document.getElementById("grillaProveedores");
    grilla.innerHTML = "";
    const visibles = proveedores.filter((p) =>
        (categoriaCatalogo === "Todas" || p.categoria === categoriaCatalogo) &&
        (p.nombre + " " + p.etiqueta + " " + p.descripcion).toLowerCase().includes(texto));
    visibles.forEach((p) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "proveedor-card";
        tarjeta.innerHTML = `<span class="proveedor-tag">${p.etiqueta}</span><h3>${p.nombre}</h3><p>${p.descripcion}</p>`;
        grilla.appendChild(tarjeta);
    });
    document.getElementById("contadorProveedores").textContent = visibles.length + " proveedores";
}

// Preguntas frecuentes
document.querySelectorAll(".faq-pregunta").forEach((boton) => {
    boton.addEventListener("click", () => {
        const respuesta = boton.nextElementSibling;
        const estabaAbierta = respuesta.classList.contains("faq-respuesta--abierta");
        document.querySelectorAll(".faq-respuesta").forEach((r) => r.classList.remove("faq-respuesta--abierta"));
        if (!estabaAbierta) respuesta.classList.add("faq-respuesta--abierta");
    });
});

// Login y registro
function correoValido(correo) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo); }

const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");
if (formLogin && formRegistro) {
    // Cambia entre "Iniciar sesión" (fondo oscuro) y "Crear cuenta" (fondo verde)
    function mostrarFormulario(esRegistro) {
        formLogin.hidden = esRegistro;
        formRegistro.hidden = !esRegistro;
        document.getElementById("authPagina").classList.toggle("auth-pagina--registro", esRegistro);
    }
    document.getElementById("irARegistro").addEventListener("click", (e) => { e.preventDefault(); mostrarFormulario(true); });
    document.getElementById("irALogin").addEventListener("click", (e) => { e.preventDefault(); mostrarFormulario(false); });
    document.getElementById("olvideClave").addEventListener("click", (e) => { e.preventDefault(); mostrarAviso("Pronto vas a poder recuperar tu contraseña."); });
    if (window.location.hash === "#registro") mostrarFormulario(true);

    formRegistro.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nombre = document.getElementById("regNombre").value.trim();
        const correo = document.getElementById("regCorreo").value.trim();
        const contrasena = document.getElementById("regContrasena").value;
        const repetida = document.getElementById("regRepetir").value;
        const error = document.getElementById("errorRegistro");

        if (nombre.length < 3) return error.textContent = "Escribí tu nombre y apellido.";
        if (!correoValido(correo)) return error.textContent = "El correo no es válido.";
        if (contrasena.length < 6) return error.textContent = "La contraseña debe tener al menos 6 caracteres.";
        if (contrasena !== repetida) return error.textContent = "Las contraseñas no coinciden.";
        try {
            const usuario = await llamarApi("/api/registro", "POST", { nombre, correo, contrasena });
            guardarSesion(usuario);
            window.location.href = "EJEMPLO.html";
        } catch (falla) { error.textContent = falla.message; }
    });

    formLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const error = document.getElementById("errorLogin");
        try {
            const usuario = await llamarApi("/api/login", "POST", {
                correo: document.getElementById("logCorreo").value.trim(),
                contrasena: document.getElementById("logContrasena").value,
            });
            guardarSesion(usuario);
            window.location.href = "EJEMPLO.html";
        } catch (falla) { error.textContent = falla.message; }
    });
}

// Contacto
const formContacto = document.getElementById("formContacto");
if (formContacto) {
    const confirmacion = document.getElementById("confirmacionEnvio");
    formContacto.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        try {
            await llamarApi("/api/contacto", "POST", {
                nombre: formContacto.nombre.value, correo: formContacto.email.value, mensaje: formContacto.mensaje.value,
            });
            confirmacion.textContent = "¡Gracias! Te vamos a responder pronto.";
            formContacto.reset();
        } catch (falla) { confirmacion.textContent = falla.message; }
    });
}

// Puesta en marcha: se ejecuta solo lo que existe en cada página
if (document.getElementById("fondoTotal")) cargarPanel();
if (document.getElementById("tablaCuotas")) cargarMisCuotas();
if (document.getElementById("tabsCategorias")) cargarVotaciones();
if (document.getElementById("tablaMovimientos")) {
    llamarApi("/api/movimientos").then((datos) => { movimientos = datos; renderHistorial(); });
    document.getElementById("filtroTipo").addEventListener("change", renderHistorial);
    document.getElementById("buscarMovimiento").addEventListener("input", renderHistorial);
}
if (document.getElementById("grillaProveedores")) {
    llamarApi("/api/proveedores").then((datos) => { proveedores = datos; renderCatalogo(); });
    document.getElementById("buscarProveedor").addEventListener("input", renderCatalogo);
}
