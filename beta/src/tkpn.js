// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @externs_url http://closure-compiler.googlecode.com/git/contrib/externs/chrome_extensions.js
// ==/ClosureCompiler==

var TestkickPanel = TestkickPanel||{
  bg: null,

  getBGPage: function() {
    var bg = chrome.extension.getBackgroundPage();
    if( bg && bg.TestkickBG ) {
      this.bg = bg.TestkickBG;
    } else {
      this.bg = {recording:false,config:{apiKey:false},records:[]}
      alert('no bg');
    }
  },
  panelInit: function() {
    var that=this;
    this.getBGPage();
    this.setState();

    //start panel and listeners
    $('#record').on('click', function() {that.record();} );
    $('#stop').on('click', function() {that.stop();} );
    $('#enter_key').on('click', function() {that.options();} );
    $('#get_key').on('click', function() {that.new_key();} );
    $('#save').on('click', function() {that.save(); return false;} );
    $('#clear').on('click', function() {that.clear();} );
    $('#open_server').on('click', function() {that.open_server();} );
    $('#help').on('click', function() {that.help();} );
    $('#options').on('click', function() {that.options();} );
  },

  setState: function() {
    // opened, what are we doing
    var new_user = false;
    var recording = false;
    var saveable = false;

    //these are order dep..

    if( this.bg.recording == true ) {
      $('.can-record').hide();
      $('.can-stop').show();
    } else {
      $('.can-record').show();
      $('.can-stop').hide();
    }

    if( this.bg.records.length > 0 ) {
      $('.can-save').show();
    } else {
      $('.can-save').hide();
    }
    if( 'undefined' == typeof this.bg.config || (this.bg.config && 'undefined' == typeof this.bg.config.apiKey ) ) {
      $('.can-record').hide();
    } else {
      $('.new_installation').hide();
    }

    $('#recordsCount').text(this.bg.records.length);
  },

  record: function() {
    this.bg.toggleRecord();
    this.setState();
  },

  stop: function() {
    this.bg.toggleRecord();
    this.setState();
  },

  open_tab: function( url ) {
    chrome.tabs.create({'url': url}, function(tab) { });
  },

  options: function() {
    // open options page
    this.open_tab( chrome.extension.getURL('tk_opt.html') );
  },

  new_key: function() {
    window.open( this.bg.getUrl('new_key'), '_blank' )
  },

  open_server: function() {
    window.open( this.bg.getUrl('main'), '_blank' );
  },

  help: function() {
    window.open( this.bg.getUrl('help'), '_blank' );
  },

  save: function() {
    var that=this;
    if( !this.bg.records || this.bg.records.length == 0 ) {
      alert('No Recorded Events To Save');
    }
    //get a name
    var rec_name = prompt("Please enter a name for this recording")
    if( rec_name != null ) {
    } else {
      rec_name = 'Recording ' + (new Date()).toString();
    }

    var aj = this.bg.saveTest( rec_name );

    aj.success( function(s) { 
      if( s !== false && 'undefined' != typeof s && s.id ) {
        that.lastsave = s;
        var c = confirm('Open Server Page for this test?')
        if( c == true ) {
          that.setState();
          window.open( s.url );
        }
      } else {
        alert('Unable to save to server. Please try again');
      }
    });
    aj.error( function(s) { 
      alert('Unable to save to server. Please try again.');
    });
    
    this.setState();

  },
  clear: function() {
    this.bg.eraseRecords();
    $('#recordsCount').text(this.bg.records.length);
    this.setState();
  }
};


$(document).ready( function() {
 TestkickPanel.panelInit();
});


