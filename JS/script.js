// Se comunica con el servidor Node mediante la API (/api/...)

// Convierte un número en pesos: 15000 -> "$15.000,00"
function formatearMoneda(numero) {
    return "$" + Number(numero).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Muestra un cartelito flotante
function mostrarAviso(texto) {
    let aviso = document.getElementById("avisoFlotante");
    if (aviso === null) {
        aviso = document.createElement("div");
        aviso.id = "avisoFlotante";
        aviso.className = "aviso-flotante";
        document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add("aviso-flotante--visible");
    setTimeout(function () {
        aviso.classList.remove("aviso-flotante--visible");
    }, 3000);
}

function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo); // expresión regular simple para validar correo electrónico
}

class ApiCliente {
    // Llama al servidor y devuelve un objeto (puede salir bien como no y tirar un mensaje por el error)

    async llamar(ruta, metodo = "GET", datos = null) {
        const opciones = { method: metodo, headers: { "Content-Type": "application/json" } };
        if (datos !== null) {
            opciones.body = JSON.stringify(datos);
        }
        const respuesta = await fetch(ruta, opciones);
        const contenido = await respuesta.json();
        if (!respuesta.ok) {
            return { ok: false, error: contenido.error || "Error del servidor." };
        }
        return { ok: true, datos: contenido };
    }
}

const api = new ApiCliente();

class Sesion {
    obtener() {
        const texto = localStorage.getItem("sesion");
        if (texto === null) {
            return null;
        }
        return JSON.parse(texto);
    }

    guardar(datos) {
        localStorage.setItem("sesion", JSON.stringify(datos));
    }

    // Las páginas que necesitan usuario mandan a LOGIN si no hay sesión.
    exigir() {
        const usuario = this.obtener();
        if (usuario === null) {
            window.location.href = "LOGIN.html";
            return null;
        }
        return usuario;
    }

    cerrar() {
        localStorage.removeItem("sesion");
        window.location.href = "index.html";
    }

    // si hay sesión muestra el nombre y permite salir.
    actualizarMenu() {
        const enlace = document.getElementById("enlaceSesion");
        const usuario = this.obtener();
        if (enlace === null || usuario === null) {
            return;
        }
        document.getElementById("nombreSesion").textContent = usuario.nombre.split(" ")[0];
        enlace.title = "Cerrar sesión";
        enlace.href = "#";
        enlace.addEventListener("click", function (evento) {
            evento.preventDefault();
            if (confirm("¿Querés cerrar sesión?")) {
                sesion.cerrar();
            }
        });
    }
}

const sesion = new Sesion();

// Una cuenta de cuotas (empresa + concepto, por ejemplo "Viaje de egresados")
class Fondo {
    constructor(fila) {
        this.id = fila.id_fondo;
        this.proveedor = fila.proveedor;
        this.concepto = fila.concepto;
        this.totalCuotas = Number(fila.total_cuotas);
        this.cuotasPagadas = Number(fila.cuotas_pagadas);
        this.montoCuota = Number(fila.monto_cuota);

        // Ícono según el concepto
        if (fila.concepto.includes("Viaje")) {
            this.icono = "✈️";
        } else {
            this.icono = "🎉";
        }
    }

    porcentajePagado() {
        return (this.cuotasPagadas / this.totalCuotas) * 100;
    }

    estaCompleto() {
        return this.cuotasPagadas >= this.totalCuotas;
    }

    totalPagado() {
        return this.cuotasPagadas * this.montoCuota;
    }

    totalPendiente() {
        return (this.totalCuotas - this.cuotasPagadas) * this.montoCuota;
    }
}

// votación 
class Encuesta {
    constructor(datos) {
        this.id = Number(datos.id);
        this.titulo = datos.titulo;
        this.empresas = [];   // Array de { id_opcion, nombre, votos }
        for (let i = 0; i < datos.empresas.length; i++) {
            const emp = datos.empresas[i];
            this.empresas.push({ id_opcion: Number(emp.id_opcion), nombre: emp.nombre, votos: Number(emp.votos) });
        }
    }

    totalVotos() {
        let total = 0;
        for (let i = 0; i < this.empresas.length; i++) {
            total += this.empresas[i].votos;
        }
        return total;
    }

