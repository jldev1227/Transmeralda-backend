import { gql } from "apollo-server-express";

const typeDefs = gql`
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
    propietario: Usuario # Relación con Usuario
    conductor: Usuario # Relación con Usuario
    createdAt: String
    updatedAt: String
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
    crearVehiculo(req: CrearVehiculoInput!): Vehiculo!
    actualizarVehiculo(id: ID!, req: ActualizarVehiculoInput!): Vehiculo!
    eliminarVehiculo(id: ID!): Boolean!
  }
`;

export default typeDefs;
