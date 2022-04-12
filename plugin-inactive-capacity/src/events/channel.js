import FlexStateSingleton from "../states/FlexState"
import { Actions } from "../states/capacityState"
import utils from "../utils/utils"
import { updateChannelApi } from "../service"


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

    await updateChannelApi(channel, { activated: true })

    utils.evaluateCapacity();
}

const updateHandler = (channel, payload) => {
    if (payload.updateReasons.includes("attributes") && payload.channel.attributes.status == "INACTIVE") {
        console.log("Chat completado")

        console.log("Capacities", payload.channel.attributes.activated)
        if (payload.channel.attributes.activated == false) {
            FlexStateSingleton.dispatchStoreAction(Actions.decreasedInactiveChat())
            // Expired Chat
            // Decrease Capacity to inactivateChats+ defaultCapacity
            // new inactive chat slot shouldnt be replaced with a new chat
            // RACE CONDICION should be with capacity locked
        }

        if (payload.channel.attributes.activated == true) {
            FlexStateSingleton.dispatchStoreAction(Actions.decreaseActiveChat())
            // Normal Chat completed
            // No updates, opened slot can be replaced for a new chat
        }

        utils.evaluateCapacity();
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
        await updateChannelApi(channel, { activated: true })

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
            // Sample solution to inactivate chats
            // Check if the channel status still active, if this chat is currently activated and if the message that fired this event will be the last message after x second
            // setTimeout(() => {
            //     console.log("Capacities", channel.attributes.status, channel.attributes.activated, message.index, channel.lastMessage.index)
            //     if (channel.attributes.status == "ACTIVE" && channel.attributes.activated == true && message.index == channel.lastMessage.index) {
            //         channel.emit("inactivated", channel);
            //     }
            // }, 10000)
        })
    })
}

export default ChannelEventsHandler;