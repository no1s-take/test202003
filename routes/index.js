const router = require('express').Router();
const { WebClient } = require('@slack/web-api');
const sprintf = require('sprintf').sprintf;

try {
  router.get('/', function(req, res, next) {
    (async () => {
      if (typeof req['query'] !== 'undefined' && typeof req['query']['code'] !== 'undefined') {
        const wc = new WebClient();
        const accessTokenData = await wc.oauth.v2.access({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: req['query']['code'],
          redirect_uri: process.env.BASE_URL
        });
        if (typeof accessTokenData['authed_user']['access_token'] !== 'undefined') {
          req.session.accessToken = accessTokenData['authed_user']['access_token'];
          res.writeHead(302, {
            Location: process.env.BASE_URL
          });
          res.end();
          return;
        }
      }

      let loginCheck = false;
      if (typeof req.session.accessToken !== 'undefined' && req.session.accessToken !== '') {
        const web = new WebClient(req.session.accessToken);
        const loginData = await web.auth.test();
        if (loginData['ok'] === true) {
          loginCheck = true;
        }
      }
      if (loginCheck !== true) {
        res.writeHead(302, {
          Location: sprintf(
            'https://slack.com/oauth/v2/authorize?client_id=%s&user_scope=%s&redirect_uri=%s',
            process.env.SLACK_CLIENT_ID,
            'channels:read,chat:write,users:read,channels:history',
            process.env.BASE_URL
          )
        });
        res.end();
        return;
      }

      res.render('index', {
        title: '2019年度発表用テスト',
        subTitle: 'NCをプレゼントする'
      });
    })();
  });
} catch (e) {
  console.log(e);
}

module.exports = router;
