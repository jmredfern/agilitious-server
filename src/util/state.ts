'use strict';

import { FSMStateValue } from '../types';

export const getPhase = (stateValue: FSMStateValue): string => {
	return stateValue instanceof Object ? stateValue.ACTIVE : stateValue;
};
