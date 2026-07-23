import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: "auth.json",
  });

  const page = await context.newPage();

  await page.goto(
    "https://aulavirtual.itla.edu.do/my/courses.php",
    {
      waitUntil: "networkidle",
    }
  );

  const courses = await page.locator(
    'a[href*="/course/view.php?id="]'
  ).evaluateAll((elements) =>
    elements.map((a) => {
      const url = (a as HTMLAnchorElement).href;

      const nombre = a.textContent
        ?.replace(/El curso es destacado/g, "")
        .replace(/Nombre del curso/g, "")
        .replace(/Destacar este curso/g, "")
        .replace(/Quitar estrella a este curso/g, "")
        .replace(/Desarchivar/g, "")
        .replace(/Eliminar de la vista/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        nombre,
        url,
      };
    })
  );

  // Eliminar cursos repetidos
  const uniqueCourses = Array.from(
    new Map(
      courses.map((course) => [
        course.url,
        course,
      ])
    ).values()
  );

  console.log("\n📚 CURSOS ENCONTRADOS:\n");

  uniqueCourses.forEach((course, index) => {
    console.log(`${index + 1}. ${course.nombre}`);
    console.log(`🔗 ${course.url}`);
    console.log("---------------------------");
  });

  console.log(`\nTotal: ${uniqueCourses.length} cursos`);

  await browser.close();
}

main();