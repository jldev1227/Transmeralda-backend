import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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

// Configurar CORS para permitir solicitudes desde orígenes específicos
app.use(cors({ origin: '*' }));

// Middleware de subida de archivos (graphql-upload)
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Middleware para desactivar la caché de todas las respuestas
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Configuración del servidor Apollo
const server = new ApolloServer({
  typeDefs: [usuarioTypeDef, vehiculoTypeDef],
  resolvers: [usuarioResolver, vehiculoResolver],
  introspection: true,
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ response, errors }) {
            if (errors && errors.length > 0) {
              const [firstError] = errors;
              const statusCode = firstError.extensions?.statusCode || 500;
              response.http.status = statusCode;

              // Evitar caché en respuestas de error
              response.http.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
              response.http.headers.set('Pragma', 'no-cache');
              response.http.headers.set('Expires', '0');
            }
          },
        };
      },
    },
  ],
  context: async ({ req, res }) => {
    const operationName = req.body.operationName;

    // Excluir la autenticación para operaciones específicas
    if (operationName === 'AutenticarUsuario') {
      return { req, res };
    }

    // Autenticación para otras operaciones
    const usuario = await authenticateUser(req);
    
    return { usuario, res };
  },
});

// Iniciar servidor Apollo y aplicar middleware
await server.start();
server.applyMiddleware({ app });

// Iniciar el servidor en el puerto especificado
app.listen({ port: 4000 }, () => {
  console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
});