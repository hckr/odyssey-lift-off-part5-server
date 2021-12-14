const { RedisPubSub } = require('graphql-redis-subscriptions');
const { withFilter } = require('graphql-subscriptions');

const pubsub = new RedisPubSub({ connection: process.env.REDIS_URL });

const resolvers = {
  Query: {
    // returns an array of Tracks that will be used to populate the homepage grid of our web client
    tracksForHome: (_, __, { dataSources }) => {
      return dataSources.trackAPI.getTracksForHome();
    },

    // get a single track by ID, for the track page
    track: (_, { id }, { dataSources }) => {
      return dataSources.trackAPI.getTrack(id);
    },

    // get a single module by ID, for the module detail page
    module: (_, { id }, { dataSources }) => {
      return dataSources.trackAPI.getModule(id);
    },
  },

  Mutation: {
    // increments a track's numberOfViews property
    incrementTrackViews: async (_, { id }, { dataSources }) => {
      try {
        const track = await dataSources.trackAPI.incrementTrackViews(id);
        await pubsub.publish('TRACK_VIEWS_UPDATED', {
          trackViewsUpdated: {
            id: track.id,
            numberOfViews: track.numberOfViews,
          },
        });
        return {
          code: 200,
          success: true,
          message: `Successfully incremented number of views for track ${id}`,
          track,
        };
      } catch (err) {
        return {
          code: err.extensions.response.status,
          success: false,
          message: err.extensions.response.body,
          track: null,
        };
      }
    },
  },

  Subscription: {
    trackViewsUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['TRACK_VIEWS_UPDATED']),
        (payload, variables) => {
          return payload.trackViewsUpdated.id === variables.id;
        }
      ),
    },
  },

  Track: {
    author: ({ authorId }, _, { dataSources }) => {
      return dataSources.trackAPI.getAuthor(authorId);
    },

    modules: ({ id }, _, { dataSources }) => {
      return dataSources.trackAPI.getTrackModules(id);
    },
  },
};

module.exports = resolvers;
