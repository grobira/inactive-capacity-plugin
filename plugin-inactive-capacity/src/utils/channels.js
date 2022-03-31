import FlexStateSingleton from "../states/FlexState"
import { ChatChannelHelper, StateHelper } from "@twilio/flex-ui";

const TIME_FOR_INACTIVE = process.env.TIME_FOR_INACTIVE || 1;


const countInactiveChats = (channels) => {
    const activeChannels = channels.filter(isActive)
    return channels.length - activeChannels.length;
}

const countActiveChats = (channels) => {
    const activeChannels = channels.filter(isActive)
    return activeChannels.length;
}

const isActive = (channel) => {
    const lastMessage = channel.lastMessage.source || channel.lastMessage;
    const current = new Date();
    if (Math.floor((current.getTime() - lastMessage.timestamp.getTime()) / 60000) > TIME_FOR_INACTIVE && channel.lastMessage.isFromMe) {
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

const orderByLastMessage = (channel1, channel2) => {
    if (channel1.lastMessage.timestamp > channel2.lastMessage.timestamp) return -1;
    if (channel1.lastMessage.timestamp < channel2.lastMessage.timestamp) return 1;
    return 0;
}

const orderByLastMessageAndInactivity = (channel1, channel2) => {
    if (channel1.attributes.activated == null) {
        return -1;
    }
    if (channel1.attributes.activated && !channel2.attributes.activated) {
        return -1;
    }
    if (!channel1.attributes.activated && channel2.attributes.activated) {
        return 1;
    }
    if (channel1.attributes.activated && channel2.attributes.activated) {
        return channel1.lastMessage.timestamp > channel2.lastMessage.timestamp ? -1 : 1;
    }
    if (!channel1.attributes.activated && !channel2.attributes.activated) {
        return channel1.lastMessage.timestamp < channel2.lastMessage.timestamp ? -1 : 1;
    }
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