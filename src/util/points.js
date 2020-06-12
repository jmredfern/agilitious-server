'use strict';

const { getRandomIntInclusive } = require('./math');

const fibonacciNumbers = [1,2,3,5,8,13,21,34]

const util = {};

util.getRandomPoints = () => {
	const randomIndex = getRandomIntInclusive(0, fibonacciNumbers.length - 1);
	return fibonacciNumbers[randomIndex];
};

util.validateFibonacciNumber = (number) => {
	return fibonacciNumbers.find(fibonacciNumber => number === fibonacciNumber) !== undefined;
}

module.exports = util;
