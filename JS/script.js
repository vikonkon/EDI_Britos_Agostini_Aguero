const fondos = [
    {
        id: "viaje",
        proveedor: "Wolf Travel",
        concepto: "Viaje de egresados",
        icono: "✈️",
        totalCuotas: 10,
        cuotasPagadas: 6,
        montoCuota: 4500,
    },
    {
        id: "salon",
        proveedor: "Desert Eventos",
        concepto: "Salón para la cena",
        icono: "🎉",
        totalCuotas: 6,
        cuotasPagadas: 2,
        montoCuota: 5000,
    },
];
 
// Ingresos de rifas, ferias de platos, bonos.
const otrosIngresos = [
    { origen: "Rifa de electrodomésticos", monto: 15500 },
    { origen: "Feria de platos", monto: 8900 },
];
 
// Gastos ya hechos con la plata de la promoción.
const gastos = [
    { motivo: "Seña salón Desert Eventos", monto: 19000 },
    { motivo: "Insumos feria de platos", monto: 3300 },
];
 
// Objetivo financiero.
const metaObjetivoValor = 120000;
 
// "Actividad reciente".
let actividad = [
    { texto: "Pago de cuota — Wolf Travel", monto: 4500, fecha: "ayer" },
    { texto: "Venta en la feria de platos", monto: 8900, fecha: "hace 3 días" },
];
 
// Empresas relevadas por la comisión, agrupadas por categoría (comparación + elección)
const categorias = [
    {
        id: "salon",
        titulo: "Salón para la cena",
        empresas: [
            { nombre: "Desert Eventos", votos: 14 },
            { nombre: "Marqués de Montecristo", votos: 9 },
        ],
    },
    {
        id: "viaje",
        titulo: "Viaje de egresados",
        empresas: [
            { nombre: "Wolf Travel", votos: 11 },
            { nombre: "Travel Rock", votos: 7 },
            { nombre: "Max Dream", votos: 4 },
            { nombre: "Luján Turismo", votos: 3 },
        ],
    },
];
 
let categoriaActiva = categorias[0].id;
 
// Para poder "Reiniciar" sin recargar la página.
const cuotasIniciales = { viaje: 6, salon: 2 };
const votosIniciales = {
    "Desert Eventos": 14,
    "Marqués de Montecristo": 9,
    "Wolf Travel": 11,
    "Travel Rock": 7,
    "Max Dream": 4,
    "Luján Turismo": 3,
};
 
 
/* FUNCIONES PARA CALCULAR NÚMEROS */

function sumarMontos(lista) {
    let total = 0;
    for (const item of lista) {
        total += item.monto;
    }
    return total;
}
 
// Suma lo que ya se pagó en cuotas de todos los fondos.
function totalCuotasPagadas() {
    let total = 0;
    for (const fondo of fondos) {
        total += fondo.cuotasPagadas * fondo.montoCuota;
    }
    return total;
}
 
function calcularFondoTotal() {
    return totalCuotasPagadas() + sumarMontos(otrosIngresos);
}
 
function calcularGastosTotales() {
    return sumarMontos(gastos);
}
 
// Porcentaje alcanzado respecto de la meta.
function calcularPorcentajeMeta() {
    const porcentaje = (calcularFondoTotal() / metaObjetivoValor) * 100;
    return Math.min(porcentaje, 100);
}
 
// Busca un fondo por su id.
function buscarFondo(id) {
    for (const fondo of fondos) {
        if (fondo.id === id) {
            return fondo;
        }
    }
    return null;
}

function buscarCategoria(id) {
    for (const categoria of categorias) {
        if (categoria.id === id) {
            return categoria;
        }
    }
    return null;
}

