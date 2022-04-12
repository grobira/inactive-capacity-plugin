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
    console.log("isActivated", lastMessage, Math.floor((current.getTime() - lastMessage.timestamp.getTime()) / 60000) >= TIME_FOR_INACTIVE, channel.lastMessage.isFromMe)
    if (lastMessage && Math.floor((current.getTime() - lastMessage.timestamp.getTime()) / 60000) >= TIME_FOR_INACTIVE && channel.lastMessage.isFromMe) {
        return false;
    }
    return true;
}

const isActivated = (channel) => {
    const { task } = channel;
    console.log("isActivated", channel)
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

const checkChannelActivity = async (channels) => {
    const channelsPromises = channels.map(async channel => {
        console.log("ChannelActivity", channel)

        const { task } = channel;
        const activated = channel.source?.attributes.activated;
        if (!isActive(channel) && (activated == null || activated == true)) {
            // update task to inactive
            console.log("isActive inactive", task)

            await updateChannelApi(channel, {
                activated: false,
                inactiveTime: new Date().getTime()
            })
        } else if (isActive(channel) && activated == false) {
            // await update task to active
            console.log("isActive", task)

            await updateChannelApi(channel, {
                activated: true
            })
        }
    });

    return await Promise.all(channelsPromises)
}

const evaluateInactivity = () => {

    const channels = getWorkerChannels();
    checkChannelActivity(channels)
    return {
        activeCount: countActiveChats(channels),
        inactiveCount: countInactiveChats(channels),
        channels
    }
}

const orderByLastMessage = (channel1, channel2) => {
    if (channel1.lastMessage.timestamp > channel2.lastMessage.timestamp) return -1;
    if (channel1.lastMessage.timestamp < channel2.lastMessage.timestamp) return 1;
    return 0;
}

export {
    countInactiveChats,
    countActiveChats,
    isActive,
    getWorkerChannels,
    evaluateInactivity,
    orderByLastMessage
}