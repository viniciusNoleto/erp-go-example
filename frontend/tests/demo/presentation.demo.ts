import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { type APIRequestContext, expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Vídeo de apresentação: um teste só, que abre na página de apresentação e passa por todas as
 * funcionalidades do GoMoney.
 *
 * A stack de demonstração sobe zerada (support/global-setup.ts) e a API carrega 30 dias de movimento da
 * loja fictícia: o sistema já abre vivo. Na tela: apresentação, visão geral (saldos, gráfico, resultado,
 * pendências), lançamento chegando ao vivo de outra pessoa, venda com validação e recebimento, venda
 * recusada por falta de estoque, produto novo, compra com custo médio, pagamento em duas fases (agendar,
 * cancelar, confirmar), conta nova no plano, lançamentos (despesa, aporte, manual e um recusado pelo
 * livro-razão), filtros do diário, razonete das contas, pendências resolvidas pela visão geral e de volta à apresentação.
 * Grava em 1440×900; no fim, o ffmpeg corta o começo em branco e gera `videos/apresentacao.mp4`.
 *
 *   npm run demo:video
 */

const ROOT = path.resolve(__dirname, '../..');
const VIDEO_DIR = path.join(ROOT, 'videos');
const RAW_DIR = path.join(ROOT, 'test-results-demo', 'raw-video');
const SIZE = { width: 1440, height: 900 };

/** Quanto tempo o vídeo fica parado no topo da apresentação antes de rolar. */
const OPENING_MS = 1500;

/** Velocidade da rolagem da apresentação até o rodapé (px por segundo): uma leitura corrida. */
const OPENING_SCROLL_PX_S = 700;

/** Os números que a loja de demonstração usa (backend/internal/domain/account.go). */
const ACCOUNT = { cash: 1101, opex: 5201, freight: 5202 } as const;

/** Nomes novos, que não existem na carga de demonstração: cada linha criada no vídeo é achada por eles. */
const NEW = {
  customer: 'Escola Pequeno Artista',
  refusedCustomer: 'Ateliê Carvão & Cia',
  supplier: 'Madeireira Serra Azul',
  product: { sku: 'PIN-10', name: 'Pincel chato (kit com 10)', price: '39,90' },
  account: { id: '5202', name: 'Despesas com frete' },
};

/** Produtos da carga de demonstração (backend/internal/app/seed.go). */
const SEED = {
  giz24: 'Giz pastel seco 24 cores',
  paper: 'Papel para pastel A3 180 g (bloco)',
  easel: 'Cavalete de mesa em pinus',
  scheduledPurchase: 'Papelaria Atacado Sul',
};

/** Ações no ritmo do vídeo: curtas, só o suficiente para cada mudança aparecer na tela. */
function actions(page: Page) {
  const pause = (ms = 700) => page.waitForTimeout(ms);

  return {
    pause,

    async click(locator: Locator, after = 700) {
      // Tooltip aberto cobre o que está ao lado: tira o foco e o mouse de cima antes do clique.
      const tooltip = page.getByRole('tooltip');
      if (await tooltip.count()) {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.mouse.move(1, 1);
        await expect(tooltip).toHaveCount(0, { timeout: 3000 }).catch(() => {});
      }
      await locator.click();
      await pause(after);
    },

    /** Digita como uma pessoa, apagando o que já havia no campo. */
    async type(locator: Locator, text: string) {
      await locator.click();
      await locator.fill('');
      await locator.pressSequentially(text, { delay: 35 });
    },

    /** Abre um Select do Mantine, digita parte do nome para filtrar e escolhe a opção. */
    async pick(combobox: Locator, option: string, search = option.slice(0, 6)) {
      await combobox.click();
      await pause(250);
      await combobox.fill('');
      await combobox.pressSequentially(search, { delay: 45 });
      await pause(350);
      await page.getByRole('option', { name: option, exact: true }).click();
      await pause(350);
    },

    /** Escolhe uma opção de um SegmentedControl (o rádio fica escondido; o clique vai no rótulo). */
    async segment(group: Locator, label: string, after = 700) {
      await group.getByText(label, { exact: true }).click();
      await pause(after);
    },

    /** Rola a janela devagar (o app e a apresentação rolam o documento). */
    async glide(pixels: number, ms = 1000) {
      await page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), pixels);
      await pause(ms);
    },

    /** Rola o documento até o fim numa velocidade constante (px/s), sem o salto do `behavior: 'smooth'`. */
    async scrollToEnd(pxPerSecond: number) {
      await page.evaluate(
        (speed) =>
          new Promise<void>((resolve) => {
            const from = window.scrollY;
            const distance = document.documentElement.scrollHeight - window.innerHeight - from;
            // O começo e o fim mais lentos tomam 10% do percurso: o meio fica na velocidade pedida.
            const duration = (Math.max(0, distance) / speed / 0.9) * 1000;
            const start = performance.now();
            const frame = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              // Começa e termina devagar; no meio, velocidade constante.
              const eased = t < 0.1 ? 5 * t * t : t > 0.9 ? 0.9 - 5 * (1 - t) * (1 - t) : t - 0.05;
              window.scrollTo(0, from + distance * (eased / 0.9));
              if (t < 1) requestAnimationFrame(frame);
              else resolve();
            };
            requestAnimationFrame(frame);
          }),
        pxPerSecond,
      );
    },

    /** Volta ao topo. */
    async top(ms = 800) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await pause(ms);
    },

    /** Rola até um elemento, suavemente, deixando-o no meio da tela. */
    async reveal(locator: Locator, ms = 1100) {
      await locator.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await pause(ms);
    },

    /** Passa o mouse devagar por cima de um elemento, da esquerda para a direita. */
    async sweep(locator: Locator, steps = 36, ms = 2600) {
      const box = (await locator.boundingBox())!;
      for (let i = 0; i <= steps; i++) {
        await page.mouse.move(box.x + 4 + ((box.width - 8) * i) / steps, box.y + box.height * 0.5);
        await page.waitForTimeout(ms / steps);
      }
    },
  };
}

