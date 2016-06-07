'use strict';
// Load modules

const Stream = require('stream');
const Loggly = require('loggly');
const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const GoodLoggly = require('..');
const Http = require('http');

// Declare internals

const internals = {
    readStream() {

        const result = new Stream.Readable({ objectMode: true });
        result._read = () => {};
        return result;
    },
    logglyOptions: {
      token: 'TOKEN',
      subdomain: 'SUBDOMAIN'
    },
    logEventData: Object.freeze({
      event: 'log',
      timestamp: 1396207735000,
      tags: ['info', 'server'],
      data: 'Log message',
      pid: 1234
    }),
    logglyResult: {
      event: 'log',
      timestamp: new Date(1396207735000).toISOString(),
      tags: ['info', 'server'],
      data: 'Log message',
      msg: 'Log message',
      pid: 1234
    },
    optionalFields: {
      name: 'loggly-name',
      hostname: 'example.com'
    }
};

// Test shortcuts

const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('GoodLoggly', () => {
  it('can be created with new', (done) => {

    const reporter = new GoodLoggly(internals.logglyOptions);

    expect(reporter._client).to.exist();
    done();
  });

  it('throws an error if no Loggly API token is defined', (done) => {

    expect(() => {
      const reporter = new GoodLoggly({subdomain: 'SUBDOMAIN'});
    }).to.throw('Loggly API token required');
    done();
  });

  it('throws an error if no Loggly subdomain is defined', (done) => {

    expect(() => {

      const reporter = new GoodLoggly({token: 'TOKEN'});
    }).to.throw('Loggly subdomain required');
    done();
  });

  it('sends a log to Loggly with the correct format', (done) => {

    const stream = internals.readStream();

    Loggly.Loggly.prototype.log = function (events) {
      const report = events[0];
      expect(report.timestamp).to.equal(new Date(1396207735000).toISOString());
      expect(report.name).to.equal('test');
      expect(report.hostname).to.equal('loggly');
      expect(report.msg).to.equal({
        id: 1,
        timestamp: 1396207735000,
        event: 'log'
      });
      done();
    };

    const reporter = new GoodLoggly({
      threshold: 0,
      token: internals.logglyOptions.token,
      subdomain: internals.logglyOptions.subdomain,
      name: 'test',
      hostname: 'loggly'
    });

    stream.pipe(reporter);

    stream.push({
      id: 1,
      timestamp: 1396207735000,
      event: 'log'
    });
  });

/*
  it('clears the data buffer when an error occurs when sending the messages', (done) => {

    const stream = internals.readStream();

    Loggly.Loggly.prototype.log = function (events, callback) {
      callback(new Error());
    };

    const reporter = new GoodLoggly({
      threshold: 0,
      token: internals.logglyOptions.token,
      subdomain: internals.logglyOptions.subdomain
    });

    stream.pipe(reporter);

    stream.push({
      id: 1,
      timestamp: 1396207735000,
      event: 'log'
    });

    expect(reporter._data.length).to.equal(0);
    done();
  });
  */

  it('honors the threshold setting and sends the events in a batch', (done) => {

    const stream = internals.readStream();

    Loggly.Loggly.prototype.log = function (events) {
      expect(events.length).to.equal(5);
      done();
    };

    const reporter = new GoodLoggly({
      threshold: 5,
      token: internals.logglyOptions.token,
      subdomain: internals.logglyOptions.subdomain
    });

    stream.pipe(reporter);

    for (let i = 0; i < 10; ++i) {
      stream.push({
        id: i,
        timestamp: 1396207735000,
        event: 'log'
      });
    }
  });

/*
  it('sends each event individually if threshold is 0', (done) => {

    const stream = internals.readStream();

    Loggly.Loggly.prototype.log = function (events) {
      expect(events.length).to.equal(1);
    };

    const reporter = new GoodLoggly({
      threshold: 0,
      token: internals.logglyOptions.token,
      subdomain: internals.logglyOptions.subdomain
    });

    stream.pipe(reporter);

    for (let i = 0; i < 3; ++i) {

      stream.push({ id: i });
    }

    done();
  });
*/

  it('makes a last attempt to send any remaining log entries on "finish"', (done) => {

    const stream = internals.readStream();

    Loggly.Loggly.prototype.log = function (events) {
      expect(events.length).to.equal(2);
      done();
    };

    const reporter = new GoodLoggly({
      threshold: 10,
      token: internals.logglyOptions.token,
      subdomain: internals.logglyOptions.subdomain
    });

    stream.pipe(reporter);
    stream.push({
        event: 'log',
        timestamp: Date.now(),
        id: 1
    });
    stream.push({
        event: 'log',
        timestamp: Date.now(),
        id: 2
    });
    stream.push(null);
  });
});
