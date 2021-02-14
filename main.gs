const props = PropertiesService.getScriptProperties().getProperties();
const webhookUrl = props.WEBHOOK_URL;
const oAuthAccessToken = props.OAUTH_ACCESS_TOKEN;
const slackApiBase = 'https://slack.com/api/';
const channelsUrl = slackApiBase + 'conversations.list?token=' + oAuthAccessToken + '&exclude_archived=1&pretty=1';
const fetchMessageUrl = slackApiBase + 'conversations.history';
const slackWorkSpaceUrl = props.SLACK_WORKSPACE_URL;

function doPost(e){
  try {
    // デバッグ用
    /*
    const itemChannel = "DCVUAQPFX";
    const itemTs = "1613184706.000200";
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
      const [channelName, userId] = data;
      
      const message = "<@" + userId + ">" + "[" + channelName + "]にリアクションがつきました。\n\n" + slackWorkSpaceUrl + "archives/" + itemChannel +"/p" + itemTs;
        
        const jsonData =
        {
          "text": ":" +reaction + ":" + message
        };
        const payload = JSON.stringify(jsonData);

        const options =
        {
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
    let channelList = new Object();

    for(let entry of channels.entries()) {
      const id = entry[1].id;
      const name = entry[1].name; 
      channelList[id] = name;
    }
    const channelName = channelList[channel] || "チャンネル以外";
    resolve(channelName);
  })
}

// 対象メッセージのユーザIDを取得
function fetchMessage(channel, ts) {
  return new Promise((resolve) => {
    const url = fetchMessageUrl + "?token=" + oAuthAccessToken + "&channel=" + channel + "&latest=" + ts + "&limit=1&inclusive=true" 
    const histories = JSON.parse(UrlFetchApp.fetch(url));
    resolve(histories.messages[0].user);
  })
}
