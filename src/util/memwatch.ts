import memwatch, { GcStats } from '@airbnb/node-memwatch';
import { Logger } from 'log4js';
import { getLoggerByFilename } from './logger';
import prettyBytes from 'pretty-bytes';

const log: Logger = getLoggerByFilename(__filename);

export const watchMemoryStats = (): void => {
	memwatch.on('stats', (stats: GcStats) => {
		const {
			total_heap_size,
			total_heap_size_executable,
			total_physical_size,
			total_available_size,
			used_heap_size,
			heap_size_limit,
			malloced_memory,
			peak_malloced_memory,
		} = stats;
		log.trace({
			total_heap_size: prettyBytes(total_heap_size),
			total_heap_size_executable: prettyBytes(total_heap_size_executable),
			total_physical_size: prettyBytes(total_physical_size),
			total_available_size: prettyBytes(total_available_size),
			used_heap_size: prettyBytes(used_heap_size),
			heap_size_limit: prettyBytes(heap_size_limit),
			malloced_memory: prettyBytes(malloced_memory),
			peak_malloced_memory: prettyBytes(peak_malloced_memory),
		});
	});
};
