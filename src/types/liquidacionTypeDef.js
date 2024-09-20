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

  type Liquidacion {
    id: String!
    periodo: Periodo!
    conductor: Conductor!  # Relación con el conductor
    auxilioTransporte: Float!
    sueldoTotal: Float!
    totalPernotes: Float!
    totalBonificaciones: Float!
    totalRecargos: Float!
    diasLaborados: Int!
    ajusteSalarial: Float!
    vehiculos: [Vehiculo]  # Relación con los vehículos
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
      vehiculos: [ID!]!  # Solo IDs de los vehículos
    ): Liquidacion
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
