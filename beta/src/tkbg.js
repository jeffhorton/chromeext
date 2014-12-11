// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @externs_url http://closure-compiler.googlecode.com/git/contrib/externs/chrome_extensions.js
// ==/ClosureCompiler==

var TestkickBG = TestkickBG|| {

    recording:false,
    records:[],
    recordingTab: null,
    server: { 
        base:'http://127.0.0.1:3000', 
        new_key:'/extension_new', main:'/extension_main', 
        help:'/extension_help', api:'/api/v1', tests:'/tests/'
    },
    config: {},

    start: function( ) {
        this.findInLocalStorage( 'tk_config', 'config'  );
    },
    setConfig: function( form  ) {
        var that=this;
        for( var k in form ){
            TestkickBG.config[k] = form[k];
        }
        that.saveCurrentConfig();
    },
    saveCurrentConfig: function() {
        TestkickBG.saveToLocalStorage( {'tk_config':TestkickBG.config}  );
    },
    saveToLocalStorage: function( data  ) {
        chrome.storage.local.set( data, function( ) {
            chrome.storage.local.get( null, function( items ) {
                //this.findInLocalStorage( 'tk_config', 'config'  );
            } );
        } );
    },
    findInLocalStorage: function( key, target  ) {
        var that=this;  
        chrome.storage.local.get( key, function( items  ) {
            if( 'undefined' != typeof items && 'undefined' != typeof items[key] ) {
                that[target] = items[key]||{}
            } else {
                that[target] = {};
            }
        } );
    },


    /* recording handlers */

    eraseRecords: function( ) {
        this.records = [];
    },

    toggleRecord: function( ) {

        var that=this;

        // if recording we stop..
        if( this.recording ) {
            this.recordingTab = null;
            this.updateContextMenu( false );
            chrome.browserAction.setBadgeText( {"text":""} );    
        } else {
            chrome.tabs.query( {active: true, currentWindow: true}, function( tabs ) {
                that.recordingTab = tabs[0].id;
                chrome.browserAction.setBadgeText( {"text":"rec"} );    
                that.updateContextMenu( true );
            });
        }

        this.recording = !this.recording;

        // Toggle the contentscript recording
        this.sendMessage( {action: 'toggleRecord'}  );
    },

    getUrl: function( key ) {
        return this.server.base + this.server[key];
    },

    updateContextMenu: function( enabled  ) {
        if(!chrome.contextMenus) { return; }
        chrome.contextMenus.update( 'TestkickContextMenu', 
        {
            //id: "TestkickContextMenu",
            //"title": "TestKick",
            //"contexts":["all","selection"],
            "enabled":enabled               
        });
    },

    messageHandler: function( msg, sender, sendResponse  ) {

        if( msg.query ) {
            return this.queryHandler( msg.query, sender, sendResponse );
        } 
        if( msg.action ) {
            return this.actionHandler( msg.action, sender, sendResponse );
        }
        if( msg.event ) {
            this.recordedEventHandler( msg.event, sender, sendResponse );
        }
    },

    queryHandler: function( query, sender, sendResponse  ) {

        // We only say if it our tab so we don't end up listening everywhere.
        var recording = this.recording;
        if( sender.tab.id != this.recordingTab  ) { recording = false; }

        switch( query  ) {
            case 'isrecording': 
            sendResponse ({'isrecording': recording });
        }
    },

    actionHandler: function( action  ) {
        switch( action  ) {
            case 'record': return this.recordAction( );
            case 'export': this.exportRecords( ); break;
        }
    },

    recordedEventHandler: function( event  ) {
        this.records.push( event );
    },

    loadScript: function( script, callback ) {
        var scriptEl = document.createElement( 'script' );
        script.id=script.split( '.' )[0];
        scriptEl.src = chrome.extension.getURL( script );
        scriptEl.addEventListener( 'load', callback, false );
        document.head.appendChild( scriptEl );
    },

    sendMessage: function( msg  ) {

        chrome.tabs.query( {active: true, currentWindow: true}, function( tabs ) {
            chrome.tabs.sendMessage( tabs[0].id, msg, function( response ) {
            } );
        } );
    },


    saveTest: function( name ) {
        // save a set of records to the server
        var recordInfo = {}
        recordInfo.name = name;
        recordInfo.key = this.config.apiKey;
        recordInfo.data = this.records;
        var url = this.server.base + this.server.api + this.server.tests;

        return $.ajax({
            url:url,
            type:"POST",
            data:JSON.stringify(recordInfo),
            contentType:"application/json; charset=utf-8",
            dataType:"json"
        });
    },

    getTestkickKey: function( ) {
        return this.config.apiKey||'';
    },

    contextClick: function( data, tab  ) {
        var that=this;

        if( data.menuItemId == 'Assert' && data.selectionText  ) {
            //got a selection, need to get more data
            chrome.tabs.query( {active: true, currentWindow: true}, function( tabs ) {
                chrome.tabs.sendMessage( tabs[0].id, {action:"getSelection"}, function( response ) {
                    if( 'undefined' != typeof response && response.dataFor == 'getSelection' ) {   
                        // we have an event object for this selection
                        
                        that.recordedEventHandler( response.obj );
                    } else { }
                });
            });
        }
    }
};

chrome.runtime.onMessage.addListener( function( msg, sender, sendResponse  ) {
    if( msg.dataFor ) { return; }    // data is for someone actively waiting

    var res = TestkickBG.messageHandler( msg, sender, sendResponse  );

    return true;
} );

var parent = chrome.contextMenus.create( {
    id: "TestkickContextMenu",
    "title": "TestKick",
    "contexts":["all","selection"],
    "enabled":false                  //update during recording
} );
var testChild = chrome.contextMenus.create( {
    id: "Assert",
    "title": "Assert for '%s'", 
    "parentId": 'TestkickContextMenu', 
    "contexts":["selection"]
} );

chrome.contextMenus.onClicked.addListener( function( data, tab ) {
    TestkickBG.contextClick( data, tab  );
} );

chrome.browserAction.onClicked.addListener(function(tab) {
    console.log('wake up');
});
TestkickBG.start( );
window['testkickBG'] = TestkickBG;