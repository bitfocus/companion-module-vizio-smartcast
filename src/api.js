const { InstanceStatus } = require('@companion-module/base')

const smartcast = require('vizio-smart-cast');

module.exports = {
	initConnection: function() {
		let self = this;
	
		if(self.config.host) {
			if (self.config.firmware === "2") {
				self.tv = new smartcast(`${self.config.host}:9000`);
			} else {
				self.tv = new smartcast(self.config.host);
			}
	
			if (self.config.authToken) {
				self.updateStatus(InstanceStatus.Ok);
				self.tv.pairing.useAuthToken(self.config.authToken);
				self.getInformation();
				self.initPolling();
			}
			else {
				self.updateStatus(InstanceStatus.UnknownWarning, 'Waiting for Auth Token.');
			}
		}
	},

	getInformation: function() {
		let self = this;
	
		self.log('debug', 'Gathering information about device.');
		self.tv.settings.system.information.tv.get().then((data) => {
			self.updateStatus(InstanceStatus.Ok);
			self.STATUS.information = 'Connected to TV.';
			try {
				if (data.ITEMS) {
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
			// Re-export actions and feedbacks after discovering the input list for this device
			self.initActions()
			self.initFeedbacks()
		})
		.catch((error) => {
			self.handleError(error);
		});
	},

	initPolling: function() {
		let self = this;
	
		if (self.config.polling) {
			if (self.config.verbose) {
				self.log('debug', 'Starting Polling: Every ' + self.config.pollingrate + ' ms');
			}
			self.POLLING_INTERVAL = setInterval(self.getState.bind(this), parseInt(self.config.pollingrate));
		}
		else {
			self.stopPolling();
		}
	},
	
	stopPolling: function() {
		let self = this;
	
		if (self.config.polling && self.POLLING_INTERVAL) {
			if (self.config.verbose) {
				self.log('debug', 'Stopping Polling.');
			}
		}	
	
		clearInterval(self.POLLING_INTERVAL);
		self.POLLING_INTERVAL = null;
	},

	getState: function() {
		let self = this;
	
		self.tv.power.currentMode().then((data) => {
			try {
				if (data.ITEMS) {
					for (let i = 0; i < data.ITEMS.length; i++) {
						let item = data.ITEMS[i];
						switch(item.CNAME) {
							case 'power_mode':
								self.STATUS.power = item.VALUE;
								break;
						}
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
			self.setVariable('power', 'Err'); //show error on the button - if the tv gets unplugged or something, the variable won't automatically switch to "Off"
			self.handleError(error);
		});
	
		self.tv.input.current().then(data => {
			try {
				if (data.ITEMS) {
					for (let i = 0; i < data.ITEMS.length; i++) {
						let item = data.ITEMS[i];
						switch(item.CNAME) {
							case 'current_input':
								self.STATUS.current_input = item.VALUE;
								break;
						}
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

		if (self.STATUS.power === 1) {
			self.tv.control.volume.getMuteState().then((data) => {
				try {
					if (data.ITEMS) {
						for (let i = 0; i < data.ITEMS.length; i++) {
							switch (data.ITEMS[i].CNAME) {
								case 'mute':
									self.STATUS.muted = data.ITEMS[i].VALUE.toLowerCase() === "on"
									self.checkFeedbacks('muteState')
									break
							}
						}
					}
				}
				catch(error) {
					self.handleError(error);
				}
			})
		}
		else {
			if (self.STATUS.muted) {
				self.STATUS.muted = false
				self.checkFeedbacks('muteState')
			}
		}
	},
	
	handleError: function(err) {
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
			self.updateStatus(InstanceStatus.ConnectionFailure);
			self.STATUS.information = 'Error - See Log';
			self.checkVariables();
			self.stopPolling();
		}
	}
}