import {
    BadgeColor,
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    DUISection,
    HomePageSectionsProviding,
    HomeSectionType,
    HomeSection,
    MangaInfo,
    MangaProviding,
    PagedResults,
    Request,
    RequestManager,
    Response,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceManga,
    TagSection,
    SourceIntents
} from '@paperback/types'

import {
    getGalleryData,
    getSearchData,
    isCategoryHidden
} from './eHentaiHelper'

import {
    getCheerioStatic,
    parseArtist,
    parseHomeSections,
    parseLanguage,
    parsePages,
    parseTags,
    parseTitle
} from './eHentaiParser'

import {
    getDisplayedCategories,
    settings,
    resetSettings,
    getUseEx,
    getIPBMemberId,
    getIPBPassHash,
    getIgneous
} from './eHentaiSettings'

const PAPERBACK_VERSION = '0.8.0'
export const getExportVersion = (EXTENSION_VERSION: string): string => {
    return PAPERBACK_VERSION.split('.').map((x, index) => Number(x) + Number(EXTENSION_VERSION.split('.')[index])).join('.')
}

export const eHentaiInfo: SourceInfo = {
    version: getExportVersion('0.0.13'),
    name: 'E-Hentai / ExHentai',
    icon: 'icon.png',
    author: 'kameia, loik, nReus',
    description: 'Based on kameia\'s extension. Set up with ipb_member_id and ipb_pass_hash immediately after adding and before browsing.',
    contentRating: ContentRating.ADULT,
    websiteBaseURL: 'https://e-hentai.org',
    authorWebsite: 'https://github.com/kameiaa',
    sourceTags: [{
        text: '18+',
        type: BadgeColor.YELLOW
    }],
    intents: SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.MANGA_CHAPTERS | SourceIntents.SETTINGS_UI | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED
}

export class eHentai implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {

    constructor(public cheerio: CheerioAPI) { }

    private async getBaseUrl(): Promise<string> {
        return (await getUseEx(this.stateManager)) ? 'https://exhentai.org' : 'https://e-hentai.org'
    }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                const useEx = await getUseEx(this.stateManager)
                const base = useEx ? 'https://exhentai.org' : 'https://e-hentai.org'
                const host = useEx ? 'exhentai.org' : 'e-hentai.org'
                const cookies = []

