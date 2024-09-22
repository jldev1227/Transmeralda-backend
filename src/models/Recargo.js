import { DataTypes, Model } from "sequelize";
import { Liquidacion } from "./index.js";

class Recargo extends Model {}

export function initRecargo(sequelize) {
  Recargo.init(
    {
      id: {
        type: DataTypes.INTEGER, // Cambia a tipo INTEGER
        autoIncrement: true, // Configura como auto incrementable
        allowNull: false,
        primaryKey: true, // Define como clave primaria
      },
      empresa: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Recargo",
      timestamps: true,
    }
  );

  return Recargo;
}
