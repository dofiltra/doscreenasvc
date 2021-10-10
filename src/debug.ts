import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { ScreenSvc, TelegramScreen } from '.'

type TAppSettings = {}

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start() {
    const { result: screen, error } = await new TelegramScreen({
      headless: false,
      maxOpenedBrowsers: 1,
      rootPath: App.rootPath
    }).get({ url: 'https://t.me/turkeymuslim/2907' })
  }
}

new App({}).start()
