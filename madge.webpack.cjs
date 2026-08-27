const path = require('node:path');

// Enhanced-resolve plugin: strips any `?query` suffix off an import
// specifier BEFORE the standard `ParsePlugin` parses it into
// `{request, query, fragment}`.
//
// Why this exists: main.js deliberately cache-busts its dynamic entry point
// via `import { createScene } from './organism/organism.js?v=1785427900'`
// (see main.js's header comment -- this is intentional, protected browser
// behavior and must not change). enhanced-resolve happily *finds* the
// underlying file for a request like this, but by design it re-appends the
// raw query string onto the final resolved path (correct webpack behavior --
// loaders need the query). filing-cabinet/dependency-tree then run a literal
// `fs.existsSync(resolvedPathWithQueryStillAttached)`, which is always
// false, so the file -- and everything it imports -- is silently dropped
// from madge's graph as "skipped", with no non-zero exit anywhere.
//
// Tapping the top-level `resolve` hook (registered before madge's supplied
// `resolve.plugins` reach ParsePlugin, since enhanced-resolve applies
// user-supplied plugins first) lets us strip the query off
// `request.request` up front, so ParsePlugin never sees one and the final
// resolved path stays a plain filesystem path. This is generic: it strips
// ANY `?...` suffix off ANY request routed through this resolver, so a
// future cache-bust value -- or an entirely different query string -- is
// covered without editing this file again.
class StripQuerySuffixPlugin {
  apply(resolver) {
    resolver.getHook('resolve').tapAsync('StripQuerySuffixPlugin', (request, resolveContext, callback) => {
      if (typeof request.request === 'string') {
        const queryIndex = request.request.indexOf('?');
        if (queryIndex !== -1) {
          request.request = request.request.slice(0, queryIndex);
        }
      }
      callback();
    });
  }
}

module.exports = {
  resolve: {
    alias: {
      '/journey': path.resolve(__dirname, 'journey'),
      three$: path.resolve(__dirname, 'vendor/three/three.module.js'),
      'three/addons': path.resolve(__dirname, 'vendor/three/addons'),
    },
    extensions: ['.js', '.mjs'],
    plugins: [new StripQuerySuffixPlugin()],
  },
};