    // Estado: sin votos, empate o empresa que va ganando
    estado() {
        if (this.totalVotos() === 0) {
            return "Todavía no hay votos en esta encuesta.";
        }

        // se busca la empresa con más votos (primero) y la que le sigue (segundo)
        let primero = null;
        let segundo = null;
        for (let i = 0; i < this.empresas.length; i++) {
            const empresa = this.empresas[i];
            if (primero === null || empresa.votos > primero.votos) {
                segundo = primero;
                primero = empresa;
            } else if (segundo === null || empresa.votos > segundo.votos) {
                segundo = empresa;
            }
        }

        if (segundo !== null && primero.votos === segundo.votos) {
            return "Hay un empate: se espera un desempate para definir la empresa y empezar a pagar.";
        }
        return "Va ganando " + primero.nombre + ". Las cuotas se arman con esa empresa.";
    }
}

// para todas las páginas. Cada página hija define su propio selector y su propio iniciar().
class Pagina {
    constructor(selector) {
        this.selector = selector;   // elemento que solo existe en esa página
    }

    existe() {
        return document.querySelector(this.selector) !== null;
    }

    iniciar() {
        // Cada página hija lo reemplaza con su propio código
    }
}

// para las páginas que muestran cuentas de cuotas (Panel y Mis cuotas)
class PaginaConFondos extends Pagina {
    constructor(selector) {
        super(selector);
        this.fondos = [];   // Array de objetos Fondo
    }

    // Devuelve true si cargó bien y false si hubo error
    async cargarFondos(idIntegrante) {
        const resultado = await api.llamar("/api/fondos/" + idIntegrante);
        if (!resultado.ok) {
            mostrarAviso(resultado.error);
            return false;
        }
        this.fondos = [];
        for (let i = 0; i < resultado.datos.length; i++) {
            this.fondos.push(new Fondo(resultado.datos[i]));
        }
        return true;
    }

    buscarFondo(id) {
        let i = 0;
        while (i < this.fondos.length) {
            if (this.fondos[i].id === id) {
                return this.fondos[i];
            }
            i++;
        }
        return null;
    }

    // Se ejecuta al tocar "Pagar cuota". Después vuelve a cargar la página.
    async pagarCuota(idFondo) {
        const usuario = sesion.obtener();
        const resultado = await api.llamar("/api/cuotas/pagar", "POST", { id_fondo: idFondo, id_integrante: usuario.id_integrante });
        if (!resultado.ok) {
            mostrarAviso(resultado.error);
            return;
        }
        mostrarAviso("Cuota registrada. ¡Gracias!");
        await this.cargar();   // cada página hija define su propio cargar()
    }
}

class Panel extends PaginaConFondos {
    constructor() {
        super("#fondoTotal");
    }

    async iniciar() {
        await this.cargar();

        // Formulario "Registrar movimiento"
        const formulario = document.getElementById("formMovimiento");
        if (formulario !== null) {
            formulario.addEventListener("submit", function (evento) {
                panelPromo.registrarMovimiento(evento);
            });
        }
    }

    async cargar() {
        const usuario = sesion.exigir();
        if (usuario === null) {
            return;
        }

        const resumen = await api.llamar("/api/resumen");
        if (!resumen.ok) {
            mostrarAviso(resumen.error);
            return;
        }
        const movimientos = await api.llamar("/api/movimientos");
        if (!movimientos.ok) {
            mostrarAviso(movimientos.error);
            return;
        }
        const cargoFondos = await this.cargarFondos(usuario.id_integrante);
        if (!cargoFondos) {
            return;
        }

        this.mostrarResumen(resumen.datos);
        this.mostrarFondos();
        this.mostrarActividad(movimientos.datos);
    }

