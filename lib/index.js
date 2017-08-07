const App = require('./App');

/**
 * Build a new App that will use invoke the boot and $wire procedure passed
 * as parameter on boot.
 *
 * Example usage:
 *
 * ``` js
 * const bootwire = require('bootwire');
 * const app = bootwire(require('./src/boot'));
 *
 * if (require.main === module) {
 *   app.boot()
 *     .catch((err) => {
 *       // Something extremely bad happened while booting
 *       console.error(err);
 *       process.exit(1);
 *     });
 * }
 *
 * module.exports = app;
 * ```
 *
 * Example tests:
 *
 * ``` js
 * const app = require('../..');
 *
 * describe('app', function() {
 *   it('runs', async function() {
 *    const port = await getRandomPort();
 *
 *    await app.boot({
 *      config: { port }
 *    });
 *
 *    await request('http://localhost:${port}/health');
 *    // ...
 *   });
 * });
 * ```
 *
 * @param  {Function} bootAndWireFn
 *         The function to be called.
 *
 * @return {App}
 *         A bootable `App` instance.
 */
function bootwire(bootAndWireFn) {
  return new App(bootAndWireFn);
}

module.exports = bootwire;
