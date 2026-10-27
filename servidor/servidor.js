// Servidor de CuentaClara: Node + Express + MySQL
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");

const aplicacion = express();
aplicacion.use(express.json());
// Sirve las páginas (HTML/CSS/JS) que están una carpeta más arriba
aplicacion.use(express.static(path.join(__dirname, "..")));

// Conexión a la base de datos
const conexion = mysql.createPool({
    host: process.env.BD_HOST,
    user: process.env.BD_USUARIO,
    password: process.env.BD_CLAVE,
    database: process.env.BD_NOMBRE,
});

const ID_PROMOCION = 1; // Promo 2026 · 5to 3ra

// Usuarios
aplicacion.post("/api/registro", async (peticion, respuesta) => {
    try {
        const { nombre, correo, contrasena } = peticion.body;
        if (!nombre || !correo || !contrasena || contrasena.length < 6) {
            return respuesta.status(400).json({ error: "Datos incompletos o contraseña muy corta." });
        }
        const contrasenaCifrada = await bcrypt.hash(contrasena, 10);
        const [resultado] = await conexion.query(
            "INSERT INTO usuarios (nombre_completo, correo, contrasena_hash) VALUES (?, ?, ?)",
            [nombre, correo.toLowerCase(), contrasenaCifrada]
        );
        const [integrante] = await conexion.query(
            "INSERT INTO integrantes (id_usuario, id_promocion) VALUES (?, ?)",
            [resultado.insertId, ID_PROMOCION]
        );
        respuesta.json({ id_usuario: resultado.insertId, id_integrante: integrante.insertId, nombre });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return respuesta.status(409).json({ error: "Ese correo ya está registrado." });
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

aplicacion.post("/api/login", async (peticion, respuesta) => {
    try {
        const { correo, contrasena } = peticion.body;
        const [filas] = await conexion.query(
            `SELECT u.id_usuario, u.nombre_completo, u.contrasena_hash, i.id_integrante
             FROM usuarios u JOIN integrantes i ON i.id_usuario = u.id_usuario
             WHERE u.correo = ?`, [(correo || "").toLowerCase()]
        );
        const usuario = filas[0];
        if (!usuario || !(await bcrypt.compare(contrasena || "", usuario.contrasena_hash))) {
            return respuesta.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
        respuesta.json({ id_usuario: usuario.id_usuario, id_integrante: usuario.id_integrante, nombre: usuario.nombre_completo });
    } catch (error) {
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

// Votaciones
// Devuelve cada encuesta con sus opciones y la cantidad de votos
aplicacion.get("/api/encuestas", async (peticion, respuesta) => {
    try {
        const [filas] = await conexion.query(
            `SELECT e.id_encuesta, e.titulo, e.fecha_cierre, o.id_opcion, p.nombre AS empresa,
                    COUNT(v.id_voto) AS votos
             FROM encuestas e
             JOIN opciones_encuesta o ON o.id_encuesta = e.id_encuesta
             JOIN proveedores p ON p.id_proveedor = o.id_proveedor
             LEFT JOIN votos v ON v.id_opcion = o.id_opcion
             WHERE e.id_promocion = ?
             GROUP BY e.id_encuesta, e.titulo, e.fecha_cierre, o.id_opcion, p.nombre
             ORDER BY e.id_encuesta, o.id_opcion`, [ID_PROMOCION]
        );
        const encuestas = {};
        for (const fila of filas) {
            if (!encuestas[fila.id_encuesta]) {
                encuestas[fila.id_encuesta] = { id: fila.id_encuesta, titulo: fila.titulo, cierre: fila.fecha_cierre, empresas: [] };
            }
            encuestas[fila.id_encuesta].empresas.push({ id_opcion: fila.id_opcion, nombre: fila.empresa, votos: fila.votos });
        }
        respuesta.json(Object.values(encuestas));
    } catch (error) {
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

aplicacion.post("/api/votar", async (peticion, respuesta) => {
    try {
        const { id_encuesta, id_opcion, id_integrante } = peticion.body;
        const [encuesta] = await conexion.query("SELECT id_encuesta FROM encuestas WHERE id_encuesta = ?", [id_encuesta]);
        if (!encuesta[0]) return respuesta.status(404).json({ error: "La encuesta no existe." });

        await conexion.query(
            "INSERT INTO votos (id_encuesta, id_opcion, id_integrante) VALUES (?, ?, ?)",
            [id_encuesta, id_opcion, id_integrante]
        );
        await sincronizarFondos();
        respuesta.json({ ok: true });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return respuesta.status(409).json({ error: "Ya votaste en esta encuesta." });
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

// Qué opción votó un integrante en cada encuesta: { id_encuesta: id_opcion }
aplicacion.get("/api/mis-votos/:id_integrante", async (peticion, respuesta) => {
    const [filas] = await conexion.query("SELECT id_encuesta, id_opcion FROM votos WHERE id_integrante = ?", [peticion.params.id_integrante]);
    const misVotos = {};
    for (const fila of filas) misVotos[fila.id_encuesta] = fila.id_opcion;
    respuesta.json(misVotos);
});

// Cuotas
// Mantiene la cuenta de cuotas de cada encuesta con la empresa que va ganando.
// Si todavía nadie votó, no se crea nada; si cambia la ganadora, se actualiza la empresa.
async function sincronizarFondos() {
    const [encuestas] = await conexion.query(
        "SELECT id_encuesta, titulo, total_cuotas, monto_cuota FROM encuestas WHERE id_promocion = ?",
        [ID_PROMOCION]
    );
    for (const encuesta of encuestas) {
        const [ganadora] = await conexion.query(
            `SELECT o.id_proveedor
             FROM opciones_encuesta o
             LEFT JOIN votos v ON v.id_opcion = o.id_opcion
             WHERE o.id_encuesta = ?
             GROUP BY o.id_opcion, o.id_proveedor
             HAVING COUNT(v.id_voto) > 0
             ORDER BY COUNT(v.id_voto) DESC, o.id_opcion ASC
             LIMIT 1`,
            [encuesta.id_encuesta]
        );
        if (!ganadora[0]) continue;
        await conexion.query(
            `INSERT INTO fondos (id_promocion, id_encuesta, id_proveedor, concepto, total_cuotas, monto_cuota)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE id_proveedor = VALUES(id_proveedor)`,
            [ID_PROMOCION, encuesta.id_encuesta, ganadora[0].id_proveedor, encuesta.titulo, encuesta.total_cuotas, encuesta.monto_cuota]
        );
    }
}

// Cuántas cuotas pagó un integrante en cada fondo
aplicacion.get("/api/fondos/:id_integrante", async (peticion, respuesta) => {
    try {
        await sincronizarFondos();
        const [filas] = await conexion.query(
            `SELECT f.id_fondo, p.nombre AS proveedor, f.concepto, f.total_cuotas, f.monto_cuota,
                    COUNT(c.id_cuota) AS cuotas_pagadas
             FROM fondos f
             JOIN proveedores p ON p.id_proveedor = f.id_proveedor
             LEFT JOIN cuotas c ON c.id_fondo = f.id_fondo AND c.id_integrante = ? AND c.estado = 'pagada'
             WHERE f.id_promocion = ?
             GROUP BY f.id_fondo, p.nombre, f.concepto, f.total_cuotas, f.monto_cuota`,
            [peticion.params.id_integrante, ID_PROMOCION]
        );
        respuesta.json(filas);
    } catch (error) {
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

aplicacion.post("/api/cuotas/pagar", async (peticion, respuesta) => {
    const { id_fondo, id_integrante } = peticion.body;
    const enlace = await conexion.getConnection();
    try {
        await enlace.beginTransaction();
        const [fondos] = await enlace.query("SELECT * FROM fondos WHERE id_fondo = ?", [id_fondo]);
        const fondo = fondos[0];
        if (!fondo) throw new Error("FONDO_INEXISTENTE");

        const [pagadas] = await enlace.query(
            "SELECT COUNT(*) AS cantidad FROM cuotas WHERE id_fondo = ? AND id_integrante = ? AND estado = 'pagada'",
            [id_fondo, id_integrante]
        );
        const numeroCuota = pagadas[0].cantidad + 1;
        if (numeroCuota > fondo.total_cuotas) throw new Error("CUOTAS_COMPLETAS");

        await enlace.query(
            "INSERT INTO cuotas (id_fondo, id_integrante, numero_cuota, estado, fecha_pago) VALUES (?, ?, ?, 'pagada', NOW())",
            [id_fondo, id_integrante, numeroCuota]
        );
        await enlace.query(
            "INSERT INTO movimientos (id_promocion, fecha, concepto, categoria, tipo, importe) VALUES (?, CURDATE(), ?, 'Cuota', 'entrada', ?)",
            [ID_PROMOCION, `Pago de cuota · ${fondo.concepto}`, fondo.monto_cuota]
        );
        await enlace.commit();
        respuesta.json({ ok: true, numero_cuota: numeroCuota });
    } catch (error) {
        await enlace.rollback();
        if (error.message === "CUOTAS_COMPLETAS") return respuesta.status(400).json({ error: "Ya pagaste todas las cuotas." });
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    } finally {
        enlace.release();
    }
});

// Datos generales
aplicacion.get("/api/resumen", async (peticion, respuesta) => {
    try {
        const [totales] = await conexion.query(
            `SELECT COALESCE(SUM(CASE WHEN tipo='entrada' THEN importe END),0) AS ingresos,
                    COALESCE(SUM(CASE WHEN tipo='salida' THEN importe END),0) AS gastos
             FROM movimientos WHERE id_promocion = ?`, [ID_PROMOCION]
        );
        const [promocion] = await conexion.query("SELECT meta_objetivo FROM promociones WHERE id_promocion = ?", [ID_PROMOCION]);
        const ingresos = Number(totales[0].ingresos);
        const gastos = Number(totales[0].gastos);
        respuesta.json({ ingresos, gastos, saldo: ingresos - gastos, meta: Number(promocion[0].meta_objetivo) });
    } catch (error) {
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

aplicacion.get("/api/movimientos", async (peticion, respuesta) => {
    const [filas] = await conexion.query(
        "SELECT DATE_FORMAT(fecha,'%d/%m/%Y') AS fecha, concepto, categoria, tipo, importe FROM movimientos WHERE id_promocion = ? ORDER BY fecha DESC, id_movimiento DESC",
        [ID_PROMOCION]
    );
    respuesta.json(filas);
});

// Registra un ingreso (rifa, feria, bono) o un gasto de la promo
aplicacion.post("/api/movimientos", async (peticion, respuesta) => {
    try {
        const { tipo, concepto, importe } = peticion.body;
        const esIngreso = tipo === "ingreso";
        if ((!esIngreso && tipo !== "gasto") || !concepto || !(Number(importe) > 0)) {
            return respuesta.status(400).json({ error: "Completá el concepto y un monto mayor a cero." });
        }
        await conexion.query(
            "INSERT INTO movimientos (id_promocion, fecha, concepto, categoria, tipo, importe) VALUES (?, CURDATE(), ?, ?, ?, ?)",
            [ID_PROMOCION, concepto, esIngreso ? "Recaudación" : "Organización", esIngreso ? "entrada" : "salida", importe]
        );
        respuesta.json({ ok: true });
    } catch (error) {
        console.error(error);
        respuesta.status(500).json({ error: "Error del servidor." });
    }
});

aplicacion.get("/api/proveedores", async (peticion, respuesta) => {
    const [filas] = await conexion.query(
        `SELECT p.nombre, c.nombre AS categoria, p.etiqueta, p.descripcion
         FROM proveedores p JOIN categorias_proveedor c ON c.id_categoria = p.id_categoria
         WHERE c.nombre <> 'Viaje' ORDER BY c.id_categoria, p.id_proveedor`
    );
    respuesta.json(filas);
});

aplicacion.get("/api/faq", async (peticion, respuesta) => {
    const [filas] = await conexion.query("SELECT pregunta, respuesta FROM preguntas_frecuentes");
    respuesta.json(filas);
});

aplicacion.post("/api/contacto", async (peticion, respuesta) => {
    const { nombre, correo, mensaje } = peticion.body;
    if (!nombre || !correo || !mensaje) return respuesta.status(400).json({ error: "Faltan datos." });
    await conexion.query("INSERT INTO mensajes_contacto (nombre, correo, mensaje) VALUES (?, ?, ?)", [nombre, correo, mensaje]);
    respuesta.json({ ok: true });
});

// Arranque
aplicacion.listen(process.env.PUERTO || 3000, () => {
    console.log("CuentaClara funcionando en http://localhost:" + (process.env.PUERTO || 3000));
});
