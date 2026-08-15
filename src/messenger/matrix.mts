import { unified } from 'unified';
import { Messenger } from '../types.mjs';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import Olm from '@matrix-org/olm';
import {
  MatrixAuth,
  RustSdkCryptoStorageProvider,
  SimpleFsStorageProvider,
} from 'matrix-bot-sdk';
import { MatrixClient } from 'matrix-bot-sdk';

global.Olm = Olm;

export type MatrixMessengerOptions = {
  homeServerUrl: string;
  userId: string;
  userPassword: string;
  settingsFile: string;
  cryptoDirectory: string;
};

export class MatrixMessenger implements Messenger {
  public client: MatrixClient;

  public constructor(private readonly options: MatrixMessengerOptions) {}

  private async initCrypto() {
    const storageProvider = new SimpleFsStorageProvider(
      this.options.settingsFile,
    ); // or any other IStorageProvider
    const cryptoProvider = new RustSdkCryptoStorageProvider(
      this.options.cryptoDirectory,
    );

    const auth = new MatrixAuth(this.options.homeServerUrl);

    const client = await auth.passwordLogin(
      this.options.userId,
      this.options.userPassword,
      'caldav-bot',
    );

    this.client = new MatrixClient(
      this.options.homeServerUrl,
      client.accessToken,
      storageProvider,
      cryptoProvider,
    );

    await this.client.start({ initialSyncLimit: 1 });
  }

  public async sendMessage(channel: string, message: string): Promise<unknown> {
    await this.initCrypto();

    const safe = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(message);

    const result = await this.client.sendEvent(channel, 'm.room.message', {
      msgtype: 'm.text',
      body: message,
      format: 'org.matrix.custom.html',
      formatted_body: safe.toString(),
      'm.mentions': {},
    });

    return result;
  }
}
