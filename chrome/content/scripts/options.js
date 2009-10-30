var SpamnessOptions = {};

SpamnessOptions.onLoad = function() {

};

SpamnessOptions.onUnload = function() {
    window.removeEventListener('load', SpamnessOptions.onLoad, false);
    window.removeEventListener('unload', SpamnessOptions.onUnload, false);
};

//window.addEventListener('load', SpamnessOptions.onLoad, false);
//window.addEventListener('unload', SpamnessOptions.onUnload, false);
