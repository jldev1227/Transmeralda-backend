import { DataTypes, Model } from "sequelize";

class Recargo extends Model {}

export function initRecargo(sequelize) {
  Recargo.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      empresa: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      pagCliente: {
        type: DataTypes.BOOLEAN, // Nuevo campo para determinar si paga el cliente
        allowNull: true,
      },
      mes: {
        type: DataTypes.STRING, // Nuevo campo para almacenar el mes
        allowNull: true,
      },
      vehiculoId: {
        type: DataTypes.INTEGER, // Relación opcional con Vehiculo
        allowNull: true,
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
