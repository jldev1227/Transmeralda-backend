import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Vehiculo from './Vehiculo.js';

const DocumentoVehiculo = sequelize.define('DocumentoVehiculo', {
    tipoDocumento: {
        type: DataTypes.STRING,
        allowNull: false
    },
    archivoURL: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

// Relación
DocumentoVehiculo.belongsTo(Vehiculo, { foreignKey: 'vehiculoId' });
Vehiculo.hasMany(DocumentoVehiculo, { foreignKey: 'vehiculoId' });

export default DocumentoVehiculo;
