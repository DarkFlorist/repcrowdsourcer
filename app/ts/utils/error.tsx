import { OptionalSignal } from './OptionalSignal.js'

type UnexpectedErrorParams = {
	unexpectedError: OptionalSignal<string>
	close: () => void
}

export const UnexpectedError = ({ unexpectedError, close }: UnexpectedErrorParams) => {
	if (unexpectedError.deepValue === undefined) return <></>
	return (
		<div className = 'error-box'>
			<h3> ERROR! </h3>
			<div style = { 'overflow-y: auto; overflow-x: hidden; max-height: 300px; border-style: solid;' }>
				<p class = 'paragraph' style = { 'color: var(--error-box-text);' }> { unexpectedError.deepValue } </p>
			</div>
			<div style = 'overflow: hidden; display: flex; justify-content: space-around; width: 100%; height: 50px; padding-top: 10px;'>
				<button class = 'button is-success is-primary' onClick = { close }> { 'close' } </button>
			</div>
		</div>
	)
}
