'use strict';

/**
 * Benchmark related modules.
 */
var benchmark = require('benchmark')
  , microtime = require('microtime');

/**
 * Logger
 */
var logger = new(require('devnull'))({ timestamp: false, namespacing: 0 });

/**
 * Preparation code.
 */
var str = require('fs').readFileSync(__filename, 'utf8')
  , chars = 5;

(
  new benchmark.Suite()
).add('str.slice()', function test1() {
  var x = str.slice(0, chars);
}).add('str += chars', function test2() {
  for (var i = 0, x = ''; i < chars; i++) {
    x += str[i];
  }
}).on('cycle', function cycle(e) {
  var details = e.target;

  logger.log('Finished benchmarking: "%s"', details.name);
  logger.metric('Count (%d), Cycles (%d), Elapsed (%d), Hz (%d)'
    , details.count
    , details.cycles
    , details.times.elapsed
    , details.hz
  );
}).on('complete', function completed() {
  logger.info('Benchmark: "%s" is was the fastest.'
    , this.filter('fastest').pluck('name')
  );
}).run();
