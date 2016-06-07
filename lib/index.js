'use strict';

const Hoek = require('hoek');
const Stream = require('stream');
const Loggly = require('loggly');

const internals = {
    defaults: {
        threshold: 20
    }
};

class GoodLoggly extends Stream.Writable{
  constructor(config) {

    config = config || {};

    Hoek.assert(typeof config.token === 'string', 'Loggly API token required');
    Hoek.assert(typeof config.subdomain === 'string', 'Loggly subdomain required');

    super({objectMode: true, decodeStrings: false});
    this._settings = Object.assign({}, internals.defaults, config);
    this._data = [];
    this._client = Loggly.createClient({
      token: this._settings.token,
      subdomain: this._settings.subdomain,
      json: true,

      // Tags in JSON logs don't seem to appear properly in Loggly when sent with the X-LOGGLY-TAG header
      useTagHeader: false,
      tags: Array.isArray(this._settings.tags) ? this._settings.tags : []
    });

    // Standard users
    this.once('finish', () => {

        this._sendMessages();
    });
  }
  _write(data, encoding, callback) {
    const report = {
      timestamp: this._timeString(data.timestamp),
      msg: data
    }

    // Map hapi event data fields to Loggly fields
    if (this._settings.name) {
      report.name = this._settings.name;
    }

    if (this._settings.hostname) {
      report.hostname = this._settings.hostname;
    }

    this._data.push(report);
    if (this._data.length >= this._settings.threshold) {
      this._sendMessages((err) => {

        // always clear the data so we don't buffer this forever if there is ever a failed POST
        this._data = [];
        return callback(err);
      });
    }
    else {
        setImmediate(callback);
    }
  }
  _sendMessages(callback) {

    this._client.log(this._data, callback);
  }
  _timeString(timestamp) {
    if (!timestamp) {
      return new Date().toISOString();
    }

    return new Date(timestamp).toISOString();
  }
}

module.exports = GoodLoggly;
