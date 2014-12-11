var TestkickCS = TestkickCS||{

    isRecording: false,
    mousemove:false,
    lastHover:[],
    capturedPopups: {},
    lastEvent:{},

    //https://developer.mozilla.org/en-US/docs/Web/Reference/Events
    listeners: [ 
    {n:'click', f: 'listenHandle', t:'document', e:'click' }, 
    {n:'keydown', f: 'listenHandle', t:'document', e:'keydown' }, 
    {n:'input_any', f:'listenHandle', t:'input', e:'change' },
    {n:'input_submit', f:'listenHandle', t:'input[submit=type]', e:'submit' },
    {n:'input_click', f:'listenHandle', t:'input', e:'click' },
    {n:'textarea', f:'listenHandle', t:'textarea', e:'change' },
    {n:'select', f:'listenHandle', t:'select', e:'change' },
    {n:'error', f:'listenHandle', t:'window', e:'error' },
    {n:'href', f:'listenHandle', t:'a', e:'click'},
    {n:'mousedown', f:'listenHandle', t:'document', e:'mousedown'},
    {n:'mouseup', f:'listenHandle', t:'document', e:'mouseup'},
    {n:'drag', f:'listenHandle', t:'document', e:'drag'},
    {n:'drop', f:'listenHandle', t:'document', e:'drop'}
    // {n:'input_radio', f:'listenHandle', t:'input[type=radio]', e:'change' },
    // {n:'input_text', f:'listenHandle', t:'input[type=text]', e:'change' },
    // {n:'input_password', f:'listenHandle', t:'input[type=password]', e:'change' },
    // {n:'hover', f:'hoverHandle', t:'document', e:'hover'},
    // {n:'mousemove', f:'listenHandle', t:'document', e:'mousemove', opt:false }
    ],
    
    // extra data to pull from specific events
    eventFields: {
        'MouseEvent': ['clientX','clientY','offsetX','offsetY'],
        'KeyboardEvent': ['keyCode','shiftKey','ctrlKey'],
        'ErrorEvent': ['filename','colno','lineno']
    },

    hoverHandle: function( event ) {
        lastHover.push( event.target );
    },
    messageHandler: function( msg, sendResponse ) {
        var that=this;

        switch( msg.action ) {
            case 'toggleRecord': 
            this.toggleRecord(); 
            break;
            case 'getSelection': 
            var data = that.getSelectedEvent();
            sendResponse( { dataFor:'getSelection', obj: data } ); 
            break;
            default:

        }
    },

    checkRecordingStatus: function() {
        var that = this;

        chrome.runtime.sendMessage( {query:'isrecording'}, function( response ) {
            if( response.isrecording === true && that.isRecording === false ) {
                that.toggleRecord();
            }
        } );
    },

    toggleRecord: function() {
        if( !this.isRecording ) {
            this.addListeners();
            this.addLocationEvent();
        } else {
            this.removeListeners();
        }
        this.isRecording = !this.isRecording;
    },

    capturedPopupEvent: function( detail ) {
        var type = detail.type;
        var result = detail.result;

        var data = {};
        data.path = 'builtinpopup';
        data.timeStamp = Date.now();
        data.type = type;
        data.value = result;

        TestkickCS.sendEvent( data );
    },


    addListeners: function() {
        //May want observer to addlisteners for injected content ( eg angular )
        //https://developer.mozilla.org/en/docs/Web/API/MutationObserver
        var that=this;
        for( var l in this.listeners ) {
            var n = this.listeners[l].n;
            var f = this.listeners[l].f;
            var t = this.listeners[l].t;
            var e = this.listeners[l].e;

            if( t=='document'){ 
                $( document ).on( e, this[f] );
            } else if ( t=='window') {
                $( window ).on( e, this[f] );
            }else {
                $( t ).on( e, null, this.listeners[l], this[f] );
            }
        }

        var s = document.createElement('script');
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL('tkcps.js');
        s.id = 'tkcps';
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);

    },

    removeListeners: function() {
        var that=this;
        for( var l in this.listeners ) {
            var n = this.listeners[l].n;
            var f = this.listeners[l].f;
            var t = this.listeners[l].t;
            var e = this.listeners[l].e;

            if( t=='document' ){  
                $( document ).off( e, this[f] );
            } else {
                $( t ).off( e, null, this.listeners[l], this[f] );
            }
        }

        var event = new CustomEvent('removeCapturedPopups');
        document.dispatchEvent(event);

    },

    listenHandle: function( event ) {
        //console.log(event)
        var e = TestkickCS.parseEvent( event );
        if( e !== false ) { TestkickCS.sendEvent( e ); }
    },

    parseEvent: function( event ) {
        // search for doc click and a click to catch all types,but get dupes sometimes.
        // elastic path search click created this
        if(event.target == TestkickCS.lastEvent.target &&
            event.originalEvent.type == TestkickCS.lastEvent.originalEvent.type ) 
        {
            TestkickCS.lastEvent = {}; //only track it once.
            return;
        } 
        TestkickCS.lastEvent = event;

        //take our event and get what we need
        var evo = event.originalEvent;

        var data = {};

        var evkey_tmp = { key: evo.toString().replace('[object ', '').replace(']','') };

        evkey = evkey_tmp.key;

        if( 'undefined' !== typeof TestkickCS.eventFields[evkey] ) {
            //we have rules for this event
            for( var i in TestkickCS.eventFields[evkey] ) {
                var field = TestkickCS.eventFields[evkey][i];
                if( 'undefined' !== typeof evo[field] ) {
                    data[field] = evo[field].toString();
                }
            }
        } else {
            // we don't have special rules yet
        }

        //Our base data
        data.path = TestkickCS.getPath( event.target );
        data.timeStamp = evo.timeStamp;
        data.type = evo.type;
        data.value = evo.target.value;

        return data;                
    },
    addLocationEvent: function() {
        var data = {};
        data.timeStamp = Date.now();
        data.value = window.location;
        data.type = 'open';
        data.path = window.location;

        TestkickCS.sendEvent( data );
    },


    sendEvent: function( d ) {
        TestkickCS.sendMessage( {event: d} );
    },

    //swiped from someone
    getPath: function( target ) {
        //find as many names as possible
        var pathObj = {};
        if( target.id ) { 
            pathObj.id = target.id; 
        }
        if( target.name ) { 
            pathObj.name = target.name; 
        } 
        if( target.href ) { 
            pathObj.href = target.href; 
        }
        if( target.localName) { 
            pathObj.localname = target.localName.toLowerCase();
        }
        if( target.type ) {
            pathObj.type = target.type;
        }
        if( target.className ) {
            pathObj.classname = target.className;
        }
        if ( target.textContent ) {
            pathObj.text = $(target).text();
            if( $(target).css('text-transform') == 'lowercase') { pathObj.text = pathObj.text.toLowerCase();}
            if( $(target).css('text-transform') == 'uppercase') { pathObj.text = pathObj.text.toUpperCase();}
        }

        var css = TestkickCS.cssPath( target );
        var hiddenlink = TestkickCS.findhiddenlink( target );

        if(css && css !== false) {
            pathObj.path = css;
        }
        if(hiddenlink !== false) {
            pathObj.hiddenlink = hiddenlink;
        }

        return pathObj;

    },

    cssPath: function(el) {
        // https://stackoverflow.com/questions/3620116/get-css-path-from-dom-element
        if (!(el instanceof Element)) { return; }

        var path = [];

        while (el.nodeType === Node.ELEMENT_NODE) {

            var selector = el.nodeName.toLowerCase();
            if ( selector == 'html') { break; }
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            }
            else {
                var sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector) {
                        nth++;
                    }
                }
                if (nth != 1) {
                    selector += ":nth-of-type("+nth+")";
                }
            }

            path.unshift(selector);
            el = el.parentNode;

        }

        if( path.length > 0 ) {
            return path.join(" > ");
        } else {
            return false;
        }
    },

    findhiddenlink: function( target ) {

        var hiddenlink = false;

        $( target ).parents().not( 'html' ).each( function() {
            var transition = $(this).css(['transition-timing-function']);
            if(transition['transition-timing-function'].indexOf('ease') != -1) { transition=true } else { transition=false;}
            var visibility = (($(this).attr('style') && $(this).attr('style').indexOf('visibility') != -1))

            if( !$(this).is(':hidden') || $(this).css('display') == 'block' || (transition) || (visibility) ) {
                $(this).prev().each( function() {
                    if( $(this) && $(this)[0] && ($(this).attr('href')) && !hiddenlink ){
                        hiddenlink = {};
                        hiddenlink.href = $(this).attr('href');
                        hiddenlink.text = $(this).text();
                        hiddenlink.html = $(this).html();
                        hiddenlink.id = $(this).attr('id');
                    } 
                    if( $(this).prev() ) { 
                        var b = $(this).prev();
                        if( $(b) && $(b)[0] && ($(b).attr('href')) && !hiddenlink ){
                            hiddenlink = {};
                            hiddenlink.href = $(b).attr('href');
                            hiddenlink.text = $(b).text();
                            hiddenlink.html = $(b).html();
                            hiddenlink.id = $(b).attr('id');
                        }
                    }
                } );
            }
        } );

return hiddenlink;
},

sendMessage: function( msg ) {
    chrome.runtime.sendMessage( msg, function( response ) {} );
},


getSelectedEvent:function() {
        // get the whole selection to get path.
        var that=this;

        try {
            var a = document.getSelection();
            var b = a.getRangeAt(0).commonAncestorContainer.parentNode;

            var data = {};
            data.timeStamp = Date.now();
            data.path = that.getPath(b);
            data.type = 'selection';
            data.value = a.toString();

            return data;
        } catch(e) {
        }
        return null;
    }
};

chrome.runtime.onMessage.addListener(  function( msg, sender, sendResponse ) {
    var resp = TestkickCS.messageHandler( msg, sendResponse );
    return true;
} );
document.addEventListener('popupEvent', function (e)
{
//  var data=e.detail;
TestkickCS.capturedPopupEvent( e.detail )
});
TestkickCS.checkRecordingStatus();  //onload if we are still running