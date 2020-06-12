'use strict';

const { getRandomIntInclusive } = require('./math');

const fibonacciPoints = [1,2,3,5,8,13,21]

const util = {};

util.getRandomPoints = () => {
	const randomIndex = getRandomIntInclusive(0, fibonacciPoints.length - 1);
	return fibonacciPoints[randomIndex];
};

module.exports = util;
