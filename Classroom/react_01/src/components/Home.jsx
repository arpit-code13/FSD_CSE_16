import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const animeList = [
    {
      title: "Demon Slayer",
      genre: "Action • Fantasy",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROx1hV8QdcoKENZMU5omQJsZuivv_mcS8m164dw2L-6Q&s=10",
    },
    {
      title: "ABES Engineering College",
      genre: "Action • Supernatural",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7KTIHGBfCzIoshUilqSGBnFhxC8XTo5hlLX__d1g1XA&s",
    },
    {
      title: "One Piece",
      genre: "Adventure • Fantasy",
      image: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=600",
    },
    {
      title: "Attack on Titan",
      genre: "Action • Dark Fantasy",
      image:
        "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600",
    },
  ];

  return (
    <div className="anime-home">
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg anime-navbar">
        <div className="container">
          <Link className="navbar-brand anime-logo" to="/home">
            AniVerse
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#animeNavbar"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="animeNavbar">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <Link className="nav-link active" to="/home">
                  Home
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="#">
                  Anime
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="#">
                  Manga
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="#">
                  Watchlist
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="#">
                  About
                </Link>
              </li>
            </ul>

            <Link to="/login" className="btn logout-btn">
              Logout
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-text">
            <span className="hero-badge">✦ YOUR ANIME UNIVERSE</span>

            <h1>
              Discover Your
              <span> Next Adventure</span>
            </h1>

            <p>
              Explore amazing anime, discover new characters, follow your
              favorite stories and build your personal anime collection.
            </p>

            <div className="hero-buttons">
              <Link to="#" className="btn explore-btn">
                Explore Anime
              </Link>

              <Link to="#" className="btn watch-btn">
                ▶ Watch Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section className="anime-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span>DISCOVER</span>
              <h2>Trending Anime</h2>
            </div>

            <Link to="#" className="view-all">
              View All →
            </Link>
          </div>

          <div className="row g-4">
            {animeList.map((anime, index) => (
              <div className="col-lg-3 col-md-6" key={index}>
                <div className="anime-card">
                  <div className="anime-image">
                    <img src={anime.image} alt={anime.title} />

                    <div className="anime-overlay">
                      <button>▶</button>
                    </div>
                  </div>

                  <div className="anime-info">
                    <h3>{anime.title}</h3>

                    <p>{anime.genre}</p>

                    <button className="details-btn">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GENRES */}
      <section className="genre-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span>EXPLORE</span>
              <h2>Browse by Genre</h2>
            </div>
          </div>

          <div className="genre-grid">
            <div className="genre-card">⚔️ Action</div>
            <div className="genre-card">✨ Fantasy</div>
            <div className="genre-card">😂 Comedy</div>
            <div className="genre-card">👻 Horror</div>
            <div className="genre-card">❤️ Romance</div>
            <div className="genre-card">🚀 Sci-Fi</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="anime-footer">
        <div className="container">
          <h2>AniVerse</h2>

          <p>Your gateway to the world of anime.</p>

          <div className="footer-links">
            <Link to="/home">Home</Link>
            <Link to="#">Anime</Link>
            <Link to="#">Manga</Link>
            <Link to="#">About</Link>
          </div>

          <hr />

          <p className="copyright">© 2026 AniVerse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
