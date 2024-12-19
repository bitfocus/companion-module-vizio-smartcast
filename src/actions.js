module.exports = {
	initActions: function () {
		let self = this;
		let actions = {};

		actions.pair = {
			name: 'Pair Device',
			options: [],
			callback: async function(action) {
				self.log('debug', `Attempting to initiate pairing`);
				self.tv.pairing.initiate()
				.catch(response => {
					self.log('debug', `Pairing failed: ${response}`);
				});
			}
		};

		actions.pin = {
			name: 'Enter PIN Code',
			options: [
				{
					type: 'textinput',
					label: 'Enter the PIN Code as displayed on the TV',
					id: 'pin',
					regex: self.REGEX_NUMBER
				}
			],
			callback: async function(action) {
				self.log('debug', `Attempting to pair with PIN [${action.options.pin}]`);

				self.tv.pairing.pair(action.options.pin).then(response => {
					self.log('debug', `Pairing result: ${JSON.stringify(response)}`);
					self.log('info', `Authorization token: ${response.ITEM.AUTH_TOKEN}`);

					self.config.authToken = response.ITEM.AUTH_TOKEN;
					self.configUpdated(self.config);
				}).catch(response => {
					self.log('debug', `Pairing failed. ${JSON.stringify(response.STATUS)}`);
					switch (response.STATUS.RESULT) {
						case 'PAIRING_DENIED':
							self.log('error', `Pairing failed. Make sure the provided PIN Code is correct.`);
							break;

						default:
							self.log('error', `Pairing failed. Result: ${JSON.stringify(response.STATUS)}`);
					}
				});
			}
		};

		actions.power = {
			name: 'Power State',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'power',
					default: 'power_on',
					choices: [
						{ label: 'On', id: 'power_on' },
						{ label: 'Off', id: 'power_off' },
						{ label: 'Toggle', id: 'power_toggle' }
					]
				}
			],
			callback: async function(action) {
				if (action.options.power === 'power_off') {
					self.tv.control.power.off();
				}
				else if (action.options.power === 'power_on') {
					self.tv.control.power.on();
				}
				else {
					self.tv.control.power.toggle();
				}
			}
		};

		actions.input = {
			name: 'Active Input',
			options: [
				{
					type: 'dropdown',
					label: 'Select the input to make active',
					id: 'input',
					choices: self.INPUTS
				}
			],
			callback: async function(action) {
				self.tv.input.set(action.options.input);
			}
		};

		actions.input_manual = {
			name: 'Active Input - Manual',
			options: [
				{
					type: 'textinput',
					label: 'Enter name of the input to make active',
					id: 'input-manual',
					useVariables: true,
				}
			],
			callback: async function(action) {
				let input = await self.parseVariablesInString(action.options['input-manual']);
				self.tv.input.set(input);
			}
		};

		actions.mute = {
			name: 'Set Mute State',
			options: [
				{
					type: 'dropdown',
					label: 'on/off',
					id: 'mute',
					default: 'mute_off',
					choices: [
						{label: 'Mute On', id: 'mute_on' },
						{label: 'Mute Off', id: 'mute_off'},
						{label: 'Mute Toggle', id: 'mute_toggle'},
					]
				}
			],
			callback: async function(action) {
				if (action.options.mute === 'mute_off') {
					self.tv.control.volume.unmute();
				}
				else if (action.options.mute === 'mute_on') {
					self.tv.control.volume.mute();
				}
				else {
					self.tv.control.volume.toggleMute()
				}
			}
		};

		actions.volume = {
			name: 'Set Volume Level',
			options: [
				{
					type: 'number',
					label: 'Volume level (0-100)',
					id: 'volume',
					min: 0,
					max: 100,
					default: 50,
					required: true
				}
			],
			callback: async function(action) {
				self.tv.control.volume.set(action.options.volume);
			}
		}

		self.setActionDefinitions(actions);
	}
}