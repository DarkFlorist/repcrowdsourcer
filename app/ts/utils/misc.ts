export function printError(error: unknown) {
	if (error instanceof Error) {
		try {
			if ('data' in error) return console.error(`Error: ${ error.message }\n${ JSON.stringify(error.data) }\n${ error.stack !== undefined ? error.stack : ''}`)
			return console.error(`Error: ${ error.message }\n${ error.stack || ''}`)
		} catch(stringifyError) {
			console.error(stringifyError)
		}
	}
	return console.error(error)
}
