import { DataTypes, Model } from "sequelize";
import { Liquidacion } from "./index.js";

class Bonificacion extends Model {}

export function initBonificacion(sequelize) {
  Bonificacion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true, // Configura como auto incrementable
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Bonificacion",
      timestamps: true,
    }
  );



  return Bonificacion;
}
