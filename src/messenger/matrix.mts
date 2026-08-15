import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import {
  MatrixAuth,
  MatrixClient,
  RustSdkCryptoStorageProvider,
  SimpleFsStorageProvider,
} from 'matrix-bot-sdk';
import type { RustSdkCryptoStoreType } from 'matrix-bot-sdk';
import type { Messenger } from '../types.mts';
import { createLogger } from '../logger.mts';

const logger = createLogger('matrix-messenger');
const ACCESS_TOKEN_KEY = 'caldav-bot/accessToken';

// The bindings declare StoreType as a `const enum`, which verbatimModuleSyntax
// forbids referencing. Sqlite is 0 and, since Sled was dropped in bindings
// 0.4.0, the only variant there is.
const SQLITE_STORE = 0 as RustSdkCryptoStoreType;

export type MatrixMessengerOptions = {
  homeServerUrl: string;
  userId: string;
  userPassword: string;
  settingsFile: string;
  cryptoDirectory: string;
};

export class MatrixMessenger implements Messenger {
  private readonly options: MatrixMessengerOptions;

  public constructor(options: MatrixMessengerOptions) {
    this.options = options;
  }

  private async connect(): Promise<MatrixClient> {
    const storage = new SimpleFsStorageProvider(this.options.settingsFile);
    const crypto = new RustSdkCryptoStorageProvider(
      this.options.cryptoDirectory,
      // Required since 0.8.0: the parameter lost its default and `Sled` was removed.
      SQLITE_STORE,
    );

    let accessToken = storage.readValue(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      // One-time login. Persisting the token keeps the device -- and therefore
      // the Megolm state in cryptoDirectory -- stable across runs.
      logger.info('No cached access token, performing password login');

      const session = await new MatrixAuth(
        this.options.homeServerUrl,
      ).passwordLogin(
        this.options.userId,
        this.options.userPassword,
        'caldav-bot',
      );

      accessToken = session.accessToken;
      storage.storeValue(ACCESS_TOKEN_KEY, accessToken);
    }

    return new MatrixClient(
      this.options.homeServerUrl,
      accessToken,
      storage,
      crypto,
    );
  }

  public async sendMessage(channel: string, message: string): Promise<unknown> {
    const client = await this.connect();

    // Everything sendEvent() needs from crypto, without start()'s sync loop --
    // which would hold a 40s /sync long-poll open and block process exit.
    await client.crypto.prepare([channel]);

    const html = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(message);

    logger.info({ channel }, 'Sending message to Matrix');

    return client.sendEvent(channel, 'm.room.message', {
      msgtype: 'm.text',
      body: message,
      format: 'org.matrix.custom.html',
      formatted_body: html.toString(),
      'm.mentions': {},
    });
  }
}
