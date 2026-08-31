import { EventEmitter } from "node:events";

const task = new EventEmitter();

// Listener for "great"
task.on("great", (name) => {
    console.log(`Great, ${name}! Welcome to the session.`);
});

// Listener for "exit"
task.on("exit", (reason) => {
    console.log(`Exit event triggered. Reason: ${reason}`);
});


task.on("task", (work) => {
  console.log(`Task, ${work}! complete your file.`);
});

task.on("start",(course) =>{
  console.log(`start the event : ${course}`);
});

// Trigger events
task.emit("great", "Arpit");
task.emit("exit", "Session completed");
task.emit("task","complete your project" )
task.emit("start","hello welcome to my landing page")