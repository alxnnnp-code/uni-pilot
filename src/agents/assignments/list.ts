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
    "https://aulavirtual.itla.edu.do/course/view.php?id=1468",
    {
      waitUntil: "networkidle",
    }
  );


  console.log("🔎 Buscando tareas...\n");


  const links = await page.locator("a").evaluateAll((elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim() || "",
      href: (el as HTMLAnchorElement).href,
    }))
  );


  const assignmentsMap = new Map();


  links
    .filter((link) =>
      link.href.includes("/mod/assign/view.php")
    )
    .forEach((link) => {

      const id = link.href.match(/id=(\d+)/)?.[1];

      if (id && !assignmentsMap.has(id)) {

        assignmentsMap.set(id, {
          text: link.text,
          href: link.href,
        });

      }

    });


  const assignments = Array.from(
    assignmentsMap.values()
  );


  const pendientes:any[] = [];
  const entregadas:any[] = [];


  console.log(`📚 Revisando ${assignments.length} tareas...\n`);


  for (let i = 0; i < assignments.length; i++) {

    const task = assignments[i];


    console.log(
      `(${i + 1}/${assignments.length}) Revisando: ${task.text}`
    );


    const taskPage = await context.newPage();


    try {

      await taskPage.goto(task.href, {
        waitUntil: "networkidle",
        timeout: 30000,
      });


      const body = (
        await taskPage.locator("body").innerText()
      ).toLowerCase();



      const info = {
        text: task.text,
        href: task.href,
      };


      if (
        body.includes("enviado para calificar") ||
        body.includes("calificado")
      ) {

        entregadas.push(info);

      } 
      else {

        pendientes.push(info);

      }


    } catch (error) {

      console.log(
        "⚠️ Error leyendo tarea"
      );

    }


    await taskPage.close();

  }



  console.log("\n\n==============================");
  console.log("❌ TAREAS PENDIENTES");
  console.log("==============================\n");


  pendientes.forEach((task, index)=>{

    console.log(
      `${index + 1}. ${task.text}`
    );

    console.log(task.href);
    console.log("---------------------------");

  });



  console.log("\n\n==============================");
  console.log("✅ TAREAS ENTREGADAS");
  console.log("==============================\n");


  entregadas.forEach((task,index)=>{

    console.log(
      `${index + 1}. ${task.text}`
    );

    console.log(task.href);
    console.log("---------------------------");

  });



  console.log("\n📊 RESUMEN");
  console.log("----------------");
  console.log(
    `❌ Pendientes: ${pendientes.length}`
  );

  console.log(
    `✅ Entregadas: ${entregadas.length}`
  );

  console.log(
    `📚 Total: ${assignments.length}`
  );


  await browser.close();

}


main();