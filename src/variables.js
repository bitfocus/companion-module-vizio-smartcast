module.exports = {
	// ##########################
	// #### Define Variables ####
	// ##########################
	setVariables: function () {
		let self = this;
		let variables = [];

		variables.push({ name: 'information', 		label: 'Information' });
		variables.push({ name: 'power', 			label: 'Power State' });
		variables.push({ name: 'current_input', 	label: 'Current Input' });
		variables.push({ name: 'cast_name', 		label: 'Cast Name' });
		variables.push({ name: 'serial_number', 	label: 'Serial Number' });
		variables.push({ name: 'model_name', 		label: 'Model Name' });
		variables.push({ name: 'version', 			label: 'Version' });
		variables.push({ name: 'cast_version', 		label: 'Cast Version' });
		variables.push({ name: 'scpl_version', 		label: 'SCPL Version' });
		variables.push({ name: 'resolution', 		label: 'Resolution' });

		return variables
	},

	// #########################
	// #### Check Variables ####
	// #########################
	checkVariables: function () {
		let self = this;

		try {
			self.setVariable('information', 	self.STATUS.information);
			self.setVariable('power', 			(self.STATUS.power == 1 ? 'On' : 'Off'));
			self.setVariable('current_input', 	self.STATUS.current_input);
			self.setVariable('cast_name', 		self.STATUS.cast_name);
			self.setVariable('serial_number', 	self.STATUS.serial_number);
			self.setVariable('model_name', 		self.STATUS.model_name);
			self.setVariable('version', 		self.STATUS.version);
			self.setVariable('cast_version', 	self.STATUS.cast_version);
			self.setVariable('scpl_version', 	self.STATUS.scpl_version);
			self.setVariable('resolution', 		self.STATUS.resolution);
		}
		catch(error) {
			self.log('error', 'Error setting Variables: ' + String(error));
		}
	}
}