/** Um lançamento feito "de fora" (outra pessoa, outra aba): a tela aberta o recebe pelo Server-Sent Events. */
async function postFromElsewhere(request: APIRequestContext, body: { kind: string; debit: number; credit: number; amountCents: number; memo: string }) {
  const response = await request.post('/api/journal', { data: body });
  expect(response.status(), await response.text()).toBeLessThan(300);
}

test('vídeo de apresentação: todas as funcionalidades', async ({ browser, baseURL, request }, testInfo) => {
  rmSync(RAW_DIR, { recursive: true, force: true });

  const context = await browser.newContext({
    baseURL,
    viewport: SIZE,
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    recordVideo: { dir: RAW_DIR, size: SIZE },
  });

  // Aquece o cache do contexto (fontes, JS, payloads das rotas) numa página descartável: a frio, a
  // primeira tela demora a pintar e a gravação começaria travada.
  const warmup = await context.newPage();
  for (const url of ['/', '/overview', '/journal', '/sales', '/purchases', '/inventory', '/accounts', `/accounts/ledger?account=${ACCOUNT.cash}`]) {
    await warmup.goto(url);
    await warmup.evaluate(() => document.fonts.ready);
  }
  await warmup.close();

  const page = await context.newPage();
  const a = actions(page);
  const drawer = page.getByRole('dialog');
  const menu = (name: string | RegExp) =>
    page
      .getByRole('navigation')
      .getByRole('link', { name: typeof name === 'string' ? new RegExp(`^${name}`) : name })
      .first();
  const heading = (name: string) => page.getByRole('heading', { name, level: 1 });
  const row = (text: string | RegExp) => page.getByRole('row').filter({ hasText: text });
  /** O palco: os cartões dos lançamentos no canto inferior direito. */
  const stage = page.locator('[aria-live="polite"]').filter({ has: page.getByRole('button', { name: 'Fechar' }) });
  const scene = (title: string) => page.locator('[aria-live="polite"]').getByText(title, { exact: true }).first();

  /** Um bloco do roteiro; se falhar, guarda a tela do momento. */
  const step = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      await page.screenshot({ path: testInfo.outputPath(`fail-${name}.png`) }).catch(() => {});
      throw error;
    }
  };

  /** Fecha os cartões do palco que ainda estão na tela, para o próximo aparecer sozinho. */
  const clearStage = async () => {
    const close = stage.getByRole('button', { name: 'Fechar' });
    while (await close.count()) {
      await close.first().click();
      await a.pause(250);
    }
  };

  /** Vai para uma área pelo menu lateral e espera o título da tela. */
  const goTo = async (link: string, title: string, after = 1400) => {
    await a.click(menu(link), 300);
    await expect(heading(title)).toBeVisible();
    await expect(page).toHaveTitle(`${title} | GoMoney`);
    await a.pause(after);
  };

  // ─── Abertura: a página de apresentação ─────────────────────────────────────────────────
  let openedAt = 0;
  await step('opening', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'GoMoney', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Apresentação | GoMoney');
    // O quadro do livro-razão ao vivo carregado (o caixa da loja).
    await expect(page.getByRole('complementary', { name: /livro-razão da loja/ })).toContainText('Ateliê Pipa');
    openedAt = Date.now();
    // Conta pelo relógio da página, a partir da primeira pintura (onde o vídeo começa depois do corte).
    await page.waitForFunction(
      (ms) => {
        const paint = performance.getEntriesByName('first-paint')[0]?.startTime ?? 0;
        return performance.now() - paint >= ms;
      },
      OPENING_MS,
      { polling: 50, timeout: OPENING_MS + 5000 },
    );

    // Rola a página inteira, num ritmo constante, até o rodapé; depois volta ao topo.
    await a.scrollToEnd(OPENING_SCROLL_PX_S);
    await a.pause(1200);
    await a.top(1400);

    await a.click(page.getByRole('main').getByRole('link', { name: 'Abrir o sistema' }), 300);
  });

  // ─── 1. Visão geral ─────────────────────────────────────────────────────────────────────
  await step('overview', async () => {
    await expect(heading('Visão geral')).toBeVisible();
    await expect(page).toHaveTitle('Visão geral | GoMoney');
    await expect(page.getByText('O balancete fecha.')).toBeVisible();
    await a.pause(2200);

    // O gráfico do saldo: o mouse passa pelos lançamentos do mês.
    const chart = page.getByRole('img', { name: /após cada lançamento/ });
    await a.sweep(chart);

    // Cada aba é uma das contas que giram o negócio.
    const tabs = page.getByRole('tablist', { name: 'Conta mostrada no gráfico' });
    for (const tab of ['Clientes a receber', 'Estoque', 'Fornecedores a pagar', 'Caixa e bancos']) {
      await a.click(tabs.getByRole('tab', { name: new RegExp(`^${tab}`) }), 1300);
    }
    await page.mouse.move(SIZE.width - 40, 120);

    // Embaixo: as pendências e os últimos lançamentos.
    await a.reveal(page.getByRole('heading', { name: 'A receber e a pagar' }), 2400);
  });

  // ─── 2. Ao vivo: outra pessoa lança, a tela vê ──────────────────────────────────────────
  await step('live', async () => {
    await a.top(900);
    await postFromElsewhere(request, {
      kind: 'expense',
      debit: ACCOUNT.opex,
      credit: ACCOUNT.cash,
      amountCents: 4890,
      memo: 'Café e água para a loja',
    });
    await expect(scene('Despesa paga')).toBeVisible();
    await a.pause(4500);
    await clearStage();
  });

  // ─── 3. Vendas: validação, faturar e receber ────────────────────────────────────────────
  await step('sale', async () => {
    // O atalho da visão geral abre a gaveta já na tela de vendas.
    await a.click(page.getByRole('link', { name: 'Nova venda' }), 300);
    await expect(page).toHaveURL(/\/sales$/);
    await expect(drawer).toBeVisible();
    await expect(page).toHaveTitle('Vendas | GoMoney');
    await a.pause(900);

    // Enviar vazio mostra o que falta.
    await a.click(drawer.getByRole('button', { name: 'Faturar venda' }), 1000);
    await expect(drawer.getByText('Informe o cliente.')).toBeVisible();

    await a.type(drawer.getByLabel('Cliente'), NEW.customer);
    await a.pick(drawer.getByRole('combobox', { name: 'Produto do item 1' }), SEED.giz24, 'seco');
    await a.type(drawer.getByLabel('Quantidade do item 1'), '3');
    await a.pause(500);
    await a.click(drawer.getByRole('button', { name: 'Adicionar item' }), 500);
    await a.pick(drawer.getByRole('combobox', { name: 'Produto do item 2' }), SEED.paper, 'papel');
    await a.type(drawer.getByLabel('Quantidade do item 2'), '5');
    await a.pause(500);

    // A prévia mostra as duas partidas encadeadas e a margem.
    await expect(drawer.getByText('Margem', { exact: true })).toBeVisible();
    await a.pause(2200);

    await a.click(drawer.getByRole('button', { name: 'Faturar venda' }), 300);
    await expect(scene('Venda faturada')).toBeVisible();
    await expect(drawer).toBeHidden();
    await expect(row(NEW.customer)).toContainText('A receber');
    await a.pause(4000);
    await clearStage();

    // O cliente pagou: receber leva o valor de clientes a receber para o caixa.
    await a.click(row(NEW.customer).getByRole('button', { name: 'Receber' }), 300);
    await expect(scene('Recebimento')).toBeVisible();
    await expect(row(NEW.customer)).toContainText('Recebida');
    await a.pause(4000);
    await clearStage();
  });

  // ─── 4. Venda recusada: não há cavalete no estoque ──────────────────────────────────────
  await step('sale-refused', async () => {
    await a.click(page.getByRole('button', { name: 'Nova venda' }), 700);
    await expect(drawer).toBeVisible();
    await a.type(drawer.getByLabel('Cliente'), NEW.refusedCustomer);
    await a.pick(drawer.getByRole('combobox', { name: 'Produto do item 1' }), SEED.easel, 'cavalete');
    await expect(drawer.getByText(/^0 un\. em estoque/)).toBeVisible();
    await a.type(drawer.getByLabel('Quantidade do item 1'), '2');
    await a.pause(1200);
    await a.click(drawer.getByRole('button', { name: 'Faturar venda' }), 300);
    await expect(scene('Recusado pelo livro-razão')).toBeVisible();
    await expect(row(NEW.refusedCustomer)).toHaveCount(0);
    await a.pause(4500);
    await clearStage();
  });

  // ─── 5. Estoque: produto novo ───────────────────────────────────────────────────────────
  await step('inventory', async () => {
    await goTo('Estoque', 'Estoque', 1800);

    await a.click(page.getByRole('button', { name: 'Novo produto' }), 700);
    await expect(drawer).toBeVisible();
    await a.click(drawer.getByRole('button', { name: 'Cadastrar' }), 1000);
    await expect(drawer.getByText('Informe o código do produto.')).toBeVisible();

    await a.type(drawer.getByLabel('Código'), NEW.product.sku);
    await a.type(drawer.getByLabel('Nome'), NEW.product.name);
    await a.type(drawer.getByLabel('Preço de venda'), NEW.product.price);
    await a.pause(700);
    await a.click(drawer.getByRole('button', { name: 'Cadastrar' }), 300);
    await expect(drawer).toBeHidden();
    await expect(row(NEW.product.name)).toBeVisible();
    await a.reveal(row(NEW.product.name), 2200);
    await a.top(600);
  });

  // ─── 6. Compras: entrada de mercadoria e pagamento em duas fases ────────────────────────
  await step('purchases', async () => {
    await goTo('Compras', 'Compras', 2200);

    await a.click(page.getByRole('button', { name: 'Nova compra' }), 700);
    await expect(drawer).toBeVisible();
    await a.type(drawer.getByLabel('Fornecedor'), NEW.supplier);
    await a.pick(drawer.getByRole('combobox', { name: 'Produto do item 1' }), SEED.easel, 'cavalete');
    await a.type(drawer.getByLabel('Quantidade do item 1'), '10');
    await a.type(drawer.getByLabel('Custo unitário do item 1'), '131,50');
    await a.click(drawer.getByRole('button', { name: 'Adicionar item' }), 500);
    await a.pick(drawer.getByRole('combobox', { name: 'Produto do item 2' }), NEW.product.name, 'pincel');
    await a.type(drawer.getByLabel('Quantidade do item 2'), '24');
    await a.type(drawer.getByLabel('Custo unitário do item 2'), '18,40');
    await a.pause(500);
    await expect(drawer.getByText('Total', { exact: true })).toBeVisible();
    await a.pause(2000);

    await a.click(drawer.getByRole('button', { name: 'Dar entrada' }), 300);
    await expect(scene('Compra recebida')).toBeVisible();
    await expect(row(NEW.supplier)).toContainText('A pagar');
    await a.pause(4000);
    await clearStage();

    // Primeira fase: agendar reserva o valor no caixa (que não pode ficar negativo).
    await a.click(row(NEW.supplier).getByRole('button', { name: /^Agendar/ }), 300);
    await expect(scene('Pagamento agendado')).toBeVisible();
    await expect(row(NEW.supplier)).toContainText('Pagamento reservado');
    await a.pause(4000);
    await clearStage();

    // Segunda fase, desfazendo: a reserva da Papelaria é cancelada e o caixa fica livre.
    const papelaria = row(SEED.scheduledPurchase).filter({ hasText: 'Pagamento reservado' });
    await a.click(papelaria.getByRole('button', { name: 'Cancelar', exact: true }), 300);
    await expect(scene('Agendamento cancelado')).toBeVisible();
    await a.pause(4000);
    await clearStage();

    // Segunda fase, efetivando: o dinheiro sai do caixa.
    await a.click(row(NEW.supplier).getByRole('button', { name: 'Confirmar' }), 300);
    await expect(scene('Pagamento confirmado')).toBeVisible();
    await expect(row(NEW.supplier)).toContainText('Paga');
    await a.pause(4500);
    await clearStage();

    // O estoque recebeu as unidades e recalculou o custo médio.
    await goTo('Estoque', 'Estoque', 1000);
    await a.reveal(row(SEED.easel), 2600);
    await a.top(600);
  });

  // ─── 7. Plano de contas: conta nova ─────────────────────────────────────────────────────
  await step('accounts', async () => {
    await goTo('Plano de contas', 'Plano de contas', 2600);

    await a.click(page.getByRole('button', { name: 'Nova conta' }), 700);
    await expect(drawer).toBeVisible();
    // O número começa pelo dígito da natureza (5 = despesa): 4202 não serve.
    await a.type(drawer.getByLabel('Número'), '4202');
    await a.type(drawer.getByLabel('Nome'), NEW.account.name);
    await a.click(drawer.getByRole('button', { name: 'Abrir conta' }), 1000);
    await expect(drawer.getByText('O primeiro dígito não bate com a natureza.')).toBeVisible();
    await a.pause(900);
    await a.type(drawer.getByLabel('Número'), NEW.account.id);
    await a.pause(500);
    await a.click(drawer.getByRole('button', { name: 'Abrir conta' }), 300);
    await expect(drawer).toBeHidden();
    await expect(row(NEW.account.name)).toBeVisible();
    await a.reveal(row(NEW.account.name), 2200);
    await a.top(600);
  });

  // ─── 8. Lançamentos: despesa, aporte, manual e um recusado ──────────────────────────────
  await step('journal', async () => {
    await goTo('Lançamentos', 'Lançamentos', 2000);

    const kind = drawer.getByRole('radiogroup', { name: 'Tipo de lançamento' });
    const open = async () => {
      await a.click(page.getByRole('button', { name: 'Novo lançamento' }), 700);
      await expect(drawer).toBeVisible();
    };
    const post = async (title: string) => {
      await a.click(drawer.getByRole('button', { name: 'Lançar no livro-razão' }), 300);
      await expect(scene(title)).toBeVisible();
      await a.pause(3800);
      await clearStage();
    };

    // Despesa paga: débito na despesa, crédito no caixa.
    await open();
    await a.click(drawer.getByRole('button', { name: 'Lançar no livro-razão' }), 900);
    await expect(drawer.getByText('Escreva o histórico do lançamento.')).toBeVisible();
    await a.type(drawer.getByLabel('Histórico'), 'Conta de água');
    await a.type(drawer.getByLabel('Valor'), '187,40');
    await a.pause(1400);
    await post('Despesa paga');

    // Aporte dos sócios: débito no caixa, crédito no capital.
    await open();
    await a.segment(kind, 'Aporte');
    await a.type(drawer.getByLabel('Histórico'), 'Aporte de dezembro');
    await a.type(drawer.getByLabel('Valor'), '15000,00');
    await a.pause(1400);
    await post('Aporte de capital');

    // Manual, já com a conta aberta agora há pouco.
    await open();
    await a.segment(kind, 'Manual');
    await a.type(drawer.getByLabel('Histórico'), `Frete da entrega para ${NEW.customer}`);
    await a.type(drawer.getByLabel('Valor'), '42,00');
    await a.pick(drawer.getByRole('combobox', { name: 'Conta debitada' }), `${NEW.account.id} · ${NEW.account.name}`, NEW.account.id);
    await a.pick(drawer.getByRole('combobox', { name: 'Conta creditada' }), `${ACCOUNT.cash} · Caixa e bancos`, String(ACCOUNT.cash));
    await a.pause(1600);
    await post('Lançamento manual');

    // Uma despesa maior que o caixa: o próprio TigerBeetle recusa.
    await open();
    await a.type(drawer.getByLabel('Histórico'), 'Reforma da fachada');
    await a.type(drawer.getByLabel('Valor'), '250000,00');
    await a.pause(1200);
    await post('Recusado pelo livro-razão');

    // O diário filtrado por origem.
    const filter = page.getByRole('radiogroup', { name: 'Filtrar por origem' });
    for (const label of ['Vendas', 'Compras', 'Despesas', 'Outros', 'Todos']) {
      await a.segment(filter, label, 1500);
    }
    await a.glide(500, 1600);
    await a.top(700);
  });

  // ─── 9. Razonete: por que o saldo é este ────────────────────────────────────────────────
  await step('ledger', async () => {
    await goTo('Plano de contas', 'Plano de contas', 1000);
    await a.click(page.getByRole('link', { name: 'Caixa e bancos', exact: true }), 300);
    await expect(heading('Caixa e bancos')).toBeVisible();
    await expect(page).toHaveTitle(`${ACCOUNT.cash} Caixa e bancos | GoMoney`);
    await a.pause(2000);
    await a.sweep(page.getByRole('img', { name: /após cada lançamento/ }));
    await page.mouse.move(SIZE.width - 40, 120);
    await a.reveal(page.getByRole('heading', { name: 'Razonete' }), 1600);
    await a.glide(500, 1800);
    await a.top(700);

    // A conta nova, com o frete lançado.
    await a.click(page.getByRole('main').getByRole('link', { name: 'Plano de contas' }), 300);
    await expect(heading('Plano de contas')).toBeVisible();
    await a.pause(700);
    await a.click(page.getByRole('link', { name: NEW.account.name, exact: true }), 300);
    await expect(heading(NEW.account.name)).toBeVisible();
    await expect(page).toHaveTitle(`${NEW.account.id} ${NEW.account.name} | GoMoney`);
    await a.pause(2600);
  });

  // ─── 10. De volta à visão geral: resolver as pendências ali mesmo ───────────────────────
  await step('dues', async () => {
    await goTo('Visão geral', 'Visão geral', 1800);
    // As linhas das pendências são as que têm botão (as dos últimos lançamentos, não).
    const dues = page.getByRole('listitem').filter({ has: page.getByRole('button') });
    await a.reveal(page.getByRole('heading', { name: 'A receber e a pagar' }), 1200);

    // Dois clientes pagaram: a lista encolhe e a compra a pagar sobe para a vista.
    for (let i = 0; i < 2; i++) {
      await a.click(dues.filter({ hasText: /Venda nº/ }).first().getByRole('button', { name: 'Receber' }), 300);
      await expect(scene('Recebimento')).toBeVisible();
      await a.pause(3000);
      await clearStage();
    }

    // A compra da Papelaria, cancelada há pouco, é reagendada e confirmada daqui mesmo.
    const papelaria = () => dues.filter({ hasText: SEED.scheduledPurchase });
    await a.click(papelaria().getByRole('button', { name: /^Agendar/ }), 300);
    await expect(scene('Pagamento agendado')).toBeVisible();
    await expect(papelaria()).toContainText('Reservado');
    await a.pause(3500);
    await clearStage();

    await a.click(papelaria().getByRole('button', { name: 'Confirmar' }), 300);
    await expect(scene('Pagamento confirmado')).toBeVisible();
    await expect(papelaria()).toHaveCount(0);
    await a.pause(3500);
    await clearStage();

    // O resultado e a prova de que o balancete continua fechando.
    await a.top(1000);
    await expect(page.getByText('O balancete fecha.')).toBeVisible();
    await a.pause(2200);
  });

  // ─── Encerramento: de volta à apresentação ──────────────────────────────────────────────
  await step('closing', async () => {
    await a.click(page.getByRole('link', { name: 'Sobre o GoMoney' }), 300);
    await expect(page.getByRole('heading', { name: 'GoMoney', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Apresentação | GoMoney');
    await a.pause(4000);
  });
  const endedAt = Date.now();

  await context.close();
  await saveVideo(await page.video()!.path(), (endedAt - openedAt) / 1000);
});

/** Instante (s) em que a primeira tela pinta no vídeo cru: o primeiro quadro diferente da página em branco. */
function firstPaint(rawPath: string): number {
  const probe = spawnSync('ffmpeg', ['-v', 'info', '-t', '3', '-i', rawPath, '-vf', "select='gt(scene,0.005)',showinfo", '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  const match = /pts_time:([\d.]+)/.exec(probe.stderr ?? '');
  return match ? Number(match[1]) : 0;
}

/**
 * Corta o começo em branco (antes da apresentação) e o fim (o vídeo segue gravando até o contexto fechar)
 * e gera o mp4. Sem ffmpeg, guarda o webm cru.
 */
async function saveVideo(rawPath: string, seconds: number) {
  mkdirSync(VIDEO_DIR, { recursive: true });
  const target = path.join(VIDEO_DIR, 'apresentacao.mp4');
  // prettier-ignore
  const result = spawnSync('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', firstPaint(rawPath).toFixed(2),
    '-t', seconds.toFixed(2),
    '-i', rawPath,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    target,
  ], { stdio: 'inherit' });

  if (result.error || result.status !== 0) {
    const fallback = path.join(VIDEO_DIR, 'apresentacao.webm');
    copyFileSync(rawPath, fallback);
    console.log(`ffmpeg indisponível: vídeo sem corte em ${fallback}`);
    return;
  }
  console.log(`Vídeo salvo em ${target}`);
}
