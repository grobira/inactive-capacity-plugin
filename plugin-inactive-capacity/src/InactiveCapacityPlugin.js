import React from 'react';
import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

import reducers, { namespace } from './states';
import { evaluateInactivity } from "./utils/channels"
import utils from "./utils/utils"
import FlexState from './states/FlexState';
import { Actions } from "./states/capacityState"


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
    this.registerReducers(manager);


    // Loop to verify how many chat are active/inactive
    // Update the state with the results
    // Call Function to check logic and update worker capacity
    setInterval(async () => {
      const { activeCount,
        inactiveCount,
        channels } = evaluateInactivity();
      FlexState.dispatchStoreAction(Actions.updateChats(activeCount, inactiveCount))
      await utils.evaluateCapacity()
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
}
