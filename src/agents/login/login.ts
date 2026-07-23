import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  await page.goto("https://aulavirtual.itla.edu.do/login/index.php");

  console.log("🔐 Inicia sesión con Microsoft.");
  console.log("Cuando termines, vuelve a la terminal y presiona ENTER.");

  process.stdin.resume();

  process.stdin.once("data", async () => {
    try {
      await context.storageState({
        path: "auth.json",
      });

      console.log("✅ Sesión guardada en auth.json");

    } catch (error) {
      console.error("❌ Error guardando sesión:", error);
    } finally {
      await browser.close();
      process.exit(0);
    }
  });
}

main();