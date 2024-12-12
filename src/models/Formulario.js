import { DataTypes, Model } from "sequelize";

class Formulario extends Model {}

export function initFormulario(sequelize) {
  Formulario.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          nombre: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          descripcion: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          campos: {
            type: DataTypes.TEXT, // Cambia de JSON a TEXT
            allowNull: false,
            get() {
              const rawValue = this.getDataValue('campos');
              return rawValue ? JSON.parse(rawValue) : null; // Parsea el JSON al obtener
            },
            set(value) {
              this.setDataValue('campos', JSON.stringify(value)); // Serializa al guardar
            },
          },
    },
    {
      sequelize,
      modelName: "Formulario",
      timestamps: true,
    }
  );

  return Formulario;
}
