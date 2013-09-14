
/*
 * This script file is part of the aciWorker jQuery plugin,
 * a web worker implementation capable of running code provided in
 * external script files (also accessible when web workers are not available).
 * http://acoderinsights.ro
 *
 * Copyright (c) 2013 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * This script does not have any dependencies.
 */

// IMPORTANT: this script file need to be on the same path as `jquery.aciWorker`
// script file so it can be loaded when required (on web worker init).

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
            if (data instanceof Array) {
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
        } else if (data instanceof Array) {
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
    },
    // post worker message
    dispatch: function(data, result) {
        if (data.task == 'isset') {
            result = !(data.exception || (result === undefined) || (result == 'undefined'));
        }
        data.result = result;
        this.context.postMessage(data);
    }
};

_aciWorkerTask.context = this;

// process the worker messages
addEventListener('message', function(e) {
    try {
        switch (e.data.task) {
            case 'load':
                // import JS script(s)
                if (e.data.file instanceof Array) {
                    importScripts.apply(this, e.data.file);
                } else {
                    importScripts(e.data.file);
                }
                _aciWorkerTask.dispatch(e.data, null);
                break;
            case 'isset':
            case 'get':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.get(e.data.name));
                break;
            case 'set':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.set(e.data.name, e.data.data));
                break;
            case 'ifset':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.ifset(e.data.name, e.data.data));
                break;
            case 'toString':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.toString(e.data.name));
                break;
            case 'call':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.call(e.data.name, e.data.data));
                break;
            case 'construct':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.construct(e.data.name, e.data.type, e.data.data));
                break;
            case 'destruct':
                _aciWorkerTask.dispatch(e.data, _aciWorkerTask.destruct(e.data.name));
                break;
            case 'destroy':
                // destroy the worker
                _aciWorkerTask.dispatch(e.data, null);
                close();
                break;
            default:
                throw new Error('Unknown task requested [' + e.data.task + ']');
        }
    } catch (Exception) {
        e.data.exception = true;
        _aciWorkerTask.dispatch(e.data, Exception.toString());
    }
}, false);
