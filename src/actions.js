module.exports = {
	// ##########################
	// #### Instance Actions ####
	// ##########################
	setActions: function () {
		let self = this;
		let actions = {};

		actions.pair = {
			label: 'Pair Device',
			callback: function(action, bank) {
				self.tv.pairing.initiate();
			}
		};

		actions.pin = {
			label: 'Enter PIN Code',
			options: [
				{
					type: 'textinput',
					label: 'Enter the PIN Code as displayed on the TV',
					id: 'pin',
					regex: self.REGEX_NUMBER
				}
			],
			callback: function(action, bank) {
				self.debug(`Attempting to pair with PIN [${action.options.pin}]`);

				self.tv.pairing.pair(action.options.pin).then(response => {
					self.debug(`Pairing result: ${JSON.stringify(response)}`);
					self.log('info', `Authorization token: ${response.ITEM.AUTH_TOKEN}`);

					self.config.authToken = response.ITEM.AUTH_TOKEN;
					self.saveConfig();
				}).catch(response => {
					self.debug(`Pairing failed. ${JSON.stringify(response.STATUS)}`);
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
			label: 'Power State',
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
			callback: function(action, bank) {
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
			label: 'Active Input',
			options: [
				{
					type: 'dropdown',
					label: 'Select the input to make active',
					id: 'input',
					choices: self.INPUTS
				}
			],
			callback: function(action, bank) {
				self.tv.input.set(action.options.input);
			}
		};

		actions.input_manual = {
			label: 'Active Input - Manual',
			options: [
				{
					type: 'textinput',
					label: 'Enter name of the input to make active',
					id: 'input-manual'
				}
			],
			callback: function(action, bank) {
				self.tv.input.set(action.options.input);
			}
		};

		actions.mute = {
			label: 'Set Mute State',
			options: [
				{
					type: 'dropdown',
					label: 'on/off',
					id: 'mute',
					default: 'mute_off',
					choices: [{ label: 'Mute On', id: 'mute_on' }, { label: 'Mute Off', id: 'mute_off' }]
				}
			],
			callback: function(action, bank) {
				if (action.options.mute === 'mute_off') {
					self.tv.control.volume.unmute();
				}
				else if (action.options.mute === 'mute_on') {
					self.tv.control.volume.mute();
				}
			}
		};

		actions.volume = {
			label: 'Set Volume Level',
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
			callback: function(action, bank) {
				self.tv.control.volume.set(action.options.volume);
			}
		}

		return actions
	}
}