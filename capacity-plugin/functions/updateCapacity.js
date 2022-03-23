const { WORKSPACE_SID } = process.env;

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  const response = new Twilio.Response();

  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { workerSid, inactiveChats, activeChats, defaultCapacity, maxInactiveCapacity } = event;

  let capacity = defaultCapacity;

  // const workerChannel = await client.taskrouter.workspaces(WORKSPACE_SID).workers(workerSid).workerChannels('chat');

  const workerChannels = await retryOnError(() => {
    return client.taskrouter.workspaces(WORKSPACE_SID).workers(workerSid).workerChannels.list();
  })

  const workerChannel = workerChannels.find(wc => wc.taskChannelUniqueName == 'chat')

  const { configuredCapacity } = workerChannel;
  if (activeChats >= defaultCapacity) {
    // locked
    capacity = defaultCapacity
    console.log("locked")
  } else if (inactiveChats < maxInactiveCapacity && activeChats < defaultCapacity) {
    // if the agent has room for more inactive or active chats we increase his capacity
    capacity = inactiveChats + defaultCapacity;
    console.log("capacity", capacity)
  }

  if (configuredCapacity != capacity) {
    try {
      await retryOnError(() => {
        return client.taskrouter.workspaces(WORKSPACE_SID).workers(workerSid).workerChannels(workerChannel.sid).update({ capacity })
      })
      response.appendHeader('Content-Type', 'application/json');
      response.setBody({
        capacity
      });

      console.log("Capacity updated", capacity)

    } catch (e) {
      console.log(e);
      response.appendHeader('Content-Type', 'application/json');
      response.setBody({ error: e.message });
      response.setStatusCode(500);
    }
  } else {
    response.appendHeader('Content-Type', 'application/json');
    response.setBody({
      capacity
    });
    console.log("Capacity not updated", capacity)
  }


  callback(null, response);
};

const delay = (t) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, t);
  });
}
const retryOnError = async (func, maxRetries = 3, index = 0) => {
  try {
    const response = await func();
    return response;
  } catch (e) {
    console.log(e);
    if (maxRetries > index) {
      console.log("Retrying...")
      if (e.code === 429) {
        await delay(1000);
        return await retryOnError(func, maxRetries, index + 1);
      }
    } else {
      throw e;
    }
  }
}