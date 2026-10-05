import { useEffect, useState } from "react";
import axios from "axios";

import CursorEffect from "./components/CursorEffect";
import StudentForm from "./components/StudentForm";
import StudentList from "./components/StudentList";
import SearchStudent from "./components/SearchStudent";


function App() {
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/students");

      setStudents(response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.log("Unable to fetch students");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStudentSaved = () => {
    setEditingStudent(null);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setEditingStudent(student);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleSearch = (searchValue) => {
    const value = searchValue.trim().toLowerCase();

    if (value === "") {
      setSearchResults(students);
      return;
    }

    const results = students.filter((student) => {
      const idMatch = String(student.id).includes(value);

      const nameMatch = student.name.toLowerCase().includes(value);

      return idMatch || nameMatch;
    });

    setSearchResults(results);
  };

  return (
    <div className="app">
      <CursorEffect />
      <header>
        <h1>Student Management System</h1>
        <p>Full Stack Development Workshop</p>
      </header>

      <main>
        <StudentForm
          editingStudent={editingStudent}
          onStudentSaved={handleStudentSaved}
          onCancelEdit={handleCancelEdit}
        />

        <SearchStudent onSearch={handleSearch} />

        <StudentList
          students={searchResults}
          onEdit={handleEdit}
          refresh={handleStudentSaved}
        />
      </main>
    </div>
  );
}

export default App;
