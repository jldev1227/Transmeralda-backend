import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { generarToken } from '../helpers/generarToken.js';

class Usuario extends Model {
  async comprobarPassword(password) {
    return await bcrypt.compare(password, this.password);
  }
}

export function initUsuario(sequelize) {
  Usuario.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confirmado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    token: {
      type: DataTypes.STRING,
    },
    rol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING,
    },
    estadoAfiliacion: {
      type: DataTypes.STRING,
    },
    fechaNacimiento: {
      type: DataTypes.DATEONLY,
    },
    genero: {
      type: DataTypes.ENUM('MASCULINO', 'FEMENINO', 'OTRO'),
      allowNull: false,
    },
    cargo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    area: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sede: {
      type: DataTypes.ENUM('VILLANUEVA', 'YOPAL'),
      allowNull: false,
    },
    salarioBase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    licenciaConduccion: {
      type: DataTypes.STRING,
    },
    fechaExpedicionLicencia: {
      type: DataTypes.DATEONLY,
    },
    fechaVencimientoLicencia: {
      type: DataTypes.DATEONLY,
    },
    fechaVinculacionEmpresa: {
      type: DataTypes.DATEONLY,
    },
  }, {
    sequelize,
    modelName: 'Usuario',
    hooks: {
      beforeCreate: async (usuario) => {
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, salt);
        usuario.token = generarToken();
      },
    },
    timestamps: true,
  });

  return Usuario;
}
