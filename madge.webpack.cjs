const path = require('node:path');

module.exports = {
  resolve: {
    alias: {
      '/journey': path.resolve(__dirname, 'journey'),
      three$: path.resolve(__dirname, 'vendor/three/three.module.js'),
      'three/addons': path.resolve(__dirname, 'vendor/three/addons'),
    },
    extensions: ['.js', '.mjs'],
  },
};
