import { combineReducers } from 'redux';

import { reduce as CapacityReducers } from './capacityState';

// Register your redux store under a unique namespace
export const namespace = 'sample';

// Combine the reducers
export default combineReducers({
  capacityReducer: CapacityReducers
});
