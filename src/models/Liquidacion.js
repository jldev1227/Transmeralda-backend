import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { Usuario, Vehiculo } from "./index.js";

const Liquidacion = sequelize.define("Liquidacion", {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  periodoStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  periodoEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  auxilioTransporte: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  sueldoTotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  totalPernotes: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  totalBonificaciones: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  totalRecargos: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  diasLaborados: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ajusteSalarial: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
    timestamps: true
});

// Relación con el modelo Conductor (una liquidación pertenece a un conductor)
Liquidacion.belongsTo(Usuario, {
  foreignKey: {
    name: "conductorId",    // Foreign key en Liquidacion
    allowNull: false,
  },
  as: "conductor",  // Alias para usar en las consultas
});

// Relación con el modelo Vehiculo (una liquidación puede tener varios vehículos)
Liquidacion.belongsToMany(Vehiculo, {
  through: "LiquidacionVehiculos",  // Tabla intermedia para la relación de muchos a muchos
  foreignKey: "liquidacionId",      // Foreign key en la tabla intermedia para Liquidacion
  otherKey: "vehiculoId",           // Foreign key en la tabla intermedia para Vehiculo
  as: "vehiculos",                  // Alias para usar en las consultas
});

// Exporta el modelo para usarlo en otros archivos
export default Liquidacion;
