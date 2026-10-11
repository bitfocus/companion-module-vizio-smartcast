const { InstanceStatus } = require('@companion-module/base')

const smartcast = require('vizio-smart-cast');

const REQUEST_TIMEOUT = 5000;
const MIN_POLL_RATE = 500;
const DEFAULT_POLL_RATE = 2000;

// The smartcast library has no request timeout, so a TV that is unplugged would leave requests hanging forever.
function withTimeout(promise, ms = REQUEST_TIMEOUT) {
	let timer;
	const timeout = new Promise((resolve, reject) => {
		timer = setTimeout(() => reject(new Error(`No response from the TV after ${ms / 1000} seconds`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function itemsToMap(data) {
	const map = {};
	if (data && Array.isArray(data.ITEMS)) {
		for (const item of data.ITEMS) {
			map[item.CNAME] = item.VALUE;
		}
	}
	return map;
}

module.exports = {
	initConnection: function() {
		let self = this;

		// Always stop any previous polling first, otherwise every config save leaves another timer running
		self.stopPolling();
		self.STATUS.online = false;
		self.INFO_LOADED = false;
		self.INPUTS_LOADED = false;

		if (!self.config.host) {
			self.updateStatus(InstanceStatus.BadConfig, 'Enter the IP address of the TV.');
			return;
		}

		if (self.config.firmware === "2") {
			self.tv = new smartcast(`${self.config.host}:9000`);
		} else {
			self.tv = new smartcast(self.config.host);
		}

		if (self.config.authToken) {
			self.tv.pairing.useAuthToken(self.config.authToken);
			self.updateStatus(InstanceStatus.Connecting);
			self.getInformation();
			self.initPolling();
		}
		else {
			self.updateStatus(InstanceStatus.UnknownWarning, 'Waiting for Auth Token.');
		}
	},

	getInformation: function() {
		let self = this;
		const tv = self.tv;

		if (!tv) {
			return Promise.resolve();
		}

		self.log('debug', 'Gathering information about device.');
		const info = withTimeout(tv.settings.system.information.tv.get()).then((data) => {
			if (tv !== self.tv) return;
			const values = itemsToMap(data);
			for (const key of ['cast_name', 'serial_number', 'model_name', 'version', 'cast_version', 'scpl_version', 'resolution']) {
				if (values[key] !== undefined) {
					self.STATUS[key] = values[key];
				}
			}
			self.STATUS.information = 'Connected to TV.';
			self.STATUS.online = true;
			self.INFO_LOADED = true;
			self.updateStatus(InstanceStatus.Ok);
			self.checkVariables();
			self.checkFeedbacks();
		});

		self.log('debug', 'Enumerating inputs.');
		const inputs = withTimeout(tv.input.list()).then((result) => {
			if (tv !== self.tv) return;
			const list = [];
			for (const input of (result.ITEMS || [])) {
				self.log('debug', `Found input "${input.NAME}" with name "${input.VALUE.NAME}"`);
				list.push({
					label: `${input.NAME} (${input.VALUE.NAME})`,
					id: input.NAME
				});
			}
			self.INPUTS = list;
			self.INPUTS_LOADED = list.length > 0;
			// Re-export actions and feedbacks after discovering the input list for this device
			self.initActions();
			self.initFeedbacks();
		});

		return Promise.all([info, inputs]).catch((error) => {
			self.handleError(error);
		});
	},

	initPolling: function() {
		let self = this;

		self.stopPolling();

		if (!self.config.polling) {
			return;
		}

		let rate = Number(self.config.pollingrate);
		if (!Number.isFinite(rate) || rate < MIN_POLL_RATE) {
			rate = DEFAULT_POLL_RATE;
		}

		if (self.config.verbose) {
			self.log('debug', `Starting Polling: Every ${rate} ms`);
		}

		// Each poll finishes (or times out) before the next one is scheduled, so requests can never pile up
		const generation = ++self.POLL_GENERATION;
		const loop = async () => {
			if (generation !== self.POLL_GENERATION) return;
			try {
				await self.getState();
			}
			catch (error) {
				self.handleError(error);
			}
			if (generation === self.POLL_GENERATION) {
				self.POLLING_INTERVAL = setTimeout(loop, rate);
			}
		};
		loop();
	},

	stopPolling: function() {
		let self = this;

		self.POLL_GENERATION++;
		clearTimeout(self.POLLING_INTERVAL);
		self.POLLING_INTERVAL = null;
	},

	// Ask for one extra update shortly after sending a command so buttons react quickly
	pollSoon: function() {
		let self = this;

		if (!self.config.polling || !self.tv) return;
		setTimeout(() => {
			if (self.tv && !self.destroyed) {
				self.getState().catch((error) => self.handleError(error));
			}
		}, 1500);
	},

	getState: async function() {
		let self = this;
		const tv = self.tv;

		if (!tv || self.destroyed) return;

		// Power state does not need the auth token, and still answers when the TV is in standby
		const power = itemsToMap(await withTimeout(tv.power.currentMode()));
		if (tv !== self.tv) return;

		if (!self.STATUS.online) {
			self.STATUS.online = true;
			self.STATUS.information = 'Connected to TV.';
			self.LAST_ERROR = '';
			self.log('info', 'Connected to TV.');
			self.updateStatus(InstanceStatus.Ok);
			// Pick up anything we missed while the TV was unreachable (e.g. it was off when Companion started)
			if (!self.INFO_LOADED || !self.INPUTS_LOADED) {
				self.getInformation();
			}
		}

		if (power.power_mode !== undefined) {
			self.STATUS.power = Number(power.power_mode);
		}

		if (self.STATUS.power === 1) {
			// Input and audio are separate requests: one failing should not hide the other
			const [input, audio] = await Promise.allSettled([
				withTimeout(tv.input.current()),
				withTimeout(tv.settings.audio.get()),
			]);

			if (input.status === 'fulfilled') {
				const values = itemsToMap(input.value);
				if (values.current_input !== undefined) {
					self.STATUS.current_input = values.current_input;
				}
			}
			else {
				self.handleError(input.reason, true);
			}

			if (audio.status === 'fulfilled') {
				const values = itemsToMap(audio.value);
				if (values.mute !== undefined) {
					self.STATUS.muted = String(values.mute).toLowerCase() === 'on';
				}
				if (values.volume !== undefined) {
					self.STATUS.volume = values.volume;
				}
			}
			else {
				self.handleError(audio.reason, true);
			}
		}
		else if (self.STATUS.muted) {
			self.STATUS.muted = false;
		}

		self.checkVariables();
		self.checkFeedbacks();
	},

	// Run a command against the TV. Never throws, so a bad command can't crash the module.
	sendCommand: async function(description, fn) {
		let self = this;

		if (!self.tv) {
			self.log('warn', `Cannot ${description}: set the TV's IP address in the module settings first.`);
			return false;
		}

		try {
			await withTimeout(fn(self.tv));
			self.pollSoon();
			return true;
		}
		catch (error) {
			self.log('error', `Could not ${description}: ${self.describeError(error)}`);
			return false;
		}
	},

	describeError: function(err) {
		const code = (err && err.cause && err.cause.code) || (err && err.error && err.error.code);
		switch (code) {
			case 'ECONNREFUSED':
				return 'Connection refused. Is this the right IP address?';
			case 'ETIMEDOUT':
				return 'Connection timed out. Is the device still online?';
			case 'ENETUNREACH':
			case 'EHOSTUNREACH':
				return 'Network unreachable. Check your network settings.';
			default:
				break;
		}

		if (err && err.statusCode === 403) {
			return 'The TV rejected the Authorization Token. Pair the TV again.';
		}

		if (err && err.message) return err.message;
		if (typeof err === 'string') return err;
		try {
			return JSON.stringify(err);
		}
		catch (e) {
			return String(err);
		}
	},

	// quiet = this is one part of a poll; the connection itself is still considered up
	handleError: function(err, quiet) {
		let self = this;

		if (self.destroyed) return;

		const message = self.describeError(err);

		// Only log each distinct problem once, until the TV is reachable again
		if (message !== self.LAST_ERROR) {
			self.LAST_ERROR = message;
			self.log('error', message);
		}

		if (quiet) return;

		// Polling keeps running, so the module recovers by itself when the TV comes back
		self.STATUS.online = false;
		self.STATUS.information = 'Error - See Log';
		self.updateStatus(InstanceStatus.ConnectionFailure, message);
		self.checkVariables();
		self.checkFeedbacks();
	}
}
