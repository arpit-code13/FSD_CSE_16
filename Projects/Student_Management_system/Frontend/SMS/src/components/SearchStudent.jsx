import { useState } from "react";

function SearchStudent({ onSearch }) {
  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    const value = e.target.value;

    setSearch(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearch("");
    onSearch("");
  };

  return (
    <div className="search-student">
      <h2>Search Student</h2>

      <input
        type="text"
        placeholder="Search by Student ID or Name"
        value={search}
        onChange={handleSearch}
      />

      {search && <button onClick={handleClear}>Clear</button>}
    </div>
  );
}

export default SearchStudent;
