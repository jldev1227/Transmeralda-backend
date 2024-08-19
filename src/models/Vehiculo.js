import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Usuario from './Usuario.js';

const Vehiculo = sequelize.define('Vehiculo', {
    placa: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    modelo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    kilometraje: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING,
        allowNull: false
    },
    latitud: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitud: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    timestamps: true // Para agregar createdAt y updatedAt automáticamente
});

// Relaciones
Vehiculo.belongsTo(Usuario, { as: 'propietario', foreignKey: 'propietarioId' });
Vehiculo.belongsTo(Usuario, { as: 'conductor', foreignKey: 'conductorId' });

export default Vehiculo;
