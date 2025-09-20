import {
    HomeSection,
    PartialSourceManga,
    RequestManager,
    SourceStateManager,
    TagSection
} from '@paperback/types'

import entities = require('entities')

import {
    getRowDetails
} from './eHentaiHelper'

import {
    getDisplayedCategories,
    getExtraArgs,
    getUseEx,
    isExReady
} from './eHentaiSettings'

export const parseArtist = (tags: string[]): string | undefined => {
    const artist = tags.filter(tag => tag.startsWith('artist:')).map(tag => tag.substring(7))
    const cosplayer = tags.filter(tag => tag.startsWith('cosplayer:')).map(tag => tag.substring(10))

    if (artist.length != 0) {
        return artist[0]
    }
    else if (cosplayer.length != 0) {
        return cosplayer[0]
    }

    return undefined
}

export const parseLanguage = (tags: string[]): string => {
    const languageTags = tags.filter(tag => tag.startsWith('language:') && tag != 'language:translated').map(tag => tag.substring(9))

    if (languageTags.length == 0 || languageTags[0] == null) {
        return 'unknown'
    }

    return languageTags.join(', ')
}

async function getImage(url: string, requestManager: RequestManager, cheerio: CheerioAPI): Promise<string> {
    const request = App.createRequest({
        url: url,
        method: 'GET'
    })

    const data = await requestManager.schedule(request, 1)
    const $ = cheerio.load(data.data as string)

    return $('#img').attr('src') ?? ''
}

export async function parsePage(id: string, page: number, requestManager: RequestManager, cheerio: CheerioAPI, baseUrl: string): Promise<string[]> {
    const request = App.createRequest({
        url: `${baseUrl}/g/${id}/?p=${page}`,
        method: 'GET'
    })

    const response = await requestManager.schedule(request, 1)
    const $ = cheerio.load(response.data as string)

    const pageArr = []
    const pageDivArr = $('#gdt a').toArray()

    console.log(pageDivArr.length)
    for (const pageDiv of pageDivArr) {
        pageArr.push(getImage($(pageDiv).attr('href') ?? '', requestManager, cheerio))
    }

    return Promise.all(pageArr)
}

export async function parsePages(mangaId: string, pageCount: string, requestManager: RequestManager, cheerio: CheerioAPI, baseUrl: string): Promise<string[]> {
    const splitPageCount: string[] = pageCount.split('-')

    if ((splitPageCount[0] ?? '0') == 'Full') {
        if (splitPageCount.length != 3) {
            return []
        }

        const pages: number = parseInt(splitPageCount[1] ?? '0')
        const imagesPerPage: number = parseInt(splitPageCount[2] ?? '0')
        const loopAmt: number = Math.ceil(pages / imagesPerPage) - 1
        const pagesArr = []
        for (let i = 0; i <= loopAmt; i++) {
            pagesArr.push(parsePage(mangaId, i, requestManager, cheerio, baseUrl))
        }
        return Promise.all(pagesArr).then(pages => pages.reduce((prev, cur) => [...prev, ...cur], []))
    } else if ((splitPageCount[0] ?? '0') == 'Pages') {
        if (splitPageCount.length != 2) {
            return []
        }
        const websitePageNum: number = parseInt(splitPageCount[1] ?? '0')
        return parsePage(mangaId, websitePageNum, requestManager, cheerio, baseUrl)
    }

    return []
}

const namespaceHasTags = (namespace: string, tags: string[]): boolean => { return tags.filter(tag => tag.startsWith(`${namespace}:`)).length != 0 }

const createTagSectionForNamespace = (namespace: string, tags: string[]): TagSection => { return App.createTagSection({ id: namespace, label: namespace, tags: tags.filter(tag => tag.startsWith(`${namespace}:`)).map(tag => App.createTag({ id: tag, label: tag.substring(namespace.length + 1) })) }) }

export const parseTags = (tags: string[]): TagSection[] => {
    const tagSectionArr = []

    switch (tags.shift()) {
        case 'Doujinshi': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:2', label: 'Doujinshi' })] })); break
        case 'Manga': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:4', label: 'Manga' })] })); break
        case 'Artist CG': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:8', label: 'Artist CG' })] })); break
        case 'Game CG': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:16', label: 'Game CG' })] })); break
        case 'Non-H': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:256', label: 'Non-H' })] })); break
        case 'Image Set': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:32', label: 'Image Set' })] })); break
        case 'Western': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:512', label: 'Western' })] })); break
        case 'Cosplay': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:64', label: 'Cosplay' })] })); break
        case 'Asian Porn': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:128', label: 'Asian Porn' })] })); break
        case 'Misc': tagSectionArr.push(App.createTagSection({ id: 'categories', label: 'categories', tags: [App.createTag({ id: 'category:1', label: 'Misc' })] })); break
    }

    if (namespaceHasTags('character', tags)) tagSectionArr.push(createTagSectionForNamespace('character', tags))
    if (namespaceHasTags('female', tags)) tagSectionArr.push(createTagSectionForNamespace('female', tags))
    if (namespaceHasTags('male', tags)) tagSectionArr.push(createTagSectionForNamespace('male', tags))
    if (namespaceHasTags('mixed', tags)) tagSectionArr.push(createTagSectionForNamespace('mixed', tags))
    if (namespaceHasTags('other', tags)) tagSectionArr.push(createTagSectionForNamespace('other', tags))
    if (namespaceHasTags('parody', tags)) tagSectionArr.push(createTagSectionForNamespace('parody', tags))

    return tagSectionArr
}

