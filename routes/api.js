const { WebClient } = require('@slack/web-api');
const router = require('express').Router();
const bodyParser = require('body-parser');
const sprintf = require('sprintf').sprintf;

let userId = '';
let userName = '';
let channelList = {};
let accessToken = '';

try {
  router.use(function(req, res, next) {
    accessToken = req.session.accessToken;
    (async () => {
      const web = new WebClient(accessToken);
      const loginData = await web.auth.test();
      if (typeof loginData['ok'] !== 'boolean' || loginData['ok'] !== true) {
        res.status(400);
        res.end();
      }
      userId = loginData['user_id'];
      userName = loginData['user'];

      const rawChannelList = await web.users.conversations({
        user: userId
      });
      for (let channelData of rawChannelList['channels']) {
        if (channelData['name'].indexOf('thanks-bot') > -1) {
          continue;
        }
        channelList[channelData['id']] = {
          name: channelData['name'],
          default: channelData['id'] === process.env.TARGET_CHANNEL_ID
        };
      }

      bodyParser.urlencoded({ extended: true });
      res.header('Content-Type', 'application/json; charset=utf-8');
      next();
    })();
  });

  router.get('/get_self_data', function(req, res) {
    res.send({
      id: userId,
      name: userName
    });
  });

  router.get('/get_user_list', function(req, res) {
    (async () => {
      const web = new WebClient(accessToken);
      const userList = await web.users.list();
      let resultData = {};
      for (let userData of userList['members']) {
        if (
          userData['id'] !== process.env.SLACK_BOT_ID &&
          userData['deleted'] === false &&
          (typeof userData['profile']['always_active'] !== 'boolean' ||
            userData['profile']['always_active'] === false)
        ) {
          let displayName = userData['profile']['real_name'];
          if (userData['profile']['display_name'] !== '') {
            displayName = sprintf('%s(%s)', userData['profile']['display_name'], displayName);
          }
          resultData[userData['id']] = {
            realName: userData['profile']['real_name'],
            displayName: userData['profile']['display_name']
          };
        }
      }
      res.send(resultData);
    })();
  });

  router.get('/get_channel_list', function(req, res) {
    (async () => {
      res.send(channelList);
    })();
  });

  router.get('/get_self_monthly_log', function(req, res) {
    (async () => {
      const web = new WebClient(accessToken);
      const currentDate = new Date();
      let messageList = [];

      for (channelId in channelList) {
        const rawMessageList = await web.conversations.history({
          channel: channelId,
          oldest: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime() / 1000
        });

        for (let messageData of rawMessageList['messages']) {
          if (messageData['user'] !== userId) {
            continue;
          }
          const MATCHES = messageData['text'].match(/^\:([+]{1,2})nc\:[ ]+<@([A-Z0-9]+)>[ ]+c=/);
          if (MATCHES === null) {
            continue;
          }

          messageList.push({
            text: messageData['text'].replace(/^\:([+]{1,2})nc\:[ ]+<@[A-Z0-9]+>[ ]+c=/, ''),
            nc: MATCHES[1].length,
            userId: MATCHES[2],
            ts: messageData['ts'],
            channel: channelList[channelId]['name']
          });
        }
      }

      messageList.sort(function(x, y) {
        return x['ts'] < y['ts'] ? 1 : -1;
      });
      res.send(messageList);
    })();
  });

  router.post('/send_nc', function(req, res) {
    (async () => {
      if (
        typeof req['body'] === 'undefined' ||
        typeof req['body']['send_user_id'] === 'undefined' ||
        typeof req['body']['send_nc'] === 'undefined' ||
        typeof req['body']['send_channel'] === 'undefined' ||
        typeof req['body']['send_comment'] === 'undefined' ||
        req['body']['send_user_id'] === '' ||
        req['body']['send_comment'] === '' ||
        req['body']['send_channel'] === ''
      ) {
        res.send({
          result: false
        });
        return;
      }

      let iconStr = '';
      switch (req['body']['send_nc']) {
        case '1':
          iconStr = '+nc';
          break;
        case '2':
          iconStr = '++nc';
          break;
        default:
          res.send({
            result: false
          });
          return;
      }

      const web = new WebClient(accessToken);
      const sendResult = await web.chat.postMessage({
        channel: req['body']['send_channel'],
        text: sprintf(
          ':%s: <@%s> c=%s',
          iconStr,
          req['body']['send_user_id'],
          req['body']['send_comment']
        ),
        as_user: true
      });
      res.send({
        result: sendResult['ok']
      });
    })();
  });

  // @TODO コミット時に削除すること
  router.get('/get_monthly_log_test', function(req, res) {
    (async () => {
      const web = new WebClient(accessToken);
      let dateObj = new Date();
      let cnt = 0;
      do {
        if (cnt > 12) {
          break;
        }
        // dateObj.setMonth(dateObj.getMonth() - 1);
        const rawMessageList = await web.conversations.history({
          channel: 'C03NPAVJK',
          oldest: new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getTime() / 1000,
          latest:
            new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000
        });
        console.log(
          dateObj.getFullYear() + '.' + (dateObj.getMonth() + 1) + ': ',
          rawMessageList['messages'].length
        );
        ++cnt;
      } while (true);
      res.send([]);
    })();
  });
} catch (e) {
  console.log(e);
}

module.exports = router;
