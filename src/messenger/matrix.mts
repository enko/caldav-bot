import { unified } from 'unified';
import { Messenger } from '../types.mjs';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import Olm from '@matrix-org/olm';
import { Config } from '../config';
import { Service } from '@freshgum/typedi';
import {
  MatrixAuth,
  RustSdkCryptoStorageProvider,
  SimpleFsStorageProvider,
} from 'matrix-bot-sdk';
import { MatrixClient } from 'matrix-bot-sdk';

global.Olm = Olm;

@Service([Config])
export class MatrixMessenger implements Messenger {
  public client: MatrixClient;

  public constructor(private config: Config) {}

  private async initCrypto() {
    const storageProvider = new SimpleFsStorageProvider(
      this.config.matrix.settingsFile,
    ); // or any other IStorageProvider
    const cryptoProvider = new RustSdkCryptoStorageProvider(
      this.config.matrix.cryptoDirectory,
    );

    const auth = new MatrixAuth(this.config.matrix.homeServerUrl);

    const client = await auth.passwordLogin(
      this.config.matrix.userId,
      this.config.matrix.userPassword,
      'caldav-bot',
    );

    this.client = new MatrixClient(
      this.config.matrix.homeServerUrl,
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
