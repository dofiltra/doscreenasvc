import { Page } from 'browser-manager'
import { ScreenSvc, TScreenSettings } from '..'

export class TelegramScreen extends ScreenSvc {
  constructor(s: TScreenSettings) {
    super(s)
  }

  async getChannelPosts(url: string) {
    const channelUrl = this.fixUrl(url, ['/s'])
    const { pwrt, page } = await this.getPwrt(channelUrl)
    const els = (await page?.$$('.tgme_widget_message')) || []
    const posts = (
      await Promise.all(
        els.map(async (el) => {
          const classnames = await el.getAttribute('class')
          if (classnames?.includes('service_message')) {
            return null
          }

          return await el?.evaluate(
            (e: any, { chanUrl }) => {
              const [, postId] = (e.attributes['data-post']?.value || '').split('/')
              const userPhoto = e.querySelector('.tgme_widget_message_user_photo img')?.src
              const ownerName = e.querySelector('.tgme_widget_message_owner_name')?.innerText
              const postBody = e.querySelector('.tgme_widget_message_text')?.innerHTML
              const views = e.querySelector('.tgme_widget_message_views')?.innerText
              const author = e.querySelector('.tgme_widget_message_from_author')?.innerText

              const $fwd = e.querySelector('.tgme_widget_message_forwarded_from_name')
              const fwd = $fwd && {
                href: $fwd.href,
                name: $fwd.innerText
              }

              const dateEl = e.querySelector('.tgme_widget_message_date time')
              const date = dateEl.attributes?.datetime?.value

              const u = new URL(chanUrl)
              const postUrl = `${u.origin}${u.pathname.replace('/s/', '')}/${postId}`

              return {
                url: postUrl,
                postId,
                userPhoto,
                ownerName,
                postBody,
                views,
                author,
                date,
                fwd
              }
            },
            { chanUrl: channelUrl }
          )
        })
      )
    )
      .filter((x) => x?.postId)
      .sort((a, b) => b?.postId - a?.postId)

    await pwrt?.close()

    return posts
  }

  protected async getPwrt(url: string) {
    const { page = null, pwrt = null, error = null } = await super.getPwrt(url)

    if (page) {
      const elMeta = await page?.$('.tgme_widget_message_meta')
      await elMeta?.evaluate((e) => (e.innerHTML = e.innerHTML.replaceAll('edited', '').replaceAll(',', '')))

      const elText = await page?.$('.tgme_widget_message_text')
      await elText?.evaluate(
        async (e, { host }) => {
          const lastChildren = Array.from(e.children || []).slice(-2)
          await Promise.all(
            lastChildren.map(async (c) => {
              if (c.innerHTML?.includes(host)) {
                c.remove()
              }
            })
          )
        },
        { host: new URL(url).host }
      )

      await this.replaceNotSupport(page)
      await this.removeEls(page!, [
        '.tgme_widget_message_forwarded_from',
        '.message_media_not_supported_wrap',
        '.tgme_header'
      ])
    }

    return { page, pwrt, error }
  }

  protected async getScreenEl(url: string, page: Page) {
    if (url?.includes('t.me')) {
      return await page?.$('.tgme_widget_message_bubble')
    }

    return super.getScreenEl(url, page)
  }

  protected fixUrl(url: string, extendPathname?: string[]) {
    try {
      let u = new URL(url)

      ;(extendPathname || []).forEach((key) => {
        u = new URL(`${u.origin}${key}${u.pathname}${u.search}`)
      })

      u.searchParams.append('embed', '1')
      return u.href
    } catch {
      return super.fixUrl(url)
    }
  }

  private async replaceNotSupport(page: Page) {
    const elNotSupport = await page?.$('.message_media_not_supported_wrap')
    if (!elNotSupport) {
      return
    }

    const elPrevImage = await page?.$('.tgme_widget_message_video_thumb')
    await elPrevImage?.evaluate((e) => e?.style && (e.style.filter = 'none'))
  }
}
