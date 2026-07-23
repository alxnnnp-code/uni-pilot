import fs from "fs/promises";


type Assignment = {
  name:string;
  points:string;
  status:string;
  priority:string;
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



const entregadas =
assignments.filter(
a =>
a.status === "Enviado para calificar" ||
a.status === "Calificado"
).length;



const pendientes =
assignments.length - entregadas;



console.log("\n🎓 UNI-PILOT DASHBOARD");
console.log("==============================\n");



console.log("==============================");
console.log("📊 RESUMEN");
console.log("==============================");



console.log(
`📚 Total tareas: ${assignments.length}`
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
(entregadas / assignments.length) * 100
)
}%`
);



console.log("\n==============================");
console.log("🔥 PRÓXIMAS TAREAS");
console.log("==============================\n");



const pending =
assignments
.filter(
a =>
a.status === "Pendiente"
)
.slice(0,5);



pending.forEach(
(task,index)=>{


console.log(
`${index+1}. ${task.name}`
);


console.log(
`⭐ Valor: ${task.points} puntos`
);


console.log(
`🔥 Prioridad: ${task.priority}`
);


console.log(
`🔗 ${task.url}`
);


console.log(
"---------------------------"
);


});


}



main();