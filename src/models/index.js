import sequelize from "../config/db.js";
import { initUsuario } from "./Usuario.js";
import { initLiquidacion } from "./Liquidacion.js";
import { initBonificacion } from "./Bonificacion.js";
import { initPernote } from "./Pernote.js";
import { initRecargo } from "./Recargo.js";
import { initServicio } from "./Servicio.js";
import { initVehiculo } from "./Vehiculo.js"; // Similar a Usuario.js

// Inicializar los modelos
const Usuario = initUsuario(sequelize);
const Vehiculo = initVehiculo(sequelize);
const Servicio = initServicio(sequelize);
const Bonificacion = initBonificacion(sequelize);
const Liquidacion = initLiquidacion(sequelize);
const Pernote = initPernote(sequelize);
const Recargo = initRecargo(sequelize);

// Establecer relaciones
Vehiculo.belongsTo(Usuario, { as: "propietario", foreignKey: "propietarioId" });
Vehiculo.belongsTo(Usuario, { as: "conductor", foreignKey: "conductorId" });

// Relación con el modelo Conductor (una liquidación pertenece a un conductor)
Liquidacion.belongsTo(Usuario, {
  foreignKey: {
    name: "conductorId", // Foreign key en Liquidacion
    allowNull: false,
  },
  as: "conductor", // Alias para usar en las consultas
});

// Relación con el modelo Vehiculo (una liquidación puede tener varios vehículos)
Liquidacion.belongsToMany(Vehiculo, {
  through: "LiquidacionVehiculos", // Tabla intermedia para la relación de muchos a muchos
  foreignKey: "liquidacionId", // Foreign key en la tabla intermedia para Liquidacion
  otherKey: "vehiculoId", // Foreign key en la tabla intermedia para Vehiculo
  as: "vehiculos", // Alias para usar en las consultas
});

Liquidacion.hasMany(Bonificacion, {
  foreignKey: "liquidacionId",
  as: "bonificaciones",
});

Liquidacion.hasMany(Pernote, {
  foreignKey: "liquidacionId",
  as: "pernotes",
});

Liquidacion.hasMany(Recargo, {
  foreignKey: "liquidacionId",
  as: "recargos",
});

// Relación de muchos a uno con Liquidacion
Bonificacion.belongsTo(Liquidacion, {
  foreignKey: {
    name: "liquidacionId", // Foreign key en Liquidacion
    allowNull: false,
  },
});

Bonificacion.belongsTo(Vehiculo, {
  foreignKey: 'vehiculoId',
  allowNull: false,
  as: 'vehiculo'
});

Pernote.belongsTo(Liquidacion, {
  foreignKey: "liquidacionId",
  allowNull: false,
});

Pernote.belongsTo(Vehiculo, {
  foreignKey: 'vehiculoId',
  allowNull: false,
  as: 'vehiculo'
});

Recargo.belongsTo(Liquidacion, {
  foreignKey: "liquidacionId",
  allowNull: false,
});

Recargo.belongsTo(Vehiculo, {
  foreignKey: 'vehiculoId',
  allowNull: false,
  as: 'vehiculo'
});

export {
  Usuario,
  Vehiculo,
  Servicio,
  Liquidacion,
  Bonificacion,
  Pernote,
  Recargo,
};
