import FlexState from '../states/FlexState';
import { updateCapacityApi } from "../service"


const evaluateCapacity = async () => {
    const { maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats, workerChannelSid } = FlexState.capacityState;

    const workerSid = FlexState.workerSid

    const channel = FlexState.workerChannels.get(workerChannelSid)
    const configuredCapacity = channel.capacity

    let capacity = defaultCapacity;
    if (activeChats >= defaultCapacity) {
        // locked
        capacity = defaultCapacity
        console.log("capacity locked")
    } else if (inactiveChats < maxInactiveCapacity && activeChats < defaultCapacity) {
        // if the agent has room for more inactive or active chats we increase his capacity
        capacity = inactiveChats + defaultCapacity;
        console.log("capacity", capacity)
    }

    if (configuredCapacity != capacity) {
        try {
            await updateCapacityApi(workerSid, workerChannelSid, capacity)

            console.log("Capacity updated", capacity)

        } catch (e) {
            console.log(e);

        }
    } else {

        console.log("Capacity not updated", capacity)
    }

    return capacity;
}

export {
    evaluateCapacity
}