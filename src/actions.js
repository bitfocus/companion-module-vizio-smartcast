module.exports = {
	initActions: function () {
		let self = this;
		let actions = {};

		actions.pair = {
			name: 'Pair Device',
			options: [],
			callback: async function(action) {
				if (!self.tv) {
					self.log('error', 'Enter the IP address of the TV in the module settings and save before pairing.');
					return;
				}
				self.log('debug', `Attempting to initiate pairing`);
				self.tv.pairing.initiate()
				.then(() => {
					self.log('info', 'Pairing started. Enter the PIN shown on the TV using the "Enter PIN Code" action.');
				})
				.catch(response => {
					self.log('error', `Pairing failed: ${self.describeError(response)}`);
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
				if (!self.tv) {
					self.log('error', 'Enter the IP address of the TV in the module settings and save before pairing.');
					return;
				}
				self.log('debug', `Attempting to pair with PIN [${action.options.pin}]`);

				self.tv.pairing.pair(action.options.pin).then(response => {
					self.log('debug', `Pairing result: ${JSON.stringify(response)}`);
					self.log('info', 'Pairing successful. The Authorization Token has been saved.');

					// saveConfig makes the token permanent; without it the token is lost when Companion restarts
					self.config.authToken = response.ITEM.AUTH_TOKEN;
					self.saveConfig(self.config);
					self.configUpdated(self.config);
				}).catch(response => {
					const result = response && response.STATUS && response.STATUS.RESULT;
					if (result === 'PAIRING_DENIED') {
						self.log('error', `Pairing failed. Make sure the provided PIN Code is correct.`);
					}
					else {
						self.log('error', `Pairing failed. ${self.describeError(response && response.STATUS ? response.STATUS : response)}`);
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
				if (action.options.power === 'power_toggle') {
					await self.sendCommand('toggle power', (tv) => tv.control.power.toggle());
				}
				else {
					await self.setPower(action.options.power === 'power_on' ? 1 : 0);
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
					default: self.INPUTS.length ? self.INPUTS[0].id : '',
					choices: self.INPUTS
				}
			],
			callback: async function(action) {
				await self.sendCommand(`switch to input ${action.options.input}`, (tv) => tv.input.set(action.options.input));
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
				await self.sendCommand(`switch to input ${input}`, (tv) => tv.input.set(input));
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
				if (action.options.mute === 'mute_toggle') {
					await self.sendCommand('toggle mute', (tv) => tv.control.volume.toggleMute());
				}
				else {
					await self.setMute(action.options.mute === 'mute_on');
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
				await self.sendCommand('set volume', (tv) => tv.control.volume.set(Number(action.options.volume)));
			}
		}

		self.setActionDefinitions(actions);
	},

	// Discrete On/Off: check what the TV is doing first, and only send a command if it needs to change.
	// This makes "On" and "Off" safe to press repeatedly, and avoids relying on the TV honoring the on/off key codes.
	setPower: async function(wanted) {
		let self = this;
		const label = wanted === 1 ? 'On' : 'Off';

		if (!self.tv) {
			self.log('warn', `Cannot turn the TV ${label}: set the TV's IP address in the module settings first.`);
			return;
		}

		try {
			const data = await self.tv.power.currentMode();
			const mode = (data.ITEMS || []).find((i) => i.CNAME === 'power_mode');
			if (mode && Number(mode.VALUE) === wanted) {
				self.log('debug', `TV is already ${label}.`);
				return;
			}
		}
		catch (error) {
			// Can't read the state (TV may be asleep); still try the command
			self.log('debug', `Could not read power state before sending ${label}: ${self.describeError(error)}`);
		}

		const sent = await self.sendCommand(`turn the TV ${label}`, (tv) => (wanted === 1 ? tv.control.power.on() : tv.control.power.off()));
		if (sent && wanted === 1) {
			self.log('debug', 'Power On sent. If the TV does not turn on, it may be in a deep standby that blocks network wake-up; enable "Quick Start" in the TV power settings.');
		}
	},

	setMute: async function(wanted) {
		let self = this;

		if (!self.tv) {
			self.log('warn', `Cannot change mute: set the TV's IP address in the module settings first.`);
			return;
		}

		try {
			const data = await self.tv.settings.audio.get();
			const mute = (data.ITEMS || []).find((i) => i.CNAME === 'mute');
			if (mute && (String(mute.VALUE).toLowerCase() === 'on') === wanted) {
				return;
			}
		}
		catch (error) {
			self.log('debug', `Could not read mute state before changing it: ${self.describeError(error)}`);
		}

		await self.sendCommand(wanted ? 'mute the TV' : 'unmute the TV', (tv) => (wanted ? tv.control.volume.mute() : tv.control.volume.unmute()));
	}
}