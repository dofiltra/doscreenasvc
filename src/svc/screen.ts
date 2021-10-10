import { BrowserManager, devices, Page, chromium } from 'browser-manager'

type TScreenOpts = {
  url: string
}

export type TScreenSettings = {
  maxOpenedBrowsers?: number
  rootPath?: string
  headless?: boolean

  blackListUrls?: string[]

  selectorInnerHtml?: { [key: string]: string }
  selectorsRemove?: string[]
}

export class ScreenSvc {
  protected settings: TScreenSettings

  constructor(s: TScreenSettings) {
    this.settings = s
  }

  async get(opts: TScreenOpts) {
    try {
      const url = this.fixUrl(opts.url)
      if (!url?.length) {
        return { error: 'invalid url' }
      }
      const { pwrt, page } = { ...(await this.getPwrt(url)) }
      const { result } = await this.getScreen(url, page!)
      await pwrt?.close()

      return { result }
    } catch (error) {
      return { error }
    }
  }

  protected async removeEls(page: Page, selectorsRemove: string[]) {
    if (!page || !selectorsRemove?.length) {
      return
    }

    await Promise.all(
      selectorsRemove.map(async (selector) => {
        const rmEl = await page?.$(selector)
        await rmEl?.evaluate((e) => e.remove())
      })
    )
  }

  protected async getPwrt(url: string) {
    const {
      rootPath,
      maxOpenedBrowsers = 1,
      headless = true,
      selectorInnerHtml = {},
      selectorsRemove = [],
      blackListUrls
    } = this.settings
    try {
      const pwrt: BrowserManager | null = await BrowserManager.build({
        browserType: chromium,
        launchOpts: {
          headless
        },
        device: devices['Pixel 5'],
        idleCloseSeconds: 60,
        maxOpenedBrowsers,
        appPath: rootPath
      })
      const page = await pwrt?.newPage({
        url,
        waitUntil: 'networkidle',
        blackList: {
          urls: blackListUrls
        }
      })

      await Promise.all(
        Object.keys(selectorInnerHtml).map(async (selector) => {
          const el = await page?.$(selector)
          if (!el) {
            return
          }
          await el.evaluate((e, { innerHTML }) => (e.innerHTML = innerHTML), {
            innerHTML: selectorInnerHtml[selector]
          })
        })
      )

      await this.removeEls(page!, selectorsRemove)

      return { pwrt, page, error: null }
    } catch (error: any) {
      return { error }
    }
  }

  private async getScreen(url: string, page: Page) {
    if (!page) {
      return { error: 'nopage' }
    }

    try {
      const el = await this.getEl(url, page)
      if (el) {
        return { result: await el?.screenshot({ type: 'png', omitBackground: true }) }
      }

      return { result: await page.screenshot({ type: 'png', omitBackground: true, fullPage: true }) }
    } catch (error) {
      return { error }
    }
  }

  private async getEl(url: string, page: Page) {
    if (url.includes('t.me')) {
      return await page?.$('.tgme_widget_message_bubble')
    }

    return null
  }

  private fixUrl(url: string) {
    try {
      const u = new URL(url)

      if (url.includes('t.me')) {
        u.searchParams.append('embed', '1')
      }

      return u.href
    } catch {
      return null
    }
  }
}
