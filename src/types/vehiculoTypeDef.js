import { gql } from "apollo-server-express";

const typeDefs = gql`
  scalar Upload

  type Vehiculo {
    id: ID!
    placa: String!
    marca: String!
    linea: String!
    modelo: String!
    color: String!
    claseVehiculo: String!
    tipoCarroceria: String!
    combustible: String!
    numeroMotor: String!
    vin: String!
    numeroSerie: String!
    numeroChasis: String!
    propietarioNombre: String!
    propietarioIdentificacion: String!
    tipo: String!
    kilometraje: Int
    disponibilidad: String
    estado: String
    latitud: Float
    longitud: Float
    propietarioId: ID
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
    marca: String!
    linea: String!
    modelo: String!
    color: String!
    claseVehiculo: String!
    tipoCarroceria: String!
    combustible: String!
    numeroMotor: String!
    vin: String!
    numeroSerie: String!
    numeroChasis: String!
    propietarioNombre: String!
    propietarioIdentificacion: String!
    tipo: String!
    kilometraje: Int
    disponibilidad: String
    estado: String!
    latitud: Float
    longitud: Float
    propietarioId: ID
    conductorId: ID
  }

  input ActualizarVehiculoInput {
    placa: String
    marca: String
    linea: String
    modelo: String
    color: String
    claseVehiculo: String
    tipoCarroceria: String
    combustible: String
    numeroMotor: String
    vin: String
    numeroSerie: String
    numeroChasis: String
    propietarioNombre: String
    propietarioIdentificacion: String
    tipo: String
    kilometraje: Int
    disponibilidad: String
    estado: String
    latitud: Float
    longitud: Float
    propietarioId: ID
    conductorId: ID
  }

  type CrearVehiculoResponse {
    success: Boolean!
    message: String
    vehiculo: Vehiculo
  }

  type Query {
    obtenerVehiculos: [Vehiculo!]!
    obtenerVehiculo(id: ID!): Vehiculo
  }

  type Mutation {
    crearVehiculo(file: Upload!, name: String!): CrearVehiculoResponse
    actualizarVehiculo(id: ID!, req: ActualizarVehiculoInput!): Vehiculo!
    eliminarVehiculo(id: ID!): Boolean!
  }
`;

export default typeDefs;
