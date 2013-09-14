
/*
 * aciWorker jQuery Plugin v1.0.0
 * http://acoderinsights.ro
 *
 * Copyright (c) 2013 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.6.0 http://jquery.com
 * + aciPlugin >= v1.4.0 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * IMPORTANT: `aciWorker.js` script file need to be located on the same path
 * as this file so it can be used on web worker init !
 */

/*
 * Note: using the `interval` and `delay` options can ensure enough processor
 * time remains for other tasks and the UI (when web workers are not used)
 * but you are responsible for splitting the code into smaller tasks.
 */

(function($, window, undefined) {

    // default options

    var options = {
        worker: true,       // when TRUE web workers will be used (if available)
        interval: 100,      // interval [ms] after which to insert a `delay`
        delay: 10           // how many [ms] delay between requests (after `interval` expiration)
    };

    // get worker path
    var workerUrl = $('script:last').attr('src');
    workerUrl = workerUrl.slice(0, workerUrl.lastIndexOf('/') + 1);

    // get script path
    var loadUrl = window.location.pathname;
    loadUrl = loadUrl.slice(0, loadUrl.lastIndexOf('/') + 1);

    // aciWorker plugin

    var aciWorker = {
        // add extra data
        __extend: function() {
            $.extend(this._instance, {
                worker: null, // the web worker object
                store: new window.Object(), // keep the callbacks
                lastIndex: 0, // the last used index (for UID generation)
                used: 0, // usage count (when 0 will reset the `store`)
                queue: new this._queue(this),//.context(this),
                interval: 0 // timestamp to apply the `delay`
            });
        },
        // init the instance
        init: function() {
            // check if was init already
            if (this.wasInit()) {
                return;
            }
            if (window.Worker) {
                this._instance.worker = new window.Worker(workerUrl + 'aciWorker.js');
                // process worker result
                this._instance.worker.addEventListener('message', this.proxy(function(e) {
                    if (e.data.uid) {
                        this._call(e.data.uid, e.data);
                    }
                    if (e.data.exception) {
                        throw new Error(e.data.result);
                    }
                }), false);
            }
            // call the parent
            this._super();
        },
        // generate a new UID
        _uid: function() {
            this._instance.lastIndex++;
            return this._instance.index + ':' + this._instance.lastIndex;
        },
        // store a callback for later use
        _store: function(callback) {
            this._instance.used++;
            if (this._instance.used == 1) {
                this._instance.store = new window.Object();
                this._instance.lastIndex = 0;
            }
            var uid = this._uid();
            this._instance.store[uid] = callback;
            return uid;
        },
        // call a stored callback
        _call: function(uid, data) {
            if (this._instance.store[uid]) {
                this._instance.store[uid].call(window, data);
                this._instance.store[uid] = null;
                this._instance.used--;
            }
        },
        // run a callback
        _dispatch: function(data, result, callback) {
            if (callback) {
                if (data.task == 'isset') {
                    result = !(data.exception || (result === undefined) || (result == 'undefined'));
                }
                data.result = result;
                callback.call(this, data);
            }
        },
        // get script path
        _scripts: function(list) {
            if (list instanceof window.Array) {
                for (var i in list) {
                    if ((list[i].indexOf('/') != 0) && (list[i].search(/^https?:/i) == -1)) {
                        list[i] = loadUrl + list[i];
                    }
                }
            } else {
                if ((list.indexOf('/') != 0) && (list.search(/^https?:/i) == -1)) {
                    list = loadUrl + list;
                }
            }
            return list;
        },
        // queue implementation
        _queue: function(parent) {
            var fifo = [];
            var load = 0;
            var locked = false;
            // run the queue
            var run = function() {
                if ((load >= 1) || locked) {
                    return;
                }
                var item = fifo.shift();
                if (item) {
                    load++;
                    if (item.call) {
                        var now = new window.Date().getTime();
                        if (now - parent._instance.interval > parent._instance.options.interval) {
                            parent._instance.interval = now + parent._instance.options.delay;
                            clear();
                            item.callback(function() {
                                load--;
                                window.setTimeout(function() {
                                    start();
                                }, parent._instance.options.delay);
                            });
                            return;
                        }
                    }
                    item.callback(function() {
                        load--;
                    });
                }
            };
            var interval = new Array();
            var start = function() {
                for (var i = 0; i < 16; i++) {
                    interval[i] = window.setInterval(run, 1);
                }
            };
            var clear = function() {
                for (var i in interval) {
                    window.clearInterval(interval[i]);
                }
            };
            start();
            // push a 'callback' for later call
            this.push = function(callback, call) {
                if (!locked) {
                    fifo.push({
                        callback: callback,
                        call: call
                    });
                }
            };
            // destroy queue
            this.destroy = function() {
                locked = true;
                clear();
                fifo = [];
                load = 0;
                locked = false;
            };
        },
        // execute worker task
        execute: function(task, data, callback) {
            data.task = task;
            if (this._instance.worker && this._instance.options.worker) {
                // using web workers
                if (callback) {
                    data.uid = this._store(callback);
                }
                if (task == 'load') {
                    data.file = this._scripts(data.file);
                }
                this._instance.worker.postMessage(data);
            } else {
                // without web workers      
                this._instance.queue.push(this.proxy(function(complete) {
                    try {
                        switch (task) {
                            case 'load':
                                // import JS script(s)
                                if (data.file instanceof window.Array) {
                                    var list = this._scripts(data.file);
                                    var load = this.proxy(function() {
                                        var file = list.shift();
                                        if (file) {
                                            $.ajax({
                                                url: file,
                                                success: load,
                                                dataType: 'script'
                                            });
                                        } else {
                                            this._dispatch(data, null, callback);
                                            complete();
                                        }
                                    });
                                    load();
                                } else {
                                    $.ajax({
                                        url: this._scripts(data.file),
                                        success: this.proxy(function() {
                                            this._dispatch(data, null, callback);
                                            complete();
                                        }),
                                        dataType: 'script'
                                    });
                                }
                                break;
                            case 'isset':
                            case 'get':
                                this._dispatch(data, _aciWorkerTask.get(data.name), callback);
                                break;
                            case 'set':
                                this._dispatch(data, _aciWorkerTask.set(data.name, data.data), callback);
                                break;
                            case 'ifset':
                                this._dispatch(data, _aciWorkerTask.ifset(data.name, data.data), callback);
                                break;
                            case 'toString':
                                this._dispatch(data, _aciWorkerTask.toString(data.name), callback);
                                break;
                            case 'call':
                                this._dispatch(data, _aciWorkerTask.call(data.name, data.data), callback);
                                break;
                            case 'construct':
                                this._dispatch(data, _aciWorkerTask.construct(data.name, data.type, data.data), callback);
                                break;
                            case 'destruct':
                                this._dispatch(data, _aciWorkerTask.destruct(data.name), callback);
                                break;
                            case 'destroy':
                                // destroy the worker
                                this._dispatch(data, null, callback);
                                break;
                            default:
                                throw new Error('Unknown task requested [' + task + ']');
                        }
                        if (task != 'load') {
                            complete();
                        }
                    } catch (Exception) {
                        data.exception = true;
                        this._dispatch(data, Exception.toString(), callback);
                        complete();
                        if (task != 'isset') {
                            throw new Error(Exception.toString());
                        }
                    }

                }), task == 'call');
            }
            return this;
        },
        // import JS script(s)
        load: function(data, callback) {
            this.execute('load', data, callback);
            return this;
        },
        // test if variable or property was defined
        isset: function(data, callback) {
            this.execute('isset', data, callback);
            return this;
        },
        // get variable or property
        get: function(data, callback) {
            this.execute('get', data, callback);
            return this;
        },
        // set variable or property
        set: function(data, callback) {
            this.execute('set', data, callback);
            return this;
        },
        // set variable or property (if not set)
        ifset: function(data, callback) {
            this.execute('ifset', data, callback);
            return this;
        },
        // return resource as string
        toString: function(data, callback) {
            this.execute('toString', data, callback);
            return this;
        },
        // call a function or method
        call: function(data, callback) {
            this.execute('call', data, callback);
            return this;
        },
        // construct object
        construct: function(data, callback) {
            this.execute('construct', data, callback);
            return this;
        },
        // destruct/remove resource
        destruct: function(data, callback) {
            this.execute('destruct', data, callback);
            return this;
        },
        // destroy the instance
        destroy: function() {
            // check if was init
            if (!this.wasInit()) {
                return;
            }
            if (this._instance.worker) {
                this._instance.worker.postMessage({
                    task: 'destroy'
                });
            }
            this._instance.queue.destroy();
            // call the parent
            this._super();
        }
    };

    // extend the base aciPluginUi class and store into aciPluginClass.plugins
    aciPluginClass.plugins.aciWorker = aciPluginClass.aciPluginUi.extend(aciWorker, 'aciWorkerCore');

    // publish the plugin & the default options
    aciPluginClass.publish('aciWorker', options);

    // used for task processing
    var _aciWorkerTask = {
        _object: function(name) {
            var names = name.split('.');
            if (names.length > 1) {
                var object = this.context;
                for (var i in names) {
                    if (!object) {
                        throw new Error('Trying to access [.' + names[i] + '] but [' + names.slice(0, i).join('.') + '] is undefined');
                    }
                    object = object[names[i]];
                }
                return object;
            }
            return this.context[name];
        },
        _parent: function(name, entry) {
            var names = name.split('.');
            if (names.length > 1) {
                var parent = this.context, last;
                for (var i in names) {
                    if (!parent) {
                        throw new Error('Trying to access [.' + names[i] + '] but [' + names.slice(0, i).join('.') + '] is undefined');
                    }
                    last = parent;
                    parent = parent[names[i]];
                }
                entry.name = names[i];
                return last;
            }
            entry.name = name;
            return this.context;
        },
        // get a variable or property
        get: function(name) {
            return this._object(name);
        },
        // set a variable or property
        set: function(name, value) {
            var entry = {
                name: null
            };
            var parent = this._parent(name, entry);
            parent[entry.name] = value;
        },
        // set a variable or property (if not set)
        ifset: function(name, value) {
            var defined = this.get(name);
            if (defined === undefined) {
                this.set(name, value);
            }
        },
        // return requested resource as string
        toString: function(name) {
            return this._object(name).toString();
        },
        // call a function or method
        call: function(name, data) {
            var entry = {
                name: null
            };
            var parent = this._parent(name, entry);
            if (typeof parent[entry.name] != 'function') {
                throw new Error('Trying to call [.' + entry.name + '] but [' + name + '] is not a function');
            }
            if (data !== undefined) {
                if (data instanceof window.Array) {
                    return parent[entry.name].apply(parent, data);
                } else {
                    return parent[entry.name].call(parent, data);
                }
            } else {
                return parent[entry.name].call(parent);
            }
        },
        // construct object
        construct: function(name, type, data) {
            var entry = {
                name: null
            };
            var parent = this._parent(name, entry);
            parent[entry.name] = this._object(type);
            if (typeof parent[entry.name] != 'function') {
                throw new Error('Trying to construct [.' + entry.name + '] but [' + name + '] is not a function');
            }
            if (data === undefined) {
                parent[entry.name] = new parent[entry.name]();
            } else if (data instanceof window.Array) {
                switch (data.length) {
                    case 0:
                        parent[entry.name] = new parent[entry.name]();
                        break;
                    case 1:
                        parent[entry.name] = new parent[entry.name](data[0]);
                        break;
                    case 2:
                        parent[entry.name] = new parent[entry.name](data[0], data[1]);
                        break;
                    case 3:
                        parent[entry.name] = new parent[entry.name](data[0], data[1], data[2]);
                        break;
                    case 4:
                        parent[entry.name] = new parent[entry.name](data[0], data[1], data[2], data[3]);
                        break;
                }
            } else {
                parent[entry.name] = new parent[entry.name](data);
            }
        },
        // destruct object
        destruct: function(name) {
            var object = {
                name: null
            };
            var parent = this._parent(name, object);
            parent[object.name] = null;
        }
    };

    _aciWorkerTask.context = window;

})(jQuery, this);
