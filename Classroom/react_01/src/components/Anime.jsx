import React from "react";
import { Link } from "react-router-dom";
import "./Anime.css";

const Anime = () => {
  const animeList = [
    {
      title: "Demon Slayer",
      genre: "Action • Fantasy",
      type: "TV",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQB-NoxKy8REKNElsoVrax-VQ_87V6l_rkooQv3DyRBLg&s=10",
    },
    {
      title: "One Piece",
      genre: "Adventure • Fantasy",
      type: "TV",
      image: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=600",
    },
    {
      title: "Attack on Titan",
      genre: "Action • Dark Fantasy",
      type: "TV",
      image:
        "https://images.unsplash.com/photo-1578632749014-ca77efd052eb?w=600",
    },
    {
      title: "My Hero Academia",
      genre: "Action • Superhero",
      type: "TV",
      image:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600",
    },
    {
      title: "Jujutsu Kaisen",
      genre: "Action • Supernatural",
      type: "TV",
      image:
        "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600",
    },
    {
      title: "Naruto",
      genre: "Action • Adventure",
      type: "TV",
      image:
        "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600",
    },
  ];

  return (
    <div className="anime-page">
      <nav className="navbar anime-navbar">
        <div className="container">
          <Link to="/home" className="anime-logo">
            AniVerse
          </Link>

          <div className="anime-nav-links">
            <Link to="/home">Home</Link>
            <Link to="/anime" className="active">
              Anime
            </Link>
            <Link to="/manga">Manga</Link>
          </div>

          <Link to="/login" className="logout-btn">
            Logout
          </Link>
        </div>
      </nav>

      <section className="anime-page-header">
        <div className="container">
          <span>EXPLORE THE WORLD</span>
          <h1>Anime Collection</h1>
          <p>Discover action, fantasy, adventure and supernatural anime.</p>
        </div>
      </section>

      <section className="anime-list-section">
        <div className="container">
          <div className="anime-page-heading">
            <div>
              <span>LATEST RELEASE</span>
              <h2>Popular Anime</h2>
            </div>
          </div>

          <div className="row g-4">
            {animeList.map((anime, index) => (
              <div className="col-lg-3 col-md-4 col-sm-6" key={index}>
                <div className="anime-page-card">
                  <div className="anime-page-image">
                    <img src={anime.image} alt={anime.title} />

                    <span className="anime-type">{anime.type}</span>

                    <button className="play-button">▶</button>
                  </div>

                  <div className="anime-page-info">
                    <h3>{anime.title}</h3>

                    <p>{anime.genre}</p>

                    <button className="anime-detail-button">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Anime;
