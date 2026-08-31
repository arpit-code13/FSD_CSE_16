console.log("Start");
process.nextTick(() => {
    console.log("nextTick");
}
);
setTimeout(() => {
    console.log("setTimeout");
}
);

setImmediate(() => {
    console.log("setImmediate");
}
);


console.log("End");