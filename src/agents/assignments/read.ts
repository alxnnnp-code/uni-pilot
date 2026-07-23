import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: "auth.json",
  });

  const page = await context.newPage();

  const taskUrl =
    "https://aulavirtual.itla.edu.do/mod/assign/view.php?id=140470";

  await page.goto(taskUrl, {
    waitUntil: "networkidle",
  });

  console.log("📚 TAREA\n");

  // Nombre
  const title = await page
    .locator("h1")
    .first()
    .innerText()
    .catch(() => "Sin nombre");

  console.log("📌 Nombre:");
  console.log(title.trim());

  // Buscar descripción
  const description = await page
    .locator(".activity-description")
    .innerText()
    .catch(() => "Sin descripción");

  console.log("\n📝 Descripción:");
  console.log(description.trim());


  // Buscar puntos
  const fullText = await page.locator("body").innerText();

  const valor =
    fullText.match(/Valor\s+([\d.,]+)\s+Puntos?/i)?.[1] ||
    fullText.match(/([\d.,]+)\s+puntos/i)?.[1];

  if (valor) {
    console.log(`\n⭐ Valor: ${valor} puntos`);
  }


  // Estado entrega
  const body = fullText.toLowerCase();

  let estado = "Desconocido";

  if (
    body.includes("enviado para calificar") ||
    body.includes("calificado")
  ) {
    estado = "REALIZADA";
  } 
  else if (
    body.includes("todavía no se han realizado envíos") ||
    body.includes("no se han realizado envíos")
  ) {
    estado = "PENDIENTE";
  }


  console.log("\n📤 Entrega:");
  console.log(`Estado: ${estado}`);


  if (estado === "REALIZADA") {
    console.log("✅ Esta tarea ya fue entregada.");
    console.log("⏳ Esperando calificación.");
  } 
  else if (estado === "PENDIENTE") {
    console.log("❌ Esta tarea todavía está pendiente.");
  }


  // Archivos enviados
  const files = await page
    .locator("a")
    .evaluateAll((els) =>
      els
        .map((e) => e.textContent?.trim())
        .filter((x) =>
          x &&
          (
            x.includes(".pdf") ||
            x.includes(".doc") ||
            x.includes(".zip")
          )
        )
    );

  if (files.length) {
    console.log("\n📎 Archivos:");
    files.forEach((f) => console.log(`- ${f}`));
  }


  // Fecha modificación
  const fecha = fullText.match(
    /Última modificación\s+(.+)/
  )?.[1];

  if (fecha) {
    console.log("\n📅 Última modificación:");
    console.log(fecha.trim());
  }


  console.log("\n🔗 Link:");
  console.log(taskUrl);


  await browser.close();
}

main();