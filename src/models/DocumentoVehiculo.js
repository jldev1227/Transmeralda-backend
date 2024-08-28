import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Usuario from './Usuario.js';
import Vehiculo from './Vehiculo.js';

const Documento = sequelize.define('Documento', {
    tipoDocumento: {
        type: DataTypes.STRING,
        allowNull: false
    },
    archivoURL: {
        type: DataTypes.STRING,
        allowNull: false
    },
    modeloId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    modeloTipo: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['modeloId', 'modeloTipo']
        }
    ]
});

// Relación polimórfica
Documento.belongsTo(Vehiculo, { foreignKey: 'modeloId', constraints: false });
Documento.belongsTo(Usuario, { foreignKey: 'modeloId', constraints: false });

Vehiculo.hasMany(Documento, { foreignKey: 'modeloId', constraints: false, scope: { modeloTipo: 'Vehiculo' } });
Usuario.hasMany(Documento, { foreignKey: 'modeloId', constraints: false, scope: { modeloTipo: 'Usuario' } });

export default Documento;
