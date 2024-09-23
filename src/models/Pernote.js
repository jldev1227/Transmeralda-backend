import { DataTypes, Model } from "sequelize";
import { Liquidacion } from "./index.js";

class Pernote extends Model {}

export function initPernote(sequelize) {
  Pernote.init(
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
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Pernote",
      timestamps: true,
    }
  );

  return Pernote;
}
