const comparePathsByDepth = require('../../lib/comparePathsByDepth.js');
const {deepEqual} = require('assert');

describe('comparePathsByDepth', function() {
  it('Allows to sort an array of paths by increasing depth', function() {
    const paths = ['/x/y', '/x/y/z/k', '/x/y/z'];

    deepEqual(paths.sort(comparePathsByDepth), ['/x/y', '/x/y/z', '/x/y/z/k']);
  });
});
