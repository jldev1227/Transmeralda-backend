import { DataTypes, Model } from "sequelize";

class Empresa extends Model {}

export function initEmpresa(sequelize) {
  Empresa.init(
    {
      NIT: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Representante: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Cedula: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Telefono: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Direccion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Empresa",
      timestamps: true,
    }
  );

  return Empresa;
}
