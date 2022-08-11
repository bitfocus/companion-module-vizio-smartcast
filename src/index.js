var instance_skel = require('../../../instance_skel');
var smartcast = require('vizio-smart-cast');

var actions = require('./actions.js');
var feedbacks = require('./feedbacks.js');
var variables = require('./variables.js');
var presets = require('./presets.js');

var debug;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	// export the actions
	self.init_actions();

	return self;
}

instance.prototype.POLLING_INTERVAL = null;

instance.prototype.tv = null;

instance.prototype.STATUS = {
	information: '',
	power: 0,
	current_input: '',
	cast_name: '',
	serial_number: '',
	model_name: '',
	version: '',
	cast_version: '',
	scpl_version: '',
	resolution: ''
};

instance.prototype.LAST_ERROR = '';

instance.prototype.init = function () {
	let self = this;

	debug = self.debug;

	if (self.config.verbose) {
		self.log('debug', 'Verbose mode enabled. Log entries will contain detailed information.');
	}

	self.status(self.STATUS_WARNING, 'Connecting');

	self.init_connection();

	self.init_actions();
	self.init_feedbacks();
	self.init_variables();
	self.init_presets();

	self.checkFeedbacks();
	self.checkVariables();
};

instance.prototype.updateConfig = function (config) {
	let self = this;
	self.config = config;

	if (self.config.verbose) {
		self.log('debug', 'Verbose mode enabled. Log entries will contain detailed information.');
	}

	self.status(self.STATUS_WARNING, 'Connecting');

	self.init_connection();

	self.init_actions();
	self.init_feedbacks();
	self.init_variables();
	self.init_presets();

	self.checkFeedbacks();
	self.checkVariables();
};

instance.prototype.init_connection = function() {
	let self = this;

	if(self.config.host) {
		if (self.config.firmware === "2") {
			self.tv = new smartcast(`${self.config.host}:9000`);
		} else {
			self.tv = new smartcast(self.config.host);
		}

		if (self.config.authToken) {
			self.tv.pairing.useAuthToken(self.config.authToken);
			self.get_information();
			self.init_polling();
		}
	}
};

instance.prototype.get_information = function() {
	let self = this;

	self.log('debug', 'Gathering information about device.');
	self.tv.settings.system.information.tv.get().then((data) => {
		self.status(self.STATUS_OK);
		self.STATUS.information = 'Connected to TV.';
		try {
			for (let i = 0; i < data.ITEMS.length; i++) {
				let item = data.ITEMS[i];
				switch(item.CNAME) {
					case 'cast_name':
						self.STATUS.cast_name = item.VALUE;
						break;
					case 'serial_number':
						self.STATUS.serial_number = item.VALUE;
						break;
					case 'model_name':
						self.STATUS.model_name = item.VALUE;
						break;
					case 'version':
						self.STATUS.version = item.VALUE;
						break;
					case 'cast_version':
						self.STATUS.cast_version = item.VALUE;
						break;
					case 'scpl_version':
						self.STATUS.scpl_version = item.VALUE;
						break;
					case 'resolution':
						self.STATUS.resolution = item.VALUE;
						break;
					default:
						break;
				}
			}

			self.checkVariables();
			self.checkFeedbacks();			
		}
		catch(error) {
			self.handleError(error);
		}
	})
	.catch((error) => {
		self.handleError(error);
	});

	self.INPUTS = [];
	self.log('debug', 'Enumerating inputs.');
	self.tv.input.list().then((result) => {
		for(input of result.ITEMS) {
			self.log('debug', `Found input "${input.NAME}" with name "${input.VALUE.NAME}"`);
			self.INPUTS.push({
				label: `${input.NAME} (${input.VALUE.NAME})`,
				id: input.NAME
			});
		}
		self.init_actions(); // export actions
	})
	.catch((error) => {
		self.handleError(error);
	});
}

