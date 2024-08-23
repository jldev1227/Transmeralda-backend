import { Model, DataTypes } from 'sequelize';

class Servicio extends Model {}

export function initServicio(sequelize) {
  Servicio.init({
    fechaSolicitud: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fechaEjecucion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tiempoPlanificacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    diasServicio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numeroSolicitud: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cliente: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    objetoServicio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    origen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destino: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tiempoDisponibilidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    duracionTrayecto: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Vehiculos', // Nombre de la tabla Vehiculos
        key: 'id',
      },
    },
    conductorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Usuarios', // Nombre de la tabla Conductores
        key: 'id',
      },
    },
    estadoConductor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estadoVia: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fuenteConsultaVia: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    riesgosDesniveles: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    riesgosDeslizamientos: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    riesgosAusenciaSenializacion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    riesgosAnimales: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    riesgosPeatones: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    riesgosTrafico: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    kmInicial: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    kmFinal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    kmTotal: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.kmFinal - this.kmInicial;
      },
    },
    calificacionServicio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroPlanilla: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroLiquidacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Servicio',
    timestamps: true,
  });

  return Servicio;
}
