const DATA_DIRECTORY = new URL('data/', import.meta.url);

// Cache for readGlobals to avoid re-importing the same files
const globalsCache = new Map();

const readGlobals = async (environment, {ignoreNonExits} = {}) => {
	// Check cache first
	if (globalsCache.has(environment)) {
		return globalsCache.get(environment);
	}

	const file = new URL(`${environment}.mjs`, DATA_DIRECTORY);
	file.searchParams.set('ts', Date.now());

	let data;

	try {
		({default: data} = await import(file));
	} catch (error) {
		if (ignoreNonExits && error.code === 'ERR_MODULE_NOT_FOUND') {
			return {};
		}

		throw error;
	}

	// Cache the result
	globalsCache.set(environment, data);
	return data;
};

const sortObject = object => {
	// Pre-sort keys, then build object - faster than sorting entries
	const sortedKeys = Object.keys(object).sort((a, b) => a.localeCompare(b));
	const result = {};
	for (const key of sortedKeys) {
		result[key] = object[key];
	}

	return result;
};

function unique(array) {
	return [...new Set(array)];
}

function mergeGlobals(globalsA, globalsB) {
	// Use Map for O(1) lookups instead of O(n) array operations
	const keysA = new Set(Object.keys(globalsA));
	const keysB = new Set(Object.keys(globalsB));

	// Find duplicates more efficiently
	const duplicates = [];
	for (const key of keysB) {
		if (keysA.has(key)) {
			duplicates.push(key);
		}
	}

	if (duplicates.length > 0) {
		throw new Error(`Already exits:\n${duplicates.map(name => ` - ${name}`).join('\n')}`);
	}

	return sortObject({...globalsA, ...globalsB});
}

function getIntersectionGlobals(globalsA, globalsB) {
	// Use Set for O(1) lookups and avoid duplicate iterations
	const keysA = new Set(Object.keys(globalsA));
	const intersection = {};

	for (const [key, value] of Object.entries(globalsB)) {
		if (keysA.has(key)) {
			intersection[key] = value;
		}
	}

	return sortObject(intersection);
}

export {
	DATA_DIRECTORY,
	unique,
	sortObject,
	mergeGlobals,
	getIntersectionGlobals,
	readGlobals,
};
