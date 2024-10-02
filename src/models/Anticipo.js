import { DataTypes, Model } from "sequelize";

class Anticipo extends Model {}

export function initAnticipo(sequelize) {
  Anticipo.init(
    {
      id: {
        type: DataTypes.INTEGER, // Tipo entero
        autoIncrement: true, // Auto incremento
        allowNull: false, // No permite valores nulos
        primaryKey: true, // Clave primaria
      },
      valor: {
        type: DataTypes.FLOAT, // Tipo flotante para números
        allowNull: false, // No permite valores nulos
      },
    },
    {
      sequelize,
      modelName: "Anticipo",
      timestamps: true,
    }
  );

  return Anticipo;
}