    mostrarResumen(resumen) {
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

    mostrarFondos() {
        const contenedor = document.getElementById("listaFondos");

        if (this.fondos.length === 0) {
            contenedor.innerHTML = "<p>Tus cuentas aparecen cuando una empresa gana la votación.</p>";
            return;
        }

        let html = "";
        for (let i = 0; i < this.fondos.length; i++) {
            const fondo = this.fondos[i];

            // La parte de abajo de la tarjeta cambia si ya pagó todo o no
            let pie = "";
            if (fondo.estaCompleto()) {
                pie = `<span class="pill pill--pagado">Cuotas completas</span>`;
            } else {
                pie = `<div class="fondo-cuota-info">
                           <span class="cuota-num">Cuota ${fondo.cuotasPagadas + 1}/${fondo.totalCuotas}</span>
                           <span class="cuota-monto">${formatearMoneda(fondo.montoCuota)}</span>
                           <span class="pill pill--pendiente">Pendiente</span>
                       </div>
                       <button class="pagar-btn" onclick="panelPromo.pagarCuota(${fondo.id})">Pagar cuota</button>`;
            }

            html += `
                <article class="fondo-card">
                    <div class="fondo-header">
                        <span class="fondo-icono">${fondo.icono}</span>
                        <div class="fondo-nombre"><h4>${fondo.proveedor}</h4><span>${fondo.concepto}</span></div>
                        <span class="fondo-contador">${fondo.cuotasPagadas}/${fondo.totalCuotas} cuotas</span>
                    </div>
                    <div class="barra-track"><div class="barra-fill" style="width:${fondo.porcentajePagado()}%"></div></div>
                    <div class="fondo-footer">${pie}</div>
                </article>`;
        }
        contenedor.innerHTML = html;
    }

    // Muestra los últimos 6 movimientos
    mostrarActividad(movimientos) {
        const lista = document.getElementById("listaActividad");

        let limite = movimientos.length;
        if (limite > 6) {
            limite = 6;
        }

        let html = "";
        for (let i = 0; i < limite; i++) {
            const mov = movimientos[i];
            html += `
                <li class="actividad-item">
                    <span class="actividad-icono">💸</span>
                    <div><p>${mov.concepto}</p>
                    <span class="actividad-meta">${formatearMoneda(mov.importe)} · ${mov.fecha}</span></div>
                </li>`;
        }
        lista.innerHTML = html;
    }

    async registrarMovimiento(evento) {
        evento.preventDefault();
        const formulario = document.getElementById("formMovimiento");
        const errorMovimiento = document.getElementById("errorMovimiento");
        const importe = parseFloat(formulario.monto.value);

        // Si algo sale mal, se guarda el mensaje acá
        let mensajeError = "";

        if (!(importe > 0)) {
            mensajeError = "El monto debe ser mayor a cero.";
        } else {
            const resultado = await api.llamar("/api/movimientos", "POST", {
                tipo: formulario.tipo.value,
                concepto: formulario.concepto.value.trim(),
                importe: importe,
            });
            if (!resultado.ok) {
                mensajeError = resultado.error;
            }
        }

        if (mensajeError !== "") {
            errorMovimiento.textContent = mensajeError;
            errorMovimiento.style.display = "block";
            return;
        }

        errorMovimiento.style.display = "none";
        formulario.reset();
        mostrarAviso("Movimiento registrado.");
        await this.cargar();
    }
}

const panelPromo = new Panel();

class MisCuotas extends PaginaConFondos {
    constructor() {
        super("#tablaCuotas");
        this.idFondoActivo = null;   // cuenta que se está mirando
    }

    async iniciar() {
        await this.cargar();
    }

    async cargar() {
        const usuario = sesion.exigir();
        if (usuario === null) {
            return;
        }
        const cargoFondos = await this.cargarFondos(usuario.id_integrante);
        if (!cargoFondos) {
            return;
        }
        this.mostrar();
    }

    // Se ejecuta al tocar una pestaña de cuenta. Cambia la cuenta activa y vuelve a mostrar
    async elegirFondo(id) {
        this.idFondoActivo = id;
        await this.cargar();
    }

