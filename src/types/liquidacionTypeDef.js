import { gql } from "apollo-server-express";

const liquidacionTypeDefs = gql`
  type Conductor {
    id: ID!
    nombre: String!
    apellido: String!
    cc: String!
    correo: String!
    salarioBase: Float!
  }

  type Vehiculo {
    id: ID!
    placa: String!
    marca: String!
    linea: String!
    modelo: String!
    color: String
    claseVehiculo: String
    tipoCarroceria: String
    combustible: String
  }

  type Bonificacion {
    id: ID!
    name: String!
    quantity: Int!
    value: Float!
    vehiculoId: ID # Relación con el vehículo
  }

  type Pernote {
    id: ID!
    empresa: String!
    cantidad: Int!
    valor: Float!
    vehiculoId: ID # Relación con el vehículo
  }

  type Recargo {
    id: ID!
    empresa: String!
    valor: Float!
    vehiculoId: ID # Relación con el vehículo
  }

  type Liquidacion {
    id: ID
    periodoStart: String! # Cambiado a String o puedes definir un tipo de fecha
    periodoEnd: String! # Cambiado a String o puedes definir un tipo de fecha
    conductor: Conductor! # Relación con el conductor
    auxilioTransporte: Float!
    sueldoTotal: Float!
    totalPernotes: Float!
    totalBonificaciones: Float!
    totalRecargos: Float!
    diasLaborados: Int!
    ajusteSalarial: Float!
    vehiculos: [Vehiculo!]! # Relación con los vehículos
    bonificaciones: [Bonificacion!]! # Relación con bonificaciones
    pernotes: [Pernote!]! # Relación con pernotes
    recargos: [Recargo!]! # Relación con recargos
  }

  # Definición de la consulta para obtener las liquidaciones
  type Query {
    liquidaciones: [Liquidacion!]!
    liquidacion(id: String!): Liquidacion
  }

  # Definición de la mutación para crear liquidaciones
  type Mutation {
    crearLiquidacion(
      conductorId: ID!
      periodoStart: FechaInput!
      periodoEnd: FechaInput!
      auxilioTransporte: Float!
      sueldoTotal: Float!
      totalPernotes: Float!
      totalBonificaciones: Float!
      totalRecargos: Float!
      diasLaborados: Int!
      ajusteSalarial: Float!
      vehiculos: [ID!]! # IDs de los vehículos relacionados
      bonificaciones: [BonificacionInput!]! # Input para las bonificaciones
      pernotes: [PernoteInput!]! # Input para los pernotes
      recargos: [RecargoInput!]! # Input para los recargos
    ): Liquidacion
  }

  type Mutation {
    editarLiquidacion(
      id: ID!
      periodoStart: String
      periodoEnd: String
      auxilioTransporte: Float
      sueldoTotal: Float
      totalPernotes: Float
      totalBonificaciones: Float
      totalRecargos: Float
      diasLaborados: Int
      ajusteSalarial: Float
      vehiculos: [ID!] # Solo IDs de los vehículos
    ): Liquidacion
  }

  # Definición de los inputs para las bonificaciones, pernotes y recargos
  input BonificacionInput {
    vehiculoId: ID! # Relación con el vehículo
    name: String!
    quantity: Int!
    value: Float!
  }

  input PernoteInput {
    vehiculoId: ID! # Relación con el vehículo
    empresa: String!
    cantidad: Int!
    valor: Float!
  }

  input RecargoInput {
    vehiculoId: ID! # Relación con el vehículo
    empresa: String!
    valor: Float!
  }

  # Definición para el periodo
  type Periodo {
    start: Fecha!
    end: Fecha!
  }

  # Definición del tipo para Fecha en las queries
  type Fecha {
    calendar: Calendar!
    era: String!
    year: Int!
    month: Int!
    day: Int!
  }

  # Definición del tipo de Calendar
  type Calendar {
    identifier: String!
  }

  # Definición de los inputs para las mutaciones
  input FechaInput {
    calendar: CalendarInput!
    era: String!
    year: Int!
    month: Int!
    day: Int!
  }

  input CalendarInput {
    identifier: String!
  }
`;

export default liquidacionTypeDefs;
