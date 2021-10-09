import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

type TAppSettings = {}

class App {
  static version = 1
  static env = process.env
  static rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

  constructor({}: TAppSettings) {
    dotenv.config({ path: path.join(App.rootPath, `.env`) })
  }

  async start() {
    //
  }
}

new App({}).start()