export const parseTitle = (title: string): string => {
    return title.replaceAll(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
}

export async function getCheerioStatic(cheerio: CheerioAPI, requestManager: RequestManager, urlParam: string): Promise<CheerioStatic> {
    const request = App.createRequest({
        url: urlParam,
        method: 'GET'
    })

    const response = await requestManager.schedule(request, 1)
    return cheerio.load(response.data as string)
}

// Perform a one-time ExH handshake: if the first fetch looks blank, hit the homepage to obtain igneous, then retry once.
export async function fetchWithExHandshake(cheerio: CheerioAPI, requestManager: RequestManager, url: string, sourceStateManager: SourceStateManager): Promise<CheerioStatic> {
    const useEx = await getUseEx(sourceStateManager)
    if (!useEx) {
        return getCheerioStatic(cheerio, requestManager, url)
    }

    // 1st try
    let $ = await getCheerioStatic(cheerio, requestManager, url)
    const looksBlank = $('table.itg.gltc').length === 0 && $('div.ido').length === 0 && ($('body').text().trim().length === 0)
    if (!looksBlank) return $

    // Handshake: ping Ex homepage to let server set igneous, then retry once
    const base = 'https://exhentai.org'
    try {
        await getCheerioStatic(cheerio, requestManager, `${base}/`)
    } catch { /* ignore */ }

    // Small delay and retry
    await new Promise(res => setTimeout(res, 250))
    $ = await getCheerioStatic(cheerio, requestManager, url)
    return $
}

export async function parseHomeSections(cheerio: CheerioAPI, requestManager: RequestManager, sections: HomeSection[], sectionCallback: (section: HomeSection) => void, sourceStateManager: SourceStateManager): Promise<void> {
    for (const section of sections) {
        let $: CheerioStatic | undefined = undefined
    const base = (await isExReady(sourceStateManager)) ? 'https://exhentai.org' : 'https://e-hentai.org'

        if (section.id == 'popular_recently') {
            $ = await fetchWithExHandshake(cheerio, requestManager, `${base}/popular`, sourceStateManager)
            if ($ != null) {
                section.items = parseMenuListPage($, true)
            }
        }

        if (section.id == 'latest_galleries') {
            const displayedCategories: number[] = await getDisplayedCategories(sourceStateManager)
            const excludedCategories: number = displayedCategories.reduce((prev, cur) => prev - cur, 1023)
            $ = await fetchWithExHandshake(cheerio, requestManager, `${base}/?f_cats=${excludedCategories}&f_search=${encodeURIComponent(await getExtraArgs(sourceStateManager))}`, sourceStateManager)
            if ($ != null) {
                section.items = parseMenuListPage($)
            }
        }

        if ($ == null) {
            section.items = [App.createPartialSourceManga({
                mangaId: 'stopSearch',
                image: '',
                title: '',
                subtitle: ''
            })]
        }
        sectionCallback(section)
    }
}

export function parseMenuListPage($: CheerioStatic, ignoreExpectedEntryAmount: boolean = false): PartialSourceManga[] {
    let skippedFirstRow = false
    let ret: PartialSourceManga[] = []

    for (const manga of $('tr', 'table.itg.gltc').toArray()) {
        if (!skippedFirstRow) {
            skippedFirstRow = true
            continue
        }

        let id: string = '', title: string = '', image: string = '', subtitle: string = ''
        let details = { id, title, image, subtitle }
        getRowDetails($, manga, details);

        if (details.id.length == 0 || details.title.length == 0) {
            continue
        }

        ret.push(App.createPartialSourceManga({
            mangaId: details.id,
            image: details.image,
            title: entities.decodeHTML(details.title),
            subtitle: entities.decodeHTML(details.subtitle)
        }))
    }

    if (!ignoreExpectedEntryAmount && (ret.length == 0 || ret.length != 25)) {
        ret.push(App.createPartialSourceManga({
            mangaId: 'stopSearch',
            image: '',
            title: '',
            subtitle: ''
        }))
    }
    return ret
}

export interface UrlInfo {
    id: number,
    query: string,
    category: number
}

export function parseUrlParams(url: string) : UrlInfo {
    const ret: UrlInfo = { id: 0, query: '', category: 0 }
    if (!url) return ret

    // Extract the query part manually (no URL / URLSearchParams in PB runtime)
    let queryString = ''
    const qIdx = url.indexOf('?')
    if (qIdx >= 0) {
        queryString = url.substring(qIdx + 1)
    } else {
        // Some callers may pass just the query string
        queryString = url
    }

    // Split into key=value pairs
    const pairs = queryString.split('&')
    for (const pair of pairs) {
        if (!pair) continue
        const eqIdx = pair.indexOf('=')
        const rawKey = eqIdx >= 0 ? pair.substring(0, eqIdx) : pair
        const rawVal = eqIdx >= 0 ? pair.substring(eqIdx + 1) : ''

        // Decode components safely
        let key = rawKey
        let val = rawVal
        try { key = decodeURIComponent(rawKey.replace(/\+/g, ' ')) } catch {}
        try { val = decodeURIComponent(rawVal.replace(/\+/g, ' ')) } catch {}

        if (key === 'next') {
            const n = parseInt(val)
            if (!Number.isNaN(n)) ret.id = n
        } else if (key === 'f_search') {
            ret.query = val
        } else if (key === 'f_cats') {
            const c = parseInt(val)
            if (!Number.isNaN(c)) ret.category = c
        }
    }

    return ret
}
