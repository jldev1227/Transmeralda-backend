import { gql } from "apollo-server-express";

const formularioTypeDef = gql`
  scalar JSON

  input FormularioInput {
    Nombre: String!
    Descripcion: String
  }

  type Formulario {
    FormularioId: ID!
    Nombre: String!
    Descripcion: String
    Imagen: String
    categorias: [Categoria!]!
  }

  type Categoria {
    CategoriaId: ID!
    Nombre: String!
    Descripcion: String
    campos: [Campo!]
  }

  type Campo {
    CampoId: ID!
    Nombre: String!
    Tipo: String!
    Requerido: Boolean
    Placeholder: String
    ValorDefecto: String
    Fuente: String
    Parametro: String
    OpcionTrue: String
    OpcionFalse: String
    ReferenciaCampo: String
    ReferenciaPropiedad: String
    Descripcion: String
    opciones: [Opciones]
  }

  type Opciones {
    OpcionId: ID!
    Valor: String!
    HabilitaTexto: Boolean
    TipoTexto: String
    Placeholder: String
  }

  type Opcion {
    Valor: String!
    Label: String!
    datosVehiculo: JSON!
  }

  type Query {
    obtenerFormularios: [Formulario!]!
    obtenerFormulario(id: ID!): Formulario
    obtenerOpciones(fuente: String!, parametro: String!): [Opcion!]!
  }

  type Mutation {
    crearFormulario(input: FormularioInput!): Formulario
    actualizarFormulario(id: ID!, input: FormularioInput!): Formulario
    eliminarFormulario(id: ID!): Boolean
  }
`;

export default formularioTypeDef;
