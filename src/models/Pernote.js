import { DataTypes, Model } from "sequelize";

class Pernote extends Model {}

export function initPernote(sequelize) {
  Pernote.init(
    {
      id: {
        type: DataTypes.INTEGER, // Cambia a tipo INTEGER
        autoIncrement: true, // Configura como auto incrementable
        allowNull: false,
        primaryKey: true, // Define como clave primaria
      },
      empresa: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      fechas: {
        type: DataTypes.TEXT, // Almacenar como texto en formato JSON
        allowNull: false,
        defaultValue: '[]', // Por defecto, un array vacío como string
        get() {
          const rawValue = this.getDataValue('fechas');
          return JSON.parse(rawValue || '[]'); // Convertir de string a JSON
        },
        set(value) {
          this.setDataValue('fechas', JSON.stringify(value)); // Convertir de JSON a string
        },
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
      modelName: "Pernote",
      timestamps: true,
    }
  );

  return Pernote;
}
