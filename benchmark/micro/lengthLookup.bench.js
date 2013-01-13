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
var str = require('fs').readFileSync(__filename, 'utf-8');

(
  new benchmark.Suite()
).add('(x += str).length', function test1() {
  var x = str
    , y;

  y = (x += str).length;
}).add('after concat .length', function test2() {
  var x = str
    , y;

  x += str;
  y = x.length;
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
