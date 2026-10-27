-- CuentaClara - Base de datos MySQL
CREATE DATABASE IF NOT EXISTS cuentaclara CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE cuentaclara;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promociones (
  id_promocion INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,          -- "Promo 2026 · 5to 3ra"
  meta_objetivo DECIMAL(12,2) NOT NULL
);

CREATE TABLE integrantes (
  id_integrante INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_promocion INT NOT NULL,
  rol ENUM('alumno','padre','comision') NOT NULL DEFAULT 'alumno',
  UNIQUE (id_usuario, id_promocion),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_promocion) REFERENCES promociones(id_promocion)
);

CREATE TABLE categorias_proveedor (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL           -- Salones, Buzos, Fotografía, DJ, Viaje
);

CREATE TABLE proveedores (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  etiqueta VARCHAR(60),
  descripcion VARCHAR(200),
  FOREIGN KEY (id_categoria) REFERENCES categorias_proveedor(id_categoria)
);

-- Cuenta de cuotas de un proveedor (Wolf Travel 10 x 4500, etc.)
CREATE TABLE fondos (
  id_fondo INT AUTO_INCREMENT PRIMARY KEY,
  id_promocion INT NOT NULL,
  id_proveedor INT NOT NULL,
  concepto VARCHAR(80) NOT NULL,
  total_cuotas INT NOT NULL,
  monto_cuota DECIMAL(12,2) NOT NULL,
  id_encuesta INT NULL UNIQUE,          -- encuesta que originó la cuenta (la crea el servidor con la empresa que va ganando la votación)
  FOREIGN KEY (id_promocion) REFERENCES promociones(id_promocion),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE cuotas (
  id_cuota INT AUTO_INCREMENT PRIMARY KEY,
  id_fondo INT NOT NULL,
  id_integrante INT NOT NULL,
  numero_cuota INT NOT NULL,
  estado ENUM('pendiente','pagada') NOT NULL DEFAULT 'pendiente',
  fecha_pago DATETIME NULL,
  UNIQUE (id_fondo, id_integrante, numero_cuota),
  FOREIGN KEY (id_fondo) REFERENCES fondos(id_fondo),
  FOREIGN KEY (id_integrante) REFERENCES integrantes(id_integrante)
);

CREATE TABLE movimientos (
  id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
  id_promocion INT NOT NULL,
  fecha DATE NOT NULL,
  concepto VARCHAR(120) NOT NULL,
  categoria VARCHAR(40) NOT NULL,       -- Cuota, Recaudación, Proveedor, Aportes, Organización
  tipo ENUM('entrada','salida') NOT NULL,
  importe DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (id_promocion) REFERENCES promociones(id_promocion)
);

CREATE TABLE encuestas (
  id_encuesta INT AUTO_INCREMENT PRIMARY KEY,
  id_promocion INT NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  fecha_cierre DATETIME NOT NULL,
  total_cuotas INT NOT NULL DEFAULT 1,            -- en cuántas cuotas se paga a la empresa ganadora
  monto_cuota DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (id_promocion) REFERENCES promociones(id_promocion)
);

CREATE TABLE opciones_encuesta (
  id_opcion INT AUTO_INCREMENT PRIMARY KEY,
  id_encuesta INT NOT NULL,
  id_proveedor INT NOT NULL,
  FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

-- UNIQUE = un voto por integrante en cada encuesta
CREATE TABLE votos (
  id_voto INT AUTO_INCREMENT PRIMARY KEY,
  id_encuesta INT NOT NULL,
  id_opcion INT NOT NULL,
  id_integrante INT NOT NULL,
  fecha_voto DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_encuesta, id_integrante),
  FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta),
  FOREIGN KEY (id_opcion) REFERENCES opciones_encuesta(id_opcion),
  FOREIGN KEY (id_integrante) REFERENCES integrantes(id_integrante)
);

CREATE TABLE preguntas_frecuentes (
  id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
  pregunta VARCHAR(150) NOT NULL,
  respuesta TEXT NOT NULL
);

CREATE TABLE mensajes_contacto (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DATOS DE EJEMPLO (los mismos del diseño de Figma)
INSERT INTO promociones (nombre, meta_objetivo) VALUES ('Promo 2026 · 5to 3ra', 120000.00);

INSERT INTO categorias_proveedor (nombre) VALUES ('Salones'),('Buzos'),('Fotografía'),('DJ'),('Viaje');

INSERT INTO proveedores (id_categoria, nombre, etiqueta, descripcion) VALUES
(1,'Desert Eventos','Salón para la cena','Una de las opciones de salón que está votando la promo.'),
(1,'Marqués de Montecristo','Salón para la cena','Alternativa de salón para comparar antes de elegir.'),
(2,'Follow Me','Buzo de egresados','Empresa a cargo de la confección de los buzos de la promoción.'),
(2,'Gallardo Group','Presentación de buzos','Organiza el evento de presentación de buzos de la promoción.'),
(3,'Estudio Promo','Fotografía','Cobertura de la cena y retratos de la promoción.'),
(3,'Recuerdos Foto','Fotografía y video','Registro del evento y entrega de una galería digital.'),
(4,'Ritmo DJ','Música para eventos','Música para la cena y la fiesta de egresados.'),
(4,'Fiesta Sonido','DJ e iluminación','Sonido e iluminación para acompañar la celebración.'),
(5,'Wolf Travel','Viaje de egresados','Viaje de egresados.'),
(5,'Travel Rock','Viaje de egresados','Viaje de egresados.'),
(5,'Max Dream','Viaje de egresados','Viaje de egresados.'),
(5,'Luján Turismo','Viaje de egresados','Viaje de egresados.');

INSERT INTO encuestas (id_promocion, titulo, fecha_cierre, total_cuotas, monto_cuota) VALUES
(1,'Salón para la cena','2026-10-30 23:59:00',6,5000),
(1,'Viaje de egresados','2026-10-30 23:59:00',10,4500);

INSERT INTO opciones_encuesta (id_encuesta, id_proveedor) VALUES (1,1),(1,2),(2,9),(2,10),(2,11),(2,12);

INSERT INTO preguntas_frecuentes (pregunta, respuesta) VALUES
('¿Es gratis?','CuentaClara te ayuda a organizar los aportes y gastos de la promo. Antes de usarlo con tu curso, consultá las condiciones de uso y cualquier costo informado.'),
('¿Cómo se suma el curso?','La comisión crea la promo y los integrantes se suman creando su cuenta.'),
('¿Es seguro?','Los datos se guardan con contraseñas cifradas. No compartas datos bancarios por el formulario de contacto.'),
('¿Cómo registro el pago de una cuota?','Entrá a "Mis cuotas" y tocá "Pagar cuota" en la siguiente cuota pendiente.'),
('¿Quién puede ver los movimientos de la promo?','Los integrantes de la promo pueden ver el historial de entradas y salidas.');

-- CONSULTAS ÚTILES
-- Resultados de una encuesta:
-- SELECT p.nombre, COUNT(v.id_voto) AS votos FROM opciones_encuesta o
--   JOIN proveedores p ON p.id_proveedor=o.id_proveedor
--   LEFT JOIN votos v ON v.id_opcion=o.id_opcion WHERE o.id_encuesta=1 GROUP BY p.nombre;
-- Saldo disponible:
-- SELECT SUM(CASE WHEN tipo='entrada' THEN importe ELSE -importe END) FROM movimientos WHERE id_promocion=1;

-- Si la base ya existía: ALTER TABLE encuestas ADD total_cuotas/monto_cuota y fondos ADD id_encuesta (ver instrucciones).
