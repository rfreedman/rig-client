import {Socket} from 'net';

class FifoQueue<T> {
  private q: T[] = [];

  public put(item: T) {
    this.q.unshift(item);
  }

  public get(): T {
    return this.q.pop();
  }
}

const minCmdIntervalMsec = 100;

export class RadioNetworkService {
  client: Socket;

  callback: (string) => void;

  commandQ: FifoQueue<string> = new FifoQueue<string>();

  connected = false;

  public start(host: string, port: number, cb: (string) => void): void {
    this.client = new Socket();
    this.callback = cb;

    this.client.on('data', (data: Buffer) => {
      if(data) {
        this.processResponse(data);
      }
    });

    this.client.on('close', () => {
      console.log('Connection closed');
      this.client.destroy();
      this.connected = false;
    });

    this.client.on('timeout', () => {
      console.log('Timeout');
      this.client.destroy();
      this.connected = false;
      if(this.callback) {
        this.callback("CONNECT_ERROR");
      }
    });

    this.client.on('error', (err: Error) => {
      console.log(`Error: ${err.message}`);
      this.client.destroy();
      this.connected = false;
      if(this.callback) {
        this.callback("CONNECT_ERROR");
      }
    });

    console.log('Connecting...');

    this.client.connect(port, host, () => {
      this.connected = true;
      console.log(`${Date()}: Connected`);

      if(this.callback) {
        this.callback("CONNECTED");
      }

      // kick off the command processor
      setTimeout(() => this.processNext(), minCmdIntervalMsec);
    });
  }

  public stop() {
    this.connected = false;
  }

  private processNext(): void {
    const nextCmd = this.commandQ.get();
    if(nextCmd) {
      try {
        this.client.write(nextCmd);
      } catch(e) {
        console.error(e);
      }
    } else {
      this.queueCommands();
      setTimeout(() => this.processNext(), minCmdIntervalMsec);
    }
  }

  public requestMode(): void {
    this.commandQ.put('|m\n');
  }

  public requestFrequency(): void {
    this.commandQ.put('|f\n');
  }

  public requestSignalStrength(): void {
    this.commandQ.put('|l STRENGTH\n');
  }

  private queueCommands(): void {
    if(this.connected) {
      this.requestSignalStrength();
      this.requestFrequency();
      this.requestMode();
    }
  }

  private processResponse(response: Buffer): void {
    if(response && this.callback) {
      this.callback(RadioNetworkService.parseResponse(response.toString('utf8')));
    }
    setTimeout(() => this.processNext(), minCmdIntervalMsec);
  }

  private static parseResponse(response: string): string {
    const parts: string[] = response.split(/[|,\n]+/);
    let op = parts[0].split(':')[0];
    let value;
    let status;

    // find status
    for(let i = 1; i < parts.length; i++) {
      if(parts[i].startsWith('RPRT')) {
        status = parts[i].substr(5);
        break;
      }
    }

    if(status === "0") {
      const rawValue = parts[1].trim();
      if(rawValue.includes(': ')) {
        value = rawValue.split(': ')[1];
      } else {
        value = rawValue;
      }
    } else {
      value = null;
    }

    if(op === 'get_level') {
      op ='get_signal_strength';
    }

    return JSON.stringify({"op": op, "value": value, "status": status});
  }
}
