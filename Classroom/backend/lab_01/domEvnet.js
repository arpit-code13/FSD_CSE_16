import { EventEmitter } from "node:events";

function createDomElement() {
  const emitter = new EventEmitter();

  return {
    addEventListener(eventName, callback) {
      emitter.on(eventName, callback);
    },

    removeEventListener(eventName, callback) {
      emitter.off(eventName, callback);
    },

    dispatchEvent(event) {
      emitter.emit(event.type, event);
    },
  };
}

function handleClick(event) {
  console.log("Second handler:", event.detail);
}

const button = createDomElement();

button.addEventListener("click", () => {
  console.log("Button clicked");
});

button.addEventListener("click", handleClick);

button.dispatchEvent({
  type: "click",
  detail: "Hello from Node.js",
});