    mostrar() {
        const cuerpo = document.getElementById("tablaCuotas");

        // Sin cuentas. se muestran los valores en cero y un aviso
        if (this.fondos.length === 0) {
            document.getElementById("pestanasFondos").innerHTML = "";
            document.getElementById("cuotasPagadasTexto").textContent = "0/0";
            document.getElementById("totalPagadoTexto").textContent = formatearMoneda(0);
            document.getElementById("totalPendienteTexto").textContent = formatearMoneda(0);
            document.getElementById("barraCuotas").style.width = "0%";
            cuerpo.innerHTML = "<tr><td colspan='5'>Tus cuotas aparecen cuando una empresa gana la votación.</td></tr>";
            return;
        }

        // Si no hay una cuenta elegida (o dejó de existir), se elige la primera
        if (this.buscarFondo(this.idFondoActivo) === null) {
            this.idFondoActivo = this.fondos[0].id;
        }
        const fondo = this.buscarFondo(this.idFondoActivo);

        // Una pestaña por cada cuenta
        let pestanas = "";
        for (let i = 0; i < this.fondos.length; i++) {
            const cuenta = this.fondos[i];
            let clase = "tab-btn";
            if (cuenta.id === this.idFondoActivo) {
                clase = "tab-btn tab-btn--activo";
            }
            pestanas += `<button class="${clase}" onclick="misCuotas.elegirFondo(${cuenta.id})">${cuenta.concepto}</button>`;
        }
        document.getElementById("pestanasFondos").innerHTML = pestanas;

        document.getElementById("tituloFondo").textContent = fondo.proveedor + " · " + fondo.concepto;
        document.getElementById("cuotasPagadasTexto").textContent = fondo.cuotasPagadas + "/" + fondo.totalCuotas;
        document.getElementById("totalPagadoTexto").textContent = formatearMoneda(fondo.totalPagado());
        document.getElementById("totalPendienteTexto").textContent = formatearMoneda(fondo.totalPendiente());
        document.getElementById("barraCuotas").style.width = fondo.porcentajePagado() + "%";

        // Una fila por cada cuota de la cuenta elegida
        let filas = "";
        for (let numero = 1; numero <= fondo.totalCuotas; numero++) {
            const estaPagada = numero <= fondo.cuotasPagadas;
            const esLaSiguiente = numero === fondo.cuotasPagadas + 1;

            let claseFila = "";
            let detalle = "";
            let clasePill = "";
            let textoPill = "";
            let accion = "";

            if (estaPagada) {
                detalle = "Pago registrado";
                clasePill = "pill--pagado";
                textoPill = "Pagada";
                accion = "Comprobante registrado";
            } else if (esLaSiguiente) {
                claseFila = "fila-siguiente";
                detalle = "Siguiente cuota a pagar";
                clasePill = "pill--pendiente";
                textoPill = "Pendiente";
                accion = `<button class="pagar-btn" onclick="misCuotas.pagarCuota(${fondo.id})">Pagar cuota</button>`;
            } else {
                detalle = "Por pagar";
                clasePill = "pill--pendiente";
                textoPill = "Pendiente";
                accion = "—";
            }

            filas += `
                <tr class="${claseFila}">
                    <td><strong>Cuota ${numero} de ${fondo.totalCuotas}</strong></td>
                    <td>${detalle}</td>
                    <td><span class="pill ${clasePill}">${textoPill}</span></td>
                    <td><strong>${formatearMoneda(fondo.montoCuota)}</strong></td>
                    <td>${accion}</td>
                </tr>`;
        }
        cuerpo.innerHTML = filas;
    }
}

const misCuotas = new MisCuotas();

class Votaciones extends Pagina {
    constructor() {
        super("#tabsCategorias");
        this.categorias = [];          // Array de objetos Encuesta
        this.misVotos = new Map();
        this.categoriaActiva = null;
    }

    async iniciar() {
        await this.cargar();
    }

    async cargar() {
        const usuario = sesion.exigir();
        if (usuario === null) {
            return;
        }

        const encuestas = await api.llamar("/api/encuestas");
        if (!encuestas.ok) {
            mostrarAviso(encuestas.error);
            return;
        }
        const votosDelServidor = await api.llamar("/api/mis-votos/" + usuario.id_integrante);
        if (!votosDelServidor.ok) {
            mostrarAviso(votosDelServidor.error);
            return;
        }

        // se pasa lo que manda el servidor a un Map
        this.misVotos = new Map();
        const claves = Object.keys(votosDelServidor.datos);
        for (let i = 0; i < claves.length; i++) {
            this.misVotos.set(Number(claves[i]), Number(votosDelServidor.datos[claves[i]]));
        }

        // se pasa cada encuesta a un objeto de la clase Encuesta
        this.categorias = [];
        for (let i = 0; i < encuestas.datos.length; i++) {
            this.categorias.push(new Encuesta(encuestas.datos[i]));
        }

        if (this.categoriaActiva === null && this.categorias.length > 0) {
            this.categoriaActiva = this.categorias[0].id;
        }
        this.mostrarTabs();
        this.mostrarEmpresas();
    }

    buscarEncuesta(id) {
        let i = 0;
        while (i < this.categorias.length) {
            if (this.categorias[i].id === id) {
                return this.categorias[i];
            }
            i++;
        }
        return null;
    }

    elegirCategoria(id) {
        this.categoriaActiva = id;
        this.mostrarTabs();
        this.mostrarEmpresas();
    }

