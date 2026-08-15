import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

import { Telegraf } from 'telegraf';
import type { Messenger } from '../types.mts';
import { createLogger } from '../logger.mts';

const logger = createLogger('telegram-messenger');

function escapeTelegramCharacters() {
  return function (tree: Root) {
    visit(tree, function (node) {
      if (node.type === 'text') {
        node.value = node.value
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)')
          .replace(/-/g, '\\-')
          .replace(/!/g, '\\!');
      }
    });
  };
}

export class TelegramMessenger implements Messenger {
  private readonly botToken: string;

  public constructor(botToken: string) {
    this.botToken = botToken;
  }

  private async sanitizeMarkdown(text: string) {
    const safe = await unified()
      .use(remarkParse)
      .use(escapeTelegramCharacters)
      .use(remarkStringify)
      .process(text);

    return safe.toString().replace(/\\\\/g, '\\');
  }

  public async sendMessage(channel: string, message: string) {
    const bot = new Telegraf(this.botToken);

    logger.info({ channel }, 'Sending message to Telegram');

    const result = await bot.telegram.sendMessage(
      channel,
      await this.sanitizeMarkdown(message),
      {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true },
      },
    );

    logger.info({ messageId: result.message_id }, 'Message sent');

    return result;
  }
}
