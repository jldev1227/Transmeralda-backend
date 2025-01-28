// index.js

import sequelize from "../config/db.js";
import { initUsuario } from "./Usuario.js";
import { initLiquidacion } from "./Liquidacion.js";
import { initBonificacion } from "./Bonificacion.js";
import { initMantenimiento } from "./Mantenimiento.js";
import { initPernote } from "./Pernote.js";
import { initRecargo } from "./Recargo.js";
import { initConfiguracionLiquidador } from "./ConfiguracionLiquidador.js";
import { initServicio } from "./Servicio.js";
import { initVehiculo } from "./Vehiculo.js"; 
import { initEmpresa } from "./Empresa.js"; 
import { initAnticipo } from "./Anticipo.js";
import { initRespuestaDetalle, initRespuestaFormulario } from "./RespuestaFormulario.js";
import { initFormulario, initCategoria, initCampo, initOpcion } from './Formulario.js'

// Inicializar modelos
const Usuario = initUsuario(sequelize);
const Vehiculo = initVehiculo(sequelize);
const Servicio = initServicio(sequelize);
const Empresa = initEmpresa(sequelize);
const Bonificacion = initBonificacion(sequelize);
const Mantenimiento = initMantenimiento(sequelize);
const Liquidacion = initLiquidacion(sequelize);
const Pernote = initPernote(sequelize);
const Recargo = initRecargo(sequelize);
const Anticipo = initAnticipo(sequelize);
const ConfiguracionLiquidador = initConfiguracionLiquidador(sequelize);

// Formulario y sus relacionados
const Formulario = initFormulario(sequelize);
const Categoria = initCategoria(sequelize);
const Campo = initCampo(sequelize);
const Opcion = initOpcion(sequelize);

// Respuestas
const RespuestaFormulario = initRespuestaFormulario(sequelize);
const RespuestaDetalle = initRespuestaDetalle(sequelize);

// Establecer relaciones

// Ejemplo: Vehiculo pertenece a Usuario
Vehiculo.belongsTo(Usuario, { as: "propietario", foreignKey: "propietarioId" });
Vehiculo.belongsTo(Usuario, { as: "conductor", foreignKey: "conductorId" });

// Liquidacion a Usuario
Liquidacion.belongsTo(Usuario, {
  foreignKey: { name: "conductorId", allowNull: false },
  as: "conductor",
});

// Liquidacion a Vehiculo - muchos a muchos
Liquidacion.belongsToMany(Vehiculo, {
  through: "LiquidacionVehiculos",
  foreignKey: "liquidacionId",
  otherKey: "vehiculoId",
  as: "vehiculos",
});

// Otras relaciones Liquidacion
Liquidacion.hasMany(Bonificacion, { foreignKey: "liquidacionId", as: "bonificaciones" });
Liquidacion.hasMany(Mantenimiento, { foreignKey: "liquidacionId", as: "mantenimientos" });
Liquidacion.hasMany(Pernote, { foreignKey: "liquidacionId", as: "pernotes" });
Liquidacion.hasMany(Recargo, { foreignKey: "liquidacionId", as: "recargos" });
Liquidacion.hasMany(Anticipo, { foreignKey: "liquidacionId", as: "anticipos" });

Bonificacion.belongsTo(Liquidacion, { foreignKey: { name: "liquidacionId", allowNull: false } });
Bonificacion.belongsTo(Vehiculo, { foreignKey: 'vehiculoId', allowNull: false, as: 'vehiculo' });

// ... repite el patrón para Mantenimiento, Pernote, Recargo, Anticipo igual que Bonificacion.

// index.js

// Formulario relaciones
Formulario.hasMany(Categoria, { 
  foreignKey: 'FormularioId', 
  as: 'categorias', 
  onUpdate: 'CASCADE', 
  onDelete: 'CASCADE' 
});
Categoria.belongsTo(Formulario, { 
  foreignKey: 'FormularioId', 
  as: 'formulario' 
});

// Categoria relaciones
Categoria.hasMany(Campo, { 
  foreignKey: 'CategoriaId', 
  as: 'campos', 
  onUpdate: 'CASCADE', 
  onDelete: 'CASCADE' 
});
Campo.belongsTo(Categoria, { 
  foreignKey: 'CategoriaId', 
  as: 'categoria' 
});

Campo.hasMany(Opcion, {
  foreignKey: 'CampoId',
  as: 'opciones',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
});
Opcion.belongsTo(Campo, {
  foreignKey: 'CampoId'
});

// RespuestaFormulario relaciones
RespuestaFormulario.belongsTo(Formulario, {
  foreignKey: 'FormularioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  as: 'formulario' // Alias para la relación
});
Formulario.hasMany(RespuestaFormulario, {
  foreignKey: 'FormularioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  as: 'respuestasFormulario' // Alias consistente
});

RespuestaDetalle.belongsTo(RespuestaFormulario, {
  foreignKey: 'RespuestaFormularioId',
  onDelete: 'NO ACTION', // Evita el conflicto de cascada
  onUpdate: 'CASCADE',
  as: 'respuestaFormulario',
});

RespuestaDetalle.belongsTo(Campo, {
  foreignKey: 'CampoId',
  onDelete: 'CASCADE', // Mantén cascada solo si es esencial
  onUpdate: 'CASCADE',
  as: 'campo',
});

RespuestaFormulario.hasMany(RespuestaDetalle, {
  foreignKey: 'RespuestaFormularioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  as: 'detalles'
});

Campo.hasMany(RespuestaDetalle, {
  foreignKey: 'CampoId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  as: 'respuestasDetalle'
});

export {
  Usuario,
  Vehiculo,
  Servicio,
  Empresa,
  Liquidacion,
  Bonificacion,
  Mantenimiento,
  Pernote,
  Recargo,
  Anticipo,
  ConfiguracionLiquidador,
  Formulario,
  Categoria,
  Campo,
  RespuestaFormulario,
  RespuestaDetalle
};
