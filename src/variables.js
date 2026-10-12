module.exports = {
	initVariables: function () {
		let self = this;
		let variables = [];

		variables.push({ variableId: 'information', 	name: 'Information' });
		variables.push({ variableId: 'power', 			name: 'Power State' });
		variables.push({ variableId: 'current_input', 	name: 'Current Input' });
		variables.push({ variableId: 'cast_name', 		name: 'Cast Name' });
		variables.push({ variableId: 'serial_number', 	name: 'Serial Number' });
		variables.push({ variableId: 'model_name', 		name: 'Model Name' });
		variables.push({ variableId: 'version', 		name: 'Version' });
		variables.push({ variableId: 'cast_version', 	name: 'Cast Version' });
		variables.push({ variableId: 'scpl_version', 	name: 'SCPL Version' });
		variables.push({ variableId: 'resolution', 		name: 'Resolution' });
		variables.push({ variableId: 'connected', 		name: 'Connected (Yes/No)' });
		variables.push({ variableId: 'volume', 			name: 'Volume Level' });
		variables.push({ variableId: 'mute', 			name: 'Mute State (On/Off)' });

		self.setVariableDefinitions(variables);
	},

	// #########################
	// #### Check Variables ####
	// #########################
	checkVariables: function () {
		let self = this;

		try {
			let variableObj = {};

			variableObj.information = self.STATUS.information;
			// 'Offline' means the TV can't be reached at all (unplugged, wrong IP); 'Off' means it answered and is in standby
			variableObj.power = (!self.STATUS.online ? 'Offline' : (self.STATUS.power == 1 ? 'On' : 'Off'));
			variableObj.connected = (self.STATUS.online ? 'Yes' : 'No');
			variableObj.volume = self.STATUS.volume;
			variableObj.mute = (self.STATUS.muted ? 'On' : 'Off');
			variableObj.current_input = self.STATUS.current_input;
			variableObj.cast_name = self.STATUS.cast_name;
			variableObj.serial_number = self.STATUS.serial_number;
			variableObj.model_name = self.STATUS.model_name;
			variableObj.version = self.STATUS.version;
			variableObj.cast_version = self.STATUS.cast_version;
			variableObj.scpl_version = self.STATUS.scpl_version;
			variableObj.resolution = self.STATUS.resolution;

			self.setVariableValues(variableObj);
		}
		catch(error) {
			self.log('error', 'Error setting Variables: ' + String(error));
		}
	}
}