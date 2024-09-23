import { DataTypes, Model } from "sequelize";
import { Usuario, Vehiculo } from "./index.js";
import { Bonificacion, Pernote, Recargo } from "./index.js";

class Liquidacion extends Model {}

export function initLiquidacion(sequelize) {
  Liquidacion.init(
    {
      id: {
        type: DataTypes.INTEGER, // Cambia a tipo INTEGER
        autoIncrement: true,     // Configura como auto incrementable
        allowNull: false,
        primaryKey: true,        // Define como clave primaria
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
    },
    {
      sequelize,
      modelName: "Liquidacion",
      timestamps: true,
    }
  );

  return Liquidacion;
}
