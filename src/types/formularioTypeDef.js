import { gql } from "apollo-server-express";

const formularioTypeDef = gql`
  scalar JSON

  type Formulario {
    id: ID!
    nombre: String!
    descripcion: String
    campos: JSON! # Cambiado de String a JSON
    createdAt: String!
    updatedAt: String!
  }

  type Opcion {
    valor: String!
    label: String!
    datosExtra: JSON
  }

  type Query {
    obtenerFormularios: [Formulario]
    obtenerFormulario(id: ID!): Formulario
    obtenerOpciones(fuente: String!, parametro: String!): [Opcion!]!
  }
`;

export default formularioTypeDef;
