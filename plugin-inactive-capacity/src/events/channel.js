import FlexStateSingleton from "../states/FlexState"
import { Actions } from "../states/capacityState"
import utils from "../utils/utils"
import { updateChannelApi, fetchChannelApi } from "../service"
import { evaluateInactivity } from "../utils/channels"
import { evaluateCapacity } from "../utils/capacity"


const inactivatedHandler = async (channel) => {
    FlexStateSingleton.dispatchStoreAction(Actions.deacticateChat())
    utils.evaluateCapacity();

    await updateChannelApi(channel, { activated: false })

}

const messageAddedHandler = async (channel, message) => {
    if (channel.attributes.activated == false) {
        FlexStateSingleton.dispatchStoreAction(Actions.reacticateChat())
        // Check for capacity if activeChats == default capacity -> setCapacity to defaultCap + inactiveChats
    }

    if (channel.attributes.activated != true || channel.attributes.firstReplied != true) {
        await updateChannelApi(channel, { activated: true, firstReplied: true })

        utils.evaluateCapacity();
    }

}

const updateHandler = async (channel, payload) => {
    if (payload.updateReasons.includes("attributes") && payload.channel.attributes.status == "INACTIVE") {
        const { activeCount,
            inactiveCount,
            channels } = evaluateInactivity();
        FlexStateSingleton.dispatchStoreAction(Actions.updateChats(activeCount, inactiveCount))
        await evaluateCapacity()
    }
}

const ChannelEventsHandler = async (flex, manager) => {


    const workerChannelsPromises = FlexStateSingleton.workerChatTasks.map(task => manager.chatClient.getChannelBySid(task.attributes.channelSid))
    const workerExistingChannels = await Promise.all(workerChannelsPromises);

    workerExistingChannels.forEach(channel => {
        channel.on("inactivated", (payload) => { inactivatedHandler(channel); });

        channel.on("updated", (payload) => { updateHandler(channel, payload); });

        channel.on("messageAdded", (message) => { messageAddedHandler(channel, message) });

    })

    // Everytime a new chat is assignment to the agent, we need to add some listeners for events
    manager.chatClient.on("channelAdded", async channel => {
        await updateChannelApi(channel, { activated: true, firstReplied: false, firstReplyCountdown: new Date().getTime() })

        FlexStateSingleton.dispatchStoreAction(Actions.increasedActiveChat())


        // Updated event
        // Will handle the ending of chats, either by completing it trough Flex or by completing/deleting the task
        channel.on("updated", (payload) => { updateHandler(channel, payload) })

        channel.on("inactivated", (payload) => {
            // InactivatedChat
            // Increase Capacity to inactivateChats+ defaultCapacity
            inactivatedHandler(channel);
        })

        channel.on("messageAdded", (message) => {

            messageAddedHandler(channel, message)

        })
    })
}

export default ChannelEventsHandler;