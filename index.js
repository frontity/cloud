const { parse } = require('url');
const got = require('got');
const cors = require('micro-cors')();

module.exports = cors(async (req, res) => {
  const url = parse(req.url.replace('/', ''));
  const response = await got(url, {
    headers: {
      'User-Agent': req.headers['user-agent'],
      Host: url.host,
    },
  });
  res.setHeader(
    'Cache-Control',
    'public, max-age=0, s-maxage=180, stale-while-revalidate=31536000, stale-if-error=31536000',
  );
  return response.body;
});
