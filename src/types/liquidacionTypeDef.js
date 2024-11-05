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
    values: [BonoValue!]!
    value: Float!
    vehiculoId: ID # Relación con el vehículo
  }

  type BonoValue {
    mes: String!
    quantity: Int!
  }

  # Modificación de Pernote para incluir array de fechas
  type Pernote {
    id: ID!
    empresa: String!
    cantidad: Int!
    valor: Float!
    vehiculoId: ID # Relación con el vehículo
    fechas: [String!]! # Array de fechas
  }

  type Recargo {
    id: ID!
    empresa: String!
    valor: Float!
    vehiculoId: ID # Relación con el vehículo
    pagCliente: Boolean # Campo adicional para pagCliente
    mes: String # Campo adicional para el mes
  }

  type Anticipo {
    id: Int!
    valor: Float!
    liquidacionId: ID!
    createdAt: String
    updatedAt: String
  }

  input AnticipoInput {
    valor: Float!
    liquidacionId: ID!
  }

  type Liquidacion {
    id: ID
    periodoStart: String!
    periodoEnd: String!
    periodoStartVacaciones: String
    periodoEndVacaciones: String
    conductor: Conductor! # Relación con el conductor
    auxilioTransporte: Float!
    sueldoTotal: Float!
    salarioDevengado: Float!
    totalPernotes: Float!
    totalBonificaciones: Float!
    totalAnticipos: Float
    totalVacaciones: Float
    totalRecargos: Float!
    diasLaborados: Int!
    diasLaboradosVillanueva: Int!
    ajusteSalarial: Float!
    salud: Float
    pension: Float
    estado: String
    vehiculos: [Vehiculo!]! # Relación con los vehículos
    bonificaciones: [Bonificacion!]! # Relación con bonificaciones
    pernotes: [Pernote!]! # Relación con pernotes
    recargos: [Recargo!]! # Relación con recargos
    anticipos: [Anticipo!]! # Relación con recargos
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
      periodoStart: String!
      periodoEnd: String!
      periodoStartVacaciones: String
      periodoEndVacaciones: String
      auxilioTransporte: Float!
      sueldoTotal: Float!
      salarioDevengado: Float!
      totalPernotes: Float!
      totalBonificaciones: Float!
      totalAnticipos: Float!
      totalRecargos: Float!
      diasLaborados: Int!
      diasLaboradosVillanueva: Int!
      ajusteSalarial: Float!
      salud: Float!
      pension: Float!
      estado: String!
      vehiculos: [ID!]! # IDs de los vehículos relacionados
      bonificaciones: [BonificacionInput!]! # Input para las bonificaciones
      pernotes: [PernoteInput!]! # Input para los pernotes
      recargos: [RecargoInput!]! # Input para los recargos
    ): Liquidacion

    editarLiquidacion(
      id: ID!
      conductorId: ID!
      periodoStart: String!
      periodoEnd: String!
      periodoStartVacaciones: String
      periodoEndVacaciones: String
      auxilioTransporte: Float!
      sueldoTotal: Float!
      salarioDevengado: Float!
      totalPernotes: Float!
      totalBonificaciones: Float!
      totalRecargos: Float!
      totalAnticipos: Float!
      totalVacaciones: Float!
      diasLaborados: Int!
      diasLaboradosVillanueva: Int!
      ajusteSalarial: Float!
      salud: Float!
      pension: Float!
      estado: String!
      vehiculos: [ID!]!
      bonificaciones: [BonificacionInput!]!
      pernotes: [PernoteInput!]!
      recargos: [RecargoInput!]!
    ): Liquidacion

    registrarAnticipos(anticipos: [AnticipoInput!]!): [Anticipo!]!
    eliminarAnticipo(id: ID!): Boolean!
  }

  # Definición de los inputs para las bonificaciones, pernotes y recargos
  input BonificacionInput {
    id: ID # Hacer el campo opcional
    vehiculoId: ID! # Relación con el vehículo
    name: String!
    values: [BonoValueInput!]!
    value: Float!
  }

  input BonoValueInput {
    mes: String!
    quantity: Int!
  }

  input PernoteInput {
    id: ID # Hacer el campo opcional
    vehiculoId: ID! # Relación con el vehículo
    empresa: String!
    cantidad: Int!
    valor: Float!
    fechas: [String!]! # Array de fechas
  }

  input RecargoInput {
    id: ID # Hacer el campo opcional
    vehiculoId: ID! # Relación con el vehículo
    empresa: String!
    valor: Float!
    pagCliente: Boolean # Campo adicional para pagCliente
    mes: String # Campo adicional para el mes
  }
`;

export default liquidacionTypeDefs;
