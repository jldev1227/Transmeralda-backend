import { gql } from "apollo-server-express";

const respuestaFormularioTypeDef = gql`
  type Query {
    obtenerRespuestas(formularioId: String!): [RespuestaFormulario]
    obtenerRespuestaPorId(formularioId: String!): RespuestaFormulario
    obtenerRespuestasPorUsuario(UsuarioId: ID!): [RespuestaFormulario]
    obtenerRespuestasPorFormularioYUsuario(
      formularioId: String!
      UsuarioId: ID!
    ): [RespuestaFormulario]
  }

  type Mutation {
    registrarRespuesta(input: RespuestaFormularioInput!): RespuestaFormulario
    editarRespuesta(
      id: String!
      input: EditarRespuestaInput!
    ): RespuestaFormulario
  }

  type Formulario {
    FormularioId: ID
    Nombre: String
    Descripcion: String
    Imagen: String
  }

  type RespuestaFormulario {
    RespuestaFormularioId: String!
    FormularioId: String!
    UsuarioId: ID
    detalles: [RespuestaDetalle]
    formulario: Formulario
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

  type RespuestaDetalle {
    RespuestaDetalleId: String!
    RespuestaFormularioId: String!
    CampoId: String!
    Valor: String
    campo: Campo
  }

  input RespuestaDetalleInput {
    CampoId: ID!
    valor: String
  }

  input RespuestaFormularioInput {
    FormularioId: String!
    UsuarioId: String
    detalles: [RespuestaDetalleInput!]!
  }

  input EditarRespuestaInput {
    detalles: [RespuestaDetalleInput!]!
  }
`;

export default respuestaFormularioTypeDef;
