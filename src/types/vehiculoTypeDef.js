import { gql } from "apollo-server";

const vehiculoTypeDef = gql`
  type Documento {
    id: ID
    tipo: String
    url: String
  }

  type Vehiculo {
    id: ID
    placa: String
    tipo: String
    modelo: String
    propietario: Usuario
    conductor: Usuario
    documentos: [Documento!]
  }

  input DocumentoInput {
    tipo: String!
    url: String!
  }

  input VehiculoInput {
    placa: String!
    tipo: String!
    modelo: String!
    propietario: UsuarioInput!
    conductor: UsuarioInput
    documentos: [DocumentoInput!]!
  }

  type Query {
    obtenerVehiculos: [Vehiculo]
    obtenerVehiculo(id: ID!): Vehiculo
  }

  type Mutation {
    crearVehiculo(input: VehiculoInput!): Vehiculo
    actualizarVehiculo(id: ID!, input: VehiculoInput!): Vehiculo
    eliminarVehiculo(id: ID!): Boolean
  }
`;

export default vehiculoTypeDef;
