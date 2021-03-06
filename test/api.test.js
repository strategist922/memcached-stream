/*global portnumbers*/
describe('memcached-stream', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect;

  chai.Assertion.includeStack = true;

  var net = require('net')
    , stream = require('../index')
    , Parser = stream.Parser;

  it('exposes the .Parser', function () {
    expect(stream.Parser).to.be.a('function');
  });

  it('exposes a .createStream', function () {
    expect(stream.createStream).to.be.a('function');
    expect(stream.createStream()).to.be.instanceOf(Parser);
  });

  it('inherits from the Stream interface', function () {
    expect(new Parser).to.be.instanceOf(require('stream'));
  });

  describe('Parser', function () {
    describe('@constructing', function () {
      it('constructs without any errors', function () {
        var memcached = new Parser();
      });

      it('applies the given options', function () {
        var memcached = new Parser({ readable: false });

        expect(memcached.readable).to.equal(false);
      });

      it('iterates over the flags Object', function () {
        var memcached = new Parser({ flags: {
            '109': function () {}
          , '110': function () {}
        }});

        expect(Object.keys(memcached.flags).length).to.equal(2);
      });
    });

    describe("#flag", function () {
      it('only accepts unsigned integers', function () {
        var memcached = new Parser();

        expect(memcached.flag.bind(memcached, -1)).to.throw(/unsigned/);
        expect(memcached.flag.bind(memcached, '-1')).to.throw(/unsigned/);
        expect(memcached.flag.bind(memcached, 4294967296)).to.throw(/unsigned/);
        expect(memcached.flag.bind(memcached, 2)).to.not.throw(/unsigned/);
      });

      it('only accepts functions as parsers', function () {
        var memcached = new Parser();

        expect(memcached.flag.bind(memcached, 1, 1)).to.throw(/function/);
        expect(memcached.flag.bind(memcached, 1, function () {})).not.to.throw(/function/);
      });
    });

    describe('#write', function () {
      it('should return true after a succesful write', function () {
        var memcached = new Parser();

        expect(memcached.write('END\r\n')).to.equal(true);
      });

      it('should only parse data when the expected amount of bytes is reached', function (done) {
        var memcached = new Parser();

        // @NOTE this is a private property!
        memcached.expecting = 1000;

        memcached.on('response', function () {
          done(new Error('I should not parse the result'));
        }).write('END\r\n');

        memcached = new Parser();

        memcached.expecting = 20;
        memcached.on('response', function (command) {
          expect(command).to.equal('KEY');
          done();
        }).write('KEY 12 победы\r\n');
      });
    });

    describe('[parser internals]', function () {
      it('parses VALUE flag responses with the a flag parser', function (done) {
        var memcached = new Parser();

        memcached.flag(1, function number(value) {
          return +value;
        });

        memcached.on('response', function (command, value) {
          expect(command).to.equal('VALUE');
          expect(value).to.be.a('number');
          expect(value).to.equal(1);

          done();
        });

        memcached.write('VALUE f 1 1\r\n1\r\n');
      });

      it('parses VALUE flag response with the correct parser', function (done) {
        var memcached = new Parser();

        memcached.flag(1, function number(value) {
          return +value;
        });

        memcached.flag(2, function number(value) {
          return JSON.parse(value);
        });

        memcached.on('response', function (command, value) {
          expect(command).to.equal('VALUE');
          expect(value).to.be.a('object');
          expect(value.foo).to.equal('bar');
          expect(value.bar).to.equal(121313);

          done();
        });

        memcached.write('VALUE f 2 26\r\n{"foo":"bar","bar":121313}\r\n');
      });

      it('wants to buffer more data if the queue doesnt contain \\r\\n', function (done) {
        var memcached = new Parser();

        expect(memcached.expecting).to.equal(0);
        memcached.write('END');

        expect(memcached.expecting).to.equal(5);

        memcached.on('response', function response(command) {
          expect(command).to.equal('END');
          expect(memcached.expecting).to.equal(0);

          setTimeout(function timeout() {
            expect(memcached.queue).to.equal('');
            done();
          }, 10);
        });

        memcached.write('\r\n');
      });

      it('should buffer on partial VALUE responses', function (done) {
        var memcached = new Parser()
          , data = 'VALUE füübar 1 60 9\r\nпривет мир, '
          , leftover = 'Memcached и nodejs для победы\r\n';

        memcached.write(data);
        expect(memcached.queue).to.equal(data);
        expect(memcached.expecting).to.equal(85);

        memcached.on('response', function (command, value, flags, cas, key) {
          expect(command).to.equal('VALUE');
          expect(value).to.equal('привет мир, Memcached и nodejs для победы');
          expect(flags).to.equal('1');
          expect(cas).to.equal('9');
          expect(key).to.equal('füübar');

          // should clear the cache
          process.nextTick(function () {
            expect(memcached.queue).to.equal('');

            done();
          });
        });

        memcached.write(leftover);
      });
    });
  });
});
