/* eslint-disable consistent-return */
const { http, https } = require('follow-redirects');
const { parse } = require('url');
const cors = require('micro-cors')();
const { send, createError, sendError } = require('micro');
const { join } = require('path');
const fs = require('fs');
const parseQuery = require('micro-query');
const { mergeOptions } = require('./helpers');

module.exports = cors(async (req, res) => {
  try {
    const url = req.url.replace('/', '');
    const { protocol, hostname, path } = parse(url);
    if (path === 'robots.txt') {
      const robots = fs.readFileSync(join(__dirname, '../robots.txt'), 'utf8');
      return send(res, 200, robots);
    }
    if (!protocol || !hostname) throw new Error(`Invalid url: ${url}`);

    res.setHeader('cache-control', 'public, max-age=31536000');
    res.setHeader('link', `<${url}>; rel="canonical"`);
    res.setHeader('Access-Control-Expose-Headers', '*');

    const transport = protocol === 'https:' ? https : http;
    transport
      .get(
        {
          protocol,
          hostname,
          path,
          headers: {
            'user-agent': req.headers['user-agent'],
            host: hostname,
          },
        },
        file => {
          send(res, 200, file);
        },
      )
      .on('response', ({ headers, statusCode }) => {
        res.statusCode = statusCode;
        Object.keys(headers)
          .filter(key => /(content-type|x-wp)/i.test(key))
          .forEach(key => {
            if (
              /content-type/i.test(key) &&
              /(html|json)/i.test(headers[key])
            ) {
              // Get cache-control options from query
              const custom = parseQuery(req)['cache-control'];
              const base = {
                public: '',
                'max-age': 0,
                's-maxage': 180,
                'stale-while-revalidate': 31536000,
                'stale-if-error': 31536000,
              };
              res.setHeader('cache-control', mergeOptions(base, custom));
            }
            res.setHeader(key, headers[key]);
          });
      })
      .on('error', error => {
        throw error;
      });
  } catch (error) {
    return sendError(
      req,
      res,
      createError(error.statusCode || 500, error.statusMessage || error),
    );
  }
});
