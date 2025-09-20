import {
    DUIButton,
    DUINavigationButton,
    SourceStateManager
} from '@paperback/types'

import {
    eHentaiCategoriesList
} from './eHentaiHelper'

// New helpers for ExHentai settings
export async function getUseEx(stateManager: SourceStateManager): Promise<boolean> {
    return (await stateManager.retrieve('use_ex') as boolean) ?? false
}

export async function getIPBMemberId(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('ipb_member_id') as string) ?? ''
}

export async function getIPBPassHash(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('ipb_pass_hash') as string) ?? ''
}

export async function getIgneous(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('igneous') as string) ?? ''
}

export async function getExtraArgs(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('extra_args') as string) ?? ''
}

export async function getDisplayedCategories(stateManager: SourceStateManager): Promise<number[]> {
    return await (await getDisplayedCategoriesStr(stateManager)).map((valueStr) => parseInt(valueStr))
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    return await stateManager.retrieve('displayed_categories') ?? eHentaiCategoriesList.getValueList()
}

// Ex is considered ready only if toggle is on and IPB cookies look valid (not empty/0/1)
export async function isExReady(stateManager: SourceStateManager): Promise<boolean> {
    const useEx = await getUseEx(stateManager)
    if (!useEx) return false
    const memberId = (await getIPBMemberId(stateManager))?.trim()
    const passHash = (await getIPBPassHash(stateManager))?.trim()
    if (!memberId || !passHash) return false
    if (memberId === '0' || memberId === '1') return false
    if (passHash === '0' || passHash === '1') return false
    return true
}

export const settings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'settings',
        label: 'Content Settings',
        form: App.createDUIForm({
            sections: () => {
                return Promise.resolve([
                    // Filters section
                    App.createDUISection({
                        id: 'filters',
                        header: 'Filters',
                        footer: 'Affects Latest Galleries and Search. Use additional arguments to refine results. Displayed Categories control which categories are shown.',
                        rows: async () => {
                            await Promise.all([
                                getExtraArgs(stateManager)
                            ])
                            return await [
                                App.createDUIInputField({
                                    id: 'extra_args',
                                    label: 'Additional filter arguments',
                                    value: App.createDUIBinding({
                                        get: async () => getExtraArgs(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('extra_args', newValue)
                                        }
                                    })
                                }),
                                App.createDUISelect({
                                    id: 'displayed_categories',
                                    label: 'Displayed Categories',
                                    options: eHentaiCategoriesList.getValueList(),
                                    labelResolver: async (option) => eHentaiCategoriesList.getName(option),
                                    value: App.createDUIBinding({
                                        get: async () => getDisplayedCategoriesStr(stateManager),
                                        set: async (newValue) => {
                                            await stateManager.store('displayed_categories', newValue)
                                        }
                                    }),
                                    allowsMultiselect: true
                                })
                            ]
                        },
                        isHidden: false
                    }),

                    // ExHentai section
                    App.createDUISection({
                        id: 'exhentai',
                        header: 'ExHentai',
                        footer: 'Enable ExHentai and provide ipb_member_id + ipb_pass_hash from your E-Hentai forum cookies. If Ex shows a blank page, this extension will attempt a handshake to obtain igneous automatically. You can also paste igneous manually if needed.',
                        rows: async () => {
                            await Promise.all([
                                getUseEx(stateManager),
                                getIPBMemberId(stateManager),
                                getIPBPassHash(stateManager),
                                getIgneous(stateManager)
                            ])
                            return await [
                                App.createDUISwitch({
                                    id: 'use_ex',
                                    label: 'Use ExHentai',
                                    value: App.createDUIBinding({
                                        get: async () => getUseEx(stateManager),
                                        set: async (newValue: boolean) => {
                                            await stateManager.store('use_ex', newValue)
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_member_id',
                                    label: 'ipb_member_id (forum cookie)',
                                    value: App.createDUIBinding({
                                        get: async () => getIPBMemberId(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('ipb_member_id', newValue?.trim() ?? '')
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_pass_hash',
                                    label: 'ipb_pass_hash (forum cookie)',
                                    value: App.createDUIBinding({
                                        get: async () => getIPBPassHash(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('ipb_pass_hash', newValue?.trim() ?? '')
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'igneous',
                                    label: 'igneous (optional, ExHentai cookie)',
                                    value: App.createDUIBinding({
                                        get: async () => getIgneous(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('igneous', newValue?.trim() ?? '')
                                        }
                                    })
                                })
                            ]
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
            await Promise.all([
                stateManager.store('extra_args', null),
                stateManager.store('use_ex', null),
                stateManager.store('ipb_member_id', null),
                stateManager.store('ipb_pass_hash', null),
                stateManager.store('igneous', null)
            ])
        }
    })
}
