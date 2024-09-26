import { DataTypes, Model } from 'sequelize';

class ConfiguracionLiquidador extends Model {}

export function initConfiguracionLiquidador(sequelize) {
  ConfiguracionLiquidador.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING, // Nombre del campo de bono o configuración
      allowNull: false,
    },
    valor: {
      type: DataTypes.INTEGER, // Valor asociado al campo de configuración
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ConfiguracionLiquidador',
    timestamps: true, // Para agregar createdAt y updatedAt automáticamente
  });

  return ConfiguracionLiquidador;
}
