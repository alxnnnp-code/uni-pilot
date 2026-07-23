import { chromium } from "playwright";


async function main(){


const browser = await chromium.launch({
  headless:false
});


const context = await browser.newContext({
  storageState:"auth.json"
});


const page = await context.newPage();



await page.goto(
"https://aulavirtual.itla.edu.do/course/view.php?id=1468",
{
waitUntil:"networkidle"
}
);



console.log(
"🔎 Buscando tareas pendientes...\n"
);



const links = await page.locator("a").evaluateAll((elements)=>
elements.map(el=>({
text:el.textContent?.trim() || "",
href:(el as HTMLAnchorElement).href
}))
);



const mapa = new Map();



links
.filter(x=>
x.href.includes("/mod/assign/view.php")
)
.forEach(x=>{


const id =
x.href.match(/id=(\d+)/)?.[1];


if(id && !mapa.has(id)){


mapa.set(id,{
nombre:x.text,
link:x.href
});


}


});



const tareas =
Array.from(mapa.values());



const pendientes:any[]=[];



for(const tarea of tareas){


const taskPage =
await context.newPage();



try{


await taskPage.goto(
tarea.link,
{
waitUntil:"networkidle",
timeout:30000
}
);



const body =
(
await taskPage.locator("body").innerText()
)
.toLowerCase();



const enviada =
body.includes(
"enviado para calificar"
)
||
body.includes(
"calificado"
);



if(!enviada){



const valor =
body.match(
/valor\s*(?:de)?\s*([\d.,]+)\s*puntos?/i
)?.[1]
||
body.match(
/([\d.,]+)\s*puntos?/i
)?.[1]
||
"N/A";



pendientes.push({

nombre:tarea.nombre,

valor,

link:tarea.link

});



}



}
catch{


console.log(
"⚠️ Error:",
tarea.nombre
);


}



await taskPage.close();


}



console.log(
"\n=============================="
);

console.log(
"❌ TAREAS PENDIENTES"
);


console.log(
"==============================\n"
);



if(pendientes.length===0){


console.log(
"🎉 No tienes tareas pendientes"
);


}
else{


pendientes.forEach(
(task,index)=>{


console.log(
`${index+1}. ${task.nombre}`
);


console.log(
`⭐ Valor: ${task.valor} puntos`
);


console.log(
`🔗 ${task.link}`
);


console.log(
"---------------------------"
);


});


}



console.log(
`\n📊 Total pendientes: ${pendientes.length}`
);



await browser.close();


}



main();