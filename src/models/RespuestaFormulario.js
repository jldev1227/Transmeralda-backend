import { DataTypes, Model } from "sequelize";

class RespuestaFormulario extends Model {}

export function initRespuestaFormulario(sequelize) {
  RespuestaFormulario.init(
    {
      RespuestaFormularioId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      FormularioId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      UsuarioId: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "RespuestaFormulario",
      timestamps: true,
    }
  );
  
  return RespuestaFormulario;
}

class RespuestaDetalle extends Model {}

export function initRespuestaDetalle(sequelize) {
  RespuestaDetalle.init(
    {
      RespuestaDetalleId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      RespuestaFormularioId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      CampoId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      Valor: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "RespuestaDetalle",
      timestamps: true,
    }
  );

  return RespuestaDetalle;
}
