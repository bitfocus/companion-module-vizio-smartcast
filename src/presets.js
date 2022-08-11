module.exports = {
	setPresets: function () {
		let self = this;
		let presets = [];

		const foregroundColor = self.rgb(255, 255, 255) // White
		const foregroundColorBlack = self.rgb(0, 0, 0) // Black
		const backgroundColorRed = self.rgb(255, 0, 0) // Red
		const backgroundColorWhite = self.rgb(255, 255, 255) // White

		presets.push({
			category: 'Power',
			label: 'Power Toggle',
			bank: {
					style: 'text',
					text: 'Power: $(smartcast:power)',
					pngalignment: 'center:center',
					size: '18',
					color: '16777215',
					bgcolor: self.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'power',
					options: {
						power: 'power_toggle'
					}
				}
			],
			feedbacks: [
				{
					type: 'powerState',
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

		return presets;
	}
}
