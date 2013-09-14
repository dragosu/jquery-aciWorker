
// just a sample script file you can run inside a web worker
// or on the window context (if web workers are not available)

function function1(a, b) {
    return 'function [#1] a: ' + a + ' b: ' + b;
}

function object1(init) {
    this.run = function(a) {
        return 'object [#1] run a: ' + a + ' this.other: ' + this.other();
    };
    this.other = function() {
        return 'object [#1] other';
    };
    this.prop = init ? init : 1;
}

object1.value = 'object [#1] value';

object1.methods = {
};

object1.methods.fn = function(a, b) {
    return 'object [#1] methods.fn a: ' + a + ' b: ' + b;
};

var object1_instance1 = new object1();

var object1_instance2 = new object1();

function process_long_stuff() {
    var y = 0;
    for (var i = 0; i < 10000000; i++) {
        var x = isPrime(i);
        if (x) {
            y++;
        }
    }
}

function isPrime(num) {
    for (var i = 2; i <= Math.sqrt(num); i += 1) {
        if (num % i == 0) {
            return false;
        }
    }
    return true;
}