    mostrarTabs() {
        let html = "";
        for (let i = 0; i < this.categorias.length; i++) {
            const categoria = this.categorias[i];
            let clase = "tab-btn";
            if (categoria.id === this.categoriaActiva) {
                clase = "tab-btn tab-btn--activo";
            }
            html += `<button class="${clase}" onclick="votaciones.elegirCategoria(${categoria.id})">${categoria.titulo}</button>`;
        }
        document.getElementById("tabsCategorias").innerHTML = html;
    }

    mostrarEmpresas() {
        const contenedor = document.getElementById("listaEmpresas");
        const categoria = this.buscarEncuesta(this.categoriaActiva);
        contenedor.innerHTML = "";
        if (categoria === null) {
            return;
        }

        document.getElementById("estadoVotacion").textContent = categoria.estado();

        const totalVotos = categoria.totalVotos();
        const yaVoto = this.misVotos.has(categoria.id);
        const opcionElegida = this.misVotos.get(categoria.id);

        let html = "";
        for (let i = 0; i < categoria.empresas.length; i++) {
            const empresa = categoria.empresas[i];

            let porcentaje = 0;
            if (totalVotos > 0) {
                porcentaje = (empresa.votos / totalVotos) * 100;
            }

            let atributoBoton = "";
            if (yaVoto) {
                atributoBoton = "disabled";
            }

            let textoBoton = "Votar";
            if (opcionElegida === empresa.id_opcion) {
                textoBoton = "✓ Tu voto";
            }

            html += `
                <article class="empresa-card">
                    <div class="empresa-info"><h4>${empresa.nombre}</h4><span class="empresa-votos">${empresa.votos} votos</span></div>
                    <div class="barra-track"><div class="barra-fill barra-fill--voto" style="width:${porcentaje}%"></div></div>
                    <div class="empresa-footer">
                        <span>${porcentaje.toFixed(0)}%</span>
                        <button class="votar-btn" onclick="votaciones.votar(${categoria.id}, ${empresa.id_opcion})" ${atributoBoton}>${textoBoton}</button>
                    </div>
                </article>`;
        }
        contenedor.innerHTML = html;
    }

    async votar(idEncuesta, idOpcion) {
        const resultado = await api.llamar("/api/votar", "POST", {
            id_encuesta: idEncuesta,
            id_opcion: idOpcion,
            id_integrante: sesion.obtener().id_integrante,
        });
        if (!resultado.ok) {
            mostrarAviso(resultado.error);
            return;
        }
        mostrarAviso("¡Gracias por votar! Tu elección ya se sumó a los resultados.");
        await this.cargar();
    }
}

const votaciones = new Votaciones();

class Historial extends Pagina {
    constructor() {
        super("#tablaMovimientos");
        this.movimientos = [];   // Array de movimientos que manda el servidor
    }

    async iniciar() {
        const resultado = await api.llamar("/api/movimientos");
        if (resultado.ok) {
            this.movimientos = resultado.datos;
        } else {
            mostrarAviso(resultado.error);
        }
        this.mostrar();

        // Cada vez que cambia el filtro o se escribe en el buscador, se vuelve a mostrar
        document.getElementById("filtroTipo").addEventListener("change", function () {
            historial.mostrar();
        });
        document.getElementById("buscarMovimiento").addEventListener("input", function () {
            historial.mostrar();
        });
    }

