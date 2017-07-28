const Context = require('../../lib/Context');
const {equal, deepEqual} = require('assert');
const {pick} = require('lodash');

describe('bootwire', function() {
  describe('set', function() {
    it('sets a key that does not exists', function() {
      const context = new Context();

      context.set('x', 2);

      equal(context.x, 2);
    });

    it('does not set a key exists already', function() {
      const context = new Context();

      context.x = 2;
      context.set('x', 3);

      equal(context.x, 2);
    });

    it('sets many keys at once', function() {
      const context = new Context();

      context.set({
        x: 2,
        y: 3
      });

      deepEqual(pick(context, 'x', 'y'), {
        x: 2,
        y: 3
      });
    });

    it('sets many keys at once, but only the one that are not set yet', function() {
      const context = new Context();
      context.x = 2;

      context.set({
        x: 3,
        y: 3
      });

      deepEqual(pick(context, 'x', 'y'), {
        x: 2,
        y: 3
      });
    });

    it('is bound to the context', function() {
      const context = new Context();

      const {set} = context;

      set('x', 2);

      equal(context.x, 2);
    });
  });

  describe('provide', function() {
    it('sets a key as result of evaluated sync function', async function() {
      const context = new Context();


      await context.provide('x', function() {
        return 2;
      });

      equal(context.x, 2);
    });

    it('sets a key as result of evaluated async function', async function() {
      const context = new Context();


      await context.provide('x', function() {
        return Promise.resolve(2);
      });

      equal(context.x, 2);
    });

    it('does not set a key if exists', async function() {
      const context = new Context();

      context.x = 2;

      await context.provide('x', function() {
        return 3;
      });

      equal(context.x, 2);
    });

    it('is bound to the context', async function() {
      const context = new Context();

      const {provide} = context;

      await provide('x', function() {
        return 2;
      });

      equal(context.x, 2);
    });
  });

  describe('wire', function() {
    it('runs with context', async function() {
      const context = new Context();

      await context.wire(function(ctx) {
        ctx.x = 2;
      });

      equal(context.x, 2);
    });

    it('is bound to the context', async function() {
      const context = new Context();

      const {wire} = context;

      let x;
      await wire(function() {
        x = 2;
      });

      equal(x, 2);
    });
  });

  describe('get', function() {
    it('returns a key', function() {
      const context = new Context();
      context.x = 2;
      equal(context.get('x'), 2);
    });

    it('returns a path', function() {
      const context = new Context();
      context.x = {
        y: 2
      };

      equal(context.get('x.y'), 2);
    });

    it('returns a defaultValue', function() {
      const context = new Context();
      context.x = {
        y: 2
      };

      equal(context.get('x.z', 4), 4);
    });

    it('returns undefined if not found', function() {
      const context = new Context();
      context.x = {
        y: 2
      };

      equal(context.get('x.z'), undefined);
    });

    it('is bound to the context', function() {
      const context = new Context();
      context.x = 2;

      const {get} = context;

      equal(get('x'), 2);
    });
  });

  describe('context', function() {
    it('returns itself', function() {
      const context = new Context();
      equal(context, context.context);
    });

    it('is bound to the context', function() {
      const contextOrig = new Context();
      contextOrig.x = 2;

      const {context} = contextOrig;
      equal(context.x, 2);
    });
  });
});
