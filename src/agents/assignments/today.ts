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



console.log("\n🎯 UNI-PILOT HOY");
console.log("==============================\n");



console.log(
`❌ Pendientes: ${pendientes.length}`
);



console.log("");



const hoy =
pendientes.sort(
(a,b)=>{


const diasA =
a.daysLeft ?? 999;


const diasB =
b.daysLeft ?? 999;


return diasA - diasB;


}
)
.slice(0,8);





hoy.forEach(
(task,index)=>{


let icon="📚";


if(task.priority==="URGENTE")
icon="🔥";


else if(task.priority==="IMPORTANTE")
icon="⚠️";



console.log(
`${index+1}. ${icon} ${task.priority}`
);



console.log(
`📌 ${task.name}`
);



console.log(
`⭐ Valor: ${task.points} puntos`
);



if(task.daysLeft !== null){

console.log(
`⏳ Fecha límite en: ${task.daysLeft} días`
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