const { Regex } = require('@companion-module/base')

module.exports = {
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module will control Vizio TVs using SmartCast.'
			},
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: ' ',
				value: `
				<div class="alert alert-info">
					<div>
						<strong>PLEASE READ:</strong>
						<br />
						To configure this module, you need to:
						<ul>
							<li>Enter the Target IP of the Vizio Device</li>
							<li>Choose the Firmware Version your Device is using</li>
							<li>Decide whether or not to Enable Polling</li>
							<li>Click "Save" to save the module config.</li>
							<li>Create a new button with a "pair" action for this module instance. Press this button and a PIN code will be displayed on your device.</li>
							<li>(Try switching the module config to the other firmware setting if pin doesn't display.)</li>
							<li>Create a second button with a "enter pin" action, using the PIN code that was displayed.</li>
							<li>Once those are complete, the token field below will be filled out automatically and you should have control of your device.</li>
							<li>Remove the "pair" and "enter pin" actions as they are no longer needed.</li>
						</ul>
					</div>
				</div>
				`,
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: Regex.IP
			},
			{
				type: 'dropdown',
				label: 'Firmware',
				id: 'firmware',
				default: '1',
				choices: [
					{ id: '1', label: '>4.0' },
					{ id: '2', label: '<4.0' }
				]
			},
			{
				type: 'static-text',
				id: 'dummy1',
				width: 12,
				label: ' ',
				value: ' ',
			},
			{
				type: 'static-text',
				id: 'info2',
				label: 'Polling',
				width: 12,
				value: `
					<div class="alert alert-warning">
						<strong>Please read:</strong>
						<br>
						Enabling polling unlocks these features:
						<br><br>
						<ul>
							<li>Current Power State</li>
							<li>Current Input</li>
						</ul>
						Enabling polling will send a request to the Device at a continuous interval.
						<br>
						<strong>This could have an undesired performance effect on your Device, depending on the polling rate.</strong>
						<br>
					</div>
				`
			},
			{
				type: 'checkbox',
				id: 'polling',
				label: 'Enable Polling (necessary for feedbacks and variables)',
				default: false,
				width: 3
			},
			{
				type: 'textinput',
				id: 'pollingrate',
				label: 'Polling Rate (in ms)',
				default: 1000,
				width: 3,
				isVisible: (configValues) => configValues.polling === true,
			},
			{
				type: 'checkbox',
				id: 'verbose',
				label: 'Enable Verbose Logging',
				default: false
			},
			{
				type: 'static-text',
				id: 'dummy2',
				width: 12,
				label: ' ',
				value: ' ',
			},
			{
				type: 'textinput',
				id: 'authToken',
				label: 'Authorization Token',
				width: 8
			}
		];
	}
}