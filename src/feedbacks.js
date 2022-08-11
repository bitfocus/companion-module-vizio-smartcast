module.exports = {
	// ##########################
	// #### Define Feedbacks ####
	// ##########################
	setFeedbacks: function () {
		let self = this;
		let feedbacks = {};

		const foregroundColor = self.rgb(255, 255, 255) // White
		const backgroundColorRed = self.rgb(255, 0, 0) // Red
		const backgroundColorGreen = self.rgb(0, 255, 0) // Green
		const backgroundColorOrange = self.rgb(255, 102, 0) // Orange

		feedbacks.powerState = {
			type: 'boolean',
			label: 'Show Power State On Button',
			description: 'Indicate if Device is in X Status',
			style: {
				color: foregroundColor,
				bgcolor: backgroundColorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Indicate in X Status',
					id: 'state',
					default: 0,
					choices: [
						{ id: 1, label: 'On'},
						{ id: 0, label: 'Off'},
					]
				}
			],
			callback: function (feedback, bank) {
				let opt = feedback.options;

				if (self.STATUS) {
					if (self.STATUS.power == opt.state) {
						return true;
					}
				}

				return false
			}
		}


		return feedbacks
	}
}
