import FlexState from '../states/FlexState';

const { REACT_APP_API_KEY, REACT_APP_API_SECRET, REACT_APP_WORKSPACE_SID } = process.env;

const getHeaders = () => {
    return {
        Authorization: `Basic ${Buffer(REACT_APP_API_KEY + ":" + REACT_APP_API_SECRET).toString('base64')}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    }
}

const updateTaskApi = async (task, newAttributes) => {

    const url = `https://taskrouter.twilio.com/v1/Workspaces/${REACT_APP_WORKSPACE_SID}/Tasks/${task.taskSid}`

    const urlencoded = new URLSearchParams();
    urlencoded.append("Attributes", JSON.stringify(
        {
            ...task.attributes,
            ...newAttributes
        }
    ))

    const config = {
        body: urlencoded,
        method: 'POST',
        headers: getHeaders()
    }

    return await fetchJsonWithReject(url, config)
}

const updateCapacityApi = async (workerSid, workerChannelSid, capacity) => {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${REACT_APP_WORKSPACE_SID}/Workers/${workerSid}/Channels/${workerChannelSid}`

    const urlencoded = new URLSearchParams();
    urlencoded.append("Capacity", capacity);

    const config = {
        body: urlencoded,
        method: 'POST',
        headers: getHeaders()
    }

    return await fetchJsonWithReject(url, config)
}

const resetCapacityApi = async () => {
    const { defaultCapacity, workerChannelSid } = FlexState.capacityState;

    const workerSid = FlexState.workerSid;

    return await updateCapacityApi(workerSid, workerChannelSid, defaultCapacity)
}

const getWorkerChannelsApi = async (workerSid) => {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${REACT_APP_WORKSPACE_SID}/Workers/${workerSid}/Channels/chat`

    const config = {
        method: 'GET',
        headers: getHeaders()
    }

    return await fetchJsonWithReject(url, config)
}

const fetchJsonWithReject = (url, config, attempts = 0) => {
    return fetch(url, config)
        .then(response => {
            if (!response.ok) {
                throw response;
            }
            return response.json();
        })
        .catch(async (error) => {
            try {
                // Generic retry when calls return a 'too many requests' response
                // request is delayed by a random number which grows with the number of retries
                if (error.status === 429 && attempts < 10) {
                    const min = Math.ceil(100);
                    const max = Math.floor(750);
                    const waitForRetry = Math.floor(Math.random() * (max - min + 1) + min) * (attempts + 1);
                    await delay(waitForRetry);
                    return await this.fetchJsonWithReject(url, config, attempts + 1);
                }
                return error.json().then((response) => {
                    throw response;
                });
            } catch (e) {
                throw error;
            }
        });
}

export {
    updateTaskApi,
    fetchJsonWithReject,
    updateCapacityApi,
    getWorkerChannelsApi,
    resetCapacityApi
}