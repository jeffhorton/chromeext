// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @externs_url http://closure-compiler.googlecode.com/git/contrib/externs/chrome_extensions.js
// ==/ClosureCompiler==

var TestkickOptions = TestkickOptions||{
	bg: null,
	config: {},

	getBGPage: function() {
		var bg = chrome.extension.getBackgroundPage();
		this.bg = bg.TestkickBG||this.bg;
	},
	panelInit: function() {
		var that = this;
		this.getBGPage();

		$('#apiKey').val( this.bg.config.apiKey );

		$('#save_options').click( function(e) {
			// collect all the opts fields and had off to bg
			$('.configval').each( function() {
				cv = $(this);
				configkey = this.id
				that.bg.config[configkey] = cv.val();
			});
			that.bg.saveCurrentConfig();
			alert('Updated');
		});

	}
};

$(document).ready( function() {
 TestkickOptions.panelInit();
});
