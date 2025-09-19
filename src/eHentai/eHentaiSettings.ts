import {
    DUIButton,
    DUINavigationButton,
    SourceStateManager
} from '@paperback/types'

import {
    eHentaiCategoriesList
} from './eHentaiHelper'

export async function getExtraArgs(stateManager: SourceStateManager): Promise<string> {
    try {
        const stored = await stateManager.retrieve('extra_args')
        return typeof stored === 'string' ? stored : ''
    } catch (error) {
        console.log('Error retrieving extra_args:', error)
        return ''
    }
}

export async function getBaseHost(stateManager: SourceStateManager): Promise<string> {
    try {
        const stored = await stateManager.retrieve('base_host')
        const validHosts = ['e-hentai.org', 'exhentai.org']
        return typeof stored === 'string' && validHosts.includes(stored) ? stored : 'e-hentai.org'
    } catch (error) {
        console.log('Error retrieving base_host:', error)
        return 'e-hentai.org'
    }
}

export async function getIpbMemberId(stateManager: SourceStateManager): Promise<string | null> {
    try {
        const stored = await stateManager.retrieve('ipb_member_id')
        return typeof stored === 'string' ? stored : null
    } catch (error) {
        console.log('Error retrieving ipb_member_id:', error)
        return null
    }
}

export async function getIpbPassHash(stateManager: SourceStateManager): Promise<string | null> {
    try {
        const stored = await stateManager.retrieve('ipb_pass_hash')
        return typeof stored === 'string' ? stored : null
    } catch (error) {
        console.log('Error retrieving ipb_pass_hash:', error)
        return null
    }
}

export async function getDisplayedCategories(stateManager: SourceStateManager): Promise<number[]> {
    try {
        const categoriesStr = await getDisplayedCategoriesStr(stateManager)
        return categoriesStr
            .map((valueStr) => parseInt(valueStr))
            .filter((value) => !isNaN(value) && isFinite(value))
    } catch (error) {
        console.log('Error getting displayed categories:', error)
        return eHentaiCategoriesList.getValueList().map(v => parseInt(v)).filter(v => !isNaN(v))
    }
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    try {
        const stored = await stateManager.retrieve('displayed_categories')
        if (Array.isArray(stored) && stored.length > 0) {
            return stored
        }
        return eHentaiCategoriesList.getValueList()
    } catch (error) {
        console.log('Error retrieving displayed_categories:', error)
        return eHentaiCategoriesList.getValueList()
    }
}

export const settings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'settings',
        label: 'Content Settings',
        form: App.createDUIForm({
            sections: () => {
                return Promise.resolve([
                    App.createDUISection({
                        id: 'general',
                        header: 'General',
                        footer: 'Affects \'Latest Galleries\' homepage section and search results.\nHidden categories will override their respective category option in search arguments.',
                        rows: () => {
                            return Promise.resolve([
                                App.createDUISelect({
                                    id: 'base_host',
                                    label: 'Site',
                                    options: ['e-hentai.org', 'exhentai.org'],
                                    labelResolver: (option) => Promise.resolve(option),
                                    value: App.createDUIBinding({
                                        get: () => getBaseHost(stateManager),
                                        set: (newValue) => {
                                            return stateManager.store('base_host', newValue).catch(error => {
                                                console.log('Error storing base_host:', error)
                                            })
                                        }
                                    }),
                                    allowsMultiselect: false
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_member_id',
                                    label: 'IPB Member ID (ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => {
                                            const value = await getIpbMemberId(stateManager)
                                            return value ?? ''
                                        },
                                        set: (newValue: string) => {
                                            const valueToStore = newValue.trim() === '' ? null : newValue.trim()
                                            return stateManager.store('ipb_member_id', valueToStore).catch(error => {
                                                console.log('Error storing ipb_member_id:', error)
                                            })
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_pass_hash',
                                    label: 'IPB Pass Hash (ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => {
                                            const value = await getIpbPassHash(stateManager)
                                            return value ?? ''
                                        },
                                        set: (newValue: string) => {
                                            const valueToStore = newValue.trim() === '' ? null : newValue.trim()
                                            return stateManager.store('ipb_pass_hash', valueToStore).catch(error => {
                                                console.log('Error storing ipb_pass_hash:', error)
                                            })
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'extra_args',
                                    label: 'Additional filter arguments',
                                    value: App.createDUIBinding({
                                        get: () => getExtraArgs(stateManager),
                                        set: (newValue: string) => {
                                            return stateManager.store('extra_args', newValue).catch(error => {
                                                console.log('Error storing extra_args:', error)
                                            })
                                        }
                                    })
                                }),
                                App.createDUISelect({
                                    id: 'displayed_categories',
                                    label: 'Displayed Categories',
                                    options: eHentaiCategoriesList.getValueList(),
                                    labelResolver: (option) => Promise.resolve(eHentaiCategoriesList.getName(option)),
                                    value: App.createDUIBinding({
                                        get: () => getDisplayedCategoriesStr(stateManager),
                                        set: (newValue) => {
                                            const validatedValue = Array.isArray(newValue) ? newValue : []
                                            return stateManager.store('displayed_categories', validatedValue).catch(error => {
                                                console.log('Error storing displayed_categories:', error)
                                            })
                                        }
                                    }),
                                    allowsMultiselect: true
                                })
                            ])
                        },
                        isHidden: false
                    })
                ])
            }
        })
    })
}

export const resetSettings = (stateManager: SourceStateManager): DUIButton => {
    return App.createDUIButton({
        id: 'reset',
        label: 'Reset Settings',
        onTap: async () => {
            try {
                await Promise.all([
                    stateManager.store('extra_args', ''),
                    stateManager.store('displayed_categories', eHentaiCategoriesList.getValueList()),
                    stateManager.store('base_host', 'e-hentai.org'),
                    stateManager.store('ipb_member_id', null),
                    stateManager.store('ipb_pass_hash', null)
                ])
            } catch (error) {
                console.log('Error resetting settings:', error)
            }
        }
    })
}