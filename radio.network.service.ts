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

export class RadioNetworkService {

  client: Socket;

  callback: (string) => void;

  commandQ: FifoQueue<string> = new FifoQueue<string>();

  timeout: NodeJS.Timeout;

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

    /*
    this.client.on('timeout', () => {
      console.log('Timeout');
      this.client.destroy();
      this.connected = false;
    });

    this.client.on('error', (err: Error) => {
      console.log(`Error: ${err.message}`);
      this.client.destroy();
      this.connected = false;
    });
     */

    console.log('Connecting...');
    this.client.connect(port, host, () => {
      this.connected = true;
      console.log(`${Date()}: Connected`);

      // process commands at interval of 100 msec.
      // TODO - process next after a previous cmd has finished, instead of on interval?
      this.timeout = setInterval(() => this.processNext(), 100);
    });
  }

  public stop() {
    if(this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private processNext(): void {
    const nextCmd = this.commandQ.get();
    if(nextCmd) {
      try {
        this.client.write(nextCmd);
      } catch(e) {
        console.error(e);
      }
    }
  }

  public requestMode(): void {
    this.commandQ.put('!m\n');
  }

  public requestFrequency(): void {
    this.commandQ.put('!f\n');
  }

  public requestSignalStrength(): void {
    this.commandQ.put('!l STRENGTH\n');
  }

  public update() {
    if(this.connected) {
      this.requestSignalStrength();
      setTimeout(() => this.requestFrequency(), 100);
      setTimeout(() => this.requestMode(), 200);
    }
  }

  private processResponse(response: Buffer): void {
    if(response && this.callback) {
      this.callback(RadioNetworkService.parseResponse(response.toString('utf8')));
    }
  }

  private static parseResponse(response: string): string {
    // get_freq:!Frequency: 7233000!RPRT 0
    if (response && response.startsWith('get_freq')) {
      const op = 'get_freq';
      const value = response.split(' ')[1].split('!')[0];
      let status = response.split(' ')[2];
      if(status && status.endsWith('\n')) {
        status = status.slice(0, status.length - 1);
      }
      return JSON.stringify({
        op, value, status: status === '0'
      });
    }

    // get_mode:!Mode: LSB!Passband: 3000!RPRT 0
    if (response && response.startsWith('get_mode')) {
      const op = 'get_mode';
      const value = response.split(' ')[1].split('!')[0];
      let status = response.split(' ')[3];
      if(status && status.endsWith('\n')) {
        status = status.slice(0, status.length - 1);
      }
      return JSON.stringify({
        op, value, status: status === '0'
      });
    }

    // get_level: STRENGTH!-44\nRPRT 0\n
    if(response && response.startsWith('get_level: STRENGTH!')) {
      const op = "get_signal_strength";
      const value = response.split('\n')[0].split(' ')[1].split('!')[1];
      const status = response.split('\n')[1].split(' ')[1];

      return JSON.stringify({
        op, value, status: status === '0'
      });
    }

    // default
    return JSON.stringify({'op': 'unknown', "value": '', status: NaN});
  }
}
