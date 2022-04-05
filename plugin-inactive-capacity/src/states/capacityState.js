const INCREASE_ACTIVE = 'INCREASE_ACTIVE';
const DECREASE_ACTIVE = 'DECREASE_ACTIVE';
const INCREASE_INACTIVE = 'INCREASE_INACTIVE';
const DECREASE_INACTIVE = 'DECREASE_INACTIVE';
const REACTIVATE_CHAT = 'REACTIVATE_CHAT';
const DEACTIVATE_CHAT = 'DEACTIVATE_CHAT';
const UPDATE_CHATS = 'UPDATE_CHATS';
const SET_WORKER_CHANNEL = 'SET_WORKER_CHANNEL';


const MAX_INACTIVE_CHAT = process.env.MAX_INACTIVE_CHAT || 5;
const MAX_ACTIVE_CHAT = process.env.MAX_ACTIVE_CHAT || 1;

const initialState = {
  inactiveChats: 0,
  activeChats: 0,
  maxInactiveCapacity: MAX_INACTIVE_CHAT,
  defaultCapacity: MAX_ACTIVE_CHAT,
  workerChannelSid: ""
};

export class Actions {
  static increasedActiveChat = () => ({ type: INCREASE_ACTIVE });

  static decreaseActiveChat = () => ({ type: DECREASE_ACTIVE });

  static increasedInactiveChat = () => ({ type: INCREASE_INACTIVE });

  static decreasedInactiveChat = () => ({ type: DECREASE_INACTIVE });

  static reacticateChat = () => ({ type: REACTIVATE_CHAT });

  static deacticateChat = () => ({ type: DEACTIVATE_CHAT });

  static updateChats = (activeChats, inactiveChats) => ({ type: UPDATE_CHATS, params: { activeChats, inactiveChats } });

  static setWorkerChannel = (workerChannelSid) => ({ type: SET_WORKER_CHANNEL, params: { workerChannelSid } });


}

export function reduce(state = initialState, action) {
  console.log("Capacities State", {
    ...state,
    ...action.params
  })
  switch (action.type) {
    case INCREASE_ACTIVE: {
      return {
        ...state,
        activeChats: state.activeChats + 1,
      };
    }
    case DECREASE_ACTIVE: {
      return {
        ...state,
        activeChats: state.activeChats - 1 >= 0 ? state.activeChats - 1 : 0,
      };
    }
    case INCREASE_INACTIVE: {
      return {
        ...state,
        inactiveChats: state.inactiveChats + 1,
      };
    }
    case DECREASE_INACTIVE: {
      return {
        ...state,
        inactiveChats: state.inactiveChats - 1 >= 0 ? state.inactiveChats - 1 : 0,
      };
    }
    case REACTIVATE_CHAT: {
      return {
        ...state,
        activeChats: state.activeChats + 1,
        inactiveChats: state.inactiveChats - 1 >= 0 ? state.inactiveChats - 1 : 0,
      };
    }
    case DEACTIVATE_CHAT: {
      return {
        ...state,
        activeChats: state.activeChats - 1 >= 0 ? state.activeChats - 1 : 0,
        inactiveChats: state.inactiveChats + 1,
      };
    }
    case UPDATE_CHATS: {
      return {
        ...state,
        ...action.params
      };
    }
    case SET_WORKER_CHANNEL: {
      return {
        ...state,
        ...action.params
      };
    }

    default:
      return state;
  }
}
