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

export async function getBaseHost(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('base_host') as string) ?? 'e-hentai.org'
}

export async function getIpbMemberId(stateManager: SourceStateManager): Promise<string | null> {
    return (await stateManager.retrieve('ipb_member_id') as string) ?? null
}

export async function getIpbPassHash(stateManager: SourceStateManager): Promise<string | null> {
    return (await stateManager.retrieve('ipb_pass_hash') as string) ?? null
}

export async function getDisplayedCategories(stateManager: SourceStateManager): Promise<number[]> {
    return await (await getDisplayedCategoriesStr(stateManager)).map((valueStr) => parseInt(valueStr))
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    return await stateManager.retrieve('displayed_categories') ?? eHentaiCategoriesList.getValueList()
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
                            await Promise.all([
                                getExtraArgs(stateManager)
                            ])
                            return await [
                                App.createDUISelect({
                                    id: 'base_host',
                                    label: 'Site',
                                    options: ['e-hentai.org', 'exhentai.org'],
                                    labelResolver: async (option) => option,
                                    value: App.createDUIBinding({
                                        get: async () => getBaseHost(stateManager),
                                        set: async (newValue) => {
                                            await stateManager.store(
                                                'base_host',
                                                newValue
                                            )
                                        }
                                    }),
                                    allowsMultiselect: false
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_member_id',
                                    label: 'IPB Member ID (ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => (await getIpbMemberId(stateManager)) ?? '',
                                        set: async (newValue: string) => {
                                            await stateManager.store(
                                                'ipb_member_id',
                                                newValue
                                            )
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'ipb_pass_hash',
                                    label: 'IPB Pass Hash (ExHentai)',
                                    value: App.createDUIBinding({
                                        get: async () => (await getIpbPassHash(stateManager)) ?? '',
                                        set: async (newValue: string) => {
                                            await stateManager.store(
                                                'ipb_pass_hash',
                                                newValue
                                            )
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
                stateManager.store('displayed_categories', null),
                stateManager.store('base_host', null),
                stateManager.store('ipb_member_id', null),
                stateManager.store('ipb_pass_hash', null)
            ])
        }
    })
}
