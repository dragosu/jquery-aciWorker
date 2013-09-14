
// just a sample script file you can run inside a web worker
// or on the window context (if web workers are not available)

function function2(a, b) {
    return 'function [#2] a: ' + a + ' b: ' + b;
}

function object2() {
    this.run = function(a) {
        return 'object [#2] run a: ' + a + ' this.other: ' + this.other();
    };
    this.other = function() {
        return 'object [#2] other';
    };
    this.prop = 2;
}

object2.value = 'object [#2] value';

object2.methods = {
};

object2.methods.fn = function(a, b) {
    return 'object [#2] methods.fn a: ' + a + ' b: ' + b;
};

var object2_instance1 = new object2();

var object2_instance2 = new object2();

object2_instance2.value = 'old value';
