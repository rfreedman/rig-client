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
var RadioNetworkService = /** @class */ (function () {
    function RadioNetworkService() {
        this.commandQ = new FifoQueue();
    }
    RadioNetworkService.prototype.start = function (host, port, cb) {
        var _this = this;
        this.client = new net_1.Socket();
        this.callback = cb;
        console.log('Connecting...');
        this.client.connect(port, host, function () {
            console.log(Date() + ": Connected");
        });
        this.client.on('data', function (data) {
            _this.processResponse(data);
        });
        this.client.on('close', function () {
            console.log('Connection closed');
            _this.client.destroy();
        });
        // process commands at interval of 100 msec.
        // TODO - process next after a previous cmd has finished, instead of on interval?
        this.timeout = setInterval(function () { return _this.processNext(); }, 100);
    };
    RadioNetworkService.prototype.stop = function () {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    };
    RadioNetworkService.prototype.processNext = function () {
        var nextCmd = this.commandQ.get();
        if (nextCmd) {
            this.client.write(nextCmd);
        }
    };
    RadioNetworkService.prototype.requestMode = function () {
        // this.client.write('!m\n');
        this.commandQ.put('!m\n');
    };
    RadioNetworkService.prototype.requestFrequency = function () {
        // this.client.write('!f\n');
        this.commandQ.put('!f\n');
    };
    RadioNetworkService.prototype.requestSignalStrength = function () {
        // this.client.write('!l STRENGTH\n');
        this.commandQ.put('!l STRENGTH\n');
    };
    RadioNetworkService.prototype.update = function () {
        var _this = this;
        this.requestSignalStrength();
        setTimeout(function () { return _this.requestFrequency(); }, 100);
        setTimeout(function () { return _this.requestMode(); }, 200);
    };
    RadioNetworkService.prototype.processResponse = function (response) {
        if (this.callback) {
            this.callback(RadioNetworkService.parseResponse(response.toString('utf8')));
        }
    };
    RadioNetworkService.parseResponse = function (response) {
        // get_freq:!Frequency: 7233000!RPRT 0
        if (response.startsWith('get_freq')) {
            var op = 'get_freq';
            var value = response.split(' ')[1].split('!')[0];
            var status_1 = response.split(' ')[2];
            if (status_1.endsWith('\n')) {
                status_1 = status_1.slice(0, status_1.length - 1);
            }
            return JSON.stringify({
                op: op, value: value,
                status: status_1 === '0'
            });
        }
        // get_mode:!Mode: LSB!Passband: 3000!RPRT 0
        if (response.startsWith('get_mode')) {
            var op = 'get_mode';
            var value = response.split(' ')[1].split('!')[0];
            var status_2 = response.split(' ')[3];
            if (status_2.endsWith('\n')) {
                status_2 = status_2.slice(0, status_2.length - 1);
            }
            return JSON.stringify({
                op: op, value: value,
                status: status_2 === '0'
            });
        }
        // get_level: STRENGTH!-44\nRPRT 0\n
        if (response.startsWith('get_level: STRENGTH!')) {
            var op = "get_signal_strength";
            var value = response.split('\n')[0].split(' ')[1].split('!')[1];
            var status_3 = response.split('\n')[1].split(' ')[1];
            return JSON.stringify({
                op: op, value: value,
                status: status_3 === '0'
            });
        }
        // default
        return JSON.stringify({ 'op': 'unknown', "value": '', status: NaN });
    };
    return RadioNetworkService;
}());
exports.RadioNetworkService = RadioNetworkService;
//# sourceMappingURL=radio.network.service.js.map