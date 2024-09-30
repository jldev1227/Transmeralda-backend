import { gql } from 'apollo-server-express'

export const empresaTypeDefs = gql`
  type Empresa {
    id: ID!
    NIT: String!
    Nombre: String!
    Representante: String!
    Cedula: String!
    Telefono: String!
    Direccion: String!
    createdAt: String
    updatedAt: String
  }

  input EmpresaInput {
    NIT: String!
    Nombre: String!
    Representante: String!
    Cedula: String!
    Telefono: String!
    Direccion: String!
  }

  type Query {
    obtenerEmpresas: [Empresa]
    obtenerEmpresa(id: ID!): Empresa
  }

  type Mutation {
    crearEmpresa(input: EmpresaInput!): Empresa
    actualizarEmpresa(id: ID!, input: EmpresaInput!): Empresa
    eliminarEmpresa(id: ID!): String
  }
`;
