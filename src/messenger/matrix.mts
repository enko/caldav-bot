import { unified } from 'unified';
import { Messenger } from '../types.mjs';
import * as sdk from 'matrix-js-sdk';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { LocalStorage } from 'node-localstorage';
import Olm from '@matrix-org/olm';
import { Config } from '../config';
import { Service } from '@freshgum/typedi';

global.Olm = Olm;

@Service([Config])
export class MatrixMessenger implements Messenger {
  public client: sdk.MatrixClient;

  private store = new LocalStorage('./store');

  public constructor(private config: Config) {}

  private async setupSecretStorage() {
    const cryptoPassphrase = this.config.matrix.cryptoPassword;

    const recoveryKey =
      await this.client.createRecoveryKeyFromPassphrase(cryptoPassphrase);

    this.client.cryptoCallbacks.getCrossSigningKey = async () =>
      recoveryKey.privateKey;

    await this.client.bootstrapSecretStorage({
      createSecretStorageKey: async () => recoveryKey,
      setupNewKeyBackup: true,
      setupNewSecretStorage: true,
    });
  }

  private async initCrypto() {
    await global.Olm.init();

    const userId = this.config.matrix.userId;

    const userPassword = this.config.matrix.userPassword;

    this.client = sdk.createClient({
      baseUrl: this.config.matrix.homeServerUrl,
      userId,
      deviceId: this.store.getItem('deviceId'),
      accessToken: this.store.getItem('accessToken'),
      store: new sdk.MemoryStore({ localStorage: this.store }),
      cryptoStore: new sdk.LocalStorageCryptoStore(this.store),
    });

    try {
      await this.client.whoami();
    } catch (error) {
      const registration = await this.client.loginWithPassword(
        userId,
        userPassword,
      );

      this.client = sdk.createClient({
        baseUrl: this.config.matrix.homeServerUrl,
        userId,
        accessToken: registration.access_token,
        deviceId: registration.device_id,
        store: new sdk.MemoryStore({ localStorage: this.store }),
        cryptoStore: new sdk.LocalStorageCryptoStore(this.store),
      });

      this.store.setItem('deviceId', registration.device_id);
      this.store.setItem('accessToken', registration.access_token);
    }

    await this.client.initCrypto();

    try {
      await this.client.bootstrapCrossSigning({
        authUploadDeviceSigningKeys: async (makeRequest) => {
          try {
            await makeRequest({});

            throw new Error('Should never have arrived here with empty auth.');
          } catch (error) {
            const response_data = error.data;

            const auth_data = {
              session: response_data.session,
              type: 'm.login.password',
              user: userId,
              identifier: {
                type: 'm.id.user',
                user: userId,
              },
              password: userPassword,
            };

            try {
              await makeRequest(auth_data);

              await this.setupSecretStorage();
            } catch (error) {
              throw new Error(
                'Failed to upload device signing keys with error: ' + error,
              );
            }
          }
        },
        // Create new keys, even if ones already exist in secret storage.
        setupNewCrossSigning: true,
      });
    } catch (err) {
      // On error - log out so we don't leave stranded devices.
      await this.client.logout();
    }
  }

  public async sendMessage(channel: string, message: string): Promise<unknown> {
    await this.initCrypto();

    await this.client.startClient({ initialSyncLimit: 1 });

    const result = await new Promise((resolve) => {
      this.client.on(sdk.ClientEvent.Sync, async (state: string) => {
        if (state !== 'PREPARED') return;

        this.client.setGlobalErrorOnUnknownDevices(false);

        await this.client.joinRoom(channel);

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

        return resolve(result);
      });
    });

    this.client.stopClient();

    // @ts-ignore
    this.store._sync();

    return result;
  }
}