function formatearMoneda(numero) {
    return "$" + numero.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
 
 
/* FUNCIONES QUE DIBUJAN EN PANTALLA (DOM) */
 
// Dibuja el fondo total, la barra de la meta y el resumen mensual.
function renderResumenGeneral() {
    const fondoTotal = calcularFondoTotal();
    const gastosTotales = calcularGastosTotales();
    const porcentaje = calcularPorcentajeMeta();
    const falta = Math.max(metaObjetivoValor - fondoTotal, 0);
 
    document.getElementById("fondoTotal").textContent = formatearMoneda(fondoTotal);
    document.getElementById("metaObjetivo").textContent = formatearMoneda(metaObjetivoValor);
    document.getElementById("metaFaltan").textContent = formatearMoneda(falta);
    document.getElementById("metaPorcentaje").textContent = porcentaje.toFixed(0) + "% alcanzado";
 
    // "barra interactiva"
    document.getElementById("metaBarraFill").style.width = porcentaje + "%";
 
    document.getElementById("resumenIngresos").textContent = formatearMoneda(fondoTotal);
    document.getElementById("resumenGastos").textContent = formatearMoneda(gastosTotales);
    document.getElementById("resumenSaldo").textContent = formatearMoneda(fondoTotal - gastosTotales);
}
 
// Tarjetas de "Tus cuentas" (Wolf Travel, Desert Eventos...).
function renderFondos() {
    const contenedor = document.getElementById("listaFondos");
    contenedor.innerHTML = "";
    fondos.forEach((fondo) => {
        const porcentaje = (fondo.cuotasPagadas / fondo.totalCuotas) * 100;
        const completo = fondo.cuotasPagadas >= fondo.totalCuotas;
 
        const card = document.createElement("article");
        card.className = "fondo-card";
        card.innerHTML = `
            <div class="fondo-header">
                <span class="fondo-icono">${fondo.icono}</span>
                <div class="fondo-nombre">
                    <h4>${fondo.proveedor}</h4>
                    <span>${fondo.concepto}</span>
                </div>
                <span class="fondo-contador">${fondo.cuotasPagadas}/${fondo.totalCuotas} cuotas</span>
            </div>
            <div class="barra-track">
                <div class="barra-fill" style="width:${porcentaje}%"></div>
            </div>
            <div class="fondo-footer">
                ${completo
                    ? `<span class="pill pill--pagado">Cuotas completas</span>`
                    : `<div class="fondo-cuota-info">
                           <span class="cuota-num">Cuota ${fondo.cuotasPagadas + 1}/${fondo.totalCuotas}</span>
                           <span class="cuota-monto">${formatearMoneda(fondo.montoCuota)}</span>
                           <span class="pill pill--pendiente">Pendiente</span>
                       </div>
                       <button class="pagar-btn" data-id="${fondo.id}">Pagar cuota</button>`
                }
            </div>
        `;
        contenedor.appendChild(card);
    });

    document.querySelectorAll(".pagar-btn").forEach((boton) => {
        boton.addEventListener("click", () => pagarCuota(boton.dataset.id));
    });
}
 
// Lista de "Actividad reciente".
function renderActividad() {
    const lista = document.getElementById("listaActividad");
    lista.innerHTML = "";
 
    const ultimosMovimientos = actividad.slice(0, 6);
    ultimosMovimientos.forEach((item) => {
        const li = document.createElement("li");
        li.className = "actividad-item";
        li.innerHTML = `
            <span class="actividad-icono">💸</span>
            <div>
                <p>${item.texto}</p>
                <span class="actividad-meta">${formatearMoneda(item.monto)} · ${item.fecha}</span>
            </div>
        `;
        lista.appendChild(li);
    });
}
 
// Se ejecuta al tocar "Pagar cuota".
function pagarCuota(idFondo) {
    const fondo = buscarFondo(idFondo);
    if (!fondo) return;
    if (fondo.cuotasPagadas >= fondo.totalCuotas) return;
 
    fondo.cuotasPagadas = fondo.cuotasPagadas + 1;

    actividad.unshift({
        texto: `Pago de cuota — ${fondo.proveedor}`,
        monto: fondo.montoCuota,
        fecha: "recién",
    });

    renderFondos();
    renderActividad();
    renderResumenGeneral();
}
 
/* SECCIÓN "COMPARAR Y VOTAR" */

function renderTabs() {
    const contenedor = document.getElementById("tabsCategorias");
    contenedor.innerHTML = "";
 
    categorias.forEach((categoria) => {
        const boton = document.createElement("button");
        const esLaActiva = categoria.id === categoriaActiva;
        boton.className = esLaActiva ? "tab-btn tab-btn--activo" : "tab-btn";
        boton.textContent = categoria.titulo;
 
        boton.addEventListener("click", () => {
            categoriaActiva = categoria.id;
            renderTabs();
            renderEmpresas();
        });
 
        contenedor.appendChild(boton);
    });
}
 
// Tarjetas de empresas de la categoría activa, con su barra de votos.
function renderEmpresas() {
    const categoria = buscarCategoria(categoriaActiva);
    const contenedor = document.getElementById("listaEmpresas");
    contenedor.innerHTML = "";
 
    // Suma los votos de la categoría para poder calcular porcentajes.
    let totalVotos = 0;
    for (const empresa of categoria.empresas) {
        totalVotos += empresa.votos;
    }
 
    categoria.empresas.forEach((empresa) => {
        const porcentaje = totalVotos === 0 ? 0 : (empresa.votos / totalVotos) * 100;
 
        const card = document.createElement("article");
        card.className = "empresa-card";
        card.innerHTML = `
            <div class="empresa-info">
                <h4>${empresa.nombre}</h4>
                <span class="empresa-votos">${empresa.votos} votos</span>
            </div>
            <div class="barra-track">
                <div class="barra-fill barra-fill--voto" style="width:${porcentaje}%"></div>
            </div>
            <div class="empresa-footer">
                <span>${porcentaje.toFixed(0)}%</span>
                <button class="votar-btn" data-categoria="${categoria.id}" data-empresa="${empresa.nombre}">Votar</button>
            </div>
        `;
        contenedor.appendChild(card);
    });
 
    document.querySelectorAll(".votar-btn").forEach((boton) => {
        boton.addEventListener("click", () => {
            votar(boton.dataset.categoria, boton.dataset.empresa);
        });
    });
}
 
// Suma un voto a la empresa elegida.
function votar(idCategoria, nombreEmpresa) {
    const categoria = buscarCategoria(idCategoria);
    for (const empresa of categoria.empresas) {
        if (empresa.nombre === nombreEmpresa) {
            empresa.votos = empresa.votos + 1;
            break;
        }
    }
    renderEmpresas();
}

/* REINICIAR */
function reiniciarDemo() {
    fondos.forEach((fondo) => {
        fondo.cuotasPagadas = cuotasIniciales[fondo.id];
    });
 
    categorias.forEach((categoria) => {
        categoria.empresas.forEach((empresa) => {
            empresa.votos = votosIniciales[empresa.nombre];
        });
    });
 
    actividad = [
        { texto: "Pago de cuota — Wolf Travel", monto: 4500, fecha: "ayer" },
        { texto: "Venta en la feria de platos", monto: 8900, fecha: "hace 3 días" },
    ];
 
    renderResumenGeneral();
    renderFondos();
    renderActividad();
    renderEmpresas();
}
 
/* PUESTA EN MARCHA */
if (document.getElementById("reiniciarDemo")) {
    document.getElementById("reiniciarDemo").addEventListener("click", reiniciarDemo);
}

if (document.getElementById("fondoTotal")) {
    renderResumenGeneral();
    renderFondos();
    renderActividad();
}

if (document.getElementById("tabsCategorias")) {
    renderTabs();
    renderEmpresas();
}
// Formulario
const formContacto = document.getElementById("formContacto");
if (formContacto) {
    const confirmacion = document.getElementById("confirmacionEnvio");
    formContacto.addEventListener("submit", (evento) => {
        evento.preventDefault();
        confirmacion.textContent = "¡Gracias! Te vamos a responder pronto.";
        formContacto.reset();
    });
}