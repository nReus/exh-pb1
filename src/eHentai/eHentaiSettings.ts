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
    return await (await getDisplayedCategoriesStr(stateManager)).map((valueStr) => parseInt(valueStr))
}

export async function getDisplayedCategoriesStr(stateManager: SourceStateManager): Promise<string[]> {
    return await stateManager.retrieve('displayed_categories') ?? eHentaiCategoriesList.getValueList()
}

export async function getUsername(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('username') as string) ?? ''
}

export async function getPassword(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('password') as string) ?? ''
}

export async function getUseExHentai(stateManager: SourceStateManager): Promise<boolean> {
    return (await stateManager.retrieve('use_exhentai') as boolean) ?? false
}

export async function getIgneous(stateManager: SourceStateManager): Promise<string> {
    return (await stateManager.retrieve('igneous') as string) ?? ''
}

export const settings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'settings',
        label: 'Content Settings',
        form: App.createDUIForm({
            sections: () => {
                return Promise.resolve([
                    App.createDUISection({
                        id: 'site',
                        header: 'Site Configuration',
                        footer: 'ExHentai requires forum login credentials. You can find your igneous cookie in browser dev tools after logging in.',
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
                                    id: 'username',
                                    label: 'Forum Username',
                                    value: App.createDUIBinding({
                                        get: async () => getUsername(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('username', newValue)
                                        }
                                    })
                                }),
                                App.createDUISecureInputField({
                                    id: 'password',
                                    label: 'Forum Password',
                                    value: App.createDUIBinding({
                                        get: async () => getPassword(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('password', newValue)
                                        }
                                    })
                                }),
                                App.createDUIInputField({
                                    id: 'igneous',
                                    label: 'Igneous Cookie (Optional)',
                                    value: App.createDUIBinding({
                                        get: async () => getIgneous(stateManager),
                                        set: async (newValue: string) => {
                                            await stateManager.store('igneous', newValue)
                                        }
                                    })
                                })
                            ]
                        },
                        isHidden: false
                    }),
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
                stateManager.store('username', null),
                stateManager.store('password', null),
                stateManager.store('use_exhentai', null),
                stateManager.store('igneous', null)
            ])
        }
    })
}
