import { unified } from 'unified';
import type { Messenger } from '../types.mjs';
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
  public constructor(private readonly options: MatrixMessengerOptions) {}

  private async initCrypto(): Promise<MatrixClient> {
    const storageProvider = new SimpleFsStorageProvider(
      this.options.settingsFile,
    ); // or any other IStorageProvider
    const cryptoProvider = new RustSdkCryptoStorageProvider(
      this.options.cryptoDirectory,
    );

    const auth = new MatrixAuth(this.options.homeServerUrl);

    const session = await auth.passwordLogin(
      this.options.userId,
      this.options.userPassword,
      'caldav-bot',
    );

    const client = new MatrixClient(
      this.options.homeServerUrl,
      session.accessToken,
      storageProvider,
      cryptoProvider,
    );

    await client.start({ initialSyncLimit: 1 });

    return client;
  }

  public async sendMessage(channel: string, message: string): Promise<unknown> {
    const client = await this.initCrypto();

    const safe = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(message);

    const result = await client.sendEvent(channel, 'm.room.message', {
      msgtype: 'm.text',
      body: message,
      format: 'org.matrix.custom.html',
      formatted_body: safe.toString(),
      'm.mentions': {},
    });

    return result;
  }
}
