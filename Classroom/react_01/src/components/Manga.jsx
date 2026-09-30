import React from "react";
import { Link } from "react-router-dom";
import "./Manga.css";

const Manga = () => {
  const mangaList = [
    {
      title: "Solo Leveling",
      genre: "Action • Fantasy",
      chapter: "Chapter 210",
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnecD1hI7RtRzqlN4AO_mWmRhdBl7U-xXzDKQAtwouCA&s=10",
    },
    {
      title: "One Piece",
      genre: "Adventure • Fantasy",
      chapter: "Chapter 1160",
      image: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=600",
    },
    {
      title: "Jujutsu Kaisen",
      genre: "Action • Supernatural",
      chapter: "Chapter 275",
      image:
        "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600",
    },
    {
      title: "Demon Slayer",
      genre: "Action • Fantasy",
      chapter: "Chapter 205",
      image:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600",
    },
    {
      title: "Naruto",
      genre: "Action • Adventure",
      chapter: "Chapter 700",
      image:
        "https://images.unsplash.com/photo-1578632749014-ca77efd052eb?w=60",
    },
    {
      title: "Attack on Titan",
      genre: "Action • Dark Fantasy",
      chapter: "Chapter 139",
      
      image:
        "https://images.unsplash.com/photo-1578632749014-ca77efd052eb?w=600",
    },
  ];

  return (
    <div className="manga-page">
      <nav className="navbar manga-navbar">
        <div className="container">
          <Link to="/home" className="manga-logo">
            AniVerse
          </Link>

          <div className="manga-nav-links">
            <Link to="/home">Home</Link>
            <Link to="/anime">Anime</Link>
            <Link to="/manga" className="active">
              Manga
            </Link>
          </div>

          <Link to="/login" className="manga-logout">
            Logout
          </Link>
        </div>
      </nav>

      <section className="manga-header">
        <div className="container">
          <span>READ YOUR FAVORITES</span>
          <h1>Manga Collection</h1>
          <p>Explore manga chapters, stories and your favorite characters.</p>
        </div>
      </section>

      <section className="manga-section">
        <div className="container">
          <div className="manga-heading">
            <span>LATEST CHAPTERS</span>
            <h2>Popular Manga</h2>
          </div>

          <div className="row g-4">
            {mangaList.map((manga, index) => (
              <div className="col-lg-3 col-md-4 col-sm-6" key={index}>
                <div className="manga-card">
                  <div className="manga-image">
                    <img src={manga.image} alt={manga.title} />

                    <span>{manga.chapter}</span>
                  </div>

                  <div className="manga-info">
                    <h3>{manga.title}</h3>

                    <p>{manga.genre}</p>

                    <button>Read Manga</button>
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

export default Manga;
