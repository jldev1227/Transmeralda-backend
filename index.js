import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
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

// Añadir middleware de CORS antes de aplicar Apollo Server
app.use(cors());

// Middleware de subida de archivos
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Configuración del servidor Apollo
const server = new ApolloServer({
  typeDefs: [usuarioTypeDef, vehiculoTypeDef],
  resolvers: [usuarioResolver, vehiculoResolver],
  introspection: true, // Asegúrate de que esto esté configurado
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ response, errors }) {
            if (errors && errors.length > 0) {
              const [firstError] = errors;
              const statusCode = firstError.extensions?.statusCode || 500; // Usa el statusCode del error o por defecto 500
              response.http.status = statusCode;
            }
          },
        };
      },
    },
  ],
  context: async ({ req, res }) => { // Incluir 'res' aquí
    const operationName = req.body.operationName;
  
    // Excluir la autenticación cuando la operación sea "AutenticarUsuario"
    if (operationName === 'AutenticarUsuario') {
      return { req, res }; // Devuelve ambos 'req' y 'res' para ser utilizados en los resolvers
    }
  
    // Para otras operaciones, realiza la autenticación
    const user = await authenticateUser(req);
  
    // Devuelve el contexto con el usuario autenticado y 'res'
    return { user, res };
  },
});

// Aplicar el middleware de Apollo Server a la aplicación Express
await server.start();
server.applyMiddleware({ app });

// Escucha en un puerto específico
app.listen({ port: 4000 }, () => {
  console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
});
