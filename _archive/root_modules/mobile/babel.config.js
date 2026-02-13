module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@screens': './screens',
            '@components': './components',
            '@services': './services',
            '@store': './store',
            '@config': './config',
            '@types': './types',
          },
        },
      ],
    ],
  };
};
