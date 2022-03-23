import FlexStateSingleton from "../states/FlexState"
import { Actions } from "../states/capacityState"
import utils from "../utils/utils"


const ChannelEventsHandler = (flex, manager) => {

    // Everytime a new chat is assignment to the agent, we need to add some listeners for events
    manager.chatClient.on("channelAdded", channel => {
        channel.attributes.activated = true;
        FlexStateSingleton.dispatchStoreAction(Actions.increasedActiveChat())


        // Updated event
        // Will handle the ending of chats, either by completing it trough Flex or by completing/deleting the task
        channel.on("updated", (payload) => {
            if (payload.updateReasons.includes("attributes") && payload.channel.attributes.status == "INACTIVE") {
                console.log("Chat completado")

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

        })

        channel.on("inactivated", (payload) => {
            // InactivatedChat
            // Increase Capacity to inactivateChats+ defaultCapacity

            FlexStateSingleton.dispatchStoreAction(Actions.deacticateChat())
            utils.evaluateCapacity();
            payload.attributes.activated = false;
        })

        channel.on("messageAdded", (message) => {

            if (channel.attributes.activated == false) {
                FlexStateSingleton.dispatchStoreAction(Actions.reacticateChat())
                // Check for capacity if activeChats == default capacity -> setCapacity to defaultCap + inactiveChats
            }
            channel.attributes.activated = true;
            utils.evaluateCapacity();


            // Sample solution to inactivate chats
            // Check if the channel status still active, if this chat is currently activated and if the message that fired this event will be the last message after x second
            setTimeout(() => {
                if (channel.attributes.status == "ACTIVE" && channel.attributes.activated == true && message.index == channel.lastMessage.index) {
                    channel.emit("inactivated", channel);
                }
            }, 10000)
        })
    })



}

export default ChannelEventsHandler;