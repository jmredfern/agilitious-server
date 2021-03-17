'use strict';

import { getRandomIntInclusive } from './math';

const fibonacciNumbers = [1, 2, 3, 5, 8, 13, 21, 34];

export const getRandomPoints = (): number => {
	const randomIndex = getRandomIntInclusive(0, fibonacciNumbers.length - 1);
	return fibonacciNumbers[randomIndex];
};

export const validateFibonacciNumber = (number: number): boolean => {
	return fibonacciNumbers.find((fibonacciNumber) => number === fibonacciNumber) !== undefined;
};
