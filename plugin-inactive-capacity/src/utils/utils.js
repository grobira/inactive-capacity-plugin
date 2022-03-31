import { TaskHelper } from '@twilio/flex-ui';
import FlexState from '../states/FlexState';
import { ConferenceParticipantTypes, TaskDirections } from './enums';

const baseServerlessUrl = `https://${process.env.REACT_APP_SERVERLESS_DOMAIN}`;

const evaluateCapacity = async () => {
  const { maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats } = FlexState.capacityState;

  const workerSid = FlexState.workerSid;

  console.log("Capacity State", { maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats, workerSid })

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats, workerSid })
  };
  try {
    const response = await fetch(`${baseServerlessUrl}/updateCapacity`, requestOptions);
    const data = await response.json();
    console.log("New Capacity", { newCapacity: data.capacity })
    return data.capacity;
  } catch (e) {
    console.log(e);
    return e;
  }
}

const updateCapacity = async (activeChats, inactiveChats) => {
  const { maxInactiveCapacity, defaultCapacity } = FlexState.capacityState;

  const workerSid = FlexState.workerSid;

  console.log("Capacities", { maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats, workerSid })

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxInactiveCapacity, defaultCapacity, activeChats, inactiveChats, workerSid })
  };
  try {
    const response = await fetch(`${baseServerlessUrl}/updateCapacity`, requestOptions);
    const data = await response.json();
    console.log("Capacities", { newCapacity: data.capacity })
    return data.capacity;
  } catch (e) {
    console.log(e);
    return e;
  }
}

const resetCapacity = async () => {
  const { defaultCapacity } = FlexState.capacityState;

  const workerSid = FlexState.workerSid;

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ defaultCapacity, workerSid })
  };
  try {
    const response = await fetch(`${baseServerlessUrl}/resetCapacity`, requestOptions);
    const data = await response.json();
    console.log(data)
    console.log("Capacities", { newCapacity: data.capacity })
    return data.capacity;
  } catch (e) {
    console.log(e);
    return e;
  }
}


// Most of those function are from plugin boilerplate
const fetchPostUrlEncoded = (body) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams(body)
});



const msToTime = (duration) => {
  let seconds = parseInt((duration / 1000) % 60);
  let minutes = parseInt((duration / (1000 * 60)) % 60);
  let hours = parseInt((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? `0${hours}` : hours;
  minutes = (minutes < 10) ? `0${minutes}` : minutes;
  seconds = (seconds < 10) ? `0${seconds}` : seconds;

  return `${hours === '00' ? '' : `${hours}:`}${minutes}:${seconds}`;
};

const isCustomerParticipant = (participantCallSid, taskSid) => {
  const conference = FlexState.conferences.get(taskSid);
  const conferenceSource = conference && conference.source;
  const conferenceParticipants = (conferenceSource && conferenceSource.participants) || [];

  const heldParticipant = conferenceParticipants.find(p => p.callSid === participantCallSid);
  const participantType = heldParticipant && heldParticipant.participantType;

  return participantType === ConferenceParticipantTypes.customer;
};

const isInboundAcdCall = (task, isParkedCall) => {
  const { attributes } = task;
  const { direction, directExtension } = attributes;

  return ((TaskHelper.isCallTask(task) || isParkedCall)
    && direction === TaskDirections.inbound
    && !directExtension);
};

const isOutboundCallTask = (task) => {
  const { attributes } = task;
  const { direction } = attributes;

  return direction && direction.toLowerCase().includes('outbound');
};

const isIncomingTransfer = (task) => {
  const { incomingTransferObject } = task;

  return incomingTransferObject !== undefined;
};

const hasCustomHoldTime = (task) => {
  const { attributes } = task;
  const { conversations } = attributes;

  return !!(conversations && conversations.hold_time);
};

const getDurationToNow = (startTime) => {
  if (!startTime) {
    return undefined;
  }
  const duration = Date.now() - Date.parse(startTime);
  return msToTime(duration);
};


export default {
  resetCapacity,
  evaluateCapacity,
  baseServerlessUrl,
  fetchPostUrlEncoded,
  getDurationToNow,
  hasCustomHoldTime,
  isCustomerParticipant,
  isInboundAcdCall,
  isIncomingTransfer,
  isOutboundCallTask,
  msToTime,
};
