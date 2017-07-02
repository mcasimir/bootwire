const bootwire = require('../../lib');

describe('bootwire', function() {
  describe('boot', function() {
    it('passes initialContext', function(done) {
      const app = bootwire(function(context) {
        if (context && (context.a === 'b')) {
          return done();
        }

        done(new Error('context is different from the expectation'));
      });

      app.boot({a: 'b'});
    });
  });
});
