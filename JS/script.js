// Clave para guardar nuestra "Base de Datos" en el navegador
const DB_KEY = 'cuentaClaraDB';

// 1. ENTIDADES Y BASE DE DATOS SIMULADA
const datosIniciales = {
    fondos: [
        { id: 1, nombre: "Viaje de Egresados", pagado: 150000, meta: 500000 },
        { id: 2, nombre: "Cena de Fin de Año", pagado: 80000, meta: 200000 },
        { id: 3, nombre: "Buzos de Promoción", pagado: 45000, meta: 90000 }
    ],
    actividad: [
        { id: 1, fecha: "recién", descripcion: "kbkjb", monto: 2000, tipo: "ingreso" },
        { id: 2, fecha: "recién", descripcion: "Pago de cuota — Desert Eventos", monto: 5000, tipo: "ingreso" }
    ],
    empresas: [
        { id: 1, nombre: "Marqués de Montecristo", categoria: "Salón para la cena", descripcion: "", votos: 10 },
        { id: 2, nombre: "Desert Eventos", categoria: "Salón para la cena", descripcion: "", votos: 14 },
        { id: 3, nombre: "Wolf Travel", categoria: "Viaje de egresados", descripcion: "", votos: 12 },
        { id: 4, nombre: "Travel Rock", categoria: "Viaje de egresados", descripcion: "", votos: 8 }
    ],
    // Nuevo: Registro para saber qué votó el usuario
    votosUsuario: {
        // Ejemplo: 'Salón para la cena': 1 (id de la empresa votada)
    }
};

// Funciones para interactuar con la Base de Datos
function obtenerDatos() {
    const datos = localStorage.getItem(DB_KEY);
    return datos ? JSON.parse(datos) : datosIniciales;
}

function guardarDatos(datos) {
    localStorage.setItem(DB_KEY, JSON.stringify(datos));
}

// Formateador para mostrar los números como Moneda Argentina
const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
};

// 2. INICIALIZADOR DE PÁGINAS (Enrutador)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('panel')) initPanel();
    if (document.getElementById('comparar')) initComparar();
    if (document.getElementById('formContacto')) initContacto();
});

// 3. LÓGICA DEL PANEL DE EJEMPLO
function initPanel() {
    const db = obtenerDatos();
    actualizarPanel(db);

    document.getElementById('reiniciarDemo').addEventListener('click', () => {
        localStorage.removeItem(DB_KEY);
        location.reload();
    });

    const formMovimiento = document.getElementById('formMovimiento');
    
    if (formMovimiento) {
        formMovimiento.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = formMovimiento.tipo.value;
            const concepto = formMovimiento.concepto.value;
            const monto = parseFloat(formMovimiento.monto.value);

            const dbActualizada = obtenerDatos();

            const nuevoMovimiento = {
                id: Date.now(),
                fecha: "recién", // Actualizado para coincidir con la imagen
                descripcion: concepto,
                monto: monto,
                tipo: tipo
            };

            dbActualizada.actividad.push(nuevoMovimiento);
            guardarDatos(dbActualizada);
            actualizarPanel(dbActualizada);
            formMovimiento.reset();
        });
    }
}