                // Always set UA and referer to selected base
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
                        'referer': `${base}/`
                    }
                }

                // Simplified viewer cookie
                cookies.push(App.createCookie({ name: 'nw', value: '1', domain: host }))

                // If ExHentai is enabled, attach IPB and igneous cookies
                if (useEx) {
                    const memberId = await getIPBMemberId(this.stateManager)
                    const passHash = await getIPBPassHash(this.stateManager)
                    const igneous = await getIgneous(this.stateManager)
                    if ((memberId?.length ?? 0) > 0 && (passHash?.length ?? 0) > 0) {
                        cookies.push(App.createCookie({ name: 'ipb_member_id', value: memberId, domain: host }))
                        cookies.push(App.createCookie({ name: 'ipb_pass_hash', value: passHash, domain: host }))
                    }
                    if ((igneous?.length ?? 0) > 0) {
                        cookies.push(App.createCookie({ name: 'igneous', value: igneous, domain: host }))
                    }
                }

                request.cookies = [ ...(request.cookies ?? []), ...cookies ]
                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                // Capture igneous from Set-Cookie if the server hands it to us
                try {
                    const useEx = await getUseEx(this.stateManager)
                    if (useEx) {
                        const hdrs = (response as any)?.headers
                        const setCookie = hdrs?.['set-cookie']
                        const list: string[] = Array.isArray(setCookie) ? setCookie : (typeof setCookie === 'string' ? [setCookie] : [])
                        for (const c of list) {
                            const m = /(?:^|;)\s*igneous=([^;]+)/i.exec(c)
                            const val = m?.[1]
                            if (val && val.toLowerCase() !== 'deleted') {
                                await this.stateManager.store('igneous', val)
                                break
                            }
                        }
                        // Some runtimes also expose cookies as parsed objects
                        const respCookies: any[] = (response as any)?.cookies ?? []
                        for (const ck of respCookies) {
                            if (ck?.name === 'igneous' && ck?.value && ck.value.toLowerCase() !== 'deleted') {
                                await this.stateManager.store('igneous', ck.value)
                                break
                            }
                        }
                    }
                } catch { /* ignore */ }
                return response
            }
        }
    })

    stateManager = App.createSourceStateManager();

    getMangaShareUrl(mangaId: string): string {
        // Share URL kept on e-hentai.org to avoid async here
        return `https://e-hentai.org/g/${mangaId}`
    }

    async getSearchTags(): Promise<TagSection[]> {
        const categoriesTagSection: TagSection = App.createTagSection({
            id: 'categories', label: 'Categories', tags: [
                App.createTag({ id: 'category:2', label: 'Doujinshi' }),
                App.createTag({ id: 'category:4', label: 'Manga' }),
                App.createTag({ id: 'category:8', label: 'Artist CG' }),
                App.createTag({ id: 'category:16', label: 'Game CG' }),
                App.createTag({ id: 'category:512', label: 'Western' }),
                App.createTag({ id: 'category:256', label: 'Non-H' }),
                App.createTag({ id: 'category:32', label: 'Image Set' }),
                App.createTag({ id: 'category:64', label: 'Cosplay' }),
                App.createTag({ id: 'category:128', label: 'Asian Porn' }),
                App.createTag({ id: 'category:1', label: 'Misc' })
            ]
        })
        const tagSections: TagSection[] = [categoriesTagSection]
        return tagSections
    }

    async supportsTagExclusion(): Promise<boolean> {
        return true
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const section_popular_recently = App.createHomeSection({ id: 'popular_recently', title: 'Popular Recently', type: HomeSectionType.singleRowNormal, containsMoreItems: false })
        const section_latest_galleries = App.createHomeSection({ id: 'latest_galleries', title: 'Latest Galleries', type: HomeSectionType.singleRowNormal, containsMoreItems: true })
        const sections: HomeSection[] = [section_popular_recently, section_latest_galleries]

        await parseHomeSections(this.cheerio, this.requestManager, sections, sectionCallback, this.stateManager)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page = metadata?.page ?? 0
        let stopSearch = metadata?.stopSearch ?? false
        if(stopSearch) return App.createPagedResults({
            results: [],
            metadata: {
                stopSearch: true
            }
        })

        let nextPageId = { id: 0 }
        const displayedCategories: number[] = await getDisplayedCategories(this.stateManager)
        const excludedCategories: number = displayedCategories.reduce((prev, cur) => prev - cur, 1023)
        const results = await getSearchData('', page, excludedCategories, this.requestManager, this.cheerio, nextPageId, this.stateManager)
        if (results[results.length - 1]?.mangaId == 'stopSearch') {
            results.pop()
            stopSearch = true
        }

        return App.createPagedResults({
            results: results,
            metadata: {
                page: nextPageId.id ?? 0,
                stopSearch: stopSearch
            }
        })
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const data = (await getGalleryData([mangaId], this.requestManager))[0]
        let languageStr: string = parseLanguage(data.tags)
        let mangaDetails: MangaInfo = App.createMangaInfo({
            titles: [parseTitle(data.title), parseTitle(data.title_jpn)],
            image: data.thumb,
            rating: data.rating,
            status: 'Completed',
            artist: parseArtist(data.tags),
            desc: ['Pages: ', data.filecount, ' | Language: ', languageStr,' | Rating: ', data.rating, ' | Uploader: ', data.uploader].join(''),
            tags: parseTags([data.category, ...data.tags]),
            hentai: !(data.category == 'Non-H' || data.tags.includes('other:non-nude'))
        })

        return App.createSourceManga({id: mangaId, mangaInfo: mangaDetails})
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        // For getting gallery metadata
        let data = (await getGalleryData([mangaId], this.requestManager))[0]
        const chapters: Chapter[] = []

        // Load page to get how much images there are per page
        const base = await this.getBaseUrl()
        let $: CheerioStatic
        $ = await getCheerioStatic(this.cheerio, this.requestManager, `${base}/g/${mangaId}`)
        const showing_text = $('p.gpc').text();
        const regexParse = /(\d[\d, ]*) - (\d[\d, ]*) of (\d[\d, ]*)/;
        const match = showing_text.match(regexParse);
        if (!match || match.length < 4) {
            console.log('getChapters - No showing text match found with regex')
            return chapters
        }

        const maxPerPageStr = match[2] as string;
        const maxImagesStr = match[3] as string;

        const maxPerPage = parseInt(maxPerPageStr.replace(/[ ,]/g, ''), 10);
        const maxImages = parseInt(maxImagesStr.replace(/[ ,]/g, ''), 10);

        let chaptersLoopNum: number = 1
        if (maxImages != maxPerPage) {
            chaptersLoopNum = Math.ceil(maxImages / maxPerPage)
        }

        // Push entire gallery first, then split gallery
        chapters.push(App.createChapter({
            id: 'Full-' + data.filecount + '-' + maxPerPage,
            name: 'Gallery (Warning - loading time grows with more pages)',
            chapNum: chaptersLoopNum + 1,
            time: new Date(parseInt(data.posted) * 1000),
            volume: 0,
            sortingIndex: chaptersLoopNum
        }))

        for (let i: number = 0; i < chaptersLoopNum; ++i) {
            let startPage: number = ((i * maxPerPage) + 1)
            let endPage: number = (i == chaptersLoopNum - 1 ? parseInt(data.filecount) : (i + 1) * maxPerPage)
            const websitePageNum: number = i
            chapters.push(App.createChapter({
                id: 'Pages-' + websitePageNum,
                name: 'Page ' + startPage + ' - ' + endPage,
                chapNum: i + 1,
                time: new Date(parseInt(data.posted) * 1000),
                volume: 0,
                sortingIndex: i
            }))
        }

        return chapters
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const base = await this.getBaseUrl()
        return App.createChapterDetails({
            mangaId: mangaId,
            id: chapterId,
            pages: await parsePages(mangaId, chapterId, this.requestManager, this.cheerio, base)
        })
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page = metadata?.page ?? 0
        let stopSearch = metadata?.stopSearch ?? false
        if (stopSearch) {
            return App.createPagedResults({
                results: undefined,
                metadata: {
                    stopSearch: true
                }
            })
        }

        const includedCategories = query.includedTags?.filter(tag => tag.id.startsWith('category:'))
        const excludedCategories = query.excludedTags?.filter(tag => tag.id.startsWith('category:'))
        let categories = 0
        if (includedCategories != undefined && includedCategories.length != 0) {
            let includedCategoriesNum = includedCategories.map(tag => parseInt(tag.id.substring(9)))
            for (let includedCategoryNum of includedCategoriesNum) {
                if (await isCategoryHidden(includedCategoryNum, this.stateManager)) {
                    includedCategoriesNum.splice(includedCategoriesNum.indexOf(includedCategoryNum), 1)
                }
            }
            categories = includedCategoriesNum.reduce((prev, cur) => prev - cur, 1023)
            if (categories == 1023) {
                categories = (await getDisplayedCategories(this.stateManager)).reduce((prev, cur) => prev - cur, 1023)
            }
        }
        else if (excludedCategories != undefined && excludedCategories.length != 0) {
            let excludedCategoriesNum = excludedCategories.map(tag => parseInt(tag.id.substring(9)))
            for (let i: number = excludedCategoriesNum.length - 1; i >= 0; --i) {
                let excludedCategoryNum: number = excludedCategoriesNum[i] ?? -1
                if (excludedCategoryNum == -1) {
                    continue
                }
                if (await isCategoryHidden(excludedCategoryNum, this.stateManager)) {
                    excludedCategoriesNum.splice(excludedCategoriesNum.indexOf(excludedCategoryNum), 1)
                }
            }

            let stateManagerHiddenCategories: number[] = await getDisplayedCategories(this.stateManager)
            excludedCategoriesNum.push(stateManagerHiddenCategories.reduce((prev, cur) => prev - cur, 1023))
            categories = excludedCategoriesNum.reduce((prev, cur) => prev + cur, 0)
        }
        else {
            categories = (await getDisplayedCategories(this.stateManager)).reduce((prev, cur) => prev - cur, 1023)
        }

        if (Number.isNaN(categories) || categories == 1023) {
            categories = 0
        }

        let nextPageId = { id: 0 }
        const results = await getSearchData(query.title, page, categories, this.requestManager, this.cheerio, nextPageId, this.stateManager)
        if (results[results.length - 1]?.mangaId == 'stopSearch') {
            results.pop()
            stopSearch = true
        }

        return App.createPagedResults({
            results: results,
            metadata: {
                page: nextPageId.id ?? 0,
                stopSearch: stopSearch
            }
        })
    }

    async getSourceMenu(): Promise<DUISection> {
        return Promise.resolve(App.createDUISection({
            id: 'main',
            header: 'Source Settings',
            rows: () => Promise.resolve([
                settings(this.stateManager),
                resetSettings(this.stateManager)
            ]),
            isHidden: false
        }))
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        const base = await this.getBaseUrl()
        return App.createRequest({
            url: `${base}/`,
            method: 'GET'
        })
    }
}
