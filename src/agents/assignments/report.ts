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



const total =
assignments.length;



const entregadas =
assignments.filter(
a =>
a.status === "Enviado para calificar" ||
a.status === "Calificado"
).length;



const pendientes =
assignments.filter(
a =>
a.status === "Pendiente"
).length;



const puntosPendientes =
assignments
.filter(
a=>a.status==="Pendiente"
)
.reduce(
(total,a)=>
total + (Number(a.points)||0),
0
);



const urgentes =
assignments.filter(
a =>
a.status==="Pendiente" &&
a.priority==="URGENTE"
);



console.log("\n📄 UNI-PILOT REPORT");
console.log("==============================\n");



console.log(
`📚 Total tareas: ${total}`
);


console.log(
`✅ Entregadas: ${entregadas}`
);


console.log(
`❌ Pendientes: ${pendientes}`
);


console.log(
`📈 Progreso: ${
Math.round(
(entregadas/total)*100
)
}%`
);



console.log(
`\n⭐ Puntos pendientes: ${puntosPendientes}`
);



console.log(
"\n🔥 TAREAS URGENTES"
);



console.log(
"------------------------------"
);



if(urgentes.length===0){

console.log(
"🎉 No hay tareas urgentes"
);


}else{


urgentes.forEach(
(task,index)=>{


console.log(
`${index+1}. ${task.name}`
);


console.log(
`⭐ ${task.points} puntos`
);


if(task.daysLeft!==null){

console.log(
`⏳ ${task.daysLeft} días restantes`
);

}


console.log(
`🔗 ${task.url}`
);


console.log(
"------------------------------"
);


});


}




console.log(
"\n📅 Última sincronización:"
);



console.log(
json.updatedAt
);



}



main();