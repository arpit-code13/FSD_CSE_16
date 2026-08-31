function f1() {
  console.log("f1");
}
function f2() {
  console.log("f2");
}
function f3() {
  console.log("f3");
}
function main() {
  console.log("main");
  f1();
//   setTimeout(f2,500);    //1000 ->1sec
  f2();
  f3();
  console.log("end");
}




main();