instance.prototype.init_polling = function() {
	let self = this;

	if (self.config.polling) {
		if (self.config.verbose) {
			self.log('debug', 'Starting Polling: Every ' + self.config.pollingrate + ' ms');
		}
		self.POLLING_INTERVAL = setInterval(self.get_state.bind(this), parseInt(self.config.pollingrate));
	}
	else {
		self.stop_polling();
	}
};

instance.prototype.stop_polling = function() {
	let self = this;

	if (self.config.polling && self.POLLING_INTERVAL) {
		if (self.config.verbose) {
			self.log('debug', 'Stopping Polling.');
		}
	}	

	clearInterval(self.POLLING_INTERVAL);
	self.POLLING_INTERVAL = null;
};

instance.prototype.get_state = function() {
	let self = this;

	self.tv.power.currentMode().then((data) => {
		try {
			for (let i = 0; i < data.ITEMS.length; i++) {
				let item = data.ITEMS[i];
				switch(item.CNAME) {
					case 'power_mode':
						self.STATUS.power = item.VALUE;
						break;
				}
			}
			self.checkVariables();
			self.checkFeedbacks();
		}
		catch(error) {
			self.handleError(error);
		}
	})
	.catch((error) => {
		self.handleError(error);
	});

	self.tv.input.current().then(data => {
		try {
			for (let i = 0; i < data.ITEMS.length; i++) {
				let item = data.ITEMS[i];
				switch(item.CNAME) {
					case 'current_input':
						self.STATUS.current_input = item.VALUE;
						break;
				}
			}
		}
		catch(error) {
			self.handleError(error);
		}
	})
	.catch((error) => {
		self.handleError(error);
	});
}

instance.prototype.handleError = function(err) {
	let self = this;

	try {
		let error = err.toString();

		let printedError = false;
	
		if (err.cause) {
			Object.keys(err.cause).forEach(function(key) {
				if (key === 'code') {
					if (err.cause[key] !== self.LAST_ERROR) {
						self.LAST_ERROR = err.cause[key];
						switch(err.cause[key]) {
							case 'ECONNREFUSED':
								error = 'Connection refused. Is this the right IP address?';
								break;
							case 'ETIMEDOUT':
								error = 'Connection timed out. Is the device still online?';
								break;
							case 'ENETUNREACH':
								error = 'Network unreachable. Check your network settings.';
								break;
							default:
								break;
						}
						self.log('error', `Error: ${error}`);
					}
					printedError = true;
				}
			});
		}

		if (!printedError) {
			self.log('error', `Error: ${error}`);
		}
	}
	catch(error) {
		//error processing the error, just print it to the log
		self.log('error', `Error: ${error}`);
	}
	finally {
		self.status(self.STATUS_ERROR);
		self.STATUS.information = 'Error - See Log';
		self.checkVariables();
		self.stop_polling();
	}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	let self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will control Vizio TVs using SmartCast'
		},
		{
			type: 'text',
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
			type: 'text',
			id: 'dummy1',
			width: 12,
			label: ' ',
			value: ' ',
		},
		{
			type: 'text',
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
			type: 'text',
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
};

// When module gets deleted
instance.prototype.destroy = function () {
	let self = this;
	
	self.tv = null;

	self.stop_polling();

	debug('destroy', self.id);
};

// ##########################
// #### Instance Actions ####
// ##########################
instance.prototype.init_actions = function (system) {
	this.setActions(actions.setActions.bind(this)());
};

// ############################
// #### Instance Feedbacks ####
// ############################
instance.prototype.init_feedbacks = function (system) {
	this.setFeedbackDefinitions(feedbacks.setFeedbacks.bind(this)());
};

// ############################
// #### Instance Variables ####
// ############################
instance.prototype.init_variables = function () {
	this.setVariableDefinitions(variables.setVariables.bind(this)());
};

// Setup Initial Values
instance.prototype.checkVariables = function () {
	variables.checkVariables.bind(this)();
};

// ##########################
// #### Instance Presets ####
// ##########################
instance.prototype.init_presets = function () {
	this.setPresetDefinitions(presets.setPresets.bind(this)());
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
