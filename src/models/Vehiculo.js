import { Model, DataTypes } from 'sequelize';

class Vehiculo extends Model {}

export function initVehiculo(sequelize) {
  Vehiculo.init({
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    disponibilidad: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'MANTENIMIENTO'),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('OPTIMO', 'NO OPTIMO'),
      allowNull: false,
    },
    latitud: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitud: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Vehiculo',
    timestamps: true, // Para agregar createdAt y updatedAt automáticamente
  });

  return Vehiculo;
}
