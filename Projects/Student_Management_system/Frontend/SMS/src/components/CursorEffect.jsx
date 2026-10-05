import { useEffect, useState } from "react";

function CursorEffect() {
  const [mouse, setMouse] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const moveMouse = (e) => {
      setMouse({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", moveMouse);

    return () => {
      window.removeEventListener("mousemove", moveMouse);
    };
  }, []);

  return (
    <>
      <div
        className="cursor-glow"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-dot dot-1"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-dot dot-2"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-dot dot-3"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-dot dot-4"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-dot dot-5"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      <div
        className="cursor-main"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />
    </>
  );
}

export default CursorEffect;
