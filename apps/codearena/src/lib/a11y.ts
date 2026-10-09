/** Ids that link a tab to its panel (`aria-controls` / `aria-labelledby`). */
export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`

/** Ids of the buttons that show and hide the problem list, used to move focus between them. */
export const SIDEBAR_TOGGLE_ID = { open: 'sidebar-open', close: 'sidebar-close' } as const
