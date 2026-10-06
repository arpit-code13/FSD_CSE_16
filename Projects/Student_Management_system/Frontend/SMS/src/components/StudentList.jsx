import axios from "axios";

function StudentList({ students, onEdit, refresh }) {
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this student?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(`https://fsd-cse-16.onrender.com/api/students/${id}`);

      refresh();
    } catch (error) {
      console.log(error.response?.data?.message || "Unable to delete student");
    }
  };

  return (
    <div className="student-list">
      <h2>All Students</h2>

      {students.length === 0 ? (
        <p>No student found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Semester</th>
              <th>Mobile Number</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.branch}</td>
                <td>{student.semester}</td>
                <td>{student.mobile}</td>

                <td>
                  <button onClick={() => onEdit(student)}>Edit</button>

                  <button onClick={() => handleDelete(student.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StudentList;
