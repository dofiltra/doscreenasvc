import dotenv from 'dotenv'
import path from 'path'
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { TelegramScreen } from '.'

type TAppSettings = {}

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start() {
    const tgOpts = {
      headless: false,
      maxOpenedBrowsers: 1,
      rootPath: App.rootPath,
      blackListUrls: ['/telegram-widget.js'],
      browserType: chromium
    }
    const posts = await new TelegramScreen(tgOpts).getChannelPosts('https://t.me/turkeymuslim')
    const { result: screen, error } = await new TelegramScreen(tgOpts).get({ url: 'https://t.me/turkeymuslim/2907' })
  }
}

new App({}).start()
