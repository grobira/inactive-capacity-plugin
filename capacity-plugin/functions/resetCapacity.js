const { WORKSPACE_SID } = process.env;

exports.handler = async function (context, event, callback) {
    const client = context.getTwilioClient();

    const response = new Twilio.Response();

    response.appendHeader('Access-Control-Allow-Origin', '*');
    response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { workerSid, defaultCapacity } = event;

    let capacity = defaultCapacity;

    const workerChannels = await client.taskrouter.workspaces(WORKSPACE_SID).workers(workerSid).workerChannels.list();

    const workerChannel = workerChannels.find(wc => wc.taskChannelUniqueName == 'chat')

    const { configuredCapacity } = workerChannel;
    if (configuredCapacity != capacity) {
        try {
            await client.taskrouter.workspaces(WORKSPACE_SID).workers(workerSid).workerChannels(workerChannel.sid).update({ capacity })
            response.appendHeader('Content-Type', 'application/json');
            response.setBody({
                capacity
            });

            console.log("Capacity reseted", capacity)

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
        console.log("Capacity not reseted", capacity)
    }


    callback(null, response);
};
