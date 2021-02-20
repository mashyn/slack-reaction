const props = PropertiesService.getScriptProperties().getProperties();
const oAuthAccessToken = props.OAUTH_ACCESS_TOKEN;
const slackApiBase = 'https://slack.com/api/';

function doPost(e){
  
  // デバッグ用
  /*
  const itemChannel = "CCWQR2L79";
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

    UrlFetchApp.fetch(props.WEBHOOK_URL, options);
  })
  .then(() => {
    return ContentService.createTextOutput(params.challenge);
  })
}

// チャンネルリストを取得してチャンネルIDから対象のチャンネル名を取得
function fetchChannel(channelId) {
  return new Promise((resolve) => {
    const channelsUrl = slackApiBase + 'conversations.list?token=' + oAuthAccessToken + '&exclude_archived=1&pretty=1';
    const channels = JSON.parse(UrlFetchApp.fetch(channelsUrl)).channels;
    const targetChannel = channels.find(channel => channel.id === channelId);
    const channelName = (targetChannel !== undefined) ? targetChannel.name : "チャンネル以外";
    resolve(channelName);
  })
}

// メンション用に対象メッセージ投稿者のユーザIDを取得
function fetchMessage(channel, ts) {
  return new Promise((resolve) => {
    const url = slackApiBase + "conversations.replies?token=" + oAuthAccessToken + "&channel=" + channel + "&ts=" + ts + "&latest=" + ts + "&limit=1&inclusive=true" 
    const replies = JSON.parse(UrlFetchApp.fetch(url));
    const targetMessage = replies.messages[0];
    const isThread = (targetMessage.thread_ts !== undefined && targetMessage.ts !== targetMessage.thread_ts);
    let linkUrl = props.SLACK_WORKSPACE_URL + "archives/" + channel +"/p" + String(targetMessage.ts).replace(/\./g, '');
    // スレッドの場合
    if(isThread) {
      linkUrl += "?thread_ts=" + String(targetMessage.thread_ts).replace(/\./g, '') + "&cid=" + channel;
    }
    resolve({linkUrl: linkUrl, userId: targetMessage.user});
  })
}
