
aciWorker - Abstract web workers with jQuery

Features:

- one or more JavaScript files can be loaded dynamically on demand;

- you can access variables, functions, objects and methods defined in the 
  dynamically loaded script files;

- the code included in the dynamically loaded script files can be executed
  even if there is no web workers support;

- the exceptions triggered inside web workers are caught and rethrown to be
  visible in the console of your browser.

Simple usage:

$(function(){

    $(document).aciWorker().aciWorker('api').load({
        file: 'scripts/myscript.js'
    }, function(){
        $(document).aciWorker('api').call({
            name: 'myfunction',
            data: ['param1', 'param2']
        });
    });

});

aciWorker jQuery Plugin v1.0.0
http://acoderinsights.ro

Copyright (c) 2013 Dragos Ursu
Dual licensed under the MIT or GPL Version 2 licenses.

Require jQuery Library >= v1.6.0 http://jquery.com
+ aciPlugin >= v1.4.0 https://github.com/dragosu/jquery-aciPlugin
