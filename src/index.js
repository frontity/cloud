const { parse } = require('url');
const got = require('got');
const cors = require('micro-cors')();
const { send, createError } = require('micro');

module.exports = cors(async (req, res) => {
  try {
    const url = parse(req.url.replace('/', ''));
    if (!url.protocol) throw new Error(`Invalid url: ${url.href}`);
    const data = await got.get(url, {
      headers: {
        'user-agent': req.headers['user-agent'],
        host: url.host,
      },
      json: true,
    });
    res.setHeader(
      'cache-control',
      'public, max-age=0, s-maxage=180, stale-while-revalidate=31536000, stale-if-error=31536000',
    );
    Object.keys(data.headers)
      .filter(key => /x-wp/i.test(key))
      .forEach(key => {
        res.setHeader(key, data.headers[key]);
      });
    send(res, 200, data.body);
  } catch (error) {
    throw createError(error.statusCode || 500, error.statusMessage || error);
  }
});
