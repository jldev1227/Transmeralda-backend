import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

// Schemas
import usuarioTypeDef from './src/types/usuarioTypeDef.js';
import vehiculoTypeDef from './src/types/vehiculoTypeDef.js';
import liquidacionTypeDefs from './src/types/liquidacionTypeDef.js';
import configuracionLiquidadorTypeDef from './src/types/configuracionLiquidadorTypeDef.js';

// Resolvers
import usuarioResolver from './src/resolvers/usuarioResolvers.js';
import vehiculoResolver from './src/resolvers/vehiculoResolver.js';
import './src/models/index.js';
import liquidacionResolver from './src/resolvers/liquidacionResolver.js';
import configuracionLiquidadorResolver from './src/resolvers/configuracionLiquidadorResolver.js';

// Middlewares
import { authenticateUser } from './src/middlewares/authMiddleware.js';
import { empresaTypeDefs } from './src/types/empresaTypeDef.js';
import empresaResolvers from './src/resolvers/empresaResolver.js';
import formularioResolver from './src/resolvers/formularioResolver.js';
import formularioTypeDef from './src/types/formularioTypeDef.js';
import respuestFormularioResolver from './src/resolvers/respuestaFormularioResolver.js';
import respuestaFormularioTypeDef from './src/types/respuestaFormularioTypeDef.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' })); // Cambia '50mb' por el tamaño necesario
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Para solicitudes codificadas

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');

// Configurar CORS para permitir solicitudes desde orígenes específicos
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      // Permitir solicitudes sin origin (ej. solicitudes desde la misma máquina) y desde los orígenes permitidos
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};

app.use(cors(corsOptions));

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
  typeDefs: [usuarioTypeDef, vehiculoTypeDef, empresaTypeDefs, liquidacionTypeDefs, configuracionLiquidadorTypeDef, formularioTypeDef, respuestaFormularioTypeDef],
  resolvers: [usuarioResolver, vehiculoResolver, empresaResolvers, liquidacionResolver, configuracionLiquidadorResolver, formularioResolver, respuestFormularioResolver],
  introspection: true,
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ response, errors }) {
            if (errors) {
              // Log de errores para depuración
              console.log("Errores de GraphQL detectados:", errors.map(e => e.message));
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
    }else if (operationName === 'SolicitarCambioPassword'){
      return { req, res };
    }else if (operationName === 'ConfirmarTokenPassword'){
      return { req, res };
    }else if(operationName === 'CambiarPassword'){
      return { req, res };
    }

    // Autenticación para otras operaciones
    const usuario = await authenticateUser(req);
    
    return { usuario, res };
  },
});

const PORT = process.env.PORT || 4000;

// Iniciar servidor Apollo y aplicar middleware
await server.start();
server.applyMiddleware({ app });

// Iniciar el servidor en el puerto especificado
app.listen({ port: PORT }, () => {
  console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
});