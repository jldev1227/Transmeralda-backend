import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import dotenv from 'dotenv';
// Usando require para graphql-upload
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

// Schemas
import usuarioTypeDef from './src/types/usuarioTypeDef.js';
import vehiculoTypeDef from './src/types/vehiculoTypeDef.js';

// Resolvers
import usuarioResolver from './src/resolvers/usuarioResolvers.js';
import vehiculoResolver from './src/resolvers/vehiculoResolver.js';
import './src/models/index.js';
import { authenticateUser } from './src/middlewares/authMiddleware.js';

dotenv.config();

const app = express();
app.use(express.json());

// Middleware de subida de archivos
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Configuración del servidor Apollo
const server = new ApolloServer({
  typeDefs: [usuarioTypeDef, vehiculoTypeDef],
  resolvers: [usuarioResolver, vehiculoResolver],
  context: async ({ req }) => {
    const operationName = req.body.operationName;

    // Excluir la autenticación cuando la operación sea "AutenticarUsuario"
    if (operationName === 'AutenticarUsuario') {
      return {};
    }

    // Para otras operaciones, realiza la autenticación
    return await authenticateUser(req);
  },
});

// Aplicar el middleware de Apollo Server a la aplicación Express
await server.start();
server.applyMiddleware({ app });

// Escucha en un puerto específico
app.listen({ port: 4000 }, () => {
  console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
});
