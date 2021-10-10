import { BrowserManager, devices, Page, chromium } from 'browser-manager'

type TScreenFromUrlOpts = {
  url: string
}

export type TScreenFromPageOpts = {
  url: string
  selectorInnerHtml: { [key: string]: string }
}

export type TScreenSettings = {
  maxOpenedBrowsers?: number
  rootPath?: string
  headless?: boolean
}

export class ScreenSvc {
  protected settings: TScreenSettings

  constructor(s: TScreenSettings) {
    this.settings = s
  }

  async fromPage(opts: TScreenFromPageOpts) {
    try {
      const { url: urlOrig, selectorInnerHtml } = opts
      const url = this.fixUrl(urlOrig)
      if (!url?.length) {
        return { error: 'invalid url' }
      }
      const { pwrt, page } = await this.getPwrt(url)

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

      const elMeta = await page?.$('.tgme_widget_message_meta')
      if (elMeta) {
        await elMeta.evaluate((e) => (e.innerHTML = e.innerHTML.replaceAll('edited', '').replaceAll(',', '')))
      }

      const notSupportedEl = await page?.$('.message_media_not_supported_wrap')
      if (notSupportedEl) {
        await notSupportedEl.evaluate((e) => e.remove())
      }

      const { result } = await this.getScreen(url, page!)
      await pwrt?.close()

      return { result }
    } catch (error) {
      return { error }
    }
  }

  async fromUrl(opts: TScreenFromUrlOpts) {
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

  private async getPwrt(url: string) {
    const { rootPath, maxOpenedBrowsers = 1 } = this.settings
    try {
      const pwrt: BrowserManager | null = await BrowserManager.build({
        browserType: chromium,
        launchOpts: {
          headless: !!this.settings.headless
        },
        device: devices['Pixel 5'],
        idleCloseSeconds: 60,
        maxOpenedBrowsers,
        appPath: rootPath
      })
      const page = await pwrt?.newPage({})
      await this.applyBlackList(page!)
      await page?.goto(url)

      return { pwrt, page }
    } catch (error) {
      return { error }
    }
  }

  private async applyBlackList(page: Page) {
    const blackListRequestUrls = ['/telegram-widget.js']
    await page?.route('**/*', (route) => {
      return blackListRequestUrls.some((bl) => new RegExp(bl).test(route.request().url()))
        ? route.abort()
        : route.continue()
    })
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
