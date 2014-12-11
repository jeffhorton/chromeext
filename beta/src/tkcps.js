var tkinject = {

    capturedPopups:{},
    init: function() {
        var that=this;
        that.capturedPopups.alert = window.alert;
        that.capturedPopups.confirm = window.confirm;
        that.capturedPopups.prompt = window.prompt;

        document.addEventListener('removeCapturedPopups', function (e) {
            window.alert = that.capturedPopups.alert;
            window.confirm = that.capturedPopups.confirm;
            window.prompt = that.capturedPopups.prompt;
            tkinject = undefined;
        });

        window.alert = function() {
            that.capturedPopupEvent( 'alert', true );
            return that.capturedPopups.alert.apply(this,arguments);
        }
        window.confirm = function() {
            var result = that.capturedPopups.confirm.apply(this,arguments);
            that.capturedPopupEvent( 'confirm', result );
            return result;
        }
        window.prompt = function() {
            var result = that.capturedPopups.prompt.apply(this,arguments);
            that.capturedPopupEvent( 'prompt', result );
            return result;
        }
    },
    capturedPopupEvent: function( type, result ) {
        var data = {
            type: type,
            result: result
        }
        var event = new CustomEvent('popupEvent', { 'detail': data });
        document.dispatchEvent(event);
    }
};
tkinject.init();