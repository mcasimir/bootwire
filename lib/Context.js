const {get, bindAll} = require('lodash');
const globby = require('globby');
const stack = require('callsite');
const {resolve: resolvePath, dirname} = require('path');
const defer = require('./defer');
const comparePathsByDepth = require('./comparePathsByDepth');

/**
 * `Context` is the main application context object. It acts as dependency
 * container and is intended to be passed down through all the initialization
 * procedure.
 *
 * @type {Object}
 */
class Context {
  constructor() {
    this.__waiting = {};
    this.__globWireRequired = new Set();
    bindAll(this, '$set', '$provide', '$wire', '$get', '$wireGlob', '$waitFor');
  }

  /**
   * `$set` sets one or more keys in the context if they are not already present.
   *
   * ie.
   *
   * ``` js
   * $set('logger', winston);
   * ```
   *
   * ``` js
   * $set({
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
  $set(keyOrObject, value) {
    if (typeof keyOrObject === 'string') {
      const key = keyOrObject;
      keyOrObject = {};
      keyOrObject[key] = value;
    }

    for (const k of Object.keys(keyOrObject)) {
      this.__waiting[k] = this.__waiting[k] || defer();
    }

    for (const [k, v] of Object.entries(keyOrObject)) {
      if (k in this) {
        continue;
      }

      this[k] = v;
      this.__waiting[k].resolve(v);
    }
  }

  /**
   * `$provide` allows to assign to a contpext key the result of a function (provider)
   * that is invoked with context as parameter.
   *
   * If the context key is already taken the `$provide` returns without doing
   * anything.
   *
   * The function to be evaluated can be synchronous or asynchronous. In either
   * cases `$provide` returns a Promise to wait for to be sure the assignment took
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
   *         a promise that will be resolved once `$provide` has completed the
   *         assignment or refused to assign.
   */
  $provide(key, fn) {
    if (key in this) {
      return;
    }

    this.__waiting[key] = this.__waiting[key] || defer();

    const returnValue = fn(this);

    if (returnValue.then) {
      return returnValue.then((value) => {
        this[key] = value;
        this.__waiting[key].resolve(value);
      });
    }

    this[key] = returnValue;
    this.__waiting[key].resolve(returnValue);
  }

  /**
   * `$wire` invokes one or more asynchronous function passing the context as first parameter.
   *
   * @param  {...Function} fns
   *         the function or functions to be evaluated. Context will be passed as param.
   *
   * @return {Promise}
   *         a promise that will be resolved once `fn` will complete.
   */
  async $wire(...fns) {
    for (const fn of fns) {
      await fn(this);
    }
  }

  /**
   * `$wireGlob` requires and wires files by patterns from the caller folder.
   *
   * ie.
   *
   * ``` js
   * await $wireGlob('routes/*.wire.js');
   * ```
   *
   * @param  {...String}  patterns
   *         One or more pattern expression (see https://github.com/isaacs/minimatch#usage for help)
   *         NOTE: path patterns are relative to the caller file and not to `process.cwd()`
   *
   * @return {Promise}
   *         A promise that will be resolved once all the files are required
   *         and wired
   */
  async $wireGlob(...patterns) {
    const callerFile = stack()[2].getFileName();
    const callerDir = dirname(callerFile);

    const paths = await globby(patterns, {
      cwd: callerDir
    });

    this.__globWireRequired.add(callerFile);

    paths.sort(comparePathsByDepth);

    const promises = [];

    for (const path of paths) {
      const requirePath = resolvePath(callerDir, path);

      if (this.__globWireRequired.has(requirePath)) {
        continue;
      }

      this.__globWireRequired.add(requirePath);

      promises.push(this.$wire(require(requirePath)));
    }

    await Promise.all(promises);
  }


  /**
   * `$waitFor` wait for the resolution of the dependencies passed as argument and
   * then it returns the context;
   *
   * ```
   * const {logger} = await $waitFor('logger');
   * ```
   *
   * @param  {...String}  keys
   *         A list of dependencies to be awaited
   * @return {Promise}
   *         A promise resolving to the context once all the dependencies
   *         are ready
   */
  async $waitFor(...keys) {
    const promises = [];

    for (const key of keys) {
      if (!this.__waiting[key]) {
        this.__waiting[key] = defer();

        if (this[key]) {
          this.__waiting[key].resolve();
        }
      }

      promises.push(this.__waiting[key]);
    }

    await Promise.all(promises);

    return this;
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
  get $context() {
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
  $get(key, defaultValue = undefined) {
    return get(this, key, defaultValue);
  }
}

module.exports = Context;
