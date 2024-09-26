import { gql } from "apollo-server-express";

const configuracionLiquidadorTypeDef = gql`
  type Configuracion {
    id: ID
    nombre: String!
    valor: Int!
  }

  # Definir un Input Type para la mutación
  input ConfiguracionInput {
    nombre: String!
    valor: Int!
  }

  type Query {
    configuracionesLiquidador: [Configuracion!]!
    configuracionLiquidador(id: String!): Configuracion
  }

  type Mutation {
    crearConfiguracionLiquidador(input: ConfiguracionInput!): Configuracion!
    actualizarConfiguracionesLiquidador(id: ID!, input: ConfiguracionInput!): Configuracion!
  }
`;

export default configuracionLiquidadorTypeDef;
