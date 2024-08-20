import { gql } from "apollo-server";

const usuarioTypeDef = gql`
  type Usuario {
    id: ID
    nombre: String
    apellido: String
    cc: String
    correo: String
    telefono: String
    rol: String
    imagen: String
  }

  input UsuarioInput {
    nombre: String!
    apellido: String!
    cc: String!
    correo: String!
    telefono: String!
    password: String!
    rol: String!
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
  }

  type UsuarioAutenticado {
    usuario: Usuario
    token: String
  }

  type Query {
    obtenerUsuario: Usuario
    obtenerUsuarios: [Usuario]
  }

  type Mutation {
    nuevoUsuario(req: UsuarioInput) : Usuario
    autenticarUsuario(req: AutenticarInput): UsuarioAutenticado
    actualizarUsuario(id: ID!, req: ActualizarUsuarioInput): Usuario
    confirmarUsuario(id: ID!): Usuario
    eliminarUsuario(id: ID!): String
  }
`;


export default usuarioTypeDef