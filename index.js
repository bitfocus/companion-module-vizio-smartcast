var instance_skel = require('../../instance_skel');
var smartcast = require('vizio-smart-cast');
var tv;
var xAuthTokenx;
var debug;
var log;

function instance(system, id, config) {
		var self = this;

		// super-constructor
		instance_skel.apply(this, arguments);
		self.actions(); // export actions
		return self;
}

instance.prototype.init = function () {
		var self = this;

		debug = self.debug;
		log = self.log;

		self.status(self.STATUS_UNKNOWN);
		if (self.config.host !== undefined) {
			self.smartcast.discover(device => {
				console.log(device);
			});
			self.tv = new self.smartcast(self.config.host);
		}
};

instance.prototype.updateConfig = function (config) {
		var self = this;
		self.config = config;

		if (self.tv !== undefined) {
			self.tv.destroy();
			delete self.tv;
		}

		if (self.config.host !== undefined) {
			self.tv = new self.smartcast(self.config.host);
		}
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
				value: 'This module is for vizio-smartcast'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				default: '192.168.0.100',
				regex: self.REGEX_IP
			}
		]
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;
	debug("destroy", self.id);
};

instance.prototype.actions = function (system) {
	var self = this;

	var actions = {
		'pair': {
			label: 'pair device'
		},
		'pin': {
			label: 'enter pin',
			options: [{
				type: 'textinput',
				label: 'enter pin as displayed on tv',
				id: 'pin',
				regex: self.REGEX_NUMBER
			}]
		},
		'power_on': {
			label: 'Power on'
		},
		'power_off': {
			label: 'Power off'
		}
	};
		self.setActions(actions);
};


instance.prototype.action = function (action) {
	var self = this;
	var id = action.action;
	var opt = action.options;
	var cmd;

	switch (id) {

		case 'pair':
			tv.pairing.initiate();
			break

		case 'enter_pin':
			self.tv.pairing.pair(opt.pin).then(response => {
				// log the token to be used for future, authenticated requests
				self.xAuthTokenx = response.ITEM.AUTH_TOKEN;
				console.log(response.ITEM.AUTH_TOKEN);
			});
			self.tv.pairing.useAuthToken(self.xAuthTokenx);
			break

		case 'power_on':
			self.tv.control.power.on();
			break

		case 'power_off':
			self.tv.control.power.off();
			break

	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
