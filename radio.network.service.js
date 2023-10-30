"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadioNetworkService = void 0;
var net_1 = require("net");
var FifoQueue = /** @class */ (function () {
    function FifoQueue() {
        this.q = [];
    }
    FifoQueue.prototype.put = function (item) {
        this.q.unshift(item);
    };
    FifoQueue.prototype.get = function () {
        return this.q.pop();
    };
    return FifoQueue;
}());
var minCmdIntervalMsec = 100;
var RadioNetworkService = /** @class */ (function () {
    function RadioNetworkService() {
        this.commandQ = new FifoQueue();
        this.connected = false;
    }
    RadioNetworkService.prototype.reconnect = function (host, port, cb) {
        var _this = this;
        console.log("reconnect - stopping the client socket");
        this.stop();
        setTimeout(function () {
            console.log("reconnect - connecting new socket");
            _this.start(host, port, cb);
        }, 10000);
    };
    RadioNetworkService.prototype.start = function (host, port, cb) {
        var _this = this;
        this.client = new net_1.Socket();
        this.callback = cb;
        this.client.on('data', function (data) {
            if (data) {
                _this.processResponse(data);
            }
        });
        this.client.on('close', function () {
            console.log('Connection closed');
            // this.client.destroy();
            // this.connected = false;
            _this.reconnect(host, port, cb);
        });
        this.client.on('timeout', function () {
            console.log('Timeout');
            //this.client.destroy();
            //this.connected = false;
            /*
            if(this.callback) {
              this.callback("CONNECT_ERROR");
            }
            */
            _this.reconnect(host, port, cb);
        });
        this.client.on('error', function (err) {
            console.log("Error: " + err.message);
            /*
            if(this.callback) {
              this.callback("CONNECT_ERROR");
            }
            */
            _this.reconnect(host, port, cb);
        });
        console.log('Connecting...');
        this.client.connect(port, host, function () {
            _this.connected = true;
            console.log(Date() + ": Connected");
            /*
            if(this.callback) {
              this.callback("CONNECTED");
            }
            */
            // kick off the command processor
            setTimeout(function () { return _this.processNext(); }, minCmdIntervalMsec);
        });
    };
    RadioNetworkService.prototype.stop = function () {
        this.connected = false;
        this.client.destroy();
    };
    RadioNetworkService.prototype.processNext = function () {
        var _this = this;
        var nextCmd = this.commandQ.get();
        if (nextCmd) {
            try {
                this.client.write(nextCmd);
            }
            catch (e) {
                console.error(e);
            }
        }
        else {
            this.queueCommands();
            setTimeout(function () { return _this.processNext(); }, minCmdIntervalMsec);
        }
    };
    RadioNetworkService.prototype.requestMode = function () {
        this.commandQ.put('|m\n');
    };
    RadioNetworkService.prototype.requestFrequency = function () {
        this.commandQ.put('|f\n');
    };
    RadioNetworkService.prototype.requestSignalStrength = function () {
        this.commandQ.put('|l STRENGTH\n');
    };
    RadioNetworkService.prototype.queueCommands = function () {
        if (this.connected) {
            this.requestSignalStrength();
            this.requestFrequency();
            this.requestMode();
        }
    };
    RadioNetworkService.prototype.processResponse = function (response) {
        var _this = this;
        if (response && this.callback) {
            this.callback(RadioNetworkService.parseResponse(response.toString('utf8')));
        }
        setTimeout(function () { return _this.processNext(); }, minCmdIntervalMsec);
    };
    RadioNetworkService.parseResponse = function (response) {
        var parts = response.split(/[|,\n]+/);
        var op = parts[0].split(':')[0];
        var value;
        var status;
        console.log(response);
        // find status
        for (var i = 1; i < parts.length; i++) {
            if (parts[i].startsWith('RPRT')) {
                status = parts[i].substr(5);
                break;
            }
        }
        if (status === "0") {
            var rawValue = parts[1].trim();
            if (rawValue.includes(': ')) {
                value = rawValue.split(': ')[1];
            }
            else {
                value = rawValue;
            }
        }
        else {
            value = null;
        }
        if (op === 'get_level') {
            op = 'get_signal_strength';
        }
        return JSON.stringify({ "op": op, "value": value, "status": status });
    };
    return RadioNetworkService;
}());
exports.RadioNetworkService = RadioNetworkService;
//# sourceMappingURL=radio.network.service.js.map