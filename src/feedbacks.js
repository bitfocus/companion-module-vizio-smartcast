const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function () {
		let self = this;
		let feedbacks = {};

		const foregroundColor = combineRgb(255, 255, 255) // White
		const backgroundColorRed = combineRgb(255, 0, 0) // Red
		const backgroundColorGreen = combineRgb(0, 255, 0) // Green
		const backgroundColorOrange = combineRgb(255, 102, 0) // Orange

		feedbacks.powerState = {
			type: 'boolean',
			name: 'Show Power State On Button',
			description: 'Indicate if Device is in X Status',
			defaultStyle: {
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

				// Don't claim the TV is On or Off while it can't be reached
				return self.STATUS.online && self.STATUS.power == opt.state
			}
		}

		feedbacks.inputState = {
			type: 'boolean',
			name: 'Show Selected Input on Button',
			description: 'Indicate if Input X is currently selected',
			defaultStyle: {
				color: foregroundColor,
				bgcolor: backgroundColorGreen,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Select Input',
					id: 'input',
					default: self.INPUTS.length ? self.INPUTS[0].id : '',
					choices: self.INPUTS,
				},
			],
			callback: function (feedback, ctx) {
				if (self.STATUS) {
					return self.STATUS.current_input === feedback.options.input
				}

				return false
			},
		}

		feedbacks.muteState = {
			type: 'boolean',
			name: 'Show Mute State on Button',
			description: 'Indicate if Device is muted',
			defaultStyle: {
				bgcolor: backgroundColorRed,
			},
			options: [
			],
			callback: function (feedback, ctx) {
				if (self.STATUS) {
					return self.STATUS.muted
				}
				return false
			}
		}


		feedbacks.connectionLost = {
			type: 'boolean',
			name: 'Show Connection Lost on Button',
			description: 'Indicate if the TV cannot be reached (unplugged, network down, wrong IP)',
			defaultStyle: {
				color: foregroundColor,
				bgcolor: backgroundColorOrange,
			},
			options: [
			],
			callback: function (feedback, ctx) {
				return !self.STATUS.online
			}
		}

		self.setFeedbackDefinitions(feedbacks);
	}
}
