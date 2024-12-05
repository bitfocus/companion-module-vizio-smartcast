const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')

const UpgradeScripts = require('./src/upgrades')

const config = require('./src/config');
const api = require('./src/api');

const actions = require('./src/actions');
const variables = require('./src/variables');
const feedbacks = require('./src/feedbacks');
const presets = require('./src/presets');

class VizioInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...api,
			...actions,
			...variables,
			...feedbacks,
			...presets,			
		})
		
		this.POLLING_INTERVAL = null;

		this.tv = null;

		this.STATUS = {
			information: '',
			power: 0,
			current_input: '',
			cast_name: '',
			serial_number: '',
			model_name: '',
			version: '',
			cast_version: '',
			scpl_version: '',
			resolution: '',
			muted: false,
		};

		this.LAST_ERROR = '';
	}

	async init(config) {
		this.configUpdated(config);
	}

	async configUpdated(config) {
		this.config = config

		this.initActions();
		this.initFeedbacks();
		this.initVariables();
		this.initPresets();

		this.checkVariables();
		this.checkFeedbacks();

		if (this.config.verbose) {
			this.log('debug', 'Verbose mode enabled. Log entries will contain detailed information.');
		}

		this.updateStatus(InstanceStatus.Connecting);

		this.initConnection();
	}

	async destroy() {
		//close out any connections
		this.tv = null;
		this.stopPolling();

		this.debug('destroy', this.id);
	}
}

runEntrypoint(VizioInstance, UpgradeScripts);