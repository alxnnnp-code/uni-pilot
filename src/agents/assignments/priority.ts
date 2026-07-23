import fs from "fs/promises";


type Assignment = {
  name:string;
  points:string;
  status:string;
  priority:string;
  daysLeft:number|null;
  url:string;
};



async function main(){


const data =
await fs.readFile(
"data/assignments.json",
"utf-8"
);



const json =
JSON.parse(data);



const assignments:Assignment[] =
json.assignments;



const pendientes =
assignments.filter(
a =>
a.status === "Pendiente"
);



console.log("\n🔥 UNI-PILOT PRIORITY");
console.log("==============================\n");



console.log(
`❌ Pendientes: ${pendientes.length}`
);



console.log("");



const ordenadas =
pendientes.sort(
(a,b)=>{


const peso = {
"URGENTE":3,
"IMPORTANTE":2,
"NORMAL":1
};



return (
(peso[b.priority as keyof typeof peso] || 0)
-
(peso[a.priority as keyof typeof peso] || 0)
);


}
);



ordenadas.forEach(
(task,index)=>{


console.log(
`${index+1}. ${
task.priority === "URGENTE"
?
"🔥"
:
task.priority === "IMPORTANTE"
?
"⚠️"
:
"📚"
} ${task.priority}`
);



console.log(
`📌 ${task.name}`
);



console.log(
`⭐ Valor: ${task.points} puntos`
);



if(task.daysLeft !== null){

console.log(
`⏳ Faltan: ${task.daysLeft} días`
);

}



console.log(
`🔗 ${task.url}`
);



console.log(
"---------------------------"
);



});



}



main();