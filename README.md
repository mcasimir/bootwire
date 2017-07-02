# bootwire

[![Build Status](https://travis-ci.org/mcasimir/bootwire.svg?branch=master)](https://travis-ci.org/mcasimir/bootwire) [![codecov](https://codecov.io/gh/mcasimir/bootwire/branch/master/graph/badge.svg)](https://codecov.io/gh/mcasimir/bootwire)

Application and dependencies bootstrap for node.js.

``` sh
npm install --save bootwire
```

## A super-minimal way to boot and compose application dependencies using ES6.

Bootwire is a very simple library that leverages ES6 destructuring
to provide a _no-black-magick-please_ way to boot node js applications
and perform dependency injection.

## Features

- Support asynchronous boot (ie. wait for database connection to be ready).
- Simplify tests allowing to mock parts of your application without `stub` and `spies`.
- Predictable top-down flow.
- IoC with plain old functions and constructors.
- No `require` hijacking.
- No `module.exports['@something-magick-and-weird-here']`
- Wire components together not to the IoC container

<!-- toc -->

- [Getting Started](#getting-started)
    + [Dependency injection](#dependency-injection)
- [Usage patterns for complex applications](#usage-patterns-for-complex-applications)
    + [Split bootstrap into phases](#split-bootstrap-into-phases)
    + [Bootstrap of many components](#bootstrap-of-many-components)
    + [Wiring classes and services](#wiring-classes-and-services)
- [Api](#api)
  * [Classes](#classes)
  * [Functions](#functions)
  * [App : Object](#app--object)
    + [app.boot(...initialContext) ⇒ Promise](#appbootinitialcontext-%E2%87%92-promise)
  * [Context : Object](#context--object)
    + [context.context ⇒ [Context](#Context)](#contextcontext-%E2%87%92-context%23context)
    + [context.set(keyOrObject, value)](#contextsetkeyorobject-value)
    + [context.provide(key, fn) ⇒ Promise](#contextprovidekey-fn-%E2%87%92-promise)
    + [context.run(...fns) ⇒ Promise](#contextrunfns-%E2%87%92-promise)
    + [context.get(key, [defaultValue]) ⇒ Any](#contextgetkey-defaultvalue-%E2%87%92-any)
  * [bootwire(bootAndWireFn) ⇒ [App](#App)](#bootwirebootandwirefn-%E2%87%92-app%23app)

<!-- tocstop -->

## Getting Started

Bootwire provides a way to create an **application context** and pass it down to a **boot procedure**.

The __context object__ is just an object that exposes a few methods to manipulate and use it:

- `set`: set one or many properties
- `provide`: set a property to the result of the invocation of a provider function.
- `run`: run a function passing the context as parameter
- `get`: get a value in the context by key or by path

Using `set` and `provide` on the context object will ensure that all of its properties **will be only set once**, allowing to inject providers, services connections, configs and so on during tests.

The __boot procedure__ to which the context is passed is a function that acts as the single starting point of an application.

#### Dependency injection

As opposed to many IoC containers `bootwire` takes a radical approach to handle dependencies:

- Dependencies resolution is not lazy: all of the components are wired together during the boot phase.
- Dependency injection follows one and only one simple rule: if a dependency is already set it will not be set again.

Which result into an extremely simple way to replace a component or a setting during tests: just set it before the boot phase.

``` js
// index.js

require('./app').boot().catch(console.error);
```

``` js
// app.js

const bootwire = require('bootwire');

function bootProcedure({provide, set, run} /* this is the context object destructured */) {
  set({
    logger: require('winston'),
    config: require('./config')
  });

  await provide('db', async function({config}) {
    return await MongoClient.connect(config.mongodbUrl);
  });

  await provide('userRepository', async function({db}) {
    return new UserRepository({db});
  });

  await run(startExpress);
}

module.exports = bootwire(bootProcedure);
```

``` js
// user.routes.js

module.exports = function({router, userRepository}) {

  router.get('/users', async function(req, res) {
    res.json(await userRepository.find());
  });

};
```

Integration tests are now extremely easy:

``` js
// app.spec.js
const app = require('./app');

it('does something', async function() {
  await app.boot({
      config: {port: await randomAvailablePort()},
      db: fakeMongodb // db will not be set during the boot
                      // since is already set here
  });

  // ...
});
```

And unit tests as well:

``` js
const UserRepository = require('./services/UserRepository');

it('retrieves all the users', async function() {
  const repo = new UserRepository({db: {
    find() {
      return Promise.resolve(usersFixture);
    }
  }});

  deepEqual(await repo.find(), expectedUsers);
});
```

The boot procedure also accepts multiple initial contexts that will be merged
together, doing so will be easy to provide a default initial context on each tests
and override it on each test case:

``` js
// app.spec.js
const app = require('./app');

const defaultTestContext = {
  config: defaultConfig
};

it('does something', async function() {
  await app.boot(defaultTestContext,
    {
      config: {port: await randomAvailablePort()},
      db: fakeMongodb
    }
  );

  // ...
});
```

## Usage patterns for complex applications

#### Split bootstrap into phases

``` js
// ./boot/index.js

const {promisify} = require('util');
const express = require('express');
const winston = require('winston');

const setupRoutes = require('./setupRoutes');
const setupMiddlewares = require('./setupMiddlewares');
const setupErrorHandlers = require('./setupErrorHandlers');

module.exports = function({run, context}) {
  set({
    config: require('./config'),
    app: express(),
    logger: winston
  });

  await run(
    setupMiddlewares,
    setupRoutes,
    setupErrorHandlers,
    async function({app, logger}) {
      await promisify(app.listen)(config.port);
      logger(`Application running on port ${config.port}`);
    }
  );
};
```

#### Bootstrap of many components

``` js
// ./boot/index.js

const {promisify} = require('util');
const express = require('express');
const winston = require('winston');

module.exports = function({run, context}) {
  set({
    config: require('./config'),
    app: express(),
    logger: winston
  });

  const submodules = ['module1', 'module2', 'module3'];

  for (submodule of submodules) {
    await run(submodule.boot);
  }

  await run(async function({app, logger}) {
    await promisify(app.listen)(config.port);
    logger(`Application running on port ${config.port}`);
  });
};
```

#### Wiring classes and services

One way to perform IoC without any magic container is to use explicitly the
constructor of services to inject dependencies.

Although it may seem a tight constraint it is actually a good way to create
independent components that are easy to reuse in different context
and applications.

This explicit and __manual__ injection is intended and is necessary to achieve one of
the goal of `bootwire`: don't require components to depend on the dependency injection
framework.

``` js
// services/UserRepository.js

class UserRepository {
  constructor({db}) {
    this.collection = db.collection('users');
  }

  find() {
    return this.collection.find().toArray();
  }
}
```

Note how the `UserRepository` class is completely usable both with `bootwire`:

``` js
// boot/index.js

module.exports = function({provide}) {
  await provide('db', async function({config}) {
    return await MongoClient.connect(config.mongodbUrl);
  });

  await provide('userRepository', async function({db}) {
    return new UserRepository({db});
  });
};
```

And without `bootwire`:

``` js
// tasks/dumpUsers.js

async main() {
  const db = await MongoClient.connect(process.env.MONGODB_URL);
  const repo = UserRepository({db});
  const users = await repo.find();
  console.info(JSON.stringify(users, null, 2));
}

main().catch(console.error);
```

## Api

<!--START docs -->
### Classes

<dl>
<dt><a href="#App">App</a> : <code>Object</code></dt>
<dd><p>App is a bootable application.</p>
</dd>
<dt><a href="#Context">Context</a> : <code>Object</code></dt>
<dd><p>Context is the main application context object. It acts as dependency
container and is intended to be passed down through all the initialization
procedure.</p>
</dd>
</dl>

### Functions

<dl>
<dt><a href="#bootwire">bootwire(bootAndWireFn)</a> ⇒ <code><a href="#App">App</a></code></dt>
<dd><p>Build a new App that will use invoke the boot and wire procedure passed
as parameter on boot.</p>
<p>Example usage:</p>
<pre><code class="language-javascript">const bootwire = require(&#39;bootwire&#39;);
const app = bootwire(require(&#39;./src/boot&#39;));

if (require.main === module) {
  app.boot()
    .catch((err) =&gt; {
      // Something extremely bad happened while booting
      console.error(err);
      process.exit(1);
    });
}

module.exports = app;
</code></pre>
<p>Example tests:</p>
<pre><code class="lang-js">const app = require(&#39;../..&#39;);

describe(&#39;app&#39;, function() {
  it(&#39;runs&#39;, async function() {
   const port = await getRandomPort();

   await app.boot({
     config: { port }
   });

   await request(&#39;http://localhost:${port}/health&#39;);
   // ...
  });
});
</code></pre>
</dd>
</dl>

<a name="App"></a>

### App : <code>Object</code>
App is a bootable application.

**Kind**: global class
<a name="App+boot"></a>

#### app.boot(...initialContext) ⇒ <code>Promise</code>
Start an application with an initialContext

**Kind**: instance method of [<code>App</code>](#App)
**Returns**: <code>Promise</code> - A promise resolving to Context when the boot procedure will complete.

| Param | Type | Description |
| --- | --- | --- |
| ...initialContext | <code>Object</code> | One or more object to be merged in the context and build the         initialContext.         Note that any function already present in the prototype of         Context (ie. run, set, provide) will NOT be overriden. |

<a name="Context"></a>

### Context : <code>Object</code>
Context is the main application context object. It acts as dependency
container and is intended to be passed down through all the initialization
procedure.

**Kind**: global class

* [Context](#Context) : <code>Object</code>
    * [.context](#Context+context) ⇒ [<code>Context</code>](#Context)
    * [.set(keyOrObject, value)](#Context+set)
    * [.provide(key, fn)](#Context+provide) ⇒ <code>Promise</code>
    * [.run(...fns)](#Context+run) ⇒ <code>Promise</code>
    * [.get(key, [defaultValue])](#Context+get) ⇒ <code>Any</code>

<a name="Context+context"></a>

#### context.context ⇒ [<code>Context</code>](#Context)
Returns the same context instance.

Useful in factory and provider functions to destructure both the context
and its internal properties.

ie.

``` js
module.exports = function setupRoutes({app, context}) {
 // NOTE: config === context.config

 app.get('/users', require('./users.routes')(context));
}
```

**Kind**: instance property of [<code>Context</code>](#Context)
**Returns**: [<code>Context</code>](#Context) - the context object itself
<a name="Context+set"></a>

#### context.set(keyOrObject, value)
Set one or more keys in the context if they are not already present.

ie.

``` js
set('logger', winston);
```

``` js
set({
  config: require('./config'),
  logger: winston
});
```

**Kind**: instance method of [<code>Context</code>](#Context)

| Param | Type | Description |
| --- | --- | --- |
| keyOrObject | <code>String</code> \| <code>Object</code> | a string key in case of single assignment or a key-value map in case        of multiple assignment. |
| value | <code>Any</code> | the value to be assigned in case a string key is provided. |

<a name="Context+provide"></a>

#### context.provide(key, fn) ⇒ <code>Promise</code>
Provide allows to assign to a context key the result of a function (provider)
that is invoked with context as parameter.

If the context key is already taken the `provide` returns without doing
anything.

The function to be evaluated can be synchronous or asynchronous. In either
cases `provide` returns a Promise to wait for to be sure the assignment took
place (or has been rejected).

**Kind**: instance method of [<code>Context</code>](#Context)
**Returns**: <code>Promise</code> - a promise that will be resolved once `provide` has completed the
        assignment or refused to assign.

| Param | Type | Description |
| --- | --- | --- |
| key | <code>String</code> | the key to be assigned |
| fn | <code>function</code> | the function to be evaluated. Context will be passed as param to         this function. |

<a name="Context+run"></a>

#### context.run(...fns) ⇒ <code>Promise</code>
Run invokes one or more asynchronous function passing the context as first parameter.

**Kind**: instance method of [<code>Context</code>](#Context)
**Returns**: <code>Promise</code> - a promise that will be resolved once `fn` will complete.

| Param | Type | Description |
| --- | --- | --- |
| ...fns | <code>function</code> | the function or functions to be evaluated. Context will be passed as param. |

<a name="Context+get"></a>

#### context.get(key, [defaultValue]) ⇒ <code>Any</code>
Get a value from context by key or path.

``` js
const context = await app.boot();

const port = context.get('config.port');
const info = await request(`http://localhost:${port}/api/info`);
// ...
```

**Kind**: instance method of [<code>Context</code>](#Context)
**Returns**: <code>Any</code> - the value if found or `defaultValue`.

| Param | Type | Description |
| --- | --- | --- |
| key | <code>String</code> | a single key or a path of the form 'key1.key2.key3'. |
| [defaultValue] | <code>Any</code> | a value to be returned if the key is not found. |

<a name="bootwire"></a>

### bootwire(bootAndWireFn) ⇒ [<code>App</code>](#App)
Build a new App that will use invoke the boot and wire procedure passed
as parameter on boot.

Example usage:

``` js
const bootwire = require('bootwire');
const app = bootwire(require('./src/boot'));

if (require.main === module) {
  app.boot()
    .catch((err) => {
      // Something extremely bad happened while booting
      console.error(err);
      process.exit(1);
    });
}

module.exports = app;
```

Example tests:

``` js
const app = require('../..');

describe('app', function() {
  it('runs', async function() {
   const port = await getRandomPort();

   await app.boot({
     config: { port }
   });

   await request('http://localhost:${port}/health');
   // ...
  });
});
```

**Kind**: global function
**Returns**: [<code>App</code>](#App) - A bootable `App` instance.

| Param | Type | Description |
| --- | --- | --- |
| bootAndWireFn | <code>function</code> | The function to be called. |


<!--END docs -->
