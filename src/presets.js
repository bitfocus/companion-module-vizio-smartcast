const { combineRgb } = require('@companion-module/base')

module.exports = {
	initPresets: function () {
		let self = this;
		let presets = [];

		const foregroundColor = combineRgb(255, 255, 255) // White
		const foregroundColorBlack = combineRgb(0, 0, 0) // Black
		const backgroundColorRed = combineRgb(255, 0, 0) // Red
		const backgroundColorWhite = combineRgb(255, 255, 255) // White

		presets.push({
			type: 'button',
			category: 'Power',
			name: 'Power Toggle',
			style: {
					text: 'Power: $(smartcast:power)',
					pngalignment: 'center:center',
					size: '18',
					color: '16777215',
					bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'power',
							options: {
								power: 'power_toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'powerState',
					options: {
						state: 1
					},
					style: {
						color: foregroundColor,
						bgcolor: backgroundColorRed
					}
				}
			]
		});

		self.setPresetDefinitions(presets);
	}
}
