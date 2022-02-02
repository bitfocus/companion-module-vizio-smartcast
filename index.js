var instance_skel = require('../../instance_skel');
var smartcast = require('vizio-smart-cast');

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	// export the actions
	self.actions();

	return self;
}

instance.prototype.init = function () {
	var self = this;

	self.status(self.STATUS_UNKNOWN);

	if(self.config.host) {
		if (self.config.firmware === "2") {
			self.tv = new smartcast(`${self.config.host}:9000`);
		} else {
			self.tv = new smartcast(self.config.host);
		}
		

		if (self.config.authToken) {
			self.tv.pairing.useAuthToken(self.config.authToken);
			self.loadInputs();
		}
	}
};

instance.prototype.updateConfig = function (config) {
	var self = this;
	self.config = config;

	if(self.config.host) {
		if (self.config.firmware === "2") {
			self.tv = new smartcast(`${self.config.host}:9000`);
		} else {
			self.tv = new smartcast(self.config.host);
		}

		if (self.config.authToken) {
			self.tv.pairing.useAuthToken(self.config.authToken);
			self.loadInputs();
		}
	}
};

instance.prototype.loadInputs = function () {
	var self = this;
	self.INPUTS = [];

	self.log('debug', 'Enumerating inputs.');
	self.tv.input.list().then(
		function(result) {
			for(input of result.ITEMS) {
				self.log('debug', `Found input "${input.NAME}" with name "${input.VALUE.NAME}"`);
				self.INPUTS.push({
					label: `${input.NAME} (${input.VALUE.NAME})`,
					id: input.NAME
				});
			}
			self.actions(); // export actions
		},
		function(result) {
			self.log('error', `Could not retrieve input list from TV: ${result.name} - ${result.message}`);
		});
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will control VIZIO TVs using SmartCast'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP
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
			type: 'textinput',
			id: 'authToken',
			label: 'Authorization Token',
			width: 8
		}
	];
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	self.tv = null;
};

instance.prototype.actions = function (system) {
	var self = this;

	self.setActions({
		'pair': {
			label: 'Pair device'
		},
		'pin': {
			label: 'Enter pin',
			options: [{
				type: 'textinput',
				label: 'Enter the pin as displayed on the TV',
				id: 'pin',
				regex: self.REGEX_NUMBER
			}]
		},
		'power': {
			label: 'Power state',
			options: [{
				type: 'dropdown',
				label: 'on/off',
				id: 'power',
				default: 'power_on',
				choices: [{ label: 'power on', id: 'power_on' }, { label: 'power off', id: 'power_off' }]
			}]
		},
		'input': {
			label: 'Active Input',
			options: [{
				type: 'dropdown',
				label: 'Select the input to make active',
				id: 'input',
				choices: self.INPUTS
			}]
		},
		'input-manual': {
			label: 'Active Input - Manual',
			options: [{
				type: 'textinput',
				label: 'Enter name of the input to make active',
				id: 'input-manual'
			}]
		},
		'mute': {
			label: 'Set Mute State',
			options: [{
				type: 'dropdown',
				label: 'on/off',
				id: 'mute',
				default: 'mute_off',
				choices: [{ label: 'mute on', id: 'mute_on' }, { label: 'mute off', id: 'mute_off' }]
			}]
		},
		'volume': {
			label: 'Set Volume Level',
			options: [{
				type: 'number',
				label: 'Volume level (0-100)',
				id: 'volume',
				min: 0,
				max: 100,
				default: 50,
				required: true
			}]
		}
	});
};

instance.prototype.action = function (action) {
	var self = this;
	var id = action.action;
	var opt = action.options;

	switch (id) {
		case 'pair':
			self.tv.pairing.initiate();
			break;

		case 'pin':
			self.debug(`Attempting to pair with pin [${opt.pin}]`);

			self.tv.pairing.pair(opt.pin).then(response => {
				self.debug(`Pairing result: ${JSON.stringify(response)}`);
				self.log('info', `Authorization token: ${response.ITEM.AUTH_TOKEN}`);

				self.config.authToken = response.ITEM.AUTH_TOKEN;
				self.saveConfig();
			}).catch(response => {
				self.debug(`Pairing failed. ${JSON.stringify(response.STATUS)}`);
				switch (response.STATUS.RESULT) {
					case 'PAIRING_DENIED':
						self.log('error', `Pairing failed. Make sure the provided pin is correct.`);
						break;

					default:
						self.log('error', `Pairing failed. Result: ${JSON.stringify(response.STATUS)}`);
				}
			});
			break;

		case 'power':
			if (opt.power === 'power_off') {
				self.tv.control.power.off();
			} else if (opt.power === 'power_on') {
				self.tv.control.power.on();
			}
			break;

		case 'input':
		case 'input-manual':
			self.tv.input.set(opt.input);
			break;

		case 'mute':
			if (opt.mute === 'mute_off') {
				self.tv.control.volume.unmute();
			} else if (opt.mute === 'mute_on') {
				self.tv.control.volume.mute();
			}
			break;

		case 'volume':
			self.tv.control.volume.set(opt.volume);
			break;
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
