import React from 'react';
import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

import reducers, { namespace } from './states';
import { evaluateInactivity } from "./utils/channels"
import { evaluateCapacity } from "./utils/capacity"
import FlexState from './states/FlexState';
import { Actions } from "./states/capacityState"
import { ActiveBubble } from './component/activeBubble';
import { ChatChannelHelper, StateHelper } from "@twilio/flex-ui";
import { getWorkerChannelsApi, resetCapacityApi } from "./service"


const PLUGIN_NAME = 'InactiveCapacityPlugin';

export default class InactiveCapacityPlugin extends FlexPlugin {
  constructor () {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {

    flex.TaskChannels.register(this.createInactiveChatDefinition(flex, manager));
    this.setTaskListFilters(flex)

    this.registerReducers(manager);

    await this.initState();


    // Loop to verify how many chat are active/inactive
    // Update the state with the results
    // Call Function to check logic and update worker capacity
    setInterval(async () => {
      const { activeCount,
        inactiveCount,
        channels } = evaluateInactivity();
      FlexState.dispatchStoreAction(Actions.updateChats(activeCount, inactiveCount))
      await evaluateCapacity()
    }, 10000)
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint-disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    manager.store.addReducer(namespace, reducers);
  }

  createInactiveChatDefinition(flex, manager) {
    const inactiveChatChannelDefinition = flex.DefaultTaskChannels.createChatTaskChannel("InactiveChat",
      (task) => task.taskChannelUniqueName === "chat" && task.attributes.activated == false, "Whatsapp", "WhatsappBold", "#a6a6a6");

    inactiveChatChannelDefinition.addedComponents = [
      {
        target: "TaskListButtons",
        component: <ActiveBubble
          key="activeBubble"
        />,
        options: { align: "start", sortOrder: 0 }
      }
    ]
    inactiveChatChannelDefinition.templates.TaskListItem.secondLine = (task) => {
      const channelState = StateHelper.getChatChannelStateForTask(task);
      const helper = new ChatChannelHelper(channelState);
      const currentDiff = new Date(new Date().getTime() - task.attributes.inactiveTime)
      const hours = currentDiff.getHours();
      const minutes = currentDiff.getMinutes();
      const seconds = currentDiff.getSeconds();

      let adicionalInfo = ""
      if (helper.typers.length) {
        adicionalInfo = "typing ..."
      } else if (helper.lastMessage) {
        adicionalInfo = `${helper.lastMessage.source.authorName ? helper.lastMessage.source.authorName : ""}: ${helper.lastMessage.source.body}`
      }

      const timeSinceInactivation = this.formatHours(hours, minutes, seconds)

      const fullText = `${timeSinceInactivation} | ${adicionalInfo} `
      return fullText
    }

    return inactiveChatChannelDefinition
  }

  formatHours(hours, minutes, seconds) {
    let fullHour = "";

    if (hours > 0) {
      fullHour = `${hours}:`;
    }
    fullHour = `${fullHour}${minutes}:${seconds}`
    return fullHour;
  }

  async initState() {
    const workerChannel = await getWorkerChannelsApi(FlexState.workerSid);

    FlexState.dispatchStoreAction(Actions.setWorkerChannel(workerChannel.sid));

    await resetCapacityApi()
  }

  setTaskListFilters(flex) {
    const inactiveFilter = new flex.TaskListFilter();
    inactiveFilter.text = "Inactive Chats"
    inactiveFilter.callback = (task) => {
      return task.attributes.activated == false
    }

    const activeFilter = flex.TaskListFilter();
    activeFilter.text = "Active Chats"
    activeFilter.callback = (task) => {
      return task.attributes.activated != false
    }

    flex.TaskListContainer.staticTaskFilter = (task) => task.assignmentStatus === "assigned"


    flex.TaskListContainer.defaultProps.taskFilters = [
      activeFilter,
      inactiveFilter,
    ]

    flex.TaskListContainer.defaultTaskFilters = [
      ...flex.TaskListContainer.defaultTaskFilters,
      inactiveFilter,
    ]
  }
}