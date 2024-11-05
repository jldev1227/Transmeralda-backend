import { DataTypes, Model } from "sequelize";

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
        type: DataTypes.STRING,
        allowNull: false,
      },
      periodoEnd: {
        type: DataTypes.STRING,
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
      salarioDevengado: {
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
      totalAnticipos: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      totalVacaciones: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      periodoStartVacaciones: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      periodoEndVacaciones: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      diasLaborados: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      diasLaboradosVillanueva: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ajusteSalarial: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      salud: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      pension: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM("Pendiente", "Liquidado"),
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
