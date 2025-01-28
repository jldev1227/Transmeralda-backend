import { DataTypes, Model } from "sequelize";

class Formulario extends Model {}

export function initFormulario(sequelize) {
  Formulario.init({
    FormularioId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    Descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Imagen: {
      type: DataTypes.STRING(200),
      allowNull: true
    }
  }, {
    sequelize, // Aquí debe estar 'sequelize' no 'sequalize'
    modelName: 'Formularios',
    timestamps: false
  });
  return Formulario;
}


class Categoria extends Model {}

export function initCategoria(sequelize) {
  Categoria.init({
    CategoriaId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    Descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize, // corregir aquí también
    modelName: 'Categorias',
    timestamps: false
  });
  return Categoria;
}


class Campo extends Model {}

export function initCampo(sequelize) {
  Campo.init({
    CampoId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    Tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    Requerido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    Placeholder: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ValorDefecto: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    Fuente: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    Parametro: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    OpcionTrue: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    OpcionFalse: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ReferenciaCampo: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    ReferenciaPropiedad: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    Descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize, // corregir aquí también
    modelName: 'Campos',
    timestamps: false
  });
  return Campo;
}

class Opcion extends Model {}

export function initOpcion(sequelize) {
  Opcion.init({
    OpcionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    Valor: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    HabilitaTexto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    TipoTexto: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Placeholder: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize, // corregir aquí también
    modelName: 'Opciones',
    timestamps: false
  });
  return Opcion;
}