function actualizarPanel(db) {
    let totalPagado = 0;
    let totalMeta = 0;
    
    const listaFondos = document.getElementById('listaFondos');
    listaFondos.innerHTML = '';

    db.fondos.forEach(fondo => {
        totalPagado += fondo.pagado;
        totalMeta += fondo.meta;
        const porcentaje = Math.min((fondo.pagado / fondo.meta) * 100, 100).toFixed(1);

        const metaAlcanzada = fondo.pagado >= fondo.meta;
        
        const botonHTML = metaAlcanzada 
            ? `<button class="cta cta-secondary" disabled style="padding: 5px 10px; font-size: 0.8rem; cursor:not-allowed; opacity: 0.6;">Meta Alcanzada</button>`
            : `<button class="cta cta-secondary" onclick="pagarCuota(${fondo.id})" style="padding: 5px 10px; font-size: 0.8rem; cursor:pointer;">Aportar $10.000</button>`;

        const div = document.createElement('div');
        div.className = 'fondo-card'; 
        div.style.marginBottom = '20px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong>${fondo.nombre}</strong>
                <span>${formatearDinero(fondo.pagado)} / ${formatearDinero(fondo.meta)}</span>
            </div>
            <div class="barra-track" style="margin-bottom: 10px;">
                <div class="barra-fill" style="width: ${porcentaje}%; background-color: var(--primary-color, #108a73);"></div>
            </div>
            ${botonHTML}
        `;
        listaFondos.appendChild(div);
    });

    document.getElementById('fondoTotal').textContent = formatearDinero(totalPagado);
    document.getElementById('metaObjetivo').textContent = formatearDinero(totalMeta);
    
    const porcentajeTotal = totalMeta > 0 ? Math.min(((totalPagado / totalMeta) * 100), 100).toFixed(1) : 0;
    document.getElementById('metaBarraFill').style.width = `${porcentajeTotal}%`;
    document.getElementById('metaPorcentaje').textContent = `${porcentajeTotal}% alcanzado`;
    
    const faltanteReal = Math.max(0, totalMeta - totalPagado);
    document.getElementById('metaFaltan').textContent = formatearDinero(faltanteReal);

    // --- ACTUALIZACIÓN: Renderizar Actividad Reciente con diseño de imagen ---
    const listaActividad = document.getElementById('listaActividad');
    listaActividad.innerHTML = '';
    let ingresos = 0;
    let gastos = 0;

    db.actividad.slice().reverse().forEach(act => {
        if(act.tipo === 'ingreso') ingresos += act.monto;
        if(act.tipo === 'gasto') gastos += act.monto;

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center'; // Alineación vertical
        li.style.gap = '15px'; // Espacio entre ícono y texto
        li.style.padding = '15px 0';
        li.style.borderBottom = '1px solid #f0f0f0'; // Borde más sutil
        
        // Ícono simulado como el de la imagen
        const icono = act.tipo === 'ingreso' ? '💸' : '📤';
        const fondoIcono = '#f4f5f7'; // Gris clarito

        li.innerHTML = `
            <div style="background-color: ${fondoIcono}; padding: 10px; border-radius: 12px; font-size: 1.2rem;">
                ${icono}
            </div>
            <div style="display: flex; flex-direction: column; width: 100%;">
                <span style="color: #1a202c; font-weight: 500;">${act.descripcion}</span>
                <span style="color: #718096; font-size: 0.85rem; margin-top: 4px;">
                    ${act.tipo === 'ingreso' ? '+' : '-'}${formatearDinero(act.monto)} · ${act.fecha}
                </span>
            </div>
        `;
        listaActividad.appendChild(li);
    });

    document.getElementById('resumenIngresos').textContent = formatearDinero(ingresos);
    document.getElementById('resumenGastos').textContent = formatearDinero(gastos);
    document.getElementById('resumenSaldo').textContent = formatearDinero(ingresos - gastos);
}

window.pagarCuota = function(idFondo) {
    const db = obtenerDatos();
    const fondo = db.fondos.find(f => f.id === idFondo);
    
    if (fondo) {
        const montoAporte = 10000;
        
        if (fondo.pagado + montoAporte > fondo.meta) {
            alert(`No podés aportar más del límite. Faltan ${formatearDinero(fondo.meta - fondo.pagado)} para llegar a la meta.`);
            return; 
        }

        fondo.pagado += montoAporte;
        
        db.actividad.push({
            id: Date.now(),
            fecha: "recién", // Actualizado
            descripcion: `Pago de cuota — ${fondo.nombre}`,
            monto: montoAporte,
            tipo: 'ingreso'
        });

        guardarDatos(db);
        actualizarPanel(db); 
    }
};

// 4. LÓGICA DE COMPARAR Y VOTAR PROMOS (ACTUALIZADA)
function initComparar() {
    const db = obtenerDatos();
    const tabsContainer = document.getElementById('tabsCategorias');
    const listaEmpresas = document.getElementById('listaEmpresas');
    
    const categorias = [...new Set(db.empresas.map(e => e.categoria))];
    let categoriaActiva = categorias[0];

    function renderizarEmpresas() {
        // --- 1. Renderizar Pestañas ---
        tabsContainer.innerHTML = '';
        tabsContainer.style.display = 'flex';
        tabsContainer.style.gap = '10px';
        tabsContainer.style.justifyContent = 'center';
        tabsContainer.style.marginBottom = '30px';

        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.textContent = cat;
            // Estilos para que coincida con la imagen ("Salón para la cena" en verde)
            btn.className = cat === categoriaActiva ? 'cta' : 'cta cta-secondary';
            if (cat === categoriaActiva) {
                btn.style.backgroundColor = '#108a73';
                btn.style.color = 'white';
                btn.style.borderRadius = '20px';
            } else {
                btn.style.backgroundColor = '#f4f5f7';
                btn.style.color = '#4a5568';
                btn.style.border = 'none';
                btn.style.borderRadius = '20px';
            }
            btn.style.padding = '8px 20px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                categoriaActiva = cat;
                renderizarEmpresas();
            };
            tabsContainer.appendChild(btn);
        });

        // --- 2. Renderizar Tarjetas de Empresas ---
        listaEmpresas.innerHTML = '';
        listaEmpresas.style.display = 'grid';
        listaEmpresas.style.gap = '20px';
        listaEmpresas.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';

        const empresasFiltradas = db.empresas.filter(e => e.categoria === categoriaActiva);
        
        // Calcular el total de votos en esta categoría para sacar el porcentaje
        const totalVotosCategoria = empresasFiltradas.reduce((sum, emp) => sum + emp.votos, 0);
        
        // Identificar la empresa ganadora (para ponerle la copa 🏆)
        const maxVotos = Math.max(...empresasFiltradas.map(e => e.votos));

        empresasFiltradas.forEach(empresa => {
            const porcentaje = totalVotosCategoria > 0 ? Math.round((empresa.votos / totalVotosCategoria) * 100) : 0;
            const esGanadora = empresa.votos === maxVotos && empresa.votos > 0;
            
            // Verificar si el usuario ya votó en esta categoría
            const yaVotoEnEstaCategoria = db.votosUsuario && db.votosUsuario[categoriaActiva] !== undefined;
            const votoPorEstaEmpresa = db.votosUsuario && db.votosUsuario[categoriaActiva] === empresa.id;

            // Determinar apariencia del botón
            let botonHTML = '';
            let bordeTarjeta = '1px solid #e2e8f0'; // Borde gris normal

            if (yaVotoEnEstaCategoria) {
                if (votoPorEstaEmpresa) {
                    botonHTML = `<button style="background-color: #26c68b; color: white; padding: 8px 16px; border: none; border-radius: 20px; font-weight: bold; cursor: default;">✓ Tu voto</button>`;
                    bordeTarjeta = '2px solid #26c68b'; // Borde verde para la opción elegida
                } else {
                    botonHTML = `<button style="background-color: #e2e8f0; color: #a0aec0; padding: 8px 16px; border: none; border-radius: 20px; font-weight: bold; cursor: not-allowed;">Votar</button>`;
                }
            } else {
                botonHTML = `<button onclick="votarEmpresa(${empresa.id}, '${categoriaActiva}')" style="background-color: #108a73; color: white; padding: 8px 16px; border: none; border-radius: 20px; font-weight: bold; cursor: pointer;">Votar</button>`;
            }

            const article = document.createElement('article');
            article.className = 'proveedor-card';
            article.style.border = bordeTarjeta;
            article.style.borderRadius = '16px';
            article.style.padding = '20px';
            article.style.backgroundColor = 'white';
            
            article.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #1a202c;">
                        ${empresa.nombre} ${esGanadora ? '🏆' : ''}
                    </h3>
                    <span style="color: #718096; font-size: 0.85rem;">${empresa.votos} votos</span>
                </div>
                
                <div class="barra-track" style="background-color: #f4f5f7; border-radius: 10px; height: 12px; margin-bottom: 15px; overflow: hidden;">
                    <div class="barra-fill" style="width: ${porcentaje}%; background: linear-gradient(90deg, #4f46e5 0%, #26c68b 100%); height: 100%; border-radius: 10px;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #108a73; font-size: 1.1rem;">${porcentaje}%</strong>
                    ${botonHTML}
                </div>
            `;
            listaEmpresas.appendChild(article);
        });
    }

    renderizarEmpresas();

    // --- NUEVO: Función para votar limitando a una opción por categoría ---
    window.votarEmpresa = function(idEmpresa, categoria) {
        const dbActualizada = obtenerDatos();
        
        // Asegurarse de que exista el objeto de registro de votos
        if (!dbActualizada.votosUsuario) {
            dbActualizada.votosUsuario = {};
        }

        // Chequear si el usuario ya votó en esta categoría
        if (dbActualizada.votosUsuario[categoria] !== undefined) {
            alert("Ya emitiste tu voto en esta categoría.");
            return;
        }

        // Buscar la empresa y sumarle el voto
        const emp = dbActualizada.empresas.find(e => e.id === idEmpresa);
        if (emp) {
            emp.votos++;
            // Registrar que el usuario ya votó
            dbActualizada.votosUsuario[categoria] = idEmpresa;
            
            guardarDatos(dbActualizada);
            db.empresas = dbActualizada.empresas;
            db.votosUsuario = dbActualizada.votosUsuario;
            renderizarEmpresas(); 
        }
    };
}

// 5. LÓGICA DE CONTACTO
function initContacto() {
    const form = document.getElementById('formContacto');
    const confirmacion = document.getElementById('confirmacionEnvio');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        confirmacion.textContent = `¡Gracias por comunicarte, ${nombre}! Tu mensaje fue enviado a la comisión.`;
        confirmacion.style.color = '#2ecc71';
        confirmacion.style.marginTop = '15px';
        confirmacion.style.fontWeight = 'bold';
        form.reset();
    });
}