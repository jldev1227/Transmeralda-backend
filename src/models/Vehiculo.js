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
    marca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    linea: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    claseVehiculo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipoCarroceria: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    combustible: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroMotor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroSerie: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroChasis: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    propietarioNombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    propietarioIdentificacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    disponibilidad: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'MANTENIMIENTO'),
      defaultValue: 'INACTIVO',
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('OPTIMO', 'NO OPTIMO'),
      defaultValue: 'OPTIMO',
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

  // Establecer relaciones
  Vehiculo.belongsTo(Usuario, { as: 'propietario', foreignKey: 'propietarioId' });
  Vehiculo.belongsTo(Usuario, { as: 'conductor', foreignKey: 'conductorId' });

  return Vehiculo;
}
