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
};

instance.prototype.updateConfig = function (config) {
	var self = this;
	self.config = config;
};

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
};

instance.prototype.actions = function (system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {
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
		}
	});
};


instance.prototype.action = function (action) {
	var self = this;
	var id = action.action;
	var opt = action.options;

	var tv = new smartcast(self.config.host);

	if (self.config.authToken !== null) {
		tv.pairing.useAuthToken(self.config.authToken);
	}

	switch (id) {
		case 'pair':
			tv.pairing.initiate();
			break;

		case 'enter_pin':
			tv.pairing.pair(opt.pin).then(response => {
				self.config.authToken = response.ITEM.AUTH_TOKEN;

				// Ensure the configuration for the device is persisted.
				self.system.emit('instance_config_put', self.id, self.config, true);
			});

			tv.pairing.useAuthToken(self.config.authToken);
			break;

		case 'power':
			if (opt.lamp === 'power_off') {
				tv.control.power.off();
			} else if (opt.lamp === 'power_on') {
				tv.control.power.on();
			}

			break;
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
