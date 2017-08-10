const {sep: pathSeparator} = require('path');

module.exports = function comparePathsByDepth(pathA, pathB) {
  const segmentsA = pathA.split(pathSeparator).length;
  const segmentsB = pathB.split(pathSeparator).length;

  if (segmentsA < segmentsB) {
    return -1;
  }

  if (segmentsA > segmentsB) {
    return 1;
  }
  // a must be equal to b
  return 0;
};
