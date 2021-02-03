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

  public start(host: string, port: number, cb: (string) => void): void {
    this.client = new Socket();
    this.callback = cb;

    console.log('Connecting...');
    this.client.connect(port, host, () => {
      console.log(`${Date()}: Connected`);
    });

    this.client.on('data', (data: Buffer) => {
      this.processResponse(data);
    });

    this.client.on('close', () => {
      console.log('Connection closed');
      this.client.destroy();
    });

    // process commands at interval of 100 msec.
    // TODO - process next after a previous cmd has finished, instead of on interval?
    this.timeout = setInterval(() => this.processNext(), 100);
  }

  public stop() {
    if(this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private processNext(): void {
    const nextCmd = this.commandQ.get();
    if(nextCmd) {
      this.client.write(nextCmd);
    }
  }

  public requestMode(): void {
    // this.client.write('!m\n');
    this.commandQ.put('!m\n');
  }

  public requestFrequency(): void {
    // this.client.write('!f\n');
    this.commandQ.put('!f\n');
  }

  public requestSignalStrength(): void {
    // this.client.write('!l STRENGTH\n');
    this.commandQ.put('!l STRENGTH\n');
  }

  public update() {
    this.requestSignalStrength();
    setTimeout(() => this.requestFrequency(),100);
    setTimeout(() => this.requestMode(),200);
  }

  private processResponse(response: Buffer): void {
    if(this.callback) {
      this.callback(RadioNetworkService.parseResponse(response.toString('utf8')));
    }
  }

  private static parseResponse(response: string): string {
    // get_freq:!Frequency: 7233000!RPRT 0
    if (response.startsWith('get_freq')) {
      const op = 'get_freq';
      const value = response.split(' ')[1].split('!')[0];
      let status = response.split(' ')[2];
      if(status.endsWith('\n')) {
        status = status.slice(0, status.length - 1);
      }
      return JSON.stringify({
        op, value, status: status === '0'
      });
    }

    // get_mode:!Mode: LSB!Passband: 3000!RPRT 0
    if (response.startsWith('get_mode')) {
      const op = 'get_mode';
      const value = response.split(' ')[1].split('!')[0];
      let status = response.split(' ')[3];
      if(status.endsWith('\n')) {
        status = status.slice(0, status.length - 1);
      }
      return JSON.stringify({
        op, value, status: status === '0'
      });
    }

    // get_level: STRENGTH!-44\nRPRT 0\n
    if(response.startsWith('get_level: STRENGTH!')) {
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
