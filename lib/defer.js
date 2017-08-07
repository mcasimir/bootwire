module.exports = function defer() {
  let resolvePromise;
  let rejectPromise;

  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  promise.resolve = resolvePromise;
  promise.reject = rejectPromise;

  return promise;
};
