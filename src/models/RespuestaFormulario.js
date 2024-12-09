import { DataTypes, Model } from "sequelize";

class RespuestaFormulario extends Model {}

export function initRespuestaFormulario(sequelize) {
  RespuestaFormulario.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      formularioId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Formularios',
          key: 'id',
        },
      },
      usuarioId: {
        type: DataTypes.UUID, // Relaciona la respuesta con un usuario, si aplica
        allowNull: true,
      },
      respuestas: {
        type: DataTypes.TEXT, // Cambia JSON a TEXT
        allowNull: false,
        get() {
          const rawValue = this.getDataValue('respuestas');
          return rawValue ? JSON.parse(rawValue) : null; // Parsea el JSON al obtener
        },
        set(value) {
          this.setDataValue('respuestas', JSON.stringify(value)); // Serializa al guardar
        },
      },
    },
    {
      sequelize,
      modelName: "RespuestaFormulario",
      timestamps: true,
    }
  );

  return RespuestaFormulario;
}
