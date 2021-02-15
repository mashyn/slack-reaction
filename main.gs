const props = PropertiesService.getScriptProperties().getProperties();
const webhookUrl = props.WEBHOOK_URL;
const oAuthAccessToken = props.OAUTH_ACCESS_TOKEN;
const slackApiBase = 'https://slack.com/api/';
const channelsUrl = slackApiBase + 'conversations.list?token=' + oAuthAccessToken + '&exclude_archived=1&pretty=1';
const fetchMessageUrl = slackApiBase + 'conversations.replies';
const slackWorkSpaceUrl = props.SLACK_WORKSPACE_URL;

function doPost(e){
  try {
    // デバッグ用
    /*const itemChannel = "CCWQR2L79";
    const itemTs = "1613358632.000200";
    const reaction = "+1";
    */
    const json = JSON.parse(e.postData.getDataAsString());
    const itemChannel = json.event.item.channel;
    const itemTs = json.event.item.ts;
    const reaction = json.event.reaction;

    Promise.all([
      fetchChannel(itemChannel),
      fetchMessage(itemChannel, itemTs)
    ])
    .then(function(data) {
      const [channelName, messageData] = data;
      const message = "<@" + messageData["userId"] + ">" + "[" + channelName + "]にリアクションがつきました。\n\n" + messageData["linkUrl"];
      const jsonData = { "text": ":" +reaction + ":" + message };
      const payload = JSON.stringify(jsonData);
      const options = {
        "method" : "post",
        "contentType" : "application/json",
        "payload" : payload
      };

      UrlFetchApp.fetch(webhookUrl, options);
    })
    .then(() => {
      return ContentService.createTextOutput(params.challenge);
    })
  } catch (ex) {
  }
}

// チャンネルリストを取得してチャンネルIDから対象のチャンネル名を取得
function fetchChannel(channel) {
  return new Promise((resolve) => {
    const channels = JSON.parse(UrlFetchApp.fetch(channelsUrl)).channels;
    
    // channelListに{id: name}で保存
    let channelList = new Object();
    channels.forEach(channel => channelList[channel.id] = channel.name);

    // channelList[channel]がなければ"チャンネル以外"をセット（DMの場合など）
    const channelName = channelList[channel] || "チャンネル以外";
    resolve(channelName);
  })
}

// メンション用に対象メッセージ投稿者のユーザIDを取得
function fetchMessage(channel, ts) {
  return new Promise((resolve) => {
    const url = fetchMessageUrl + "?token=" + oAuthAccessToken + "&channel=" + channel + "&ts=" + ts + "&latest=" + ts + "&limit=1&inclusive=true" 
    const replies = JSON.parse(UrlFetchApp.fetch(url));

    const targetMessage = replies.messages[0];
    const isThread = targetMessage.ts !== targetMessage.thread_ts;

    let linkUrl = slackWorkSpaceUrl + "archives/" + channel +"/p" + String(targetMessage.ts).replace(/\./g, '');
    // スレッドの場合
    if(isThread) {
      linkUrl += "?thread_ts=" + String(targetMessage.thread_ts).replace(/\./g, '') + "&cid=" + channel;
    }
    
    resolve({linkUrl: linkUrl, userId: targetMessage.user});
  })
}
