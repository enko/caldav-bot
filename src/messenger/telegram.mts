import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

import { Telegraf } from 'telegraf';
import { Messenger } from '../types.mjs';
import { Service } from '@freshgum/typedi';
import { Config } from '../config';

function escapeTelegramCharacters() {
  return function (tree: Root) {
    visit(tree, function (node) {
      if (node.type === 'text') {
        node.value = node.value
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)')
          .replace(/-/g, '\\-');
      }
    });
  };
}

@Service([Config])
export class TelegramMessenger implements Messenger {
  public constructor(private config: Config) {}
  private async sanitizeMarkdown(text: string) {
    const safe = await unified()
      .use(remarkParse)
      .use(escapeTelegramCharacters)
      .use(remarkStringify)
      .process(text);

    return safe.toString().replace(/\\\\/g, '\\');
  }

  public async sendMessage(channel: string, message: string) {
    const bot = new Telegraf(this.config.telegram.botToken);

    return bot.telegram.sendMessage(
      channel,
      await this.sanitizeMarkdown(message),
      {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      },
    );
  }
}
