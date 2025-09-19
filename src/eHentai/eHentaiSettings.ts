import {
    DUIButton,
    DUINavigationButton,
    DUISection,
    DUISwitch,
    DUIInputField,
    SourceStateManager
} from '@paperback/types'

import {
    eHentaiCategoriesList
} from './eHentaiHelper'

export async function getExtraArgs(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('extra_args') as string) ?? ''
}

export async function getDisplayedCategories(stateManager: SourceStateManager): Promise<number[]> {
    return await (await getDisplayedCategoriesStr(stateManager)).map((valueStr) => parseInt(valueStr))
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    return await stateManager.retrieve('displayed_categories') ?? eHentaiCategoriesList.getValueList()
}

export async function isExHentaiEnabled(stateManager: SourceStateManager): Promise<boolean> {
    return await stateManager.retrieve('exhentai_enabled') ?? false;
}

export async function getExHentaiCookies(stateManager: SourceStateManager): Promise<{ memberId: string; passHash: string }> {
    const memberId = await stateManager.retrieve('ipb_member_id') ?? '';
    const passHash = await stateManager.retrieve('ipb_pass_hash') ?? '';
    return { memberId, passHash };
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
                    }),
                    App.createDUISection({
                        id: 'exhentai',
                        header: 'ExHentai Settings',
                        footer: 'Enable ExHentai access with your forum login cookies. Obtain cookies from forums.e-hentai.org after logging in.',
                        rows: () => Promise.resolve([
                            App.createDUISwitch({
                                id: 'exhentai_toggle',
                                label: 'Enable ExHentai',
                                value: App.createDUIBinding({
                                    get: async () => await isExHentaiEnabled(stateManager),
                                    set: async (value: boolean) => await stateManager.store('exhentai_enabled', value)
                                })
                            }),
                            App.createDUIInputField({
                                id: 'ipb_member_id',
                                label: 'IPB Member ID',
                                value: App.createDUIBinding({
                                    get: async () => (await getExHentaiCookies(stateManager)).memberId,
                                    set: async (value: string) => await stateManager.store('ipb_member_id', value)
                                })
                            }),
                            App.createDUIInputField({
                                id: 'ipb_pass_hash',
                                label: 'IPB Pass Hash',
                                value: App.createDUIBinding({
                                    get: async () => (await getExHentaiCookies(stateManager)).passHash,
                                    set: async (value: string) => await stateManager.store('ipb_pass_hash', value)
                                })
                            })
                        ]),
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
                stateManager.store('exhentai_enabled', null),
                stateManager.store('ipb_member_id', null),
                stateManager.store('ipb_pass_hash', null)
            ])
        }
    })
}
