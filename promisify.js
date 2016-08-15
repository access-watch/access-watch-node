'use strict';
/**
 * Promisify a node style async func.
 *
 * @param {function} f Function that takes a node style callback as its last
 * argument.
 * @param [{object}] scope Scope to run `f` in, if necessary.
 * @return {Promise} Resolves with the data or rejects if any error occur.
 *
 * @example ```
 *  const read = promisify(fs.readFile, fs);
 *  read('./file')
 *    .then(data => console.log(data.toString('utf8')))
 *    .catch(err => console.log(err));
 * ```
 */
const promisify = (slice => (f, scope) => function() {
  return new Promise(
    (res, rej) => f.apply(
      scope, slice.call(arguments).concat(
        (err, data) => { return (err ? rej(err) : res(data)); }
      )
    )
  );
})(Array.prototype.slice);

module.exports = promisify;
