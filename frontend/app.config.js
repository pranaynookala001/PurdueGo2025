import 'dotenv/config';

export default {
  expo: {
    // ... other config ...
    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
}; 