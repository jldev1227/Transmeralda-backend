import { gql } from "apollo-server-express";

const usuarioTypeDef = gql`
  type Usuario {
    id: ID
    nombre: String
    apellido: String
    cc: String
    correo: String
    telefono: String
    password: String
    confirmado: Boolean
    token: String
    rol: String
    imagen: String
    estadoAfiliacion: String
    fechaNacimiento: String
    genero: String
    cargo: String
    area: String
    sede: String
    licenciaConduccion: String
    fechaExpedicionLicencia: String
    fechaVencimientoLicencia: String
    fechaVinculacionEmpresa: String
    createdAt: String
    updatedAt: String
  }

  input UsuarioInput {
    nombre: String!
    apellido: String!
    cc: String!
    correo: String!
    telefono: String!
    password: String!
    rol: String!
    imagen: String
    estadoAfiliacion: String
    fechaNacimiento: String
    genero: String!
    cargo: String!
    area: String!
    sede: String!
    licenciaConduccion: String
    fechaExpedicionLicencia: String
    fechaVencimientoLicencia: String
    fechaVinculacionEmpresa: String
  }

  input AutenticarInput {
    correo: String!
    password: String!
  }

  input ActualizarUsuarioInput {
    nombre: String
    apellido: String
    cc: String
    correo: String
    telefono: String
    password: String
    rol: String
    imagen: String
    estadoAfiliacion: String
    fechaNacimiento: String
    genero: String
    cargo: String
    area: String
    sede: String
    licenciaConduccion: String
    fechaExpedicionLicencia: String
    fechaVencimientoLicencia: String
    fechaVinculacionEmpresa: String
  }

  type UsuarioAutenticado {
    usuario: Usuario!
    token: String!
  }

  type Query {
    obtenerUsuario: Usuario!
    obtenerUsuarios: [Usuario!]!
    obtenerUsuarioPorId(id: ID!): Usuario!
    solicitarCambioPassword(correo: String!): String!
  }

  type Mutation {
    crearUsuario(req: UsuarioInput): Usuario!
    autenticarUsuario(req: AutenticarInput): UsuarioAutenticado!
    actualizarUsuario(id: ID!, req: ActualizarUsuarioInput): Usuario!
    confirmarUsuario(id: ID!): String!
    eliminarUsuario(id: ID!): String!
    cambiarPassword(token: String!, nuevaPassword: String!): String!
  }
`;

export default usuarioTypeDef;