    mostrar() {
        const filtroTipo = document.getElementById("filtroTipo").value;
        const textoBusqueda = document.getElementById("buscarMovimiento").value.toLowerCase();

        // Se cuentan las entradas y salidas para mostrar el total en el pie de la tabla
        const totales = new Map();
        totales.set("entrada", 0);
        totales.set("salida", 0);
        let cantidad = 0;
        let html = "";

        for (let i = 0; i < this.movimientos.length; i++) {
            const mov = this.movimientos[i];
            const coincideTipo = (filtroTipo === "todos" || mov.tipo === filtroTipo);
            const coincideTexto = mov.concepto.toLowerCase().includes(textoBusqueda);

            if (coincideTipo && coincideTexto) {
                const importe = Number(mov.importe);
                cantidad++;

                let clasePill = "pill--pendiente";
                let textoPill = "Salida";
                let claseImporte = "negativo";
                let signo = "- ";
                if (mov.tipo === "entrada") {
                    clasePill = "pill--pagado";
                    textoPill = "Entrada";
                    claseImporte = "positivo";
                    signo = "+ ";
                    totales.set("entrada", totales.get("entrada") + importe);
                } else {
                    totales.set("salida", totales.get("salida") + importe);
                }

                html += `
                    <tr>
                        <td>${mov.fecha}</td><td>${mov.concepto}</td><td>${mov.categoria}</td>
                        <td><span class="pill ${clasePill}">${textoPill}</span></td>
                        <td class="${claseImporte}"><strong>${signo}${formatearMoneda(importe)}</strong></td>
                    </tr>`;
            }
        }

        document.getElementById("tablaMovimientos").innerHTML = html;
        document.getElementById("pieHistorial").textContent =
            cantidad + " movimientos · Entradas " + formatearMoneda(totales.get("entrada")) +
            " · Salidas " + formatearMoneda(totales.get("salida"));
    }
}

const historial = new Historial();

class Catalogo extends Pagina {
    constructor() {
        super("#grillaProveedores");
        this.proveedores = [];            // Array de proveedores
        this.nombresCategorias = [];      // Array con los nombres de categorías
        this.categoriaActiva = "Todas";
    }

    async iniciar() {
        const resultado = await api.llamar("/api/proveedores");
        if (resultado.ok) {
            this.proveedores = resultado.datos;
        } else {
            mostrarAviso(resultado.error);
        }
        this.mostrar();

        document.getElementById("buscarProveedor").addEventListener("input", function () {
            catalogo.mostrar();
        });
    }

    // Al tocar un botón de categoría (se manda la posición en el array)
    elegirCategoria(posicion) {
        this.categoriaActiva = this.nombresCategorias[posicion];
        this.mostrar();
    }

    mostrar() {
        const texto = document.getElementById("buscarProveedor").value.toLowerCase();

        // Un Set guarda cada categoría una sola vez, aunque se repita en varios proveedores
        const categoriasUnicas = new Set();
        categoriasUnicas.add("Todas");
        for (let i = 0; i < this.proveedores.length; i++) {
            categoriasUnicas.add(this.proveedores[i].categoria);
        }

        // Array para poder usar la posición de cada categoría
        this.nombresCategorias = [];
        for (const nombre of categoriasUnicas) {
            this.nombresCategorias.push(nombre);
        }

        // Botones de categoría
        let botones = "";
        for (let i = 0; i < this.nombresCategorias.length; i++) {
            const nombre = this.nombresCategorias[i];

            let clase = "tab-btn";
            if (nombre === this.categoriaActiva) {
                clase = "tab-btn tab-btn--activo";
            }
            let etiqueta = nombre;
            if (nombre === "Todas") {
                etiqueta = "Todas las categorías";
            }
            botones += `<button class="${clase}" onclick="catalogo.elegirCategoria(${i})">${etiqueta}</button>`;
        }
        document.getElementById("botonesCategoria").innerHTML = botones;

        // Tarjetas de proveedores
        let tarjetas = "";
        let visibles = 0;
        for (let i = 0; i < this.proveedores.length; i++) {
            const p = this.proveedores[i];
            const coincideCategoria = (this.categoriaActiva === "Todas" || p.categoria === this.categoriaActiva);
            const textoProveedor = (p.nombre + " " + p.etiqueta + " " + p.descripcion).toLowerCase();
            const coincideTexto = textoProveedor.includes(texto);

            if (coincideCategoria && coincideTexto) {
                visibles++;
                tarjetas += `<article class="proveedor-card"><span class="proveedor-tag">${p.etiqueta}</span><h3>${p.nombre}</h3><p>${p.descripcion}</p></article>`;
            }
        }
        document.getElementById("grillaProveedores").innerHTML = tarjetas;
        document.getElementById("contadorProveedores").textContent = visibles + " proveedores";
    }
}

const catalogo = new Catalogo();

class Faq extends Pagina {
    constructor() {
        super(".faq-pregunta");
    }

    iniciar() {
        const preguntas = document.querySelectorAll(".faq-pregunta");
        for (let i = 0; i < preguntas.length; i++) {
            const boton = preguntas[i];
            boton.addEventListener("click", function () {
                faq.alternar(boton);
            });
        }
    }

