const { createServer } =  require("http");
const { execute, subscribe } =  require("graphql");
const { SubscriptionServer } =  require("subscriptions-transport-ws");
const { makeExecutableSchema } =  require("@graphql-tools/schema");
const express =  require("express");
const { ApolloServer } =  require("apollo-server-express");
const resolvers =  require("./resolvers");
const typeDefs =  require("./schema");
const TrackAPI = require('./datasources/track-api');

require('dotenv').config();

(async function () {
  const app = express();

  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const subscriptionServer = SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: '/subscriptions' }
  );

  const server = new ApolloServer({
    schema,
    dataSources: () => {
      return {
        trackAPI: new TrackAPI(),
      };
    },
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });
  await server.start();
  server.applyMiddleware({ app });

  const PORT = 4000;
  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}/graphql`)
  );
})();