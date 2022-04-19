import FlexStateSingleton from "../states/FlexState"
import { ChatChannelHelper, StateHelper } from "@twilio/flex-ui";
import { updateChannelApi } from "../service";

const TIME_FOR_INACTIVE = process.env.REACT_APP_TIME_FOR_INACTIVE || 1;


const isTimerPausedForTask = (task) => {
    const inactivityTimer = task.attributes.inactivityTimer || {};
    return !!inactivityTimer.pausedSince
};

const countInactiveChats = (channels) => {
    const activeChannels = channels.filter(isActivated)
    return channels.length - activeChannels.length;
}

const countActiveChats = (channels) => {
    const activeChannels = channels.filter(isActivated)
    return activeChannels.length;
}

const isActive = (channel) => {
    const lastMessage = channel.lastMessage ? channel.lastMessage.source || channel.lastMessage : null;
    const current = new Date();
    if (lastMessage && Math.floor((current.getTime() - lastMessage.timestamp.getTime()) / 60000) >= TIME_FOR_INACTIVE && channel.lastMessage.isFromMe) {
        return false;
    }
    return true;
}

const isActivated = (channel) => {
    const { task } = channel;
    return (channel.source?.attributes.activated == true || channel.source?.attributes.activated == null) && (!isTimerPausedForTask(task));
}

const getWorkerChannels = () => {
    const chatTasks = FlexStateSingleton.workerChatTasks;

    const channels = chatTasks.map(task => {
        const channelState = StateHelper.getChatChannelStateForTask(task);
        const chatChannelHelper = new ChatChannelHelper(channelState);
        return {
            ...channelState,
            lastMessage: chatChannelHelper.lastMessage,
            task
        };
    })

    return channels;
}

const isFirstReplyed = (channel) => {
    return channel.source?.attributes.firstReplied;
}


const isFirstReplyedTimeExpired = (channel) => {
    if (!isFirstReplyed(channel)) {
        const diff = (new Date().getTime() - channel?.source?.attributes.firstReplyCountdown) / 1000;
        if (diff > 30)
            return true
    }
    return false
}

const verifyChannelsFirstReply = async () => {

    const channels = getWorkerChannels();
    const channelsToUpdate = channels.filter(channel => {
        return isFirstReplyedTimeExpired(channel);
    })

    const channelsPromises = channelsToUpdate.map(async channel => {
        return await updateChannelApi(channel, {
            firstReplyExpired: true
        })
    })

    return await Promise.all(channelsPromises)
}

const checkChannelActivity = async (channels) => {
    const channelsPromises = channels.map(async channel => {

        const { task } = channel;
        const activated = channel.source?.attributes.activated;
        if (!isActive(channel) && (activated == null || activated == true)) {
            // update task to inactive

            await updateChannelApi(channel, {
                activated: false,
                inactiveTime: new Date().getTime()
            })
        } else if (isActive(channel) && activated == false) {
            // await update task to active

            await updateChannelApi(channel, {
                activated: true
            })
        }
    });

    return await Promise.all(channelsPromises)
}

const evaluateInactivity = () => {

    const channels = getWorkerChannels();
    // checkChannelActivity(channels)
    return {
        activeCount: countActiveChats(channels),
        inactiveCount: countInactiveChats(channels),
        channels
    }
}

export {
    countInactiveChats,
    countActiveChats,
    isActive,
    getWorkerChannels,
    evaluateInactivity,
    verifyChannelsFirstReply
}