    // Abre la respuesta tocada y cierra las demás
    alternar(boton) {
        const respuesta = boton.nextElementSibling;
        const estabaAbierta = respuesta.classList.contains("faq-respuesta--abierta");

        const todas = document.querySelectorAll(".faq-respuesta");
        for (let i = 0; i < todas.length; i++) {
            todas[i].classList.remove("faq-respuesta--abierta");
        }
        if (!estabaAbierta) {
            respuesta.classList.add("faq-respuesta--abierta");
        }
    }
}

const faq = new Faq();

class Login extends Pagina {
    constructor() {
        super("#formLogin");
    }

    iniciar() {
        document.getElementById("irARegistro").addEventListener("click", function (evento) {
            evento.preventDefault();
            login.mostrarFormulario(true);
        });
        document.getElementById("irALogin").addEventListener("click", function (evento) {
            evento.preventDefault();
            login.mostrarFormulario(false);
        });
        document.getElementById("olvideClave").addEventListener("click", function (evento) {
            evento.preventDefault();
            mostrarAviso("Pronto vas a poder recuperar tu contraseña.");
        });
        document.getElementById("formRegistro").addEventListener("submit", function (evento) {
            login.registrar(evento);
        });
        document.getElementById("formLogin").addEventListener("submit", function (evento) {
            login.ingresar(evento);
        });

        if (window.location.hash === "#registro") {
            this.mostrarFormulario(true);
        }
    }

    // Cambia entre "Iniciar sesión" y "Crear cuenta" 
    mostrarFormulario(esRegistro) {
        document.getElementById("formLogin").hidden = esRegistro;
        document.getElementById("formRegistro").hidden = !esRegistro;
        document.getElementById("authPagina").classList.toggle("auth-pagina--registro", esRegistro);
    }

    async registrar(evento) {
        evento.preventDefault();
        const nombre = document.getElementById("regNombre").value.trim();
        const correo = document.getElementById("regCorreo").value.trim();
        const contrasena = document.getElementById("regContrasena").value;
        const repetida = document.getElementById("regRepetir").value;
        const error = document.getElementById("errorRegistro");

        if (nombre.length < 3) {
            error.textContent = "Escribí tu nombre y apellido.";
            return;
        }
        if (!correoValido(correo)) {
            error.textContent = "El correo no es válido.";
            return;
        }
        if (contrasena.length < 6) {
            error.textContent = "La contraseña debe tener al menos 6 caracteres.";
            return;
        }
        if (contrasena !== repetida) {
            error.textContent = "Las contraseñas no coinciden.";
            return;
        }

        const resultado = await api.llamar("/api/registro", "POST", { nombre: nombre, correo: correo, contrasena: contrasena });
        if (!resultado.ok) {
            error.textContent = resultado.error;
            return;
        }
        sesion.guardar(resultado.datos);
        window.location.href = "EJEMPLO.html";
    }

    async ingresar(evento) {
        evento.preventDefault();
        const error = document.getElementById("errorLogin");
        const resultado = await api.llamar("/api/login", "POST", {
            correo: document.getElementById("logCorreo").value.trim(),
            contrasena: document.getElementById("logContrasena").value,
        });
        if (!resultado.ok) {
            error.textContent = resultado.error;
            return;
        }
        sesion.guardar(resultado.datos);
        window.location.href = "EJEMPLO.html";
    }
}

const login = new Login();

class Contacto extends Pagina {
    constructor() {
        super("#formContacto");
    }

    iniciar() {
        document.getElementById("formContacto").addEventListener("submit", function (evento) {
            contacto.enviar(evento);
        });
    }

    async enviar(evento) {
        evento.preventDefault();
        const formulario = document.getElementById("formContacto");
        const confirmacion = document.getElementById("confirmacionEnvio");
        const resultado = await api.llamar("/api/contacto", "POST", {
            nombre: formulario.nombre.value,
            correo: formulario.email.value,
            mensaje: formulario.mensaje.value,
        });
        if (!resultado.ok) {
            confirmacion.textContent = resultado.error;
            return;
        }
        confirmacion.textContent = "¡Gracias! Te vamos a responder pronto.";
        formulario.reset();
    }
}

const contacto = new Contacto();

sesion.actualizarMenu();

const paginas = [panelPromo, misCuotas, votaciones, historial, catalogo, faq, login, contacto];
for (let i = 0; i < paginas.length; i++) {
    if (paginas[i].existe()) {
        paginas[i].iniciar();
    }
}
