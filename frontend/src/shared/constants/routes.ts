/**
 * As rotas do app num lugar só (os links do menu e os atalhos entre telas).
 * Endereços sempre em inglês; o texto da interface é que fica em português.
 */
export const ROUTES = {
  presentation: '/',
  overview: '/overview',
  journal: '/journal',
  sales: '/sales',
  purchases: '/purchases',
  inventory: '/inventory',
  accounts: '/accounts',
  /**
   * O razonete de uma conta. Vai na query string (e não em /accounts/1101)
   * porque o build de produção é estático: uma página só atende toda conta,
   * inclusive as abertas depois do build.
   */
  accountLedger: (accountId: number) => `/accounts/ledger?account=${accountId}`,
} as const;

/** O parâmetro que abre a gaveta de criação ao chegar na tela (/sales?new=1). */
export const OPEN_CREATE_PARAM = 'new';
