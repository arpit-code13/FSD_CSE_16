import { useEffect, useState } from "react";
import axios from "axios";

const initialForm = {
  id: "",
  name: "",
  email: "",
  branch: "CSE",
  semester: "",
  mobile: "",
};

function StudentForm({ editingStudent, onStudentSaved, onCancelEdit }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingStudent) {
      setForm({
        id: editingStudent.id,
        name: editingStudent.name,
        email: editingStudent.email,
        branch: editingStudent.branch,
        semester: editingStudent.semester,
        mobile: editingStudent.mobile,
      });
    } else {
      setForm(initialForm);
    }
  }, [editingStudent]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      if (editingStudent) {
        const response = await axios.put(
          `https://fsd-cse-16.onrender.com/api/students/${editingStudent.id}`,
          form,
        );

        setMessage(response.data.message);
      } else {
        const response = await axios.post(
          "https://fsd-cse-16.onrender.com/api/students",
          form,
        );

        setMessage(response.data.message);
        setForm(initialForm);
      }

      onStudentSaved();
    } catch (error) {
      setError(error.response?.data?.message || "Something went wrong");
    }
  };

  const handleCancel = () => {
    setForm(initialForm);
    setMessage("");
    setError("");
    onCancelEdit();
  };

  return (
    <div className="student-form">
      <h2>{editingStudent ? "Update Student" : "Add Student"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Student ID</label>
          <input
            type="number"
            name="id"
            value={form.id}
            onChange={handleChange}
            required
            disabled={editingStudent}
          />
        </div>

        <div>
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Branch</label>
          <select
            name="branch"
            value={form.branch}
            onChange={handleChange}
            required
          >
            <option value="CSE">CSE</option>
            <option value="CS">CS</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
          </select>
        </div>

        <div>
          <label>Semester</label>
          <input
            type="number"
            name="semester"
            value={form.semester}
            onChange={handleChange}
            min="1"
            max="8"
            required
          />
        </div>

        <div>
          <label>Mobile Number</label>
          <input
            type="text"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            maxLength="10"
            required
          />
        </div>

        <button type="submit">
          {editingStudent ? "Update Student" : "Add Student"}
        </button>

        {editingStudent && (
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default StudentForm;
