import { gql } from "apollo-server-express";

const typeDefs = gql`
  scalar Upload

  type Vehiculo {
    id: ID!
    placa: String!
    tipo: String!
    modelo: String!
    kilometraje: Int!
    disponibilidad: String!
    estado: String!
    latitud: Float
    longitud: Float
    propietarioId: ID!
    conductorId: ID
    propietario: Usuario
    conductor: Usuario
    createdAt: String
    updatedAt: String
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }

  input CrearVehiculoInput {
    placa: String!
    tipo: String!
    modelo: String!
    kilometraje: Int!
    disponibilidad: String!
    estado: String!
    latitud: Float
    longitud: Float
    propietarioId: ID
    conductorId: ID
  }

  input ActualizarVehiculoInput {
    placa: String
    tipo: String
    modelo: String
    kilometraje: Int
    disponibilidad: String
    estado: String
    latitud: Float
    longitud: Float
    propietarioId: ID
    conductorId: ID
  }

  type Query {
    obtenerVehiculos: [Vehiculo!]!
    obtenerVehiculo(id: ID!): Vehiculo
  }

  type Mutation {
    uploadFile(file: Upload!, placa: String!, name: String!): File!
    crearVehiculo(req: CrearVehiculoInput!): Vehiculo!
    actualizarVehiculo(id: ID!, req: ActualizarVehiculoInput!): Vehiculo!
    eliminarVehiculo(id: ID!): Boolean!
  }
`;

export default typeDefs;
