const Context = require('./Context');
const {merge, omit} = require('lodash');

/**
 * App is a bootable application.
 * @type {Object}
 */
class App {
  constructor(bootAndWireFn) {
    this.bootAndWireFn = bootAndWireFn;
  }

  /**
   * Start an application with an initialContext
   *
   * @param  {...Object}  initialContext
   *         One or more object to be merged in the context and build the
   *         initialContext.
   *         Note that any function already present in the prototype of
   *         Context (ie. run, set, provide) will NOT be overriden.
   *
   * @return {Promise}
   *         A promise resolving to Context when the boot procedure will complete.
   */
  async boot(...initialContext) {
    const context = new Context();

    initialContext = initialContext.map((ctx) => {
      return omit(ctx, 'provide', 'set', 'run');
    });

    merge(context, ...initialContext);

    await this.bootAndWireFn(context);

    return context;
  }
}

module.exports = App;
