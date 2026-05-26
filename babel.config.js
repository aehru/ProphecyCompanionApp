module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets Drizzle import generated .sql migration files inline.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
