import { Model, DataTypes } from 'sequelize';
import { Usuario } from './index.js';  // Asegúrate de que la ruta sea correcta

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
    propietarioId: {
      type: DataTypes.INTEGER,
      references: {
        model: Usuario,  // Relación con el modelo Usuario
        key: 'id',
      },
      allowNull: true,
    },
    conductorId: {
      type: DataTypes.INTEGER,
      references: {
        model: Usuario,  // Relación con el modelo Usuario
        key: 'id',
      },
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Vehiculo',
    timestamps: true, // Para agregar createdAt y updatedAt automáticamente
  });

  return Vehiculo;
}
