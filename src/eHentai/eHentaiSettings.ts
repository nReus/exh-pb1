import {
    DUIButton,
    DUINavigationButton,
    SourceStateManager
} from '@paperback/types'

import {
    eHentaiCategoriesList
} from './eHentaiHelper'

export async function getExtraArgs(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('extra_args') as string) ?? ''
}

export async function getDisplayedCategories(stateManager: SourceStateManager): Promise<number[]> {
    const categoriesStr = await getDisplayedCategoriesStr(stateManager)
    return categoriesStr.map((valueStr) => parseInt(valueStr))
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    const stored = await stateManager.retrieve('displayed_categories')
    if (Array.isArray(stored)) {
        return stored
    }
    return eHentaiCategoriesList.getValueList()
}

export async function getUseExHentai(stateManager: SourceStateManager): Promise<boolean> {
    return (await stateManager.retrieve('use_exhentai') as boolean) ?? false
}

export async function getIpbMemberId(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('ipb_member_id') as string) ?? ''
}

export async function getIpbPassHash(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('ipb_pass_hash') as string) ?? ''
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
                        rows: async () => {
                            return [
                                App.createDUISwitch({
                                    id: 'use_exhentai',
                                    label: 'Use ExHentai',
                                    value: App.createDUIBinding({
                                        get: async () => getUseExHentai(stateManager),
                                        set: async (newValue: boolean) => {
                                            await stateManager.store('use_exhentai', newValue)
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_member_id',
                                    label: 'IPB Member ID (for ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => getIpbMemberId(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('ipb_member_id', newValue)
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_pass_hash',
                                    label: 'IPB Pass Hash (for ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => getIpbPassHash(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('ipb_pass_hash', newValue)
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'extra_args',
                                    label: 'Additional filter arguments',
                                    value: App.createDUIBinding({
                                        get: async () => getExtraArgs(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store(
                                                'extra_args',
                                                newValue
                                            )
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
                                            await stateManager.store(
                                                'displayed_categories',
                                                newValue
                                            )
                                        }
                                    }),
                                    allowsMultiselect: true
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
                stateManager.store('use_exhentai', null),
                stateManager.store('ipb_member_id', null),
                stateManager.store('ipb_pass_hash', null)
            ])
        }
    })
}
