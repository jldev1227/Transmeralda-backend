import { DataTypes, Model } from "sequelize";

class Bonificacion extends Model {}

export function initBonificacion(sequelize) {
  Bonificacion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      values: {
        type: DataTypes.TEXT, // Cambia a TEXT o NVARCHAR(MAX) para SQL Server
        allowNull: false,
        // No uses un DEFAULT vacío, puedes inicializar con un valor vacío si lo necesitas
        defaultValue: '[]', // Usa un array vacío en formato JSON como valor por defecto
        get() {
          const rawValue = this.getDataValue('values');
          return JSON.parse(rawValue || '[]'); // Al obtener el valor, conviértelo de string a JSON
        },
        set(value) {
          this.setDataValue('values', JSON.stringify(value)); // Al setear, conviértelo a string
        }
      },
      value: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      vehiculoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Vehiculos',
          key: 'id'
        },
        onDelete: 'SET NULL',
      },
      liquidacionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Liquidacions',
          key: 'id'
        },
        onDelete: 'SET NULL',
      }
    },
    {
      sequelize,
      modelName: "Bonificacion",
      timestamps: true,
    }
  );

  return Bonificacion;
}
