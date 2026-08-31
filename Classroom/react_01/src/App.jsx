import "./App.css";
function App() {
  return (
    <>
      <nav className="navbar">
        <h2>ReactWorld</h2>

        <ul>
          <li>Home</li>
          <li>About</li>
          <li>Services</li>
          <li>Contact</li>
        </ul>
      </nav>

      <section className="hero">
        <h1>Enter the World of Anime</h1>

        <p>
          Explore thousands of anime series, blockbuster movies, trending
          episodes, and legendary characters all in one place.
        </p>

        <button>Get Started</button>
      </section>

      <section className="cards">
        <div className="card">
          <h2>AnimeVerse</h2>
          <p>Lightning fast performance with reusable components.</p>
        </div>

        <div className="card">
          <h2>🎨 Beautiful</h2>
          <p>Modern UI with clean and attractive design.</p>
        </div>

        <div className="card">
          <h2>📱 Responsive</h2>
          <p>Looks perfect on mobile, tablet and desktop.</p>
        </div>
      </section>

      <footer>© 2026 ReactWorld | Made with ❤️ using React</footer>
    </>
  );
}

export default App;
// import Home from "./components/Home";