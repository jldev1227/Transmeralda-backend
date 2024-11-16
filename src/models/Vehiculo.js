import { Model, DataTypes } from "sequelize";
import { Usuario } from "./index.js"; // Asegúrate de que la ruta sea correcta

class Vehiculo extends Model {}

export function initVehiculo(sequelize) {
  Vehiculo.init(
    {
      id: {
        type: DataTypes.INTEGER, // Cambia a tipo INTEGER
        autoIncrement: true, // Configura como auto incrementable
        allowNull: false,
        primaryKey: true, // Define como clave primaria
      },
      placa: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      marca: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      linea: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      modelo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      claseVehiculo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tipoCarroceria: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      combustible: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numeroMotor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vin: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numeroSerie: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numeroChasis: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      propietarioNombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      propietarioIdentificacion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kilometraje: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      estado: {
        type: DataTypes.ENUM("DISPONIBLE", "NO DISPONIBLE", "MANTENIMIENTO", "INACTIVO"),
        defaultValue: "DISPONIBLE",
        allowNull: false,
      },
      latitud: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      longitud: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      galeria: {
        type: DataTypes.JSON, // Usa JSON para almacenar arrays directamente
        allowNull: false,
        defaultValue: [], // Usa un array vacío como valor por defecto
        get() {
          const rawValue = this.getDataValue("galeria");
          return JSON.parse(rawValue || "[]"); // Al obtener el valor, conviértelo de string a JSON
        },
        set(value) {
          this.setDataValue("galeria", JSON.stringify(value)); // Al setear, conviértelo a string
        },
      },
      fechaMatricula: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      soatVencimiento: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tecnomecanicaVencimiento: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      propietarioId: {
        type: DataTypes.INTEGER,
        references: {
          model: Usuario, // Relación con el modelo Usuario
          key: "id",
        },
        allowNull: true,
      },
      conductorId: {
        type: DataTypes.INTEGER,
        references: {
          model: Usuario, // Relación con el modelo Usuario
          key: "id",
        },
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Vehiculo",
      timestamps: true, // Para agregar createdAt y updatedAt automáticamente
    }
  );

  return Vehiculo;
}
