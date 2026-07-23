import { chromium } from "playwright";
import fs from "fs/promises";


type Assignment = {
  name: string;
  points: string;
  description: string;
  status: string;
  attempt: string;
  grade: string;
  files: string[];
  url: string;
  dueDate: string;
  daysLeft: number | null;
  priority: string;
};



function calculateDaysLeft(date:string){

  if(!date) return null;

  const today = new Date();

  const due = new Date(date);

  const diff =
    due.getTime() - today.getTime();


  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

}



function getPriority(
  days:number|null,
  points:string
){

  const p =
    Number(points) || 0;


  if(days !== null && days <= 2)
    return "URGENTE";


  if(p >= 5)
    return "IMPORTANTE";


  return "NORMAL";

}



async function main(){


const browser =
await chromium.launch({
  headless:false
});



const context =
await browser.newContext({
  storageState:"auth.json"
});



const page =
await context.newPage();



await page.goto(
"https://aulavirtual.itla.edu.do/course/view.php?id=1468",
{
waitUntil:"networkidle"
}
);



console.log("🔎 Buscando tareas...\n");



const links =
await page.locator("a").evaluateAll(elements=>

elements.map(el=>({

text:
el.textContent
?.replace(/\s+/g," ")
.trim() || "",


href:
(el as HTMLAnchorElement).href

}))

);



const map =
new Map<string,string>();



for(const link of links){


if(link.href.includes("/mod/assign/view.php")){


const id =
link.href.match(/id=(\d+)/)?.[1];


if(id)
map.set(id,link.href);


}

}



const urls =
Array.from(map.values());



console.log(
`📚 ${urls.length} tareas encontradas\n`
);



const assignments:Assignment[]=[];



for(let i=0;i<urls.length;i++){


const url=urls[i];


console.log(
`📖 Leyendo ${i+1}/${urls.length}`
);



await page.goto(url,{
waitUntil:"networkidle"
});



const body =
await page.locator("body").innerText();



const clean =
body.replace(/\r/g,"");



let name =
await page.locator("h1")
.first()
.innerText()
.catch(()=>"");



name =
name
.replace(/\s+/g," ")
.trim();



const points =
clean.match(
/(?:Valor|Puntos?)\s*:?\s*([\d.,]+)/i
)?.[1]
||
"";



const status =
clean.includes(
"Enviado para calificar"
)
?
"Enviado para calificar"
:
clean.includes("Calificado")
?
"Calificado"
:
"Pendiente";



const attempt =
clean.match(
/Número del intento\s+([^\n]+)/i
)?.[1]
||
"";



const grade =
clean.match(
/Estado de la calificación\s+([^\n]+)/i
)?.[1]
||
"";



const dueDate =
clean.match(
/(?:Fecha límite|Fecha de entrega)[^\n]*\n([^\n]+)/i
)?.[1]
?.trim()
||
"";



const daysLeft =
calculateDaysLeft(dueDate);



let description="";



const desc =
await page
.locator(".activity-description")
.allInnerTexts()
.catch(()=>[]);



if(desc.length){

description =
desc.join("\n");

}



const files =
await page
.locator(
"a[href*='pluginfile.php']"
)
.allInnerTexts()
.catch(()=>[]);



assignments.push({

name,

points:
points || "N/A",

description:
description.trim(),

status,

attempt:
attempt.trim(),

grade:
grade.trim(),

files,

url,

dueDate,

daysLeft,

priority:
getPriority(
daysLeft,
points
)

});


}



await fs.mkdir(
"data",
{
recursive:true
}
);



await fs.writeFile(
"data/assignments.json",
JSON.stringify(
{
updatedAt:
new Date().toISOString(),

total:
assignments.length,

assignments

},
null,
2
),
"utf-8"
);



console.log(
"\n✅ Sincronización terminada"
);


console.log(
"📁 Guardado en data/assignments.json"
);



await browser.close();

}



main();