import FlexStateSingleton from "../states/FlexState"
import { ChatChannelHelper, StateHelper } from "@twilio/flex-ui";

const TIME_FOR_INACTIVE = process.env.TIME_FOR_INACTIVE || 5;


const countInactiveChats = (channels) => {
    const activeChannels = channels.filter(isActive)
    return channels - activeChannels.length;
}

const countActiveChats = (channels) => {
    const activeChannels = channels.filter(isActive)
    return activeChannels.length;
}

const isActive = (channel) => {
    console.log("time ", channel)
    const lastMessage = channel.lastMessage.source;
    const current = new Date();
    if (Math.floor((current.getTime() - lastMessage.timestamp.getTime()) / 60000) > TIME_FOR_INACTIVE && !channel.lastMessage.isFromMe) {
        return false;
    }
    return true;
}

const getWorkerChannels = () => {
    const chatTasks = FlexStateSingleton.workerChatTasks;

    const channels = chatTasks.map(task => {
        const channelState = StateHelper.getChatChannelStateForTask(task);
        const chatChannelHelper = new ChatChannelHelper(channelState);
        return {
            ...channelState,
            lastMessage: chatChannelHelper.lastMessage,
        };
    })

    return channels;
}

const evaluateInactivity = () => {

    const channels = getWorkerChannels();
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
    evaluateInactivity
}