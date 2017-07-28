const {get, bindAll} = require('lodash');

/**
 * Context is the main application context object. It acts as dependency
 * container and is intended to be passed down through all the initialization
 * procedure.
 *
 * @type {Object}
 */
class Context {
  constructor() {
    bindAll(this, 'set', 'provide', 'wire', 'get');
  }

  /**
   * Set one or more keys in the context if they are not already present.
   *
   * ie.
   *
   * ``` js
   * set('logger', winston);
   * ```
   *
   * ``` js
   * set({
   *   config: require('./config'),
   *   logger: winston
   * });
   * ```
   *
   * @param {String|Object} keyOrObject
   *        a string key in case of single assignment or a key-value map in case
   *        of multiple assignment.
   *
   * @param {Any} value
   *        the value to be assigned in case a string key is provided.
   */
  set(keyOrObject, value) {
    if (typeof keyOrObject === 'string') {
      const key = keyOrObject;
      keyOrObject = {};
      keyOrObject[key] = value;
    }

    for (const [k, v] of Object.entries(keyOrObject)) {
      if (k in this) {
        continue;
      }

      this[k] = v;
    }
  }

  /**
   * Provide allows to assign to a context key the result of a function (provider)
   * that is invoked with context as parameter.
   *
   * If the context key is already taken the `provide` returns without doing
   * anything.
   *
   * The function to be evaluated can be synchronous or asynchronous. In either
   * cases `provide` returns a Promise to wait for to be sure the assignment took
   * place (or has been rejected).
   *
   * @param  {String}   key
   *         the key to be assigned
   *
   * @param  {Function} fn
   *         the function to be evaluated. Context will be passed as param to
   *         this function.
   *
   * @return {Promise}
   *         a promise that will be resolved once `provide` has completed the
   *         assignment or refused to assign.
   */
  async provide(key, fn) {
    if (key in this) {
      return;
    }

    this[key] = await fn(this);
  }

  /**
   * Run invokes one or more asynchronous function passing the context as first parameter.
   *
   * @param  {...Function} fns
   *         the function or functions to be evaluated. Context will be passed as param.
   *
   * @return {Promise}
   *         a promise that will be resolved once `fn` will complete.
   */
  async wire(...fns) {
    for (const fn of fns) {
      await fn(this);
    }
  }

  /**
   * Returns the same context instance.
   *
   * Useful in factory and provider functions to destructure both the context
   * and its internal properties.
   *
   * ie.
   *
   * ``` js
   * module.exports = function setupRoutes({app, context}) {
   *  // NOTE: config === context.config
   *
   *  app.get('/users', require('./users.routes')(context));
   * }
   * ```
   *
   * @return {Context} the context object itself
   */
  get context() {
    return this;
  }

  /**
   * Get a value from context by key or path.
   *
   * ``` js
   * const context = await app.boot();
   *
   * const port = context.get('config.port');
   * const info = await request(`http://localhost:${port}/api/info`);
   * // ...
   * ```
   *
   * @param  {String} key
   *         a single key or a path of the form 'key1.key2.key3'.
   * @param  {Any} [defaultValue=undefined]
   *         a value to be returned if the key is not found.
   * @return {Any}
   *         the value if found or `defaultValue`.
   */
  get(key, defaultValue = undefined) {
    return get(this, key, defaultValue);
  }
}

module.exports = Context;
