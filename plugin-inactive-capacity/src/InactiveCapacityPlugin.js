import React from 'react';
import { TaskList, VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import FlexState from './states/FlexState';

import reducers, { namespace } from './states';

import { ActiveBubble } from './components/activeBubble';
import { ChatChannelHelper, StateHelper } from "@twilio/flex-ui";

const PLUGIN_NAME = 'InactiveCapacityPlugin';

import utils from "./utils/utils"
import registerEventsHandler from './events';
import { evaluateCapacity } from './utils/capacity';
import { evaluateInactivity, verifyChannelsFirstReply } from './utils/channels';
import { getWorkerChannelsApi } from './service';
import { Actions } from './states/capacityState';

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
    flex.TaskChannels.register(this.createFirstReplyChatDefinition(flex, manager));

    this.registerReducers(manager);

    registerEventsHandler(flex, manager);

    await this.initStates();
    this.initFistReplyVerification();
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
    const channelDefinition = flex.DefaultTaskChannels.createChatTaskChannel("InactiveChat",
      (task) => {
        if (task.taskChannelUniqueName === "chat") {
          const channel = StateHelper.getChatChannelStateForTask(task);
          return channel?.source?.attributes.activated == false
        }
        return false
      }, "Whatsapp", "WhatsappBold", "#afb3a5");

    const { templates } = channelDefinition;
    const inactiveChatChannelDefinition = {
      ...channelDefinition,
      templates: {
        ...templates,
        TaskListItem: {
          ...templates?.TaskListItem,
          secondLine: (task) => {
            const channelState = StateHelper.getChatChannelStateForTask(task);
            const helper = new ChatChannelHelper(channelState);
            const currentDiff = new Date(new Date().getTime() - channelState.source.attributes.inactiveTime)
            const hours = new Date().getHours() - new Date(channelState.source.attributes.inactiveTime).getHours()
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
        },
        TaskCard: {
          ...templates?.TaskCard,
          secondLine: (task) => {
            const channelState = StateHelper.getChatChannelStateForTask(task);
            const helper = new ChatChannelHelper(channelState);
            const currentDiff = new Date(new Date().getTime() - channelState.source.attributes.inactiveTime)
            const hours = new Date().getHours() - new Date(channelState.source.attributes.inactiveTime).getHours()
            const minutes = currentDiff.getMinutes();
            const seconds = currentDiff.getSeconds();

            const timeSinceInactivation = this.formatHours(hours, minutes, seconds)

            const fullText = `Inativo | ${timeSinceInactivation}`
            return fullText
          }
        },
      },
      addedComponents: [
        {
          target: "TaskListButtons",
          component: <ActiveBubble
            key="activeBubble"
          />,
          options: { align: "start", sortOrder: 0 }
        }
      ]
    };

    return inactiveChatChannelDefinition
  }

  createFirstReplyChatDefinition(flex, manager) {
    const channelDefinition = flex.DefaultTaskChannels.createChatTaskChannel("FirstReplyCh",
      (task) => {
        if (task.taskChannelUniqueName === "chat") {
          const channel = StateHelper.getChatChannelStateForTask(task);
          return channel?.source?.attributes.firstReplied == false && channel?.source?.attributes.firstReplyExpired == true
        }
        return false
      }, "Whatsapp", "WhatsappBold", "#ab2727");

    return channelDefinition;
  }

  formatHours(hours, minutes, seconds) {
    let fullHour = "";

    if (hours > 0) {
      fullHour = `${hours}:`;
    }
    fullHour = `${fullHour}${minutes}:${seconds}`
    return fullHour;
  }

  async initStates() {

    const workerChannel = await getWorkerChannelsApi(FlexState.workerSid);

    FlexState.dispatchStoreAction(Actions.setWorkerChannel(workerChannel.sid));
    const { workerChannelSid } = FlexState.capacityState;

    const { activeCount,
      inactiveCount,
      channels } = evaluateInactivity();
    FlexState.dispatchStoreAction(Actions.updateChats(activeCount, inactiveCount))
    await evaluateCapacity()
  }

  initFistReplyVerification() {
    const timer = setInterval(async () => {
      await verifyChannelsFirstReply();
    }, 5000)
  }
}
