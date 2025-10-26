// Requiere Playwright. Ejecutar desde la raíz del repo:
// npm i -D @playwright/test
// npx playwright install
// npx playwright test tests/playwright/catalogo-modal.spec.js --project=Mobile

const { test, expect, devices } = require('@playwright/test');

// Prueba que simula toques repetidos en un item del catálogo móvil
test.use({
  // Emular dispositivo móvil
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
});

test('catalogo - abrir modal con toques repetidos', async ({ page }) => {
  // Ajusta la URL si tu servidor local sirve en otra ruta
  await page.goto('http://localhost:8080/public/index.html');

  // Esperar carga catálogo
  await page.waitForSelector('#catalogo-grid-page');

  // Esperar que se carguen algunos items
  await page.waitForTimeout(1000);

  // Seleccionar primer item disponible
  const firstItem = await page.$('.catalogo-item');
  test.expect(firstItem).not.toBeNull();

  // Función auxiliar para tocar (tap) usando touch events
  async function tapElement(el) {
    const box = await el.boundingBox();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
  }

  // Hacer varios toques rápidos
  for (let i = 0; i < 6; i++) {
    await tapElement(firstItem);
    // pequeña pausa para simular comportamiento humano
    await page.waitForTimeout(120);
  }

  // Dar tiempo a que el modal se abra
  await page.waitForTimeout(800);

  // Verificar que el overlay esté visible
  const overlay = await page.$('#details-modal-overlay');
  test.expect(overlay).not.toBeNull();
  const visible = await overlay.evaluate((el) => el && el.style && el.style.display === 'block');
  expect(visible).toBeTruthy();

  // Tomar screenshot para inspección si falla
  await page.screenshot({ path: 'tests/playwright/catalogo-modal-result.png', fullPage: false });
